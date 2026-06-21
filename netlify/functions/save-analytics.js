// functions/save-analytics.js — BBW4LIFE Analytics + Orders

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
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });
  if (!res.ok) throw new Error(`Sheets append failed: ${await res.text()}`);
}

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function onRequestOptions() {
  return new Response('', { status: 200, headers: CORS_HEADERS });
}

// ══════════════════════════════════════
//  GET — read all rows
// ══════════════════════════════════════
export async function onRequestGet(context) {
  const { env } = context;
  try {
    const spreadsheetId = env.SHEET_ID_BBW4LIFE_ANALYTICS;
    const accessToken = await getGoogleAccessToken(env);

    const data = await sheetsGet(accessToken, spreadsheetId, "bbw4life-analytics!A:T");
    const rows = data.values || [];
    return new Response(JSON.stringify({ success: true, rows }), {
      status: 200, headers: CORS_HEADERS
    });
  } catch (err) {
    console.error("[ANALYTICS]", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: CORS_HEADERS
    });
  }
}

// ══════════════════════════════════════
//  POST — write one row
// ══════════════════════════════════════
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    let data;
    try {
      data = await request.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: "No body" }), {
        status: 400, headers: CORS_HEADERS
      });
    }

    const spreadsheetId = env.SHEET_ID_BBW4LIFE_ANALYTICS;
    const accessToken = await getGoogleAccessToken(env);

    // ── Géolocalisation IP ──
    let country = "Unknown";
    let city = "Unknown";

    try {
      const rawIp =
        (request.headers.get("cf-connecting-ip") || "").trim() ||
        (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
        (request.headers.get("x-real-ip") || "").trim() ||
        "";

      const ip = rawIp.replace(/^::ffff:/, "");

      if (ip && ip !== "127.0.0.1" && ip !== "::1" && ip !== "") {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city&lang=en`);
        const geoData = await geoRes.json();

        if (geoData.status === "success") {
          country = geoData.country || "Unknown";
          city = geoData.city || "Unknown";
        } else {
          const fallbackRes = await fetch(`https://ipapi.co/${ip}/json/`);
          const fallbackData = await fallbackRes.json();
          if (!fallbackData.error) {
            country = fallbackData.country_name || "Unknown";
            city = fallbackData.city || "Unknown";
          }
        }
      }
    } catch (geoErr) {
      console.warn("[ANALYTICS] Geo lookup failed:", geoErr.message);
    }

    const row = [[
      data.timestamp || new Date().toISOString(),
      data.sessionId || "",
      country,
      city,
      data.pageUrl || "",
      data.pageTitle || "",
      data.timeOnPage || 0,
      data.clicks || 0,
      data.menuClicks || 0,
      data.scrollDepth || 0,
      data.referrer || "direct",
      data.device || "desktop",
      data.browser || "unknown",
      data.screenWidth || 0,
      data.actionsCount || 0,
      data.orderId || "",
      data.orderTotal || "",
      data.currency || "",
      data.itemsCount || "",
      data.orderCountry || ""
    ]];

    await sheetsAppend(accessToken, spreadsheetId, "bbw4life-analytics!A:T", row[0] ? row : row);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: CORS_HEADERS
    });

  } catch (err) {
    console.error("[ANALYTICS]", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: CORS_HEADERS
    });
  }
}