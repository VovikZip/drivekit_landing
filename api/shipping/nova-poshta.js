const { clean, json, requireJson } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }
  if (!requireJson(req, res)) return;

  const apiKey = process.env.NOVA_POSHTA_API_KEY;
  if (!apiKey) return json(res, 503, { ok: false, error: 'Nova Poshta API is not configured' });

  const action = clean(req.body?.action, 30);
  let payload;

  if (action === 'cities') {
    const query = clean(req.body?.query, 100);
    if (query.length < 2) return json(res, 200, { ok: true, items: [] });
    payload = {
      apiKey,
      modelName: 'Address',
      calledMethod: 'searchSettlements',
      methodProperties: { CityName: query, Limit: '20', Page: '1' }
    };
  } else if (action === 'warehouses') {
    const cityRef = clean(req.body?.cityRef, 80);
    if (!cityRef) return json(res, 400, { ok: false, error: 'City reference is required' });
    payload = {
      apiKey,
      modelName: 'AddressGeneral',
      calledMethod: 'getWarehouses',
      methodProperties: { CityRef: cityRef, Limit: '200', Page: '1', Language: 'UA' }
    };
  } else {
    return json(res, 400, { ok: false, error: 'Unknown action' });
  }

  try {
    const response = await fetch('https://api.novaposhta.ua/v2.0/json/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error((result.errors || ['Nova Poshta request failed']).join(', '));

    if (action === 'cities') {
      const addresses = result.data?.[0]?.Addresses || [];
      return json(res, 200, {
        ok: true,
        items: addresses.map(item => ({
          ref: item.DeliveryCity || item.Ref,
          label: [item.Present || item.MainDescription, item.Area].filter(Boolean).join(', ')
        })).filter(item => item.ref)
      });
    }

    return json(res, 200, {
      ok: true,
      items: (result.data || []).map(item => ({ ref: item.Ref, label: item.Description, number: item.Number }))
    });
  } catch (error) {
    console.error('Nova Poshta request failed', error);
    return json(res, 502, { ok: false, error: 'Не вдалося завантажити дані Нової пошти' });
  }
};
