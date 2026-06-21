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

async function sheetsUpdate(accessToken, spreadsheetId, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: 'PUT', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });
  if (!res.ok) throw new Error(`Sheets update failed: ${await res.text()}`);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { action, fullName, email, title, rating, text, productId } = body;

    const reviewsSpreadsheetId = env.SHEET_ID_BBW4LIFE_CUSTOMERS_REVIEWS;
    const accountsSpreadsheetId = env.SHEET_ID_BBW4LIFE_ACCOUNTS;
    const accessToken = await getGoogleAccessToken(env);

    function formatReviewDate() {
      const d = new Date();
      const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d.getFullYear()}-${monthNames[d.getMonth()]}-${d.getDate().toString().padStart(2, '0')}`;
    }
    const normalize = (str) => str ? str.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";

    if (action === 'save-review') {
      if (!fullName || !email || !title || !rating || !text || !productId) throw new Error("Toutes les données sont obligatoires");
      if (!email.includes('@')) throw new Error("Email invalide");

      const date = formatReviewDate();
      const images = Array.isArray(body.images) ? body.images.slice(0, 3) : [];
      const imagesCell = images.filter(Boolean).join(' | ');

      await sheetsAppend(accessToken, reviewsSpreadsheetId, "bbw4life-customers-reviews!A:H",
        [[fullName.trim(), email.trim(), title.trim(), rating, text.trim(), date, productId, imagesCell]]);

      const accountsData = await sheetsGet(accessToken, accountsSpreadsheetId, "bbw4life-accounts!A:Z");
      const accountsRows = accountsData.values || [];
      const accountRowIndex = accountsRows.findIndex(row => normalize(row[2] || "") === normalize(email));

      if (accountRowIndex !== -1) {
        const accountRowNum = accountRowIndex + 1;
        const currentRow = accountsRows[accountRowIndex] || [];
        let currentReviewsCount = parseInt(currentRow[8] || 0);
        const newReviewsCount = currentReviewsCount + 1;

        await sheetsUpdate(accessToken, accountsSpreadsheetId, `bbw4life-accounts!I${accountRowNum}`, [[newReviewsCount]]);
        console.log(`✅ Reviews Written mis à jour pour ${email} → ${newReviewsCount}`);
      } else {
        console.log(`ℹ️ Email ${email} non trouvé dans les comptes`);
      }

      fetch(`${env.BASE_URL}/send-email-auto`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'review_thanks', email, firstName: fullName.trim().split(' ')[0] }),
      }).catch(e => console.warn('[Email] review_thanks trigger failed:', e.message));

      return jsonResponse(200, { success: true });
    }

    if (action === 'get-reviews') {
      if (!productId) throw new Error("Product ID manquant");
      const data = await sheetsGet(accessToken, reviewsSpreadsheetId, "bbw4life-customers-reviews!A:Z");
      const rows = data.values || [];

      const reviews = rows.slice(1)
        .filter(row => row[6] === productId)
        .map(row => ({
          fullName: row[0] || "", email: row[1] || "", title: row[2] || "",
          rating: parseInt(row[3]) || 5, text: row[4] || "", date: row[5] || "",
          images: row[7] ? row[7].split(' | ').filter(Boolean) : []
        }));

      return jsonResponse(200, { success: true, reviews });
    }

    throw new Error("Action inconnue");
  } catch (error) {
    console.error("REVIEWS ERROR:", error.message);
    return jsonResponse(500, { success: false, error: error.message });
  }
}

export async function onRequestGet() {
  return new Response('Method Not Allowed', { status: 405 });
}

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
}