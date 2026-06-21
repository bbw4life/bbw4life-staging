// temp-orders-store.js

const SHEET_TAB       = "Temp_Orders";
const SHEET_RANGE     = `${SHEET_TAB}!A:D`;
const PROCESSED_TAB   = "Processed_Orders";
const PROCESSED_RANGE = `${PROCESSED_TAB}!A:B`;

// ── JWT / Google Auth (Web Crypto RSASSA-PKCS1-v1_5) ──────────────────
function base64urlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlEncodeUint8(bytes) {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken(env) {
  const privateKeyPem = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const pemBody = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const now     = Math.floor(Date.now() / 1000);
  const header  = base64urlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64urlEncode(JSON.stringify({
    iss:   env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600
  }));

  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${base64urlEncodeUint8(new Uint8Array(signature))}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Failed to get Google access token');
  return tokenData.access_token;
}

// ── Helpers fetch Sheets ───────────────────────────────────────────────
async function sheetsGet(token, spreadsheetId, range) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Sheets GET failed: ${await res.text()}`);
  return res.json();
}

async function sheetsAppend(token, spreadsheetId, range, values) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ values })
    }
  );
  if (!res.ok) throw new Error(`Sheets APPEND failed: ${await res.text()}`);
  return res.json();
}

async function sheetsBatchUpdate(token, spreadsheetId, requests) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ requests })
    }
  );
  if (!res.ok) throw new Error(`Sheets batchUpdate failed: ${await res.text()}`);
  return res.json();
}

async function sheetsGetMeta(token, spreadsheetId) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Sheets getMeta failed: ${await res.text()}`);
  return res.json();
}

// ── Crée l'onglet Processed_Orders s'il n'existe pas encore ──
async function ensureProcessedTabExists(token, spreadsheetId) {
  const meta   = await sheetsGetMeta(token, spreadsheetId);
  const exists = meta.sheets.some(s => s.properties.title === PROCESSED_TAB);
  if (exists) return;

  await sheetsBatchUpdate(token, spreadsheetId, [{
    addSheet: { properties: { title: PROCESSED_TAB } }
  }]);
  console.log(`[TEMP ORDERS] Onglet "${PROCESSED_TAB}" créé`);
}

// ── Écrit cart + shipping dans le sheet temporaire, identifié par orderId ──
export async function saveTempOrder(env, orderId, cart, shipping) {
  const token         = await getAccessToken(env);
  const spreadsheetId = env.SHEET_ID_BBW4LIFE_PENDING_ORDERS;
  const now           = new Date().toISOString();

  await sheetsAppend(token, spreadsheetId, SHEET_RANGE, [[
    orderId,
    JSON.stringify(cart),
    JSON.stringify(shipping),
    now
  ]]);
}

// ── Récupère cart + shipping par orderId, puis supprime immédiatement la ligne ──
export async function getAndDeleteTempOrder(env, orderId) {
  const token         = await getAccessToken(env);
  const spreadsheetId = env.SHEET_ID_BBW4LIFE_PENDING_ORDERS;

  const data = await sheetsGet(token, spreadsheetId, SHEET_RANGE);
  const rows = data.values || [];
  const rowIndex = rows.findIndex(row => row[0] === orderId);

  if (rowIndex === -1) return null;

  const [, cartJson, shippingJson] = rows[rowIndex];
  const cart     = JSON.parse(cartJson     || '[]');
  const shipping = JSON.parse(shippingJson || '{}');

  // ── Nettoyage immédiat : suppression de la ligne ──
  try {
    const meta    = await sheetsGetMeta(token, spreadsheetId);
    const sheetObj = meta.sheets.find(s => s.properties.title === SHEET_TAB);
    const sheetId  = sheetObj ? sheetObj.properties.sheetId : 0;

    await sheetsBatchUpdate(token, spreadsheetId, [{
      deleteDimension: {
        range: {
          sheetId,
          dimension:  'ROWS',
          startIndex: rowIndex,
          endIndex:   rowIndex + 1
        }
      }
    }]);
  } catch (e) {
    console.error('[TEMP ORDERS] Échec suppression ligne:', e.message);
  }

  return { cart, shipping };
}

// ── Vérifie si paymentId a déjà été traité (lecture fiable, onglet dédié) ──
export async function isOrderAlreadyProcessed(env, paymentId) {
  const token         = await getAccessToken(env);
  const spreadsheetId = env.SHEET_ID_BBW4LIFE_PENDING_ORDERS;

  try {
    await ensureProcessedTabExists(token, spreadsheetId);

    const data = await sheetsGet(token, spreadsheetId, PROCESSED_RANGE);
    const rows = data.values || [];
    return rows.some(row => row[0] === paymentId);
  } catch (e) {
    console.error('[TEMP ORDERS] Erreur vérification doublon:', e.message);
    // En cas d'erreur de lecture, on ne bloque pas le paiement légitime,
    // mais on log clairement pour investigation.
    return false;
  }
}

// ── Marque paymentId comme traité (écriture fiable, onglet dédié) ──
export async function markOrderAsProcessed(env, paymentId) {
  const token         = await getAccessToken(env);
  const spreadsheetId = env.SHEET_ID_BBW4LIFE_PENDING_ORDERS;

  try {
    await ensureProcessedTabExists(token, spreadsheetId);

    await sheetsAppend(token, spreadsheetId, PROCESSED_RANGE, [[
      paymentId,
      new Date().toISOString()
    ]]);
    return true;
  } catch (e) {
    console.error('[TEMP ORDERS] Échec marquage doublon:', e.message);
    return false;
  }
}