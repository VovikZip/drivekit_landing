function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function clean(value, maxLength = 200) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return clean(Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0], 64) || 'unknown';
}

function requireJson(req, res) {
  if (!String(req.headers['content-type'] || '').includes('application/json')) {
    json(res, 415, { ok: false, error: 'Content-Type must be application/json' });
    return false;
  }
  return true;
}

module.exports = { json, clean, clientIp, requireJson };
