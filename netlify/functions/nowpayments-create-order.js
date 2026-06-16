const crypto = require('crypto');
const https  = require('https');

const SANDBOX = process.env.NOWPAYMENTS_SANDBOX === 'true';
const BASE_URL_NOW = SANDBOX
  ? 'api.sandbox.nowpayments.io'
  : 'api.nowpayments.io';

const API_KEY = SANDBOX
  ? process.env.NOWPAYMENTS_API_KEY_SANDBOX
  : process.env.NOWPAYMENTS_API_KEY;

function httpsPost(hostname, path, data, headers) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers
      }
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, data: {} });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  try {
    if (!event.body) return res(400, { success: false, error: 'No data received' });

    const { cart, shipping, shipping_cost, tax, cartToken } = JSON.parse(event.body);

    if (!Array.isArray(cart) || cart.length === 0) {
      return res(400, { success: false, error: 'Cart empty' });
    }

    if (!API_KEY) {
      return res(500, { success: false, error: 'NOWPayments not configured' });
    }

    // ── Calcul total ──
    let subtotal = 0;
    cart.forEach(item => {
      subtotal += parseFloat(item.price || 0) * parseInt(item.quantity || 0);
    });
    const shippingCost = parseFloat(shipping_cost || 0);
    const taxAmount    = parseFloat(tax || 0);
    const totalAmount  = (subtotal + shippingCost + taxAmount).toFixed(2);

    const BASE_SITE = process.env.BASE_URL || 'https://bbw4lifee.netlify.app';
    const orderId   = `BBW-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const orderTitle = cart.length === 1
      ? cart[0].title.substring(0, 100)
      : `BBW4LIFE — ${cart.length} articles`;

    const body = {
      price_amount:      parseFloat(totalAmount),
      price_currency:    'usd',
      order_id:          orderId,
      order_description: orderTitle,
      ipn_callback_url:  `${BASE_SITE}/.netlify/functions/nowpayments-webhook`,
      success_url:       `${BASE_SITE}/thankyou.html?provider=nowpayments&orderId=${orderId}`,
      cancel_url:        `${BASE_SITE}/checkout.html`,
      is_fixed_rate:     false,
      is_fee_paid_by_user: false,
    };

    const result = await httpsPost(
      BASE_URL_NOW,
      '/v1/invoice',
      body,
      { 'x-api-key': API_KEY }
    );

    console.log('[NOWPAYMENTS] Response:', result.status, JSON.stringify(result.data));

    if (result.status !== 200 || !result.data.invoice_url) {
      console.error('[NOWPAYMENTS] Error:', JSON.stringify(result.data));
      return res(500, { success: false, error: result.data.message || 'NOWPayments order failed' });
    }

    return res(200, {
      success:    true,
      invoiceUrl: result.data.invoice_url,
      orderId,
      paymentId:  result.data.id,
    });

  } catch (err) {
    console.error('[NOWPAYMENTS] Fatal:', err.message);
    return res(500, { success: false, error: 'Internal server error' });
  }
};

function res(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}