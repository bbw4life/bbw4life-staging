// netlify/functions/save-account.js
const { google } = require('googleapis');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { action = 'signup', lastName, firstName, email, phone = "", password, newsletter = "No",
            line1, line2, city, state, zip, newPassword,
            totalAmount = 0, totalQuantity = 0, orderItems = [],
            currentCartQuantity = null } = body;

    const normalize = (str) => str ? str.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SHEET_ID_BBW4LIFE_ACCOUNTS;

    function formatDate() {
      const d = new Date();
      return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear().toString().slice(-2)}`;
    }

    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "bbw4life-accounts!A:Z" });
    let rows = res.data.values || [];
    const rowIndex = rows.findIndex(row => normalize(row[2] || "") === normalize(email));
    const rowNum = rowIndex + 1;

    // ==================== SIGNUP ====================
    if (action === 'signup') {
      if (!lastName || !firstName || !email || !password) throw new Error("Données manquantes");
      const passNormalized = normalize(password);
      const memberSince = formatDate();
      const values = [[normalize(lastName), normalize(firstName), normalize(email), normalize(phone), passNormalized, newsletter,
                       0, 0, 0, "", "", "", "", "", 0, memberSince, "[]"]];
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: "bbw4life-accounts!A:Z", valueInputOption: "RAW", insertDataOption: "INSERT_ROWS", resource: { values }
      });
      fetch(`${process.env.URL}/.netlify/functions/send-email-auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'welcome', email, firstName, lastName, newsletter }),
      }).catch(e => console.warn('[Email] welcome trigger failed:', e.message));

      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // ==================== UPDATE PROFILE PHOTO ====================
    if (action === 'update-profile-photo') {
      if (rowIndex === -1) throw new Error("Utilisateur non trouvé");
      const { photoBase64 } = body;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `bbw4life-accounts!R${rowNum}`,
        valueInputOption: "RAW",
        resource: { values: [[photoBase64 || ""]] }
      });
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // ==================== UPDATE ADDRESS ====================
    if (action === 'update-address') {
      if (rowIndex === -1) throw new Error("Utilisateur non trouvé");
      await sheets.spreadsheets.values.update({ spreadsheetId, range: `bbw4life-accounts!J${rowNum}:N${rowNum}`, valueInputOption: "RAW",
        resource: { values: [[line1 || "", line2 || "", city || "", state || "", zip || ""]] }
      });
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }


    // ==================== RESET PASSWORD (Forgot Password) ====================
    if (action === 'reset-password') {
      const { newPassword } = body;
      if (!email || !newPassword) throw new Error("Email and new password are required");

      const normalizedEmail = normalize(email).toLowerCase();
      const rowIdx = rows.findIndex(row => normalize(row[2] || "").toLowerCase() === normalizedEmail);

      if (rowIdx === -1) {
        return {
          statusCode: 200,
          body: JSON.stringify({ success: false, error: 'EMAIL_NOT_FOUND' })
        };
      }

      const targetRow = rowIdx + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `bbw4life-accounts!E${targetRow}`,
        valueInputOption: "RAW",
        resource: { values: [[normalize(newPassword).toLowerCase()]] }
      });

      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // ==================== UPDATE PASSWORD ====================
    if (action === 'update-password') {
      if (rowIndex === -1) throw new Error("Utilisateur non trouvé");
      await sheets.spreadsheets.values.update({ spreadsheetId, range: `bbw4life-accounts!E${rowNum}`, valueInputOption: "RAW",
        resource: { values: [[normalize(newPassword)]] }
      });
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // ==================== UPDATE CART QUANTITY ====================
    if (action === 'update-cart-quantity') {
      if (rowIndex === -1) throw new Error("Utilisateur non trouvé");
      await sheets.spreadsheets.values.update({ spreadsheetId, range: `bbw4life-accounts!O${rowNum}`, valueInputOption: "RAW",
        resource: { values: [[currentCartQuantity]] }
      });
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
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

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: {
          valueInputOption: "RAW",
          data: [
            { range: `bbw4life-accounts!G${rowNum}`, values: [[newOrders]] },
            { range: `bbw4life-accounts!H${rowNum}`, values: [[newSpent]] },
            { range: `bbw4life-accounts!Q${rowNum}`, values: [[JSON.stringify(history)]] }
          ]
        }
      });
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // ==================== GET STATS ====================
    if (action === 'get-stats') {
      if (rowIndex === -1) throw new Error("Utilisateur non trouvé");
      const currentRow = rows[rowIndex] || [];
      let history = [];
      try { history = JSON.parse(currentRow[16] || "[]"); } catch(e) {}

      return {
        statusCode: 200,
        body: JSON.stringify({
          orders: parseInt(currentRow[6] || 0),
          totalSpent: parseFloat(currentRow[7] || 0),
          quantityInCart: parseInt(currentRow[14] || 0),
          history: history,
          memberSince: currentRow[15] || "January 2026",
          points: parseInt(currentRow[6] || 0) * 10,
          reviewsCount: parseInt(currentRow[8] || 0),
          profilePhoto: currentRow[17] || ""
        })
      };
    }

    // ==================== NEWSLETTER SUBSCRIBE ====================
    if (action === 'newsletter-subscribe') {
      if (!email) throw new Error("Email required");

      const normalizedEmail = normalize(email);
      const rowIndex = rows.findIndex(row => normalize(row[2] || "") === normalizedEmail);
      const rowNum = rowIndex + 1;

      if (rowIndex !== -1) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `bbw4life-accounts!F${rowNum}`,
          valueInputOption: "RAW",
          resource: { values: [["Yes"]] }
        });
      } else {
        const rowData = [
          "", "", normalizedEmail, "", "", "Yes",
          0, 0, 0, "", "", "", "", "", 0,
          formatDate(), "[]"
        ];

        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: "bbw4life-accounts!A:Z",
          valueInputOption: "RAW",
          insertDataOption: "INSERT_ROWS",
          resource: { values: [rowData] }
        });
      }

      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }







    // ================================================================
//   AFFILIATION — Nouveaux handlers pour save-account.js
//   À insérer AVANT la ligne : throw new Error("Action inconnue");
// ================================================================

// ==================== AFF-CREATE ====================
if (action === 'aff-create') {
  const { affiliateData, allAffiliates } = body;
  if (!email || !affiliateData) throw new Error("Données manquantes");

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Essayer d'écrire dans l'onglet "Affiliates"
  try {
    const affRange = "Affiliates!A:Z";
    let affRows = [];
    try {
      const affRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: affRange });
      affRows = affRes.data.values || [];
    } catch(e) {
      // Onglet peut-être absent — on crée la ligne quand même
    }

    // Chercher si l'affilié existe déjà
    const existingRowIdx = affRows.findIndex(r => normalize(r[0]||'') === normalize(email) && normalize(r[1]||'') === normalize(affiliateData.username));

    const newRow = [
      email,
      affiliateData.username,
      affiliateData.clicks || 0,
      affiliateData.totalMoney || 0,
      affiliateData.totalOrders || 0,
      affiliateData.totalOrderValue || 0,
      affiliateData.withdrawStatus || 'none',
      affiliateData.createdAt || formatDate(),
      JSON.stringify(allAffiliates || [])
    ];

    if (existingRowIdx === -1) {
      // Nouvelle ligne
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Affiliates!A:A",
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [newRow] }
      });
    } else {
      // Mise à jour ligne existante
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Affiliates!A${existingRowIdx + 1}:I${existingRowIdx + 1}`,
        valueInputOption: 'RAW',
        resource: { values: [newRow] }
      });
    }
  } catch(e) {
    console.error('[AFF-CREATE] Sheet error:', e.message);
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
}

// ==================== AFF-GET-STATS ====================
if (action === 'aff-get-stats') {
  if (!email) throw new Error("Email requis");

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  let affiliates = [];

  try {
    const affRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Affiliates!A:I"
    });
    const rows = affRes.data.values || [];

    rows.forEach(function(row) {
      if (normalize(row[0] || '') === normalize(email)) {
        affiliates.push({
          username:        row[1] || '',
          clicks:          parseInt(row[2]) || 0,
          totalMoney:      parseFloat(row[3]) || 0,
          totalOrders:     parseInt(row[4]) || 0,
          totalOrderValue: parseFloat(row[5]) || 0,
          withdrawStatus:  row[6] || 'none',
          createdAt:       row[7] || ''
        });
      }
    });
  } catch(e) {
    console.error('[AFF-GET-STATS] Sheet error:', e.message);
  }

  return { statusCode: 200, body: JSON.stringify({ success: true, affiliates }) };
}

// ==================== AFF-TRACK-CLICK ====================
if (action === 'aff-track-click') {
  const { username } = body;
  if (!username) throw new Error("Username requis");

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    const affRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Affiliates!A:I"
    });
    const rows = affRes.data.values || [];

    const rowIdx = rows.findIndex(r => normalize(r[1] || '') === normalize(username));
    if (rowIdx !== -1) {
      const currentClicks = parseInt(rows[rowIdx][2]) || 0;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Affiliates!C${rowIdx + 1}`,
        valueInputOption: 'RAW',
        resource: { values: [[currentClicks + 1]] }
      });
    }
  } catch(e) {
    console.error('[AFF-TRACK-CLICK] Sheet error:', e.message);
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
}

// ==================== AFF-RECORD-ORDER ====================
// Appelé depuis verify-payment.js quand une commande est passée via un lien affilié
// Paramètres : username (ref), orderAmount
if (action === 'aff-record-order') {
  const { username, orderAmount } = body;
  if (!username || !orderAmount) throw new Error("Données manquantes");

  const commission     = parseFloat(orderAmount) * 0.05;
  const spreadsheetId  = process.env.GOOGLE_SHEET_ID;

  try {
    const affRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Affiliates!A:I"
    });
    const rows = affRes.data.values || [];

    const rowIdx = rows.findIndex(r => normalize(r[1] || '') === normalize(username));
    if (rowIdx !== -1) {
      const currentOrders     = parseInt(rows[rowIdx][4])   || 0;
      const currentMoney      = parseFloat(rows[rowIdx][3]) || 0;
      const currentOrderValue = parseFloat(rows[rowIdx][5]) || 0;

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Affiliates!D${rowIdx + 1}:F${rowIdx + 1}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[
            (currentMoney + commission).toFixed(2),
            currentOrders + 1,
            (currentOrderValue + parseFloat(orderAmount)).toFixed(2)
          ]]
        }
      });
    }
  } catch(e) {
    console.error('[AFF-RECORD-ORDER] Sheet error:', e.message);
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
}

// ==================== AFF-WITHDRAW-REQUEST ====================
if (action === 'aff-withdraw-request') {
  const { paypalName, paypalEmail } = body;
  if (!email || !paypalName || !paypalEmail) throw new Error("Données manquantes");

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    // 1. Mettre à jour le statut dans Affiliates
    const affRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Affiliates!A:I"
    });
    const rows = affRes.data.values || [];

    rows.forEach(async function(row, idx) {
      if (normalize(row[0] || '') === normalize(email)) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `Affiliates!G${idx + 1}`,
          valueInputOption: 'RAW',
          resource: { values: [['pending']] }
        });
      }
    });

    // 2. Enregistrer la demande de retrait dans un onglet dédié
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "AffWithdrawals!A:A",
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[
          email,
          paypalName,
          paypalEmail,
          'pending',
          new Date().toISOString(),
          '' // date approbation (vide au départ)
        ]]
      }
    });
  } catch(e) {
    console.error('[AFF-WITHDRAW-REQUEST] Sheet error:', e.message);
    throw new Error('Impossible d\'enregistrer la demande');
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
}

// ==================== AFF-APPROVE-WITHDRAW ====================
// Appelé manuellement par l'admin via votre dashboard Google Sheet ou un outil admin
if (action === 'aff-approve-withdraw') {
  const { targetEmail } = body;
  if (!targetEmail) throw new Error("targetEmail requis");

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    // 1. Mettre à jour Affiliates
    const affRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Affiliates!A:I"
    });
    const affRows = affRes.data.values || [];

    const updatePromises = [];
    affRows.forEach(function(row, idx) {
      if (normalize(row[0] || '') === normalize(targetEmail)) {
        updatePromises.push(
          sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Affiliates!G${idx + 1}`,
            valueInputOption: 'RAW',
            resource: { values: [['approved']] }
          })
        );
      }
    });
    await Promise.all(updatePromises);

    // 2. Mettre à jour AffWithdrawals
    const wRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "AffWithdrawals!A:F"
    });
    const wRows = wRes.data.values || [];

    const wPromises = [];
    wRows.forEach(function(row, idx) {
      if (normalize(row[0] || '') === normalize(targetEmail) && (row[3] || '').toLowerCase() === 'pending') {
        wPromises.push(
          sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `AffWithdrawals!D${idx + 1}:F${idx + 1}`,
            valueInputOption: 'RAW',
            resource: { values: [['approved', new Date().toISOString()]] }
          })
        );
      }
    });
    await Promise.all(wPromises);
  } catch(e) {
    console.error('[AFF-APPROVE-WITHDRAW] Sheet error:', e.message);
    throw new Error('Impossible d\'approuver le retrait');
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
}

// ================================================================
//   FIN AFFILIATION HANDLERS
// ================================================================








    throw new Error("Action inconnue");
  } catch (error) {
    console.error("SAVE ERROR:", error.message);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};