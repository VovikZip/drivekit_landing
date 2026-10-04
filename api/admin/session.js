const { json } = require('../_lib/http');
const { readSession } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }
  const session = readSession(req);
  return session
    ? json(res, 200, { ok: true, username: session.username })
    : json(res, 401, { ok: false, error: 'Unauthorized' });
};
