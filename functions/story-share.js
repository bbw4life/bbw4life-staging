import { notifyTelegram } from './notify-telegram.js';

const SHEET_NAME = 'bbw4life-stories';

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

  const now = Math.floor(Date.now() / 1000);
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

// ── Helpers ───────────────────────────────────────────────────────────
function formatDate() {
  const d = new Date();
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear().toString().slice(-2)}`;
}

// ── SAVE ──────────────────────────────────────────────────────────────
async function saveStory(body, env) {
  const {
    firstName, age, email, country,
    bodyPressureDuration, bbwHelped, discoveredWhen,
    selfChange, wordToday, toldBefore,
    story, mentalQuote, rating, photo, anonymous
  } = body;

  if (!firstName || !email || !bodyPressureDuration || !bbwHelped || !story || !selfChange) {
    throw new Error('Required fields missing');
  }

  const values = [[
    firstName.trim(),
    age                  || '',
    email.trim().toLowerCase(),
    country              || '',
    bodyPressureDuration || '',
    bbwHelped            || '',
    discoveredWhen       || '',
    selfChange           || '',
    wordToday            || '',
    toldBefore           || '',
    story.trim(),
    mentalQuote          || '',
    rating               || '5',
    photo                || '',
    anonymous === true || anonymous === 'true' ? 'yes' : 'no',
    'pending',
    formatDate()
  ]];

  const token = await getAccessToken(env);
  const spreadsheetId = env.SHEET_ID_BBW4LIFE_STORIES;
  const range = encodeURIComponent(`${SHEET_NAME}!A:Q`);

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets append failed: ${err}`);
  }

  await notifyTelegram(
    env,
    `💕 <b>Waww Pdg Francenel, une personne vient de partager son story, c'est en attente!</b>\n\n` +
    `👤 <b>Prénom:</b> ${firstName}\n` +
    `📧 <b>Email:</b> ${email}\n` +
    `🌍 <b>Pays:</b> ${country || 'N/A'}\n` +
    `⭐ <b>Note:</b> ${rating || '5'}/5`
  );

  return { success: true };
}

// ── FETCH approved stories ─────────────────────────────────────────────
async function fetchStories(env) {
  const token = await getAccessToken(env);
  const spreadsheetId = env.SHEET_ID_BBW4LIFE_ACCOUNTS;
  const range = encodeURIComponent(`${SHEET_NAME}!A:Q`);

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets get failed: ${err}`);
  }

  const data = await res.json();
  const rows = data.values || [];

  const stories = rows
    .slice(1)
    .filter(r => r[15] && r[15].toString().toLowerCase() === 'approved')
    .map(r => ({
      firstName:            r[14] && r[14].toString().toLowerCase() === 'yes' ? 'Anonymous' : (r[0] || 'Anonymous'),
      age:                  r[1]  || '',
      country:              r[3]  || '',
      bodyPressureDuration: r[4]  || '',
      bbwHelped:            r[5]  || '',
      discoveredWhen:       r[6]  || '',
      selfChange:           r[7]  || '',
      wordToday:            r[8]  || '',
      toldBefore:           r[9]  || '',
      story:                r[10] || '',
      mentalQuote:          r[11] || '',
      rating:               r[12] || '5',
      photo:                r[13] || '',
      date:                 r[16] || ''
    }));

  return { success: true, stories };
}

// ── HANDLER ───────────────────────────────────────────────────────────
const headers = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export async function onRequestOptions() {
  return new Response('', { status: 200, headers });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const data = await saveStory(body, env);
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (err) {
    console.error('STORY-SHARE ERROR:', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers });
  }
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const data = await fetchStories(env);
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (err) {
    console.error('STORY-SHARE ERROR:', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers });
  }
}