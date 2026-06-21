/* ================================================================
   BBW4LIFE — VALIDATE PROMO CODE (Single-Use Affiliate Code)
   Cloudflare Pages Function : /validate-promo-code
================================================================ */

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
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
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

async function sheetsUpdate(token, spreadsheetId, range, values) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method:  'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ values })
    }
  );
  if (!res.ok) throw new Error(`Sheets UPDATE failed: ${await res.text()}`);
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

async function sheetsGetMeta(token, spreadsheetId) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Sheets getMeta failed: ${await res.text()}`);
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

// ── Crée l'onglet PromoCodes s'il n'existe pas encore ─────────────────
async function getOrCreatePromoSheet(token, spreadsheetId) {
  const meta     = await sheetsGetMeta(token, spreadsheetId);
  const existing = meta.sheets.find(s => s.properties.title === 'PromoCodes');

  if (!existing) {
    await sheetsBatchUpdate(token, spreadsheetId, [{
      addSheet: { properties: { title: 'PromoCodes' } }
    }]);
    await sheetsUpdate(token, spreadsheetId, 'PromoCodes!A1:F1', [
      ['code', 'username', 'discount_percent', 'status', 'created_at', 'used_at']
    ]);
  }
}

// ── Trouve la ligne du code (insensible à la casse) ───────────────────
async function findCodeRow(token, spreadsheetId, code) {
  const data = await sheetsGet(token, spreadsheetId, 'PromoCodes!A:F');
  const rows  = data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].trim().toUpperCase() === code.trim().toUpperCase()) {
      return { rowIndex: i + 1, row: rows[i] };
    }
  }
  return null;
}

// ── Enregistre un nouveau code ─────────────────────────────────────────
async function registerCode(token, spreadsheetId, code, username, discountPct) {
  await getOrCreatePromoSheet(token, spreadsheetId);

  const existing = await findCodeRow(token, spreadsheetId, code);
  if (existing) return;

  await sheetsAppend(token, spreadsheetId, 'PromoCodes!A:F', [[
    code.toUpperCase(),
    username    || '',
    discountPct || '',
    'active',
    new Date().toISOString(),
    ''
  ]]);
}

// ── Marquer used immédiatement dès le Apply ───────────────────────────
async function validateCode(token, spreadsheetId, code) {
  await getOrCreatePromoSheet(token, spreadsheetId);

  const found = await findCodeRow(token, spreadsheetId, code);
  if (!found) {
    return { valid: false, reason: 'CODE_NOT_FOUND' };
  }

  const { rowIndex, row } = found;
  const status      = (row[3] || '').trim().toLowerCase();
  const discountPct = parseFloat(row[2]) || 0;
  const username    = row[1] || '';

  if (status === 'used') {
    return { valid: false, reason: 'CODE_ALREADY_USED', discountPct, username };
  }

  if (status !== 'active') {
    return { valid: false, reason: 'CODE_INACTIVE', discountPct, username };
  }

  // Marquer used immédiatement dès la validation
  await sheetsUpdate(token, spreadsheetId, `PromoCodes!D${rowIndex}:F${rowIndex}`, [[
    'used',
    row[4] || '',
    new Date().toLocaleString('fr-FR', { timeZone: 'America/New_York' })
  ]]);

  return { valid: true, discountPct, username };
}

// ── Response helper ───────────────────────────────────────────────────
function res(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status:  statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ── HANDLER ───────────────────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const text = await request.text();
    if (!text) return res(400, { success: false, error: 'No body' });

    const { action, code, username, discount_percent } = JSON.parse(text);
    const spreadsheetId = env.SHEET_ID_BBW4LIFE_ACCOUNTS;
    const token         = await getAccessToken(env);

    if (action === 'register') {
      if (!code || !username) {
        return res(400, { success: false, error: 'Missing code or username' });
      }
      await registerCode(token, spreadsheetId, code, username, discount_percent || 0);
      return res(200, { success: true });
    }

    if (action === 'validate') {
      if (!code) {
        return res(400, { success: false, error: 'Missing code' });
      }
      const result = await validateCode(token, spreadsheetId, code);
      return res(200, { success: true, ...result });
    }

    return res(400, { success: false, error: 'Unknown action' });

  } catch (err) {
    console.error('[validate-promo-code]', err.message);
    return res(500, { success: false, error: err.message });
  }
}

export async function onRequestOptions() {
  return new Response('', { status: 200, headers: { 'Content-Type': 'application/json' } });
}