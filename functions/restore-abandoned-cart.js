// restore-abandoned-cart.js
process.removeAllListeners('warning');
const { google } = require("googleapis");

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
const ABANDONED_TAB  = "Abandoned_Carts";
const ABANDONED_RANGE = `${ABANDONED_TAB}!A:J`;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const orderId = (event.queryStringParameters || {}).orderId;
    if (!orderId) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "Missing orderId" }) };
    }

    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: ABANDONED_RANGE
    });

    const rows = res.data.values || [];
    // Cherche la dernière occurrence (au cas où plusieurs lignes existeraient pour le même ID)
    let match = null;
    for (let i = rows.length - 1; i >= 1; i--) { // skip header (row 0)
      if (rows[i][0] === orderId) { match = rows[i]; break; }
    }

    if (!match) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: "Order not found" }) };
    }

    const [, email, firstName, lastName, cartJson, shippingJson, promoCode] = match;

    let cart = [];
    let shipping = {};
    try { cart = JSON.parse(cartJson || "[]"); } catch {}
    try { shipping = JSON.parse(shippingJson || "{}"); } catch {}

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        cart,
        shipping,
        promoCode: promoCode || null
      })
    };

  } catch (error) {
    console.error("[RESTORE ABANDONED CART] ERROR:", error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
  }
};