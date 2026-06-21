// verify-login.js

import { generateAccountToken } from './account-token.js';

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

// ── HANDLER ───────────────────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      throw new Error('Email et mot de passe requis');
    }

    const normalize = (str) =>
      str ? str.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim() : '';

    const userEmail    = normalize(email).toLowerCase();
    const userPassword = normalize(password).toLowerCase();

    const token         = await getAccessToken(env);
    const spreadsheetId = env.SHEET_ID_BBW4LIFE_ACCOUNTS;

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('bbw4life-accounts!A:Z')}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`Sheets GET failed: ${await res.text()}`);

    const data = await res.json();
    const rows = data.values || [];

    if (!rows || rows.length === 0) throw new Error('Impossible de lire le Google Sheet');

    const userRow = rows.find((row) => {
      const sheetEmail    = (row[2] || '').toLowerCase();
      const sheetPassword = (row[4] || '').trim().toLowerCase();
      return sheetEmail === userEmail && sheetPassword === userPassword;
    });

    if (!userRow) {
      console.log('❌ Aucun utilisateur trouvé avec cet email/mot de passe');
      return new Response(
        JSON.stringify({ success: false, error: 'Email ou mot de passe incorrect' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = {
      lastName:     userRow[0]  || '',
      firstName:    userRow[1]  || '',
      email:        userRow[2]  || '',
      phone:        userRow[3]  || '',
      addressLine1: userRow[9]  || '',
      line2:        userRow[10] || '',
      city:         userRow[11] || '',
      state:        userRow[12] || '',
      zip:          userRow[13] || ''
    };

    // ── Génère un token lié à cet email pour sécuriser les futures requêtes ──
    const accountToken = await generateAccountToken(env, user.email);

    return new Response(
      JSON.stringify({ success: true, user, token: accountToken }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('VERIFY LOGIN ERROR:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function onRequestOptions() {
  return new Response('', { status: 200 });
}