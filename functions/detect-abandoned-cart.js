// functions/detect-abandoned-cart.js

const ABANDON_THRESHOLD_MINUTES = 20;

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

async function sheetsAppend(accessToken, spreadsheetId, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Sheets append failed: ${errText}`);
  }
}

async function sheetsGetMeta(accessToken, spreadsheetId) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Sheets meta failed: ${res.status}`);
  return res.json();
}

async function sheetsBatchUpdate(accessToken, spreadsheetId, requests) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Sheets batchUpdate failed: ${errText}`);
  }
  return res.json();
}

const TEMP_TAB = "Temp_Orders";
const TEMP_RANGE = `${TEMP_TAB}!A:D`;
const ABANDONED_TAB = "Abandoned_Carts";
const ABANDONED_RANGE = `${ABANDONED_TAB}!A:J`;

// ── Crée l'onglet Abandoned_Carts s'il n'existe pas, avec en-têtes ──
async function ensureAbandonedTabExists(accessToken, spreadsheetId) {
  const meta = await sheetsGetMeta(accessToken, spreadsheetId);
  const exists = meta.sheets.some(s => s.properties.title === ABANDONED_TAB);
  if (exists) return;

  await sheetsBatchUpdate(accessToken, spreadsheetId, [{
    addSheet: { properties: { title: ABANDONED_TAB } }
  }]);

  await sheetsAppend(accessToken, spreadsheetId, `${ABANDONED_TAB}!A:J`, [[
    "Order ID", "Email", "First Name", "Last Name",
    "Cart JSON", "Shipping JSON", "Promo Code",
    "Created At", "Status", "Restart Link"
  ]]);
  console.log(`[ABANDONED CART] Onglet "${ABANDONED_TAB}" créé avec en-têtes`);
}

// ── Charge settings depuis products.data.json (pour les promos) ──
async function getSettings(env) {
  try {
    const BASE_URL = env.BASE_URL || '';
    const res = await fetch(`${BASE_URL}/products.data.json`);
    if (!res.ok) throw new Error('Failed to fetch products.data.json');
    const data = await res.json();
    return data.find(p => p.type === 'settings') || {};
  } catch (err) {
    console.warn('[ABANDONED CART] Could not load products.data.json:', err.message);
    return {};
  }
}

function pickRandomPromo(settings) {
  const promos = settings.promos || [];
  if (!promos.length) return null;
  return promos[Math.floor(Math.random() * promos.length)];
}

async function notifyTelegramAbandoned(env, orderId, shipping, cart, promo) {
  try {
    const itemCount = (cart || []).reduce((sum, i) => sum + (parseInt(i.quantity) || 1), 0);
    const fullName = shipping.fullName || `${shipping.firstName || ''} ${shipping.lastName || ''}`.trim();
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text:
          `🛒 <b>Pdg Francenel, un panier vient d'être abandonné !</b>\n\n` +
          `🆔 <b>Order ID:</b> ${orderId}\n` +
          `👤 <b>Client:</b> ${fullName || 'N/A'}\n` +
          `📧 <b>Email:</b> ${shipping.email || 'N/A'}\n` +
          `📦 <b>Articles:</b> ${itemCount}\n` +
          `🎁 <b>Code promo envoyé:</b> ${promo ? `${promo.code} (${promo.percent}%)` : 'aucun disponible'}`,
        parse_mode: "HTML"
      })
    });
  } catch (e) {
    console.warn("[ABANDONED CART] Telegram notify failed:", e.message);
  }
}

async function deleteTempOrderRow(accessToken, spreadsheetId, rowIndex) {
  const sheetMeta = await sheetsGetMeta(accessToken, spreadsheetId);
  const sheetObj = sheetMeta.sheets.find(s => s.properties.title === TEMP_TAB);
  const sheetId = sheetObj ? sheetObj.properties.sheetId : 0;

  await sheetsBatchUpdate(accessToken, spreadsheetId, [{
    deleteDimension: {
      range: {
        sheetId: sheetId,
        dimension: "ROWS",
        startIndex: rowIndex,
        endIndex: rowIndex + 1
      }
    }
  }]);
}

export async function onRequestGet(context) {
  const { env } = context;
  console.log('[ABANDONED CART] 🚀 Démarrage - ' + new Date().toISOString());

  try {
    const SPREADSHEET_ID = env.SHEET_ID_BBW4LIFE_PENDING_ORDERS;
    const accessToken = await getGoogleAccessToken(env);
    await ensureAbandonedTabExists(accessToken, SPREADSHEET_ID);

    const data = await sheetsGet(accessToken, SPREADSHEET_ID, TEMP_RANGE);
    const rows = data.values || [];

    if (rows.length === 0) {
      console.log('[ABANDONED CART] Aucun panier en cours');
      return jsonResponse(200, { success: true, processed: 0 });
    }

    const now = new Date();
    const settings = await getSettings(env);

    let processed = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      const [orderId, cartJson, shippingJson, createdAt] = row;

      if (!orderId || !createdAt) continue;

      const createdDate = new Date(createdAt);
      const minutesElapsed = (now - createdDate) / (1000 * 60);

      if (minutesElapsed < ABANDON_THRESHOLD_MINUTES) continue;

      let cart = [];
      let shipping = {};
      try { cart = JSON.parse(cartJson || "[]"); } catch {}
      try { shipping = JSON.parse(shippingJson || "{}"); } catch {}

      const email = (shipping.email || '').trim();

      console.log(`[ABANDONED CART] Détecté : ${orderId} | ${minutesElapsed.toFixed(1)} min écoulées`);

      const promo = pickRandomPromo(settings);
      const restartLink = `${env.BASE_URL || ''}/checkout.html?restore=${encodeURIComponent(orderId)}`;

      // ── Sauvegarder dans Abandoned_Carts ──
      try {
        await sheetsAppend(accessToken, SPREADSHEET_ID, ABANDONED_RANGE, [[
          orderId,
          email,
          shipping.firstName || '',
          shipping.lastName || '',
          cartJson || "[]",
          shippingJson || "{}",
          promo ? promo.code : '',
          new Date().toISOString(),
          "abandoned",
          restartLink
        ]]);
      } catch (e) {
        console.error(`[ABANDONED CART] Échec sauvegarde ${orderId}:`, e.message);
        continue;
      }

      // ── Notifier Telegram ──
      await notifyTelegramAbandoned(env, orderId, shipping, cart, promo);

      // ── Envoyer l'email de relance au client ──
      if (email && email.includes('@')) {
        try {
          await fetch(`${env.BASE_URL}/send-email-auto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              trigger: 'cart_abandoned',
              email: email,
              firstName: shipping.firstName || '',
              lastName: shipping.lastName || '',
              orderId: orderId,
              items: cart,
              promoCode: promo ? promo.code : null,
              promoPercent: promo ? promo.percent : null,
              restartLink: restartLink
            })
          });
          console.log(`[ABANDONED CART] ✅ Email de relance envoyé à ${email}`);
        } catch (e) {
          console.warn(`[ABANDONED CART] Échec envoi email à ${email}:`, e.message);
        }
      }

      // ── Supprimer la ligne de Temp_Orders pour ne pas la retraiter ──
      try {
        await deleteTempOrderRow(accessToken, SPREADSHEET_ID, i);
      } catch (e) {
        console.error(`[ABANDONED CART] Échec suppression Temp_Orders ligne ${i}:`, e.message);
      }

      processed++;
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`[ABANDONED CART] ✅ FIN - Traités: ${processed}`);
    return jsonResponse(200, { success: true, processed });

  } catch (error) {
    console.error("[ABANDONED CART] ERROR:", error.message);
    return jsonResponse(500, { success: false, error: error.message });
  }
}

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json" }
  });
}