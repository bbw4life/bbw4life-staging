// functions/create-reservation-stripe-session.js
import Stripe from 'stripe';

// ── Lire reservation_price depuis products.data.json (anti-tamper) ──
async function getReservationPrice(env) {
  try {
    const BASE_URL = env.BASE_URL || '';
    const res = await fetch(`${BASE_URL}/products.data.json`);
    if (!res.ok) throw new Error('Failed to fetch products.data.json');
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [];
    const settings = arr.find(p => p.type === 'settings') || {};
    const price = parseFloat(settings.reservation_price);
    if (!price || price <= 0) throw new Error('reservation_price not set in settings');
    return price;
  } catch (err) {
    throw new Error('Cannot read reservation price from server: ' + err.message);
  }
}

// ── Auth Google via JWT signé avec Web Crypto (remplace googleapis) ──
async function getGoogleAccessToken(env) {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyPem = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64url = (obj) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const unsigned = `${base64url(header)}.${base64url(claimSet)}`;

  const key = await importPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    new TextEncoder().encode(unsigned)
  );

  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${unsigned}.${sigBase64}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) throw new Error('Failed to get Google access token');
  const { access_token } = await tokenRes.json();
  return access_token;
}

async function importPrivateKey(pem) {
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function saveToSheet(env, data) {
  const accessToken = await getGoogleAccessToken(env);
  const spreadsheetId = env.SHEET_ID_BBW4LIFE_PENDING_PLAN;

  function formatDate() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/bbw4life-pending-plan!A:I:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [[
        formatDate(),
        data.firstName || '',
        data.lastName || '',
        data.email || '',
        data.phone || '',
        data.program || '',
        'Yes',
        data.amount || '',
        'Stripe - Paid'
      ]]
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error('Failed to save to Google Sheet: ' + errText);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      throw new Error('No data received');
    }

    const action = body.action || 'create';

    // ════════════════════════════════
    // ACTION : create — crée la session
    // ════════════════════════════════
    if (action === 'create') {
      const { program, customer, productId, productImage } = body;

      const reservationAmount = await getReservationPrice(env);

      const BASE_URL = env.BASE_URL || '';
      const returnUrl = body.returnUrl || `${BASE_URL}/`;

      const productName = program
        ? `Reservation — ${program}`
        : 'BBW4LIFE Product Reservation';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              description: 'Refundable reservation fee — deducted from your final order total.',
              images: productImage ? [productImage] : [],
            },
            unit_amount: Math.round(reservationAmount * 100),
          },
          quantity: 1,
        }],
        customer_email: customer.email || undefined,
        metadata: {
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          email: customer.email || '',
          phone: customer.phone || '',
          program: program || '',
          productId: productId || '',
          amount: String(reservationAmount),
        },
        success_url: `${returnUrl}?res_session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: returnUrl,
      });

      return jsonResponse(200, { success: true, sessionId: session.id });
    }

    // ════════════════════════════════
    // ACTION : verify — vérifie + sauvegarde
    // ════════════════════════════════
    if (action === 'verify') {
      const { sessionId } = body;
      if (!sessionId) throw new Error('Missing sessionId');

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return jsonResponse(200, { success: false, error: `Payment status: ${session.payment_status}` });
      }

      const m = session.metadata || {};
      await saveToSheet(env, {
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        phone: m.phone,
        program: m.program,
        amount: m.amount,
      });

      return jsonResponse(200, { success: true });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (err) {
    console.error('[create-reservation-stripe-session]', err.message);
    return jsonResponse(500, { success: false, error: err.message });
  }
}

export async function onRequestGet() {
  return new Response('Method Not Allowed', { status: 405 });
}

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}