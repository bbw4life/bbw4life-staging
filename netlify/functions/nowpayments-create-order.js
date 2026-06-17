const https = require('https');
const fetch = require('node-fetch');

// ── Mode LIVE ──
const BASE_URL_NOW = 'api.nowpayments.io';
const API_KEY      = process.env.NOWPAYMENTS_API_KEY;

// ── Fetch settings from products.data.json ──
async function getSettings() {
  try {
    const BASE_URL = process.env.BASE_URL || '';
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
  const cd     = settings.cart_drawer || {};
  const buyQty = parseInt(cd.promo_buy_quantity) || 0;
  const getQty = parseInt(cd.promo_get_quantity)  || 0;
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
  const cd                = settings.cart_drawer || {};
  const SHIPPING_COST     = parseFloat(settings.shipping_cost) || 10.00;
  const TAX_RATE          = parseFloat(settings.tax_rate)      || 0.00;
  const freeShipThreshold = parseFloat(cd.free_shipping_threshold) || 0;

  const subtotal = cart.reduce((sum, item) =>
    sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0);

  const isFreeMethod    = ['Standard Shipping', 'Economy Shipping'].includes(shippingMethod);
  const isFreeThreshold = freeShipThreshold > 0 && subtotal >= freeShipThreshold;
  const isFree          = isFreeMethod || isFreeThreshold;

  return {
    subtotal,
    shippingCost: isFree ? 0 : SHIPPING_COST,
    taxAmount:    isFree ? 0 : parseFloat((subtotal * TAX_RATE).toFixed(2)),
  };
}

// ── HTTPS helper natif Node ──
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
    const req = https.request(options, (response) => {
      let raw = '';
      response.on('data', chunk => raw += chunk);
      response.on('end', () => {
        try { resolve({ status: response.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: response.statusCode, data: {} }); }
      });
    });
    req.on('error', (err) => {
      console.error('[NOWPAYMENTS] HTTPS error:', err.message);
      reject(err);
    });
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('NOWPayments request timeout'));
    });
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  try {
    if (!event.body) return res(400, { success: false, error: 'No data received' });

    const { cart: rawCart, shipping, shipping_cost, tax, cartToken } = JSON.parse(event.body);

    if (!Array.isArray(rawCart) || rawCart.length === 0) {
      return res(400, { success: false, error: 'Cart empty' });
    }

    if (!API_KEY) {
      console.error('[NOWPAYMENTS] Missing API key');
      return res(500, { success: false, error: 'NOWPayments not configured' });
    }

    console.log(`[NOWPAYMENTS] Mode: LIVE | Host: ${BASE_URL_NOW}`);

    // ── Load settings + sanitize cart ──
    const settings       = await getSettings();
    const cart           = sanitizeCart(rawCart, settings);
    const shippingMethod = shipping?.shipping_method || 'Standard Shipping';

    const shippingCost = shipping_cost !== undefined
      ? parseFloat(shipping_cost)
      : computeTotals(cart, settings, shippingMethod).shippingCost;

    const taxAmount = tax !== undefined
      ? parseFloat(tax)
      : computeTotals(cart, settings, shippingMethod).taxAmount;

    const subtotal = cart.reduce((sum, item) =>
      sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0);

    const totalAmount = (subtotal + shippingCost + taxAmount).toFixed(2);

    const BASE_SITE  = process.env.BASE_URL || 'https://bbw4lifee.netlify.app';
    const orderId    = `BBW-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const orderTitle = cart.length === 1
      ? cart[0].title.substring(0, 100)
      : `BBW4LIFE — ${cart.length} articles`;

    // ── Encoder cart + shipping dans order_description (récupéré par le webhook) ──
    const orderData = JSON.stringify({ cart, shipping });
    // Limité à 500 chars dans order_description — on tronque le titre des items si besoin
    const encodedData = Buffer.from(orderData).toString('base64');

    const invoiceBody = {
      price_amount:        parseFloat(totalAmount),
      price_currency:      'usd',
      order_id:            orderId,
      order_description:   encodedData,
      ipn_callback_url:    `${BASE_SITE}/.netlify/functions/nowpayments-webhook`,
      success_url:         `${BASE_SITE}/thankyou.html?provider=nowpayments&orderId=${orderId}`,
      cancel_url:          `${BASE_SITE}/checkout.html`,
      is_fixed_rate:       false,
      is_fee_paid_by_user: false,
    };

    console.log('[NOWPAYMENTS] Creating invoice:', orderId, '| Amount:', totalAmount, 'USD');

    const result = await httpsPost(
      BASE_URL_NOW,
      '/v1/invoice',
      invoiceBody,
      { 'x-api-key': API_KEY }
    );

    console.log('[NOWPAYMENTS] Response status:', result.status);

    if (result.status !== 200 || !result.data.invoice_url) {
      console.error('[NOWPAYMENTS] Error response:', JSON.stringify(result.data));
      return res(500, {
        success: false,
        error: result.data?.message || result.data?.error || 'NOWPayments invoice creation failed'
      });
    }

    console.log('[NOWPAYMENTS] Invoice created:', result.data.id);

    return res(200, {
      success:    true,
      invoiceUrl: result.data.invoice_url,
      orderId,
      paymentId:  result.data.id,
    });

  } catch (err) {
    console.error('[NOWPAYMENTS] Fatal:', err.message);
    return res(500, { success: false, error: err.message || 'Internal server error' });
  }
};

function res(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}