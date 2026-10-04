const { clean, json, requireJson } = require('../_lib/http');
const { requireAdmin } = require('../_lib/auth');
const { supabase } = require('../_lib/supabase');

function categoryPayload(body) {
  const name = clean(body.name, 100);
  if (name.length < 2) throw new Error('Вкажіть назву категорії');
  return {
    name,
    slug: clean(body.slug, 120) || name.toLowerCase().replace(/[^a-zа-яіїєґ0-9]+/gi, '-').replace(/(^-|-$)/g, ''),
    sort_order: Number.parseInt(body.sort_order, 10) || 100
  };
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      const categories = await supabase('categories?select=*&order=sort_order.asc,name.asc');
      return json(res, 200, { ok: true, categories });
    }
    if (!requireJson(req, res)) return;

    if (req.method === 'POST') {
      const [category] = await supabase('categories', { method: 'POST', body: JSON.stringify(categoryPayload(req.body || {})) });
      return json(res, 201, { ok: true, category });
    }

    const id = clean(req.body?.id, 80);
    if (!id) return json(res, 400, { ok: false, error: 'Category id is required' });

    if (req.method === 'PATCH') {
      const [category] = await supabase(`categories?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(categoryPayload(req.body || {}))
      });
      return json(res, 200, { ok: true, category });
    }

    if (req.method === 'DELETE') {
      await supabase(`categories?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return json(res, 200, { ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin categories request failed', error);
    return json(res, 500, { ok: false, error: error.message || 'Category operation failed' });
  }
};
