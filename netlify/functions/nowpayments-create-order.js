// functions/nowpayments-create-order.js
import { saveTempOrder } from './temp-orders-store.js';

// ── Fetch settings from products.data.json ──
async function getSettings(env) {
  try {
    const BASE_URL = env.BASE_URL || '';
    const res = await fetch(`${BASE_URL}/products.data.json`);
    if (!res.ok) throw new Error('Failed to fetch products.data.json');
    const data = await res.json();
    return data.find(p => p.type === 'settings') || {};
  } catch (err) {
    console.warn('[NOWPAYMENTS] Could not load products.data.json:', err.message);
    return {};
  }
}

// ── Sanitize free promo items ──
function sanitizeCart(cart, settings) {
  const cd = settings.cart_drawer || {};
  const buyQty = parseInt(cd.promo_buy_quantity) || 0;
  const getQty = parseInt(cd.promo_get_quantity) || 0;
  if (!buyQty || !getQty) return cart;

  const paidQty = cart
    .filter(i => !i.isFreePromo)
    .reduce((sum, i) => sum + (parseInt(i.quantity) || 0), 0);

  return cart.map(item => {
    if (item.isFreePromo) {
      return paidQty >= buyQty
        ? { ...item, price: 0 }
        : { ...item, isFreePromo: false };
    }
    return item;
  });
}

// ── Compute totals ──
function computeTotals(cart, settings, shippingMethod) {
  const cd = settings.cart_drawer || {};
  const SHIPPING_COST = parseFloat(settings.shipping_cost) || 10.00;
  const TAX_RATE = parseFloat(settings.tax_rate) || 0.00;
  const freeShipThreshold = parseFloat(cd.free_shipping_threshold) || 0;

  const subtotal = cart.reduce((sum, item) =>
    sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0);

  const isFreeMethod = ['Standard Shipping', 'Economy Shipping'].includes(shippingMethod);
  const isFreeThreshold = freeShipThreshold > 0 && subtotal >= freeShipThreshold;
  const isFree = isFreeMethod || isFreeThreshold;

  return {
    subtotal,
    shippingCost: isFree ? 0 : SHIPPING_COST,
    taxAmount: isFree ? 0 : parseFloat((subtotal * TAX_RATE).toFixed(2)),
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const API_KEY = env.NOWPAYMENTS_API_KEY;
  const BASE_URL_NOW = 'https://api.nowpayments.io';

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return res(400, { success: false, error: 'No data received' });
    }

    const { cart: rawCart, shipping, shipping_cost, tax } = body;

    if (!Array.isArray(rawCart) || rawCart.length === 0) {
      return res(400, { success: false, error: 'Cart empty' });
    }

    if (!API_KEY) {
      console.error('[NOWPAYMENTS] Missing API key');
      return res(500, { success: false, error: 'NOWPayments not configured' });
    }

    console.log(`[NOWPAYMENTS] Mode: LIVE | Host: ${BASE_URL_NOW}`);

    const settings = await getSettings(env);
    const cart = sanitizeCart(rawCart, settings);
    const shippingMethod = shipping?.shipping_method || 'Standard Shipping';

    const shippingCost = shipping_cost !== undefined
      ? parseFloat(shipping_cost)
      : computeTotals(cart, settings, shippingMethod).shippingCost;

    const taxAmount = tax !== undefined
      ? parseFloat(tax)
      : computeTotals(cart, settings, shippingMethod).taxAmount;

    const subtotal = cart.reduce((sum, item) =>
      sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0);

    const totalAmount = parseFloat((subtotal + shippingCost + taxAmount).toFixed(2));

    const BASE_SITE = env.BASE_URL || 'https://bbw4lifee.netlify.app';
    const orderId = `BBW-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const orderTitle = cart.length === 1
      ? cart[0].title.substring(0, 100)
      : `BBW4LIFE — ${cart.length} articles`;

    // ── Stocker cart + shipping dans le Sheet temporaire (clé = orderId) ──
    await saveTempOrder(env, orderId, cart, shipping);
    console.log('[NOWPAYMENTS] Temp order saved | orderId:', orderId);

    const invoiceBody = {
      price_amount: totalAmount,
      price_currency: 'usd',
      order_id: orderId,
      order_description: orderTitle,
      ipn_callback_url: `${BASE_SITE}/nowpayments-webhook`,
      success_url: `${BASE_SITE}/thankyou.html?provider=nowpayments&orderId=${orderId}`,
      cancel_url: `${BASE_SITE}/checkout.html`,
      is_fixed_rate: false,
      is_fee_paid_by_user: false,
    };

    console.log('[NOWPAYMENTS] Creating invoice:', orderId, '| Amount:', totalAmount, 'USD');

    const nowRes = await fetch(`${BASE_URL_NOW}/v1/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(invoiceBody)
    });

    let data = {};
    try { data = await nowRes.json(); } catch {}

    console.log('[NOWPAYMENTS] Response status:', nowRes.status);

    if (nowRes.status !== 200 || !data.invoice_url) {
      console.error('[NOWPAYMENTS] Error response:', JSON.stringify(data));
      return res(500, {
        success: false,
        error: data?.message || data?.error || 'NOWPayments invoice creation failed'
      });
    }

    console.log('[NOWPAYMENTS] Invoice created:', data.id);

    return res(200, {
      success: true,
      invoiceUrl: data.invoice_url,
      orderId,
      paymentId: data.id,
    });

  } catch (err) {
    console.error('[NOWPAYMENTS] Fatal:', err.message);
    return res(500, { success: false, error: err.message || 'Internal server error' });
  }
}

export async function onRequestGet() {
  return new Response('Method Not Allowed', { status: 405 });
}

function res(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}