const assert = require('assert');

function response() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

async function run(handler, req) {
  const res = response();
  await handler(req, res);
  return res;
}

(async () => {
  process.env.ADMIN_LOGIN = 'admin';
  process.env.ADMIN_PASSWORD = 'test-password';
  process.env.ADMIN_SESSION_SECRET = '12345678901234567890123456789012';
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  process.env.TELEGRAM_CHAT_ID = '-1001';
  process.env.NOVA_POSHTA_API_KEY = 'test-nova-key';
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const productsHandler = require('../api/products');
  const products = await run(productsHandler, { method: 'GET', headers: {} });
  assert.equal(products.statusCode, 200);
  assert.equal(products.body.products[0].id, 'drivekit-gl-965a');

  const loginHandler = require('../api/admin/login');
  const login = await run(loginHandler, {
    method: 'POST', headers: {'content-type': 'application/json'}, body: {username: 'admin', password: 'test-password'}
  });
  assert.equal(login.statusCode, 200);
  assert.match(login.headers['set-cookie'], /HttpOnly/);

  const sessionHandler = require('../api/admin/session');
  const session = await run(sessionHandler, {
    method: 'GET', headers: {cookie: login.headers['set-cookie'].split(';')[0]}
  });
  assert.equal(session.statusCode, 200);
  assert.equal(session.body.username, 'admin');

  const adminProductsHandler = require('../api/admin/products');
  const unauthorized = await run(adminProductsHandler, {method: 'GET', headers: {}});
  assert.equal(unauthorized.statusCode, 401);

  let telegramPayload;
  global.fetch = async (url, options) => {
    if (String(url).includes('api.telegram.org')) {
      telegramPayload = JSON.parse(options.body);
      return {ok: true, status: 200, json: async () => ({ok: true}), text: async () => ''};
    }
    if (String(url).includes('api.novaposhta.ua')) {
      return {
        ok: true,
        json: async () => ({success: true, data: [{Addresses: [{DeliveryCity: 'city-ref', Present: 'м. Київ'}]}]})
      };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  const orderHandler = require('../api/order');
  const order = await run(orderHandler, {
    method: 'POST',
    headers: {'content-type': 'application/json', 'x-forwarded-for': 'smoke-order'},
    body: {
      customerName: 'Тестовий Покупець',
      phone: '+380501234567',
      delivery: {carrier: 'ukr', address: '01001, Київ, Хрещатик, 1'},
      items: [{id: 'drivekit-gl-965a', quantity: 2}]
    }
  });
  assert.equal(order.statusCode, 200);
  assert.match(telegramPayload.text, /4[\s ]?380 ₴/);

  const novaHandler = require('../api/shipping/nova-poshta');
  const cities = await run(novaHandler, {
    method: 'POST', headers: {'content-type': 'application/json'}, body: {action: 'cities', query: 'Ки'}
  });
  assert.equal(cities.statusCode, 200);
  assert.deepEqual(cities.body.items[0], {ref: 'city-ref', label: 'м. Київ'});

  console.log('Smoke tests passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
