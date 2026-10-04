const crypto = require('crypto');

const COOKIE_NAME = 'drivekit_admin';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('ADMIN_SESSION_SECRET must contain at least 32 characters');
  return value;
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function createSession(username) {
  const payload = b64url(JSON.stringify({ username, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }));
  return `${payload}.${sign(payload)}`;
}

function parseCookies(req) {
  return String(req.headers.cookie || '').split(';').reduce((cookies, part) => {
    const index = part.indexOf('=');
    if (index > -1) cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    return cookies;
  }, {});
}

function readSession(req) {
  try {
    const token = parseCookies(req)[COOKIE_NAME];
    if (!token) return null;
    const [payload, signature] = token.split('.');
    if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.username || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch (_) {
    return null;
  }
}

function sessionCookie(value, maxAge = SESSION_TTL_SECONDS) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

function verifyPassword(password) {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected && safeEqual(password, expected));
}

function requireAdmin(req, res) {
  const session = readSession(req);
  if (!session) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return null;
  }
  return session;
}

module.exports = {
  createSession,
  readSession,
  requireAdmin,
  sessionCookie,
  verifyPassword
};
