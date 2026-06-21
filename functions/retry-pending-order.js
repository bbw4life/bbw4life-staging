// functions/retry-pending-order.js - VERSION AMÉLIORÉE (traite un par un sans se bloquer)

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

async function sheetsUpdate(accessToken, spreadsheetId, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Sheets update failed: ${errText}`);
  }
}

// ── Lit le switch global Yes/No depuis l'onglet Settings ──
async function getAutoFulfillMode(accessToken, spreadsheetId) {
  try {
    const data = await sheetsGet(accessToken, spreadsheetId, "Settings!A1");
    const value = (data.values?.[0]?.[0] || "yes").trim().toLowerCase();
    return value === "no" ? "no" : "yes";
  } catch (e) {
    console.log('[RETRY PENDING] Onglet Settings introuvable, mode par défaut: yes');
    return "yes";
  }
}

export async function onRequestGet(context) {
  const { env } = context;
  console.log('[RETRY PENDING] 🚀 Démarrage - ' + new Date().toISOString());

  try {
    const accessToken = await getGoogleAccessToken(env);
    const spreadsheetId = env.SHEET_ID_BBW4LIFE_PENDING_ORDERS;

    const rangesToTry = ["bbw4life-pending-orders!A:R"];
    let rows = [];
    let activeTab = "";
    for (const range of rangesToTry) {
      try {
        const data = await sheetsGet(accessToken, spreadsheetId, range);
        rows = data.values || [];
        if (rows.length > 1) {
          activeTab = range.split('!')[0];
          console.log(`[RETRY PENDING] ✅ Onglet détecté : ${activeTab} (${rows.length} lignes)`);
          break;
        }
      } catch (e) {}
    }

    if (rows.length <= 1) {
      console.log('[RETRY PENDING] Aucune commande en attente');
      return jsonResponse(200, { success: true, processed: 0 });
    }

    const autoMode = await getAutoFulfillMode(accessToken, spreadsheetId);
    console.log(`[RETRY PENDING] Mode auto-fulfill : ${autoMode.toUpperCase()}`);

    const dataRows = rows.slice(1);
    const groups = {};
    dataRows.forEach((row, index) => {
      const paymentId = row[2] || "";
      const status = (row[14] || "").toLowerCase();

      const shouldProcess = autoMode === "yes"
        ? (status === "pending" || status === "failed")
        : (status === "approved");

      if (shouldProcess) {
        if (!groups[paymentId]) groups[paymentId] = [];
        groups[paymentId].push({ row, lineNumber: index + 2 });
      }
    });

    const paymentIds = Object.keys(groups);
    if (paymentIds.length === 0) {
      console.log('[RETRY PENDING] Aucune commande à traiter');
      return jsonResponse(200, { success: true, processed: 0 });
    }

    console.log(`[RETRY PENDING] ${paymentIds.length} commande(s) à traiter (une par une)`);

    let processed = 0;
    let successCount = 0;

    for (const paymentId of paymentIds) {
      const group = groups[paymentId];
      processed++;

      const firstRow = group[0].row;
      const shipping = {
        fullName: firstRow[3] || "",
        email: firstRow[4] || "",
        phone: firstRow[5] || "",
        country: firstRow[6] || "Canada",
        state: firstRow[7] || "",
        city: firstRow[8] || "",
        postalCode: firstRow[9] || "",
        address: firstRow[10] || "",
        shipping_method: firstRow[17] || "Standard Shipping",
      };
      let countryCode = 'CA';
      try {
        const countryRes = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(shipping.country)}?fullText=true&fields=cca2`);
        if (countryRes.ok) countryCode = (await countryRes.json())[0]?.cca2 || 'CA';
      } catch {}
      shipping.countryCode = countryCode;
      shipping.provinceCode = shipping.state.substring(0, 2).toUpperCase() || '';

      const cartMap = {};
      group.forEach(({ row }) => {
        const variantsid = row[12] || "";
        const quantity = parseInt(row[13]) || 1;
        if (variantsid) cartMap[variantsid] = (cartMap[variantsid] || 0) + quantity;
      });
      const cart = Object.keys(cartMap).map(v => ({ variantsid: v, quantity: cartMap[v] }));

      try {
        const createRes = await fetch(`${env.BASE_URL}/create-eprolo-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cart, shipping })
        });
        const createData = await createRes.json();

        if (createData.success) {
          for (const { lineNumber } of group) {
            await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-pending-orders!O${lineNumber}`, [["successful"]]);
          }
          successCount++;
          console.log(` ✅ SUCCÈS pour ${paymentId}`);
        } else {
          throw new Error(createData.error || "Échec Eprolo");
        }
      } catch (err) {
        console.error(` ❌ ÉCHEC pour ${paymentId}: ${err.message}`);
        for (const { lineNumber } of group) {
          await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-pending-orders!O${lineNumber}`, [["failed"]]);
        }
      }

      await new Promise(r => setTimeout(r, 1200));
    }

    console.log(`[RETRY PENDING] ✅ FIN - Traités: ${processed} | Réussis: ${successCount}`);
    return jsonResponse(200, { success: true, processed, fulfilled: successCount });
  } catch (error) {
    console.error("RETRY ERROR:", error.message);
    return jsonResponse(500, { success: false, error: error.message });
  }
}

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json" }
  });
}