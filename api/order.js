const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;
const requestBuckets = new Map();

function clean(value, maxLength) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return clean(Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0], 64) || 'unknown';
}

function isRateLimited(key) {
  const now = Date.now();
  const bucket = requestBuckets.get(key);

  if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
    requestBuckets.set(key, { startedAt: now, count: 1 });
    return false;
  }

  bucket.count += 1;
  return bucket.count > MAX_REQUESTS_PER_WINDOW;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.includes('application/json')) {
    return res.status(415).json({ ok: false, error: 'Content-Type must be application/json' });
  }

  const body = req.body || {};

  // Honeypot: bots commonly fill every field. Return success without sending spam.
  if (clean(body.company, 100)) {
    return res.status(200).json({ ok: true });
  }

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ ok: false, error: 'Too many requests' });
  }

  const name = clean(body.name, 80);
  const phone = clean(body.phone, 24);
  const phoneDigits = phone.replace(/\D/g, '');
  const city = clean(body.city, 80);
  const product = clean(body.product, 100) || 'DRIVEKIT GL-965A 4-в-1';
  const price = clean(body.price, 40) || '2 190 ₴';

  if (name.length < 2 || phoneDigits.length < 10 || phoneDigits.length > 15) {
    return res.status(400).json({ ok: false, error: 'Invalid order data' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('Telegram environment variables are not configured');
    return res.status(503).json({ ok: false, error: 'Order service is not configured' });
  }

  const source = clean(body.source, 120);
  const campaign = clean(body.campaign, 120);
  const pageUrl = clean(body.pageUrl, 300);
  const referrer = clean(body.referrer, 300);
  const localTime = new Intl.DateTimeFormat('uk-UA', {
    timeZone: 'Europe/Kyiv',
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(new Date());

  const text = [
    '🚗 НОВЕ ЗАМОВЛЕННЯ DRIVEKIT',
    '',
    `Товар: ${product}`,
    `Ціна: ${price}`,
    '',
    `Ім’я: ${name}`,
    `Телефон: ${phone}`,
    `Місто: ${city || 'не вказано'}`,
    '',
    `Джерело: ${source || 'прямий перехід'}`,
    campaign ? `Кампанія: ${campaign}` : '',
    referrer ? `Referrer: ${referrer}` : '',
    pageUrl ? `Сторінка: ${pageUrl}` : '',
    `Час: ${localTime}`
  ].filter(Boolean).join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: controller.signal
    });

    if (!telegramResponse.ok) {
      const details = await telegramResponse.text();
      console.error(`Telegram API returned ${telegramResponse.status}: ${details.slice(0, 500)}`);
      return res.status(502).json({ ok: false, error: 'Telegram delivery failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram request failed', error);
    return res.status(502).json({ ok: false, error: 'Telegram delivery failed' });
  } finally {
    clearTimeout(timeout);
  }
};
