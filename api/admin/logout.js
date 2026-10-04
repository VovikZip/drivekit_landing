const { json } = require('../_lib/http');
const { sessionCookie } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }
  res.setHeader('Set-Cookie', sessionCookie('', 0));
  return json(res, 200, { ok: true });
};
