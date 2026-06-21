// functions/retry-pending-order.js
import { getGoogleAuthToken } from './account-token';

async function sheetsGet(accessToken, spreadsheetId, range) {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    return res.json();
}

async function sheetsUpdate(accessToken, spreadsheetId, range, values) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
    });
}

async function getAutoFulfillMode(accessToken, spreadsheetId) {
    try {
        const json = await sheetsGet(accessToken, spreadsheetId, 'Settings!A1');
        const value = (json.values?.[0]?.[0] || 'yes').trim().toLowerCase();
        return value === 'no' ? 'no' : 'yes';
    } catch (e) {
        console.log('[RETRY PENDING] Onglet Settings introuvable, mode par défaut: yes');
        return 'yes';
    }
}

export async function onRequest(context) {
    const { env } = context;
    console.log('[RETRY PENDING] 🚀 Démarrage - ' + new Date().toISOString());

    try {
        const accessToken = await getGoogleAuthToken(env);
        const spreadsheetId = env.SHEET_ID_BBW4LIFE_PENDING_ORDERS;

        const rangesToTry = ['bbw4life-pending-orders!A:R'];
        let rows = [];
        let activeTab = '';
        for (const range of rangesToTry) {
            try {
                const json = await sheetsGet(accessToken, spreadsheetId, range);
                rows = json.values || [];
                if (rows.length > 1) {
                    activeTab = range.split('!')[0];
                    console.log(`[RETRY PENDING] ✅ Onglet détecté : ${activeTab} (${rows.length} lignes)`);
                    break;
                }
            } catch (e) {}
        }

        if (rows.length <= 1) {
            console.log('[RETRY PENDING] Aucune commande en attente');
            return new Response(JSON.stringify({ success: true, processed: 0 }), { status: 200 });
        }

        const autoMode = await getAutoFulfillMode(accessToken, spreadsheetId);
        console.log(`[RETRY PENDING] Mode auto-fulfill : ${autoMode.toUpperCase()}`);

        const dataRows = rows.slice(1);
        const groups = {};
        dataRows.forEach((row, index) => {
            const paymentId = row[2] || '';
            const status = (row[14] || '').toLowerCase();

            const shouldProcess = autoMode === 'yes'
                ? (status === 'pending' || status === 'failed')
                : (status === 'approved');

            if (shouldProcess) {
                if (!groups[paymentId]) groups[paymentId] = [];
                groups[paymentId].push({ row, lineNumber: index + 2 });
            }
        });

        const paymentIds = Object.keys(groups);
        if (paymentIds.length === 0) {
            console.log('[RETRY PENDING] Aucune commande à traiter');
            return new Response(JSON.stringify({ success: true, processed: 0 }), { status: 200 });
        }

        console.log(`[RETRY PENDING] ${paymentIds.length} commande(s) à traiter (une par une)`);

        let processed = 0;
        let successCount = 0;

        for (const paymentId of paymentIds) {
            const group = groups[paymentId];
            processed++;

            const firstRow = group[0].row;
            const shipping = {
                fullName: firstRow[3] || '',
                email: firstRow[4] || '',
                phone: firstRow[5] || '',
                country: firstRow[6] || 'Canada',
                state: firstRow[7] || '',
                city: firstRow[8] || '',
                postalCode: firstRow[9] || '',
                address: firstRow[10] || '',
                shipping_method: firstRow[17] || 'Standard Shipping',
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
                const variantsid = row[12] || '';
                const quantity = parseInt(row[13]) || 1;
                if (variantsid) cartMap[variantsid] = (cartMap[variantsid] || 0) + quantity;
            });
            const cart = Object.keys(cartMap).map(v => ({ variantsid: v, quantity: cartMap[v] }));

            try {
                const createRes = await fetch(`${env.BASE_URL}/create-eprolo-order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cart, shipping })
                });
                const createData = await createRes.json();

                if (createData.success) {
                    for (const { lineNumber } of group) {
                        await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-pending-orders!O${lineNumber}`, [['successful']]);
                    }
                    successCount++;
                    console.log(` ✅ SUCCÈS pour ${paymentId}`);
                } else {
                    throw new Error(createData.error || 'Échec Eprolo');
                }
            } catch (err) {
                console.error(` ❌ ÉCHEC pour ${paymentId}: ${err.message}`);
                for (const { lineNumber } of group) {
                    await sheetsUpdate(accessToken, spreadsheetId, `bbw4life-pending-orders!O${lineNumber}`, [['failed']]);
                }
            }

            await new Promise(r => setTimeout(r, 1200));
        }

        console.log(`[RETRY PENDING] ✅ FIN - Traités: ${processed} | Réussis: ${successCount}`);
        return new Response(JSON.stringify({ success: true, processed, fulfilled: successCount }), { status: 200 });

    } catch (error) {
        console.error('RETRY ERROR:', error.message);
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
}