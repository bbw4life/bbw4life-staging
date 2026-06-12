/* ================================================================
   BBW4LIFE — VALIDATE PROMO CODE (Single-Use Affiliate Code)
   Netlify Function : /.netlify/functions/validate-promo-code
================================================================ */

const { google } = require('googleapis');

// ── Google Sheets auth ──────────────────────────────────────────────
async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

// ── Find or create the "PromoCodes" sheet ──────────────────────────
async function getOrCreatePromoSheet(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets.find(
    s => s.properties.title === 'PromoCodes'
  );

  if (!existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          addSheet: {
            properties: { title: 'PromoCodes' }
          }
        }]
      }
    });
    // Write headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'PromoCodes!A1:F1',
      valueInputOption: 'RAW',
      resource: {
        values: [['code', 'username', 'discount_percent', 'status', 'created_at', 'used_at']]
      }
    });
  }
}

// ── Find a row by code ──────────────────────────────────────────────
async function findCodeRow(sheets, spreadsheetId, code) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'PromoCodes!A:F'
  });
  const rows = res.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].trim().toUpperCase() === code.trim().toUpperCase()) {
      return { rowIndex: i + 1, row: rows[i] }; // 1-based for Sheets
    }
  }
  return null;
}

// ── Register a new promo code ───────────────────────────────────────
async function registerCode(sheets, spreadsheetId, code, username, discountPct) {
  await getOrCreatePromoSheet(sheets, spreadsheetId);

  // Check if already exists
  const existing = await findCodeRow(sheets, spreadsheetId, code);
  if (existing) return; // already registered, skip

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'PromoCodes!A:F',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [[
        code.toUpperCase(),
        username || '',
        discountPct || '',
        'active',
        new Date().toISOString(),
        ''
      ]]
    }
  });
}

// ── Validate & optionally consume a code ───────────────────────────
async function validateCode(sheets, spreadsheetId, code, consume) {
  await getOrCreatePromoSheet(sheets, spreadsheetId);

  const found = await findCodeRow(sheets, spreadsheetId, code);
  if (!found) {
    return { valid: false, reason: 'CODE_NOT_FOUND' };
  }

  const { rowIndex, row } = found;
  const status      = (row[3] || '').trim().toLowerCase();
  const discountPct = parseFloat(row[2]) || 0;
  const username    = row[1] || '';

  if (status === 'used') {
    return { valid: false, reason: 'CODE_ALREADY_USED', discountPct, username };
  }

  if (status !== 'active') {
    return { valid: false, reason: 'CODE_INACTIVE', discountPct, username };
  }

  // If we're consuming (at payment time), mark as used immediately
  if (consume) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `PromoCodes!D${rowIndex}:F${rowIndex}`,
      valueInputOption: 'RAW',
      resource: {
        values: [['used', row[4] || '', new Date().toISOString()]]
      }
    });
  }

  return { valid: true, discountPct, username };
}

// ── Main handler ───────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };

  try {
    if (!event.body) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'No body' }) };
    }

    const { action, code, username, discount_percent, consume } = JSON.parse(event.body);
    const spreadsheetId = process.env.SHEET_ID_BBW4LIFE_ACCOUNTS;
    const sheets = await getSheets();

    // ── ACTION: register ──────────────────────────────────────────
    if (action === 'register') {
      if (!code || !username) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Missing code or username' }) };
      }
      await registerCode(sheets, spreadsheetId, code, username, discount_percent || 0);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // ── ACTION: validate ──────────────────────────────────────────
    if (action === 'validate') {
      if (!code) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Missing code' }) };
      }
      const result = await validateCode(sheets, spreadsheetId, code, consume === true);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, ...result }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Unknown action' }) };

  } catch (err) {
    console.error('[validate-promo-code]', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};