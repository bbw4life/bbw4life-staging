// functions/daily-report.js
import { notifyTelegram } from './notify-telegram.js';

function getTodayDate() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
}

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

async function getSheetValues(accessToken, spreadsheetId, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`Sheet read failed: ${res.status}`);
  const data = await res.json();
  return data.values || [];
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Sécurité — clé secrète pour éviter les appels non autorisés
  const secret = request.headers.get('x-report-secret') || url.searchParams.get('secret');
  if (secret !== env.REPORT_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const accessToken = await getGoogleAccessToken(env);
    const today = getTodayDate();

    // ── 1. Commandes du jour ──
    let ordersToday = 0;
    try {
      const orderRows = (await getSheetValues(accessToken, env.SHEET_ID_BBW4LIFE_PENDING_ORDERS, 'bbw4life-pending-orders!A:R')).slice(1);
      orderRows.forEach(row => {
        if (row[16] && row[16].toString().startsWith(new Date().toISOString().slice(0, 10))) {
          ordersToday++;
        }
      });
    } catch (e) { console.warn('Orders read failed:', e.message); }

    // ── 2. Nouveaux clients du jour ──
    let newClients = 0;
    try {
      const accountRows = (await getSheetValues(accessToken, env.SHEET_ID_BBW4LIFE_ACCOUNTS, 'bbw4life-accounts!A:Z')).slice(1);
      accountRows.forEach(row => {
        if (row[0] && row[0].toString() === today) newClients++;
      });
    } catch (e) { console.warn('Accounts read failed:', e.message); }

    // ── 3. Messages contact du jour ──
    let messagesTODAY = 0;
    try {
      const messageRows = (await getSheetValues(accessToken, env.SHEET_ID_BBW4LIFE_ACCOUNTS, 'bbw4life-contact-messages!A:G')).slice(1);
      messageRows.forEach(row => {
        if (row[6] && row[6].toString() === today) messagesTODAY++;
      });
    } catch (e) { console.warn('Messages read failed:', e.message); }

    // ── 4. Stories du jour ──
    let storiesToday = 0;
    try {
      const storyRows = (await getSheetValues(accessToken, env.SHEET_ID_BBW4LIFE_STORIES, 'bbw4life-stories!A:Q')).slice(1);
      storyRows.forEach(row => {
        if (row[16] && row[16].toString() === today) storiesToday++;
      });
    } catch (e) { console.warn('Stories read failed:', e.message); }

    // ── 5. Produits personnalisés du jour ──
    let customToday = 0;
    try {
      const customRows = (await getSheetValues(accessToken, env.SHEET_ID_BBW4LIFE_PLAN_REQUEST, 'bbw4life-product-personalized!A:Q')).slice(1);
      customRows.forEach(row => {
        if (row[0] && row[0].toString() === today) customToday++;
      });
    } catch (e) { console.warn('Custom products read failed:', e.message); }

    // ── 6. Plan requests du jour ──
    let plansToday = 0;
    try {
      const planRows = (await getSheetValues(accessToken, env.SHEET_ID_BBW4LIFE_PLAN_REQUEST, 'bbw4life-plan-request!A:K')).slice(1);
      planRows.forEach(row => {
        if (row[0] && row[0].toString().startsWith(today)) plansToday++;
      });
    } catch (e) { console.warn('Plans read failed:', e.message); }

    // ── Envoyer le rapport ──
    const rapport =
      `📊 <b>Rapport Quotidien BBW4LIFE</b>\n` +
      `📅 <b>${today}</b>\n\n` +
      `🛍️ <b>Commandes:</b> ${ordersToday}\n` +
      `👥 <b>Nouveaux clients:</b> ${newClients}\n` +
      `💌 <b>Messages contact:</b> ${messagesTODAY}\n` +
      `📖 <b>Stories soumises:</b> ${storiesToday}\n` +
      `🎨 <b>Produits personnalisés:</b> ${customToday}\n` +
      `⏳ <b>Plan requests:</b> ${plansToday}\n\n` +
      `👑 <i>Beauty Has No Sizes — BBW4LIFE</i>`;

    await notifyTelegram(env, rapport);

    // ── Lancer le tracking checker en même temps ──
    try {
      await fetch(`${env.BASE_URL}/send-email-auto?action=tracking&secret=${env.REPORT_SECRET}`, {
        method: 'GET'
      });
      console.log('[DailyReport] Tracking checker triggered');
    } catch (e) {
      console.warn('[DailyReport] Tracking trigger failed:', e.message);
    }

    return new Response(JSON.stringify({ success: true, today }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('[DailyReport] Error:', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}