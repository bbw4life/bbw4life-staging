// functions/save-pending-order.js
import { notifyTelegram } from './notify-telegram.js';

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

async function sheetsAppend(accessToken, spreadsheetId, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });
  if (!res.ok) throw new Error(`Sheets append failed: ${await res.text()}`);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  console.log('[SAVE PENDING] Function invoked');

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return response(400, { success: false, error: "No data received" });
    }

    let { shipping, item, payment_provider, payment_id, status = "pending_stock" } = body;
    if (!payment_id) throw new Error("Missing payment_id");

    const normalize = (str) => str ? str.normalize("NFKD").replace(/[\u0300-\u036f]/g, "") : "";
    const fullName = shipping.fullName || `${shipping.firstName || ''} ${shipping.lastName || ''}`.trim();
    shipping.fullName = normalize(fullName);
    shipping.email = normalize(shipping.email);
    shipping.phone = normalize(shipping.phone);
    shipping.country = normalize(shipping.country || "United States");
    shipping.state = normalize(shipping.state);
    shipping.city = normalize(shipping.city);
    shipping.postalCode = normalize(shipping.postalCode);
    shipping.address = normalize(shipping.address);

    const spreadsheetId = env.SHEET_ID_BBW4LIFE_PENDING_ORDERS;
    const accessToken = await getGoogleAccessToken(env);
    const now = new Date().toISOString();
    const internalOrderId = `PENDING_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const values = [[
      internalOrderId,
      payment_provider,
      payment_id,
      shipping.fullName || "",
      shipping.email || "",
      shipping.phone || "",
      shipping.country || "United States",
      shipping.state || "",
      shipping.city || "",
      shipping.postalCode || "",
      shipping.address || "",
      "",
      item.variantsid || "",
      item.quantity || 1,
      status,
      "paid",
      now,
      shipping.shipping_method || "Standard Shipping"
    ]];

    const rangesToTry = ["bbw4life-pending-orders!A:R"];
    let success = false;
    for (const range of rangesToTry) {
      try {
        await sheetsAppend(accessToken, spreadsheetId, range, values);
        console.log(`[SAVE PENDING] ✅ SAUVEGARDE OK dans ${range}`);
        await notifyTelegram(env,
          `🛍️ <b>Pdg Francenel, une nouvelle commande vient de passer!</b>\n\n` +
          `🆔 <b>Order ID:</b> ${internalOrderId}\n` +
          `👤 <b>Client:</b> ${shipping.fullName}\n` +
          `📧 <b>Email:</b> ${shipping.email}\n` +
          `💳 <b>Paiement:</b> ${payment_provider}\n` +
          `📦 <b>Quantité:</b> ${item.quantity || 1}\n` +
          `🌍 <b>Pays:</b> ${shipping.country}`
        );
        success = true;
        break;
      } catch (err) {
        console.log(`[SAVE PENDING] Échec avec ${range}`);
      }
    }

    if (!success) throw new Error("Aucun onglet n'a fonctionné");
    return response(200, { success: true });
  } catch (error) {
    console.error("SAVE PENDING ERROR:", error.message);
    return response(500, { success: false, error: error.message });
  }
}

export async function onRequestGet() {
  return new Response('Method Not Allowed', { status: 405 });
}

function response(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json" }
  });
}