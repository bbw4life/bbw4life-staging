// functions/create-reservation-paypal.js

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

async function getPaypalToken(env, PAYPAL_BASE) {
  const auth = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_SECRET}`);

  const tokenRes = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!tokenRes.ok) throw new Error('Failed to get PayPal token');
  const { access_token } = await tokenRes.json();
  return access_token;
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
        'PayPal - Paid'
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
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      throw new Error('No data received');
    }

    const action = body.action || 'create';

    const PAYPAL_BASE = env.PAYPAL_ENV === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    // ════════════════════════════════
    // ACTION : create — crée l'ordre
    // ════════════════════════════════
    if (action === 'create') {
      const { program, customer } = body;

      const serverAmount = await getReservationPrice(env);

      const BASE_URL = env.BASE_URL || '';
      const returnUrl = body.returnUrl || `${BASE_URL}/`;
      const access_token = await getPaypalToken(env, PAYPAL_BASE);

      const orderBody = {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: serverAmount.toFixed(2),
          },
          description: `CurvaFit Reservation — ${program || 'Program'}`,
          custom_id: `${customer.email || ''}|${customer.firstName || ''}|${customer.lastName || ''}|${customer.phone || ''}|${program || ''}|${serverAmount}`,
        }],
        application_context: {
          return_url: `${returnUrl}?res_paypal=1`,
          cancel_url: returnUrl,
          brand_name: 'CurvaFit',
          user_action: 'PAY_NOW',
        },
      };

      const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderBody),
      });

      if (!orderRes.ok) {
        const errText = await orderRes.text();
        throw new Error(errText || 'PayPal order creation failed');
      }

      const orderData = await orderRes.json();
      const approvalLink = orderData.links.find(l => l.rel === 'approve');
      if (!approvalLink) throw new Error('No PayPal approval URL found');

      return jsonResponse(200, { success: true, approvalUrl: approvalLink.href });
    }

    // ════════════════════════════════
    // ACTION : capture — capture + sauvegarde
    // ════════════════════════════════
    if (action === 'capture') {
      const { orderID, clientData, program, amount } = body;
      if (!orderID) throw new Error('Missing orderID');

      const access_token = await getPaypalToken(env, PAYPAL_BASE);

      const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const captureData = await captureRes.json();

      if (captureData.status !== 'COMPLETED') {
        throw new Error(`PayPal capture failed: ${captureData.status}`);
      }

      let firstName = clientData?.firstName || '';
      let lastName = clientData?.lastName || '';
      let email = clientData?.email || '';
      let phone = clientData?.phone || '';
      let prog = program || '';
      let amt = amount || '';

      if (!email) {
        const unit = captureData.purchase_units?.[0] || {};
        const customId = unit.custom_id || '';
        const parts = customId.split('|');
        email = parts[0] || '';
        firstName = parts[1] || '';
        lastName = parts[2] || '';
        phone = parts[3] || '';
        prog = parts[4] || '';
        amt = parts[5] || '';
      }

      await saveToSheet(env, { firstName, lastName, email, phone, program: prog, amount: amt });

      return jsonResponse(200, { success: true });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (err) {
    console.error('[create-reservation-paypal]', err.message);
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