// functions/save-account.js
import { verifyAccountToken } from './account-token.js';

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

async function sheetsUpdate(accessToken, spreadsheetId, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });
  if (!res.ok) throw new Error(`Sheets update failed: ${await res.text()}`);
}

async function sheetsBatchUpdate(accessToken, spreadsheetId, data) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ valueInputOption: 'RAW', data })
  });
  if (!res.ok) throw new Error(`Sheets batchUpdate failed: ${await res.text()}`);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      throw new Error("No data received");
    }

    const { action = 'signup', lastName, firstName, email, phone = "", password, newsletter = "No", birthday = "",
            line1, line2, city, state, zip, newPassword,
            totalAmount = 0, totalQuantity = 0, orderItems = [],
            currentCartQuantity = null, token } = body;

    const PROTECTED_ACTIONS = [
      'get-stats',
      'update-address',
      'update-profile-photo',
      'update-password',
      'aff-get-stats',
      'aff-create',
      'aff-withdraw-request'
    ];

    if (PROTECTED_ACTIONS.includes(action)) {
      const valid = await verifyAccountToken(env, email, token);
      if (!valid) {
        return jsonResponse(401, { success: false, error: 'Unauthorized' });
      }
    }

    const normalize = (str) => str ? str.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";

    const spreadsheetId = env.SHEET_ID_BBW4LIFE_ACCOUNTS;
    const accessToken = await getGoogleAccessToken(env);

    function formatDate() {
      const d = new Date();
      return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear().toString().slice(-2)}`;
    }

    const sheetData = await sheetsGet(accessToken, spreadsheetId, "bbw4life-accounts!A:AE");
    let rows = sheetData.values || [];
    const rowIndex = rows.findIndex(row => normalize(row[2] || "") === normalize(email));
    const rowNum = rowIndex + 1;

    // ==================== SIGNUP ====================
    if (action === 'signup') {
      if (!lastName || !firstName || !email || !password) throw new Error("Données manquantes");
      const passNormalized = normalize(password);
      const memberSince = formatDate();
      const values = [[normalize(lastName), normalize(firstName), normalize(email), normalize(phone), passNormalized, newsletter,
                       0, 0, 0, "", "", "", "", "", 0, memberSince, "[]"]];
      await sheetsAppend(accessToken, spreadsheetId, "bbw4life-accounts!A:Z", values);

      fetch(`${env.BASE_URL}/send-email-auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'welcome', email, firstName, lastName, newsletter }),
      }).catch(e => console.warn('[Email] welcome trigger failed:', e.message));

      if ((newsletter || '').toLowerCase() === 'yes') {
        fetch(`${env.BASE_URL}/send-email-auto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger: 'newsletter_1', email, firstName })
        }).catch(e => console.warn('[Email] newsletter_1 failed:', e.message));
      }

      return jsonResponse(200, { success: true });
    }

    // ==================== UPDATE PROFILE PHOTO ====================
    if (action === 'update-profile-photo') {
      if (rowIndex === -1) throw new Error("Utilisateur non trouvé");
      const { photoBase64 } = body;
      await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-accounts!R${rowNum}`, [[photoBase64 || ""]]);
      return jsonResponse(200, { success: true });
    }

    // ==================== UPDATE ADDRESS ====================
    if (action === 'update-address') {
      if (rowIndex === -1) throw new Error("Utilisateur non trouvé");
      await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-accounts!J${rowNum}:N${rowNum}`,
        [[line1 || "", line2 || "", city || "", state || "", zip || ""]]);
      return jsonResponse(200, { success: true });
    }

    // ==================== RESET PASSWORD ====================
    if (action === 'reset-password') {
      const { newPassword } = body;
      if (!email || !newPassword) throw new Error("Email and new password are required");

      const normalizedEmail = normalize(email).toLowerCase();
      const rowIdx = rows.findIndex(row => normalize(row[2] || "").toLowerCase() === normalizedEmail);

      if (rowIdx === -1) {
        return jsonResponse(200, { success: false, error: 'EMAIL_NOT_FOUND' });
      }

      const targetRow = rowIdx + 1;
      await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-accounts!E${targetRow}`,
        [[normalize(newPassword).toLowerCase()]]);

      return jsonResponse(200, { success: true });
    }

    // ==================== UPDATE PASSWORD ====================
    if (action === 'update-password') {
      if (rowIndex === -1) throw new Error("Utilisateur non trouvé");
      await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-accounts!E${rowNum}`, [[normalize(newPassword)]]);
      return jsonResponse(200, { success: true });
    }

    // ==================== UPDATE CART QUANTITY + CONTENT ====================
    if (action === 'update-cart-quantity') {
      if (rowIndex === -1) throw new Error("Utilisateur non trouvé");
      const { cartContent = null } = body;

      const updateData = [
        { range: `bbw4life-accounts!O${rowNum}`, values: [[currentCartQuantity]] }
      ];

      if (cartContent !== null) {
        updateData.push({
          range: `bbw4life-accounts!AC${rowNum}`,
          values: [[JSON.stringify(cartContent)]]
        });
      }

      await sheetsBatchUpdate(accessToken, spreadsheetId, updateData);
      return jsonResponse(200, { success: true });
    }

    // ==================== RECORD ORDER ====================
    if (action === 'record-order') {
      if (rowIndex === -1) throw new Error("Utilisateur non trouvé");
      const currentRow = rows[rowIndex] || [];
      const newOrders = parseInt(currentRow[6] || 0) + 1;
      const newSpent = parseFloat(currentRow[7] || 0) + parseFloat(totalAmount);
      let history = [];
      try { history = JSON.parse(currentRow[16] || "[]"); } catch(e) {}
      history.push({ date: formatDate(), total: parseFloat(totalAmount).toFixed(2), totalQuantity: parseInt(totalQuantity), items: orderItems });

      await sheetsBatchUpdate(accessToken, spreadsheetId, [
        { range: `bbw4life-accounts!G${rowNum}`, values: [[newOrders]] },
        { range: `bbw4life-accounts!H${rowNum}`, values: [[newSpent]] },
        { range: `bbw4life-accounts!Q${rowNum}`, values: [[JSON.stringify(history)]] }
      ]);
      return jsonResponse(200, { success: true });
    }

    // ==================== GET STATS ====================
    if (action === 'get-stats') {
      if (rowIndex === -1) throw new Error("Utilisateur non trouvé");
      const currentRow = rows[rowIndex] || [];
      let history = [];
      try { history = JSON.parse(currentRow[16] || "[]"); } catch(e) {}

      return jsonResponse(200, {
        orders:         parseInt(currentRow[6]  || 0),
        totalSpent:     parseFloat(currentRow[7] || 0),
        quantityInCart: parseInt(currentRow[14] || 0),
        history:        history,
        memberSince:    currentRow[15] || "January 2026",
        points:         parseInt(currentRow[6]  || 0) * 10,
        reviewsCount:   parseInt(currentRow[8]  || 0),
        profilePhoto:   currentRow[17] || "",
        addressLine1:   currentRow[9]  || "",
        line2:          currentRow[10] || "",
        city:           currentRow[11] || "",
        state:          currentRow[12] || "",
        zip:            currentRow[13] || "",
        savedCart:      currentRow[28] || "[]"
      });
    }

    // ==================== NEWSLETTER SUBSCRIBE ====================
    if (action === 'newsletter-subscribe') {
      if (!email) throw new Error("Email required");

      const normalizedEmail = normalize(email);
      const nlRowIndex = rows.findIndex(row => normalize(row[2] || "") === normalizedEmail);
      const nlRowNum = nlRowIndex + 1;

      if (nlRowIndex !== -1) {
        await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-accounts!F${nlRowNum}`, [["Yes"]]);

        if (firstName || lastName) {
          await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-accounts!A${nlRowNum}:B${nlRowNum}`,
            [[normalize(lastName) || "", normalize(firstName) || ""]]);
        }
        if (birthday) {
          await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-accounts!AB${nlRowNum}`, [[birthday]]);
        }
      } else {
        const rowData = [
          normalize(lastName) || "",
          normalize(firstName) || "",
          normalizedEmail, "", "", "Yes",
          0, 0, 0, "", "", "", "", "", 0,
          formatDate(), "[]", "", "", "", "", "", "", "", "", "", "", "", birthday || ""
        ];
        await sheetsAppend(accessToken, spreadsheetId, "bbw4life-accounts!A:AE", [rowData]);
      }

      fetch(`${env.BASE_URL}/send-email-auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'newsletter_1', email, firstName: firstName || '' })
      }).catch(e => console.warn('[Email] newsletter_1 failed:', e.message));

      return jsonResponse(200, { success: true });
    }

    // ==================== AFF CREATE ====================
    if (action === 'aff-create') {
      if (!email) throw new Error("Email required");
      const { allAffiliates } = body;
      if (rowIndex === -1) throw new Error("User not found");

      const newAff = allAffiliates && allAffiliates[allAffiliates.length - 1];
      if (!newAff) throw new Error("No affiliate data");

      const existingUsername = (rows[rowIndex][18] || '').toLowerCase().trim();
      if (existingUsername && existingUsername === newAff.username.toLowerCase().trim()) {
        return jsonResponse(200, { success: true });
      }

      await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-accounts!S${rowNum}:Y${rowNum}`, [[
        newAff.username,
        newAff.clicks || 0,
        newAff.totalMoney || 0,
        newAff.totalOrders || 0,
        newAff.totalOrderValue || 0,
        newAff.withdrawStatus || 'none',
        newAff.createdAt || formatDate()
      ]]);
      return jsonResponse(200, { success: true });
    }

    // ==================== AFF GET STATS ====================
    if (action === 'aff-get-stats') {
      if (!email) throw new Error("Email required");
      if (rowIndex === -1) return jsonResponse(200, { success: true, affiliates: [] });

      const currentRow = rows[rowIndex] || [];

      const username        = currentRow[18] || '';
      const clicks          = parseInt(currentRow[19]  || 0);
      const totalMoney      = parseFloat(currentRow[20] || 0);
      const totalOrders     = parseInt(currentRow[21]  || 0);
      const totalOrderValue = parseFloat(currentRow[22] || 0);
      const withdrawStatus  = currentRow[23] || 'none';
      const createdAt       = currentRow[24] || '';

      if (!username) {
        return jsonResponse(200, { success: true, affiliates: [] });
      }

      // ── AD (index 29) = ClickRewardThreshold, AE (index 30) = ClickRewardEarned ──
      const clickRewardEarned     = parseFloat(currentRow[30] || 0);
      const clicksPerRewardStored = currentRow[29] || '';

      const affiliates = [{
        username,
        clicks,
        totalMoney,
        totalOrders,
        totalOrderValue,
        withdrawStatus,
        createdAt,
        clickRewardEarned,
        clicksPerRewardStored
      }];

      return jsonResponse(200, { success: true, affiliates, withdrawStatus });
    }

    // ==================== AFF TRACK CLICK ====================
    if (action === 'aff-track-click') {
      const { username } = body;
      if (!username) throw new Error("Username required");

      for (let i = 1; i < rows.length; i++) {
        const rowUsername = (rows[i][18] || '').toLowerCase().trim();
        if (rowUsername !== username.toLowerCase().trim()) continue;

        const currentClicks = parseInt(rows[i][19] || 0);
        const newClicks = currentClicks + 1;

        await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-accounts!T${i + 1}`, [[newClicks]]);
        return jsonResponse(200, { success: true, clicks: newClicks });
      }
      return jsonResponse(200, { success: false, error: 'Username not found' });
    }

    // ==================== AFF RECORD ORDER ====================
    if (action === 'aff-record-order') {
      const { username, orderAmount } = body;
      if (!username || !orderAmount) throw new Error("Missing data");
      const commissionPct = parseFloat(body.commissionPercent) || 5;
      const commission = parseFloat(orderAmount) * (commissionPct / 100);

      for (let i = 1; i < rows.length; i++) {
        const rowUsername = (rows[i][18] || '').toLowerCase().trim();
        if (rowUsername !== username.toLowerCase().trim()) continue;

        const newMoney    = parseFloat((parseFloat(rows[i][20] || 0) + commission)).toFixed(2);
        const newOrders   = parseInt(rows[i][21] || 0) + 1;
        const newOrderVal = parseFloat((parseFloat(rows[i][22] || 0) + parseFloat(orderAmount))).toFixed(2);

        await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-accounts!U${i + 1}:W${i + 1}`,
          [[newMoney, newOrders, newOrderVal]]);
        return jsonResponse(200, { success: true });
      }
      return jsonResponse(200, { success: false, error: 'Username not found' });
    }

    // ==================== AFF WITHDRAW REQUEST ====================
    if (action === 'aff-withdraw-request') {
      const { paypalName, paypalEmail } = body;
      if (!email || !paypalName || !paypalEmail) throw new Error("Missing data");
      if (rowIndex === -1) throw new Error("User not found");

      await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-accounts!X${rowNum}:AA${rowNum}`,
        [['pending', '', paypalName, paypalEmail]]);
      return jsonResponse(200, { success: true });
    }

    // ==================== AFF APPROVE WITHDRAW ====================
    if (action === 'aff-approve-withdraw') {
      const { targetEmail } = body;
      if (!targetEmail) throw new Error("targetEmail required");

      const normalize2 = (s) => s ? s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";
      const targetIdx = rows.findIndex(r => normalize2(r[2] || '') === normalize2(targetEmail));
      if (targetIdx === -1) throw new Error("User not found");

      const targetRowNum = targetIdx + 1;
      await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-accounts!X${targetRowNum}`, [['approved']]);
      return jsonResponse(200, { success: true });
    }

    // ==================== AFF MARK PROMO USED ====================
    if (action === 'aff-mark-promo-used') {
      if (!email) throw new Error("Email required");
      if (rowIndex === -1) throw new Error("User not found");
      await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-accounts!AB${rowNum}`, [['yes']]);
      return jsonResponse(200, { success: true });
    }

    // ==================== AFF CHECK PROMO USED ====================
    if (action === 'aff-check-promo-used') {
      if (!email) throw new Error("Email required");
      if (rowIndex === -1) return jsonResponse(200, { success: true, used: false });
      const currentRow = rows[rowIndex] || [];
      const usedVal = (currentRow[27] || '').toLowerCase().trim();
      return jsonResponse(200, { success: true, used: usedVal === 'yes' });
    }

    // ==================== GET TODAY BIRTHDAYS ====================
    if (action === 'get-today-birthdays') {
      const today = new Date();
      const todayDay   = today.getDate();
      const todayMonth = today.getMonth() + 1;

      function parseBirthdaySheet(raw) {
        if (!raw || typeof raw !== 'string') return null;
        raw = raw.trim();

        const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
          return { month: parseInt(isoMatch[2], 10), day: parseInt(isoMatch[3], 10) };
        }

        const parts = raw.split('/');
        if (parts.length >= 2) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (!isNaN(d) && !isNaN(m) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return { day: d, month: m };
          }
        }

        const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (usMatch) {
          const m2 = parseInt(usMatch[1], 10);
          const d2 = parseInt(usMatch[2], 10);
          if (m2 <= 12 && d2 <= 31) return { day: d2, month: m2 };
        }

        return null;
      }

      const customers = [];

      for (let i = 1; i < rows.length; i++) {
        const row      = rows[i] || [];
        const birthday = row[27] || '';
        if (!birthday) continue;

        const parsed = parseBirthdaySheet(birthday);
        if (!parsed) continue;

        if (parsed.day === todayDay && parsed.month === todayMonth) {
          customers.push({
            firstName: row[1] || '',
            lastName:  row[0] || '',
            email:     row[2] || '',
          });
        }
      }

      return jsonResponse(200, {
        success:   true,
        customers: customers,
        count:     customers.length
      });
    }

    // ==================== CHECK BIRTHDAY PROMO ELIGIBILITY ====================
    if (action === 'check-birthday-promo-eligibility') {
      if (!email) {
        return jsonResponse(200, { success: false, reason: 'NOT_LOGGED_IN' });
      }

      const normalizedEmail = normalize(email);
      const userRowIndex    = rows.findIndex(row => normalize(row[2] || '') === normalizedEmail);

      if (userRowIndex === -1) {
        return jsonResponse(200, { success: false, reason: 'USER_NOT_FOUND' });
      }

      const userRow      = rows[userRowIndex] || [];
      const isSubscribed = (userRow[5] || '').toLowerCase().trim() === 'yes';
      const birthdayRaw  = (userRow[27] || '').trim();

      if (!isSubscribed) {
        return jsonResponse(200, { success: false, reason: 'NOT_SUBSCRIBED' });
      }

      if (!birthdayRaw) {
        return jsonResponse(200, { success: false, reason: 'NO_BIRTHDAY' });
      }

      function parseBirthdayLocal(raw) {
        const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) return { month: parseInt(isoMatch[2], 10), day: parseInt(isoMatch[3], 10) };
        const parts = raw.split('/');
        if (parts.length >= 2) {
          const d = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
          if (!isNaN(d) && !isNaN(m) && m >= 1 && m <= 12 && d >= 1 && d <= 31) return { day: d, month: m };
        }
        const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (usMatch) {
          const m2 = parseInt(usMatch[1], 10), d2 = parseInt(usMatch[2], 10);
          if (m2 <= 12 && d2 <= 31) return { day: d2, month: m2 };
        }
        return null;
      }

      const parsed = parseBirthdayLocal(birthdayRaw);
      const today  = new Date();
      const isBday = parsed && parsed.day === today.getDate() && parsed.month === (today.getMonth() + 1);

      return jsonResponse(200, {
        success:         true,
        isSubscribed:    true,
        hasBirthday:     !!parsed,
        isBirthdayToday: isBday || false
      });
    }

    // ==================== AFF UPDATE CLICK REWARD ====================
    if (action === 'aff-update-click-reward') {
      if (!email) throw new Error("Email required");
      if (rowIndex === -1) throw new Error("User not found");

      const { clickRewardEarned = 0, clicksPerReward = 1000 } = body;

      // AD (index 29) = ClickRewardThreshold (format "2 / 3000"), AE (index 30) = ClickRewardEarned
      await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-accounts!AD${rowNum}:AE${rowNum}`,
        [[clicksPerReward, clickRewardEarned]]);

      return jsonResponse(200, { success: true });
    }

    throw new Error("Action inconnue");
  } catch (error) {
    console.error("SAVE ERROR:", error.message);
    return jsonResponse(500, { success: false, error: error.message });
  }
}

export async function onRequestGet() {
  return new Response('Method Not Allowed', { status: 405 });
}

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
}