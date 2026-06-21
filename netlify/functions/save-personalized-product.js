import { notifyTelegram } from './notify-telegram.js';

async function getGoogleAccessToken(env) {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyPem = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: email, scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now,
  };
  const base64url = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unsigned = `${base64url(header)}.${base64url(claimSet)}`;
  const key = await importPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, new TextEncoder().encode(unsigned));
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const jwt = `${unsigned}.${sigBase64}`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!tokenRes.ok) throw new Error('Failed to get Google access token');
  const { access_token } = await tokenRes.json();
  return access_token;
}

async function importPrivateKey(pem) {
  const pemContents = pem.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', binaryDer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

async function sheetsGet(accessToken, spreadsheetId, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Sheets get failed: ${res.status}`);
  return res.json();
}

async function sheetsAppend(accessToken, spreadsheetId, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });
  if (!res.ok) throw new Error(`Sheets append failed: ${await res.text()}`);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const spreadsheetId = env.SHEET_ID_BBW4LIFE_PLAN_REQUEST;
    const SHEET_NAME = "bbw4life-product-personalized";
    const accessToken = await getGoogleAccessToken(env);

    function formatDate() {
      const d = new Date();
      return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear().toString().slice(-2)}`;
    }
    function formatTime() {
      const d = new Date();
      return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    }

    if (body.action === 'get_votes') {
      const data = await sheetsGet(accessToken, spreadsheetId, `${SHEET_NAME}!A:Q`);
      const rows = data.values || [];
      const result = {};
      rows.forEach(row => {
        if (row[13] === 'vote' && row[14] && row[15]) {
          const group = row[14]; const val = row[15];
          if (!result[group]) result[group] = {};
          result[group][val] = (result[group][val] || 0) + 1;
        }
      });
      return jsonResponse(200, { success: true, votes: result });
    }

    if (body.action === 'vote') {
      const { group = "", val: voteVal = "" } = body;
      if (!group || !voteVal) throw new Error("group et val requis");

      await sheetsAppend(accessToken, spreadsheetId, `${SHEET_NAME}!A:Q`, [[
        formatDate(), formatTime(), "", "", "", "", "", "", "", "", "", "", "",
        "vote", group, voteVal, new Date().toISOString()
      ]]);

      const data = await sheetsGet(accessToken, spreadsheetId, `${SHEET_NAME}!A:Q`);
      const rows = data.values || [];
      const counts = {};
      rows.forEach(row => {
        if (row[13] === 'vote' && row[14] === group && row[15]) {
          counts[row[15]] = (counts[row[15]] || 0) + 1;
        }
      });
      return jsonResponse(200, { success: true, counts });
    }

    if (body.action === 'waitlist') {
      const waitlistEmail = (body.email || "").trim().toLowerCase();
      if (!waitlistEmail || !waitlistEmail.includes('@')) throw new Error("Email invalide");

      await sheetsAppend(accessToken, spreadsheetId, `${SHEET_NAME}!A:Q`, [[
        formatDate(), formatTime(), "", "", waitlistEmail, "", "", "", "", "", "", "", "",
        "waitlist", "", "", new Date().toISOString()
      ]]);
      return jsonResponse(200, { success: true });
    }

    if (body.action === 'suggestion') {
      const suggestStyle = (body.suggest_style || '').trim();
      const suggestColor = (body.suggest_color || '').trim();
      const suggestNote = (body.suggest_note || '').trim();
      if (!suggestStyle && !suggestColor) throw new Error("Au moins un champ requis");

      await sheetsAppend(accessToken, spreadsheetId, `${SHEET_NAME}!A:Q`, [[
        formatDate(), formatTime(), "", "", "", "", "", "", suggestStyle, suggestNote, "", "", "",
        "suggestion", suggestStyle, suggestColor, new Date().toISOString()
      ]]);
      return jsonResponse(200, { success: true });
    }

    const {
      firstname = "", lastname = "", email = "", phone = "", size = "", color = "",
      product_title = "", product_desc = "", image1_base64 = "", image2_base64 = ""
    } = body;

    if (!firstname || !lastname || !email || !product_title) {
      throw new Error("Données manquantes (firstname, lastname, email, product_title requis)");
    }

    await sheetsAppend(accessToken, spreadsheetId, `${SHEET_NAME}!A:Q`, [[
      formatDate(), formatTime(), firstname.trim(), lastname.trim(), email.trim().toLowerCase(),
      phone.trim(), size.trim(), color.trim(), product_title.trim(), product_desc.trim(),
      image1_base64 || "", image2_base64 || "", "New", "dream_product", "", "", new Date().toISOString()
    ]]);

    await notifyTelegram(env,
      `🎨 <b>Pdg Francenel, un client vient de demander un produit personnalisé!</b>\n\n` +
      `👤 <b>Nom:</b> ${firstname} ${lastname}\n` +
      `📧 <b>Email:</b> ${email}\n` +
      `👗 <b>Produit demandé:</b> ${product_title}`
    );
    return jsonResponse(200, { success: true });

  } catch (error) {
    console.error("PERSONALIZED PRODUCT ERROR:", error.message);
    return jsonResponse(500, { success: false, error: error.message });
  }
}

export async function onRequestGet() {
  return new Response('Method Not Allowed', { status: 405 });
}

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
}