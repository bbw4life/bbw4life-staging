// functions/save-message.js
import { notifyTelegram } from './notify-telegram';
import { getGoogleAuthToken } from './account-token';

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const { firstName, lastName, email, subject, category, message } = body;

        if (!firstName || !lastName || !email || !subject || !message) {
            throw new Error("All fields are required");
        }

        const normalize = (str) => str ? str.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";

        const accessToken = await getGoogleAuthToken(env);
        const spreadsheetId = env.SHEET_ID_BBW4LIFE_ACCOUNTS;

        function formatDate() {
            const d = new Date();
            return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear().toString().slice(-2)}`;
        }

        const values = [[
            normalize(firstName),
            normalize(lastName),
            normalize(email),
            subject,
            category || "N/A",
            message,
            formatDate()
        ]];

        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/bbw4life-contact-messages!A:G:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values })
        });

        await notifyTelegram(env,
        `📩 <b>Pdg Francenel, un client vient de vous envoyer un message depuis la page contact!</b>\n\n` +
        `👤 <b>Nom:</b> ${firstName} ${lastName}\n` +
        `📧 <b>Email:</b> ${email}\n` +
        `📌 <b>Sujet:</b> ${subject}\n` +
        `🗂️ <b>Catégorie:</b> ${category || 'N/A'}`
        );

        fetch(`${env.BASE_URL}/send-email-auto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                trigger:   'contact_reply',
                email:     email,
                firstName: firstName,
                lastName:  lastName,
                subject:   subject,
                category:  category || 'N/A'
            })
        }).catch(e => console.warn('[Email] contact_reply failed:', e.message));

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        console.error("SAVE MESSAGE ERROR:", error.message);
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
}