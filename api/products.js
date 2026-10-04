const { fallbackProducts } = require('./_lib/catalog');
const { isConfigured, supabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!isConfigured()) return res.status(200).json({ ok: true, products: fallbackProducts, fallback: true });

  try {
    const rows = await supabase('products?active=eq.true&select=*,category:categories(id,name,slug)&order=sort_order.asc,created_at.desc');
    return res.status(200).json({ ok: true, products: rows });
  } catch (error) {
    console.error('Products fetch failed', error);
    return res.status(500).json({ ok: false, error: 'Failed to load products' });
  }
};
