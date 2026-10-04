const { clean, json, requireJson } = require('../_lib/http');
const { requireAdmin } = require('../_lib/auth');
const { supabase } = require('../_lib/supabase');

function productPayload(body) {
  const name = clean(body.name, 140);
  const price = Number(body.price);
  if (name.length < 2 || !Number.isInteger(price) || price < 0) throw new Error('Некоректна назва або ціна');

  return {
    name,
    slug: clean(body.slug, 160) || name.toLowerCase().replace(/[^a-zа-яіїєґ0-9]+/gi, '-').replace(/(^-|-$)/g, ''),
    price,
    compare_price: body.compare_price ? Number(body.compare_price) : null,
    description: clean(body.description, 2000),
    category_id: clean(body.category_id, 80) || null,
    image_url: clean(body.image_url, 500),
    stock: Math.max(0, Number.parseInt(body.stock, 10) || 0),
    active: body.active !== false,
    sort_order: Number.parseInt(body.sort_order, 10) || 100
  };
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      const products = await supabase('products?select=*,category:categories(id,name,slug)&order=sort_order.asc,created_at.desc');
      return json(res, 200, { ok: true, products });
    }

    if (!requireJson(req, res)) return;

    if (req.method === 'POST') {
      const [product] = await supabase('products', { method: 'POST', body: JSON.stringify(productPayload(req.body || {})) });
      return json(res, 201, { ok: true, product });
    }

    const id = clean(req.body?.id, 80);
    if (!id) return json(res, 400, { ok: false, error: 'Product id is required' });

    if (req.method === 'PATCH') {
      const [product] = await supabase(`products?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(productPayload(req.body || {}))
      });
      return json(res, 200, { ok: true, product });
    }

    if (req.method === 'DELETE') {
      await supabase(`products?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return json(res, 200, { ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin products request failed', error);
    return json(res, 500, { ok: false, error: error.message || 'Product operation failed' });
  }
};
