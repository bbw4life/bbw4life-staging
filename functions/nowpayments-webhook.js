// functions/nowpayments-webhook.js
import { getAndDeleteTempOrder } from './temp-orders-store.js';

function sortObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObject);
  return Object.keys(obj).sort().reduce((sorted, key) => {
    sorted[key] = sortObject(obj[key]);
    return sorted;
  }, {});
}

// ── HMAC-SHA512 via Web Crypto (remplace crypto.createHmac) ──
async function hmacSha512Hex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const IPN_SECRET = env.NOWPAYMENTS_IPN_SECRET;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    // ── Vérification signature IPN ──
    const signature = request.headers.get('x-nowpayments-sig');
    if (signature && IPN_SECRET) {
      const sortedBody = JSON.stringify(sortObject(body));
      const hmac = await hmacSha512Hex(IPN_SECRET, sortedBody);

      if (hmac !== signature) {
        console.error('[NOWPAYMENTS WEBHOOK] Invalid signature');
        return res(401, { error: 'Invalid signature' });
      }
    }

    console.log('[NOWPAYMENTS WEBHOOK] Payment status:', body.payment_status, '| Order:', body.order_id);

    // ── Seulement traiter les paiements confirmés ──
    const confirmedStatuses = ['finished', 'confirmed', 'complete'];
    if (!confirmedStatuses.includes(body.payment_status)) {
      console.log(`[NOWPAYMENTS WEBHOOK] Status ${body.payment_status} — skipping`);
      return res(200, { received: true });
    }

    const BASE_SITE = env.BASE_URL || 'https://bbw4lifee.netlify.app';
    const orderId = body.order_id;

    // ── Récupérer cart + shipping depuis le Sheet temporaire ──
    let cart = [];
    let shipping = {};
    try {
      const tempOrder = await getAndDeleteTempOrder(env, orderId);
      if (!tempOrder) {
        console.error('[NOWPAYMENTS WEBHOOK] No temp order found for orderId:', orderId);
        return res(404, { error: 'Order data not found' });
      }
      cart = tempOrder.cart || [];
      shipping = tempOrder.shipping || {};
      console.log('[NOWPAYMENTS WEBHOOK] Cart + shipping récupérés | items:', cart.length);
    } catch (e) {
      console.error('[NOWPAYMENTS WEBHOOK] Failed to retrieve temp order:', e.message);
      return res(500, { error: 'Could not retrieve order data' });
    }

    // ── Appeler verify-payment avec cart + shipping ──
    try {
      await fetch(`${BASE_SITE}/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'nowpayments',
          orderID: orderId,
          cart,
          shipping,
          totalAmount: body.price_amount
        })
      });
      console.log('[NOWPAYMENTS WEBHOOK] verify-payment appelé avec succès');
    } catch (e) {
      console.error('[NOWPAYMENTS WEBHOOK] verify-payment failed:', e.message);
    }

    // ── Notifier Telegram ──
    try {
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          parse_mode: 'HTML',
          text: `💎 <b>Paiement Crypto Confirmé!</b>\n\n` +
                `🔢 <b>Order:</b> ${orderId}\n` +
                `💰 <b>Montant:</b> $${body.price_amount} USD\n` +
                `🪙 <b>Crypto:</b> ${body.pay_amount} ${body.pay_currency?.toUpperCase()}\n` +
                `✅ <b>Status:</b> ${body.payment_status}\n\n` +
                `👑 <i>BBW4LIFE — Beauty Has No Sizes</i>`
        })
      });
    } catch (e) {
      console.warn('[NOWPAYMENTS WEBHOOK] Telegram notify failed:', e.message);
    }

    return res(200, { received: true });

  } catch (err) {
    console.error('[NOWPAYMENTS WEBHOOK] Fatal:', err.message);
    return res(500, { error: 'Internal server error' });
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