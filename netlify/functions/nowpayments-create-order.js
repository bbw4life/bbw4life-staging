const crypto = require('crypto');

const SANDBOX = process.env.NOWPAYMENTS_SANDBOX === 'true';
const BASE_URL_NOW = SANDBOX
  ? 'https://api.sandbox.nowpayments.io/v1'
  : 'https://api.nowpayments.io/v1';

const API_KEY = SANDBOX
  ? process.env.NOWPAYMENTS_API_KEY_SANDBOX
  : process.env.NOWPAYMENTS_API_KEY;

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
      price_amount:    parseFloat(totalAmount),
      price_currency:  'usd',
      order_id:        orderId,
      order_description: orderTitle,
      ipn_callback_url: `${BASE_SITE}/.netlify/functions/nowpayments-webhook`,
      success_url:     `${BASE_SITE}/thankyou.html?provider=nowpayments&orderId=${orderId}`,
      cancel_url:      `${BASE_SITE}/checkout.html`,
      is_fixed_rate:   false,
      is_fee_paid_by_user: false,
    };

    const response = await fetch(`${BASE_URL_NOW}/invoice`, {
      method:  'POST',
      headers: {
        'x-api-key':    API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || !data.invoice_url) {
      console.error('[NOWPAYMENTS] Error:', JSON.stringify(data));
      return res(500, { success: false, error: data.message || 'NOWPayments order failed' });
    }

    return res(200, {
      success:    true,
      invoiceUrl: data.invoice_url,
      orderId,
      paymentId:  data.id,
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