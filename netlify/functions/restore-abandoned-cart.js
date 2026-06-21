// functions/restore-abandoned-cart.js

// ── Auth Google via JWT signé avec Web Crypto ──
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

async function sheetsGet(accessToken, spreadsheetId, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Sheets get failed: ${res.status}`);
  return res.json();
}

const ABANDONED_TAB = "Abandoned_Carts";
const ABANDONED_RANGE = `${ABANDONED_TAB}!A:J`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

export async function onRequestOptions() {
  return new Response('', { status: 200, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');

    if (!orderId) {
      return new Response(JSON.stringify({ success: false, error: "Missing orderId" }), {
        status: 400,
        headers: CORS_HEADERS
      });
    }

    const SPREADSHEET_ID = env.SHEET_ID_BBW4LIFE_PENDING_ORDERS;
    const accessToken = await getGoogleAccessToken(env);
    const data = await sheetsGet(accessToken, SPREADSHEET_ID, ABANDONED_RANGE);

    const rows = data.values || [];
    let match = null;
    for (let i = rows.length - 1; i >= 1; i--) { // skip header (row 0)
      if (rows[i][0] === orderId) { match = rows[i]; break; }
    }

    if (!match) {
      return new Response(JSON.stringify({ success: false, error: "Order not found" }), {
        status: 404,
        headers: CORS_HEADERS
      });
    }

    const [, email, firstName, lastName, cartJson, shippingJson, promoCode] = match;

    let cart = [];
    let shipping = {};
    try { cart = JSON.parse(cartJson || "[]"); } catch {}
    try { shipping = JSON.parse(shippingJson || "{}"); } catch {}

    return new Response(JSON.stringify({
      success: true,
      cart,
      shipping,
      promoCode: promoCode || null
    }), {
      status: 200,
      headers: CORS_HEADERS
    });

  } catch (error) {
    console.error("[RESTORE ABANDONED CART] ERROR:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
}