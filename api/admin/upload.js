const crypto = require('crypto');
const { clean, json, requireJson } = require('../_lib/http');
const { requireAdmin } = require('../_lib/auth');

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }
  if (!requireJson(req, res)) return;

  const mime = clean(req.body?.mime, 40);
  const extension = MIME_EXTENSIONS[mime];
  const raw = String(req.body?.data || '').replace(/^data:[^;]+;base64,/, '');
  if (!extension || !raw) return json(res, 400, { ok: false, error: 'Підтримуються JPG, PNG та WEBP' });

  const bytes = Buffer.from(raw, 'base64');
  if (!bytes.length || bytes.length > 3 * 1024 * 1024) {
    return json(res, 400, { ok: false, error: 'Файл має бути не більшим за 3 МБ' });
  }

  const baseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !key) return json(res, 503, { ok: false, error: 'Сховище не налаштоване' });

  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
  const response = await fetch(`${baseUrl}/storage/v1/object/product-images/${filename}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': mime,
      'x-upsert': 'false'
    },
    body: bytes
  });

  if (!response.ok) {
    console.error('Image upload failed', response.status, (await response.text()).slice(0, 500));
    return json(res, 502, { ok: false, error: 'Не вдалося завантажити фото' });
  }

  return json(res, 201, {
    ok: true,
    url: `${baseUrl}/storage/v1/object/public/product-images/${filename}`
  });
};
