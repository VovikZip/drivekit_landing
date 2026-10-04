const { fallbackProducts } = require('./_lib/catalog');
const { clean, clientIp, json, requireJson } = require('./_lib/http');
const { isConfigured, supabase } = require('./_lib/supabase');

const buckets = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const item = buckets.get(ip);
  if (!item || now - item.startedAt > 60_000) {
    buckets.set(ip, { startedAt: now, count: 1 });
    return false;
  }
  item.count += 1;
  return item.count > 5;
}

async function loadProducts(ids) {
  if (!isConfigured()) return fallbackProducts.filter(product => ids.includes(product.id));
  const encodedIds = ids.map(id => `"${String(id).replace(/["\\]/g, '')}"`).join(',');
  return supabase(`products?id=in.(${encodeURIComponent(encodedIds)})&active=eq.true&select=id,name,price,stock`);
}

async function sendTelegram(order) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error('Telegram is not configured');

  const items = order.items.map(item => `• ${item.name} × ${item.quantity} — ${item.lineTotal.toLocaleString('uk-UA')} ₴`);
  const delivery = order.delivery.carrier === 'nova'
    ? `Нова пошта\nМісто: ${order.delivery.city}\nВідділення: ${order.delivery.warehouse}`
    : `Укрпошта\nАдреса: ${order.delivery.address}`;
  const time = new Intl.DateTimeFormat('uk-UA', {
    timeZone: 'Europe/Kyiv', dateStyle: 'medium', timeStyle: 'medium'
  }).format(new Date());

  const text = [
    '🛒 НОВЕ ЗАМОВЛЕННЯ DRIVEKIT', '',
    ...items, '',
    `Разом: ${order.total.toLocaleString('uk-UA')} ₴`, '',
    `ПІБ: ${order.customerName}`,
    `Телефон: ${order.phone}`, delivery, '',
    `Джерело: ${order.source || 'прямий перехід'}`,
    order.campaign ? `Кампанія: ${order.campaign}` : '',
    `Час: ${time}`
  ].filter(Boolean).join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Telegram returned ${response.status}`);
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }
  if (!requireJson(req, res)) return;
  if (clean(req.body?.company, 100)) return json(res, 200, { ok: true });
  if (rateLimited(clientIp(req))) return json(res, 429, { ok: false, error: 'Too many requests' });

  const customerName = clean(req.body?.customerName, 120);
  const phone = clean(req.body?.phone, 24);
  const phoneDigits = phone.replace(/\D/g, '');
  const carrier = clean(req.body?.delivery?.carrier, 20);
  const city = clean(req.body?.delivery?.city, 120);
  const warehouse = clean(req.body?.delivery?.warehouse, 220);
  const address = clean(req.body?.delivery?.address, 300);
  const rawItems = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];

  if (customerName.length < 5 || phoneDigits.length < 10 || phoneDigits.length > 15 || !['nova', 'ukr'].includes(carrier)) {
    return json(res, 400, { ok: false, error: 'Перевірте контактні дані' });
  }
  if (carrier === 'nova' && (!city || !warehouse)) {
    return json(res, 400, { ok: false, error: 'Оберіть місто та відділення Нової пошти' });
  }
  if (carrier === 'ukr' && address.length < 8) {
    return json(res, 400, { ok: false, error: 'Вкажіть повну адресу доставки Укрпоштою' });
  }
  if (!rawItems.length) return json(res, 400, { ok: false, error: 'Кошик порожній' });

  try {
    const normalized = rawItems.map(item => ({
      id: clean(item.id, 80),
      quantity: Math.min(99, Math.max(1, Number.parseInt(item.quantity, 10) || 1))
    }));
    const products = await loadProducts([...new Set(normalized.map(item => item.id))]);
    const productMap = new Map(products.map(product => [String(product.id), product]));
    const items = normalized.map(item => {
      const product = productMap.get(item.id);
      if (!product || Number(product.stock) < item.quantity) throw new Error('Один із товарів недоступний у потрібній кількості');
      return {
        productId: item.id,
        name: product.name,
        price: Number(product.price),
        quantity: item.quantity,
        lineTotal: Number(product.price) * item.quantity
      };
    });
    const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const order = {
      customerName, phone,
      delivery: { carrier, city, warehouse, address },
      items, total,
      source: clean(req.body?.source, 120),
      campaign: clean(req.body?.campaign, 120)
    };

    await sendTelegram(order);

    let orderId = null;
    if (isConfigured()) {
      try {
        const [saved] = await supabase('orders', {
          method: 'POST',
          body: JSON.stringify({
            customer_name: customerName,
            phone,
            carrier,
            city: carrier === 'nova' ? city : null,
            warehouse: carrier === 'nova' ? warehouse : null,
            address: carrier === 'ukr' ? address : null,
            items,
            total,
            source: order.source || null,
            campaign: order.campaign || null,
            status: 'new'
          })
        });
        orderId = saved?.id || null;
      } catch (databaseError) {
        // Telegram already received the order; do not make the customer retry and create a duplicate.
        console.error('Order database backup failed', databaseError);
      }
    }

    return json(res, 200, { ok: true, orderId });
  } catch (error) {
    console.error('Order failed', error);
    const clientMessage = /недоступний/.test(error.message) ? error.message : 'Не вдалося оформити замовлення';
    return json(res, 502, { ok: false, error: clientMessage });
  }
};
