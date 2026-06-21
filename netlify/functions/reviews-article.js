// functions/reviews-article.js

const SHEET_NAME = 'bbw4life-reviews-article';

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

// Colonnes :
// A=articleId | B=firstName | C=lastName | D=avatar | E=rating | F=reviewText | G=date | H=likes | I=shares

async function getAllRows(accessToken, spreadsheetId) {
  const data = await sheetsGet(accessToken, spreadsheetId, `${SHEET_NAME}!A:I`);
  return data.values || [];
}

async function ensureHeader(accessToken, spreadsheetId) {
  const rows = await getAllRows(accessToken, spreadsheetId);
  if (rows.length === 0) {
    await sheetsAppend(accessToken, spreadsheetId, `${SHEET_NAME}!A1`, [
      ['articleId', 'firstName', 'lastName', 'avatar', 'rating', 'reviewText', 'date', 'likes', 'shares']
    ]);
  }
}

function getReviewsFromRows(rows, articleId) {
  return rows
    .filter((r, i) => i > 0 && r[0] === articleId && r[1])
    .map(r => ({
      firstName: r[1] || '',
      lastName: r[2] || '',
      avatar: r[3] || '',
      rating: parseInt(r[4] || '5'),
      text: r[5] || '',
      date: r[6] || ''
    }));
}

function getStatsFromRows(rows, articleId) {
  const articleRows = rows.filter((r, i) => i > 0 && r[0] === articleId);
  if (articleRows.length === 0) return { likes: 0, shares: 0, reviewsCount: 0 };

  const likes = parseInt(articleRows[0][7] || '0');
  const shares = parseInt(articleRows[0][8] || '0');
  const reviewsCount = articleRows.filter(r => r[1]).length;

  return { likes, shares, reviewsCount };
}

async function updateStatsOnAllRows(accessToken, spreadsheetId, rows, articleId, likes, shares) {
  const updates = [];
  rows.forEach((r, i) => {
    if (i > 0 && r[0] === articleId) {
      updates.push(
        sheetsUpdate(accessToken, spreadsheetId, `${SHEET_NAME}!H${i + 1}:I${i + 1}`, [[likes, shares]])
      );
    }
  });
  if (updates.length > 0) await Promise.all(updates);
}

async function appendStatsRow(accessToken, spreadsheetId, articleId) {
  await sheetsAppend(accessToken, spreadsheetId, `${SHEET_NAME}!A:I`, [
    [articleId, '', '', '', '', '', '', 0, 0]
  ]);
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export async function onRequestOptions() {
  return new Response('', { status: 200, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const articleId = url.searchParams.get('articleId');
    if (!articleId) {
      return new Response(JSON.stringify({ success: false, error: 'articleId required' }), {
        status: 400, headers: CORS_HEADERS
      });
    }

    const spreadsheetId = env.SHEET_ID_BBW4LIFE_CUSTOMERS_REVIEWS;
    const accessToken = await getGoogleAccessToken(env);

    const rows = await getAllRows(accessToken, spreadsheetId);
    const stats = getStatsFromRows(rows, articleId);
    const reviews = getReviewsFromRows(rows, articleId);

    return new Response(JSON.stringify({
      success: true,
      likes: stats.likes,
      shares: stats.shares,
      reviewsCount: stats.reviewsCount,
      reviews
    }), { status: 200, headers: CORS_HEADERS });

  } catch (err) {
    console.error('reviews-article ERROR:', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: CORS_HEADERS
    });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const { action, articleId } = body;

    if (!articleId) {
      return new Response(JSON.stringify({ success: false, error: 'articleId required' }), {
        status: 400, headers: CORS_HEADERS
      });
    }

    const spreadsheetId = env.SHEET_ID_BBW4LIFE_CUSTOMERS_REVIEWS;
    const accessToken = await getGoogleAccessToken(env);

    await ensureHeader(accessToken, spreadsheetId);
    let rows = await getAllRows(accessToken, spreadsheetId);
    const stats = getStatsFromRows(rows, articleId);

    const articleExists = rows.some((r, i) => i > 0 && r[0] === articleId);
    if (!articleExists) {
      await appendStatsRow(accessToken, spreadsheetId, articleId);
      rows = await getAllRows(accessToken, spreadsheetId);
    }

    // ── like ─────────────────────────────────────────────────
    if (action === 'like') {
      const newLikes = stats.likes + 1;
      await updateStatsOnAllRows(accessToken, spreadsheetId, rows, articleId, newLikes, stats.shares);
      return new Response(JSON.stringify({ success: true, likes: newLikes }), {
        status: 200, headers: CORS_HEADERS
      });
    }

    // ── share ────────────────────────────────────────────────
    if (action === 'share') {
      const newShares = stats.shares + 1;
      await updateStatsOnAllRows(accessToken, spreadsheetId, rows, articleId, stats.likes, newShares);
      return new Response(JSON.stringify({ success: true, shares: newShares }), {
        status: 200, headers: CORS_HEADERS
      });
    }

    // ── add-review ───────────────────────────────────────────
    if (action === 'add-review') {
      const { firstName, lastName, avatar, text, rating } = body;

      if (!firstName || !lastName || !text) {
        return new Response(JSON.stringify({ success: false, error: 'firstName, lastName and text are required' }), {
          status: 400, headers: CORS_HEADERS
        });
      }

      const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });

      await sheetsAppend(accessToken, spreadsheetId, `${SHEET_NAME}!A:I`, [[
        articleId,
        firstName.trim(),
        lastName.trim(),
        avatar || '',
        parseInt(rating) || 5,
        text.trim(),
        date,
        stats.likes,
        stats.shares
      ]]);

      const newReviewsCount = stats.reviewsCount + 1;

      return new Response(JSON.stringify({ success: true, reviewsCount: newReviewsCount }), {
        status: 200, headers: CORS_HEADERS
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), {
      status: 400, headers: CORS_HEADERS
    });

  } catch (err) {
    console.error('reviews-article ERROR:', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: CORS_HEADERS
    });
  }
}