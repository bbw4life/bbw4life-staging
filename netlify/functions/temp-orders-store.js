// temp-orders-store.js
const { google } = require('googleapis');

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  return google.sheets({ version: "v4", auth });
}

const SPREADSHEET_ID = process.env.SHEET_ID_BBW4LIFE_PENDING_ORDERS;
const SHEET_TAB       = "Temp_Orders";
const SHEET_RANGE     = `${SHEET_TAB}!A:D`;

// ── Écrit cart + shipping dans le sheet temporaire, identifié par orderId ──
async function saveTempOrder(orderId, cart, shipping) {
  const sheets = getSheetsClient();
  const now = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_RANGE,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    resource: {
      values: [[
        orderId,
        JSON.stringify(cart),
        JSON.stringify(shipping),
        now
      ]]
    }
  });
}

// ── Récupère cart + shipping par orderId, puis supprime immédiatement la ligne ──
async function getAndDeleteTempOrder(orderId) {
  const sheets = getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_RANGE
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex(row => row[0] === orderId);

  if (rowIndex === -1) return null;

  const [, cartJson, shippingJson] = rows[rowIndex];
  const cart     = JSON.parse(cartJson     || "[]");
  const shipping = JSON.parse(shippingJson || "{}");

  // ── Nettoyage immédiat : suppression de la ligne ──
  try {
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetObj  = sheetMeta.data.sheets.find(s => s.properties.title === SHEET_TAB);
    const sheetId   = sheetObj ? sheetObj.properties.sheetId : 0;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }]
      }
    });
  } catch (e) {
    console.error("[TEMP ORDERS] Échec suppression ligne:", e.message);
  }

  return { cart, shipping };
}

module.exports = { saveTempOrder, getAndDeleteTempOrder };