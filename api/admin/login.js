const { clean, clientIp, json, requireJson } = require('../_lib/http');
const { createSession, sessionCookie, verifyPassword } = require('../_lib/auth');

const attempts = new Map();

function blocked(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.startedAt > 15 * 60_000) {
    attempts.set(ip, { startedAt: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > 10;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }
  if (!requireJson(req, res)) return;

  if (blocked(clientIp(req))) {
    return json(res, 429, { ok: false, error: 'Забагато спроб. Повторіть пізніше' });
  }

  const username = clean(req.body?.username, 80);
  const password = String(req.body?.password || '').slice(0, 200);
  const expectedUsername = process.env.ADMIN_LOGIN;

  if (!expectedUsername || username !== expectedUsername || !verifyPassword(password)) {
    await new Promise(resolve => setTimeout(resolve, 350));
    return json(res, 401, { ok: false, error: 'Невірний логін або пароль' });
  }

  try {
    res.setHeader('Set-Cookie', sessionCookie(createSession(username)));
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('Admin login is not configured', error);
    return json(res, 503, { ok: false, error: 'Адмін-вхід не налаштований' });
  }
};
