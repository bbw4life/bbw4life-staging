const crypto = require('crypto');
const fetch  = require('node-fetch');

const SANDBOX = process.env.NOWPAYMENTS_SANDBOX === 'true';
const IPN_SECRET = SANDBOX
  ? process.env.NOWPAYMENTS_IPN_SECRET_SANDBOX
  : process.env.NOWPAYMENTS_IPN_SECRET;

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return res(405, { error: 'Method not allowed' });
    }

    const body = JSON.parse(event.body || '{}');

    // ── Vérification signature IPN ──
    const signature = event.headers['x-nowpayments-sig'];
    if (signature && IPN_SECRET) {
      const sortedBody = JSON.stringify(sortObject(body));
      const hmac = crypto
        .createHmac('sha512', IPN_SECRET)
        .update(sortedBody)
        .digest('hex');

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

    const BASE_SITE = process.env.BASE_URL || 'https://bbw4lifee.netlify.app';

    // ── Notifier Telegram ──
    try {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:    process.env.TELEGRAM_CHAT_ID,
          parse_mode: 'HTML',
          text: `💎 <b>Paiement Crypto Confirmé!</b>\n\n` +
                `🔢 <b>Order:</b> ${body.order_id}\n` +
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
};

// Tri récursif des clés pour la vérification signature
function sortObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObject);
  return Object.keys(obj).sort().reduce((sorted, key) => {
    sorted[key] = sortObject(obj[key]);
    return sorted;
  }, {});
}

function res(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}