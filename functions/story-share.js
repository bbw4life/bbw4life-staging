// functions/story-share.js
import { notifyTelegram } from './notify-telegram';
import { getGoogleAuthToken } from './account-token';

const SHEET_NAME = 'bbw4life-stories';

const HEADERS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

function formatDate() {
    const d = new Date();
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear().toString().slice(-2)}`;
}

// ── SAVE ──────────────────────────────────────────────────────────────
async function saveStory(body, env) {
    const {
        firstName, age, email, country,
        bodyPressureDuration, bbwHelped, discoveredWhen,
        selfChange, wordToday, toldBefore,
        story, mentalQuote, rating, photo, anonymous
    } = body;

    if (!firstName || !email || !bodyPressureDuration || !bbwHelped || !story || !selfChange) {
        throw new Error('Required fields missing');
    }

    const accessToken = await getGoogleAuthToken(env);
    const spreadsheetId = env.SHEET_ID_BBW4LIFE_STORIES;

    const values = [[
        firstName.trim(),
        age                  || '',
        email.trim().toLowerCase(),
        country              || '',
        bodyPressureDuration || '',
        bbwHelped            || '',
        discoveredWhen       || '',
        selfChange           || '',
        wordToday            || '',
        toldBefore           || '',
        story.trim(),
        mentalQuote          || '',
        rating               || '5',
        photo                || '',
        anonymous === true || anonymous === 'true' ? 'yes' : 'no',
        'pending',
        formatDate()
    ]];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_NAME}!A:Q:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
    });

    await notifyTelegram(env,
        `💕 <b>Waww Pdg Francenel, une personne vient de partager son story, c'est en attente!</b>\n\n` +
        `👤 <b>Prénom:</b> ${firstName}\n` +
        `📧 <b>Email:</b> ${email}\n` +
        `🌍 <b>Pays:</b> ${country || 'N/A'}\n` +
        `⭐ <b>Note:</b> ${rating || '5'}/5`
    );

    return { success: true };
}

// ── FETCH approved stories ─────────────────────────────────────────────
async function fetchStories(env) {
    const accessToken = await getGoogleAuthToken(env);
    const spreadsheetId = env.SHEET_ID_BBW4LIFE_ACCOUNTS;

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_NAME}!A:Q`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const json = await res.json();
    const rows = json.values || [];

    const stories = rows
        .slice(1)
        .filter(r => r[15] && r[15].toString().toLowerCase() === 'approved')
        .map(r => ({
            firstName:           r[14] && r[14].toString().toLowerCase() === 'yes' ? 'Anonymous' : (r[0] || 'Anonymous'),
            age:                 r[1]  || '',
            country:             r[3]  || '',
            bodyPressureDuration:r[4]  || '',
            bbwHelped:           r[5]  || '',
            discoveredWhen:      r[6]  || '',
            selfChange:          r[7]  || '',
            wordToday:           r[8]  || '',
            toldBefore:          r[9]  || '',
            story:               r[10] || '',
            mentalQuote:         r[11] || '',
            rating:              r[12] || '5',
            photo:               r[13] || '',
            date:                r[16] || ''
        }));

    return { success: true, stories };
}

// ── HANDLER ───────────────────────────────────────────────────────────
export async function onRequest(context) {
    const { request, env } = context;
    const method = request.method;

    if (method === 'OPTIONS') {
        return new Response('', { status: 200, headers: HEADERS });
    }

    try {
        if (method === 'POST') {
            const body = await request.json();
            const data = await saveStory(body, env);
            return new Response(JSON.stringify(data), { status: 200, headers: HEADERS });
        }

        if (method === 'GET') {
            const data = await fetchStories(env);
            return new Response(JSON.stringify(data), { status: 200, headers: HEADERS });
        }

        return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: HEADERS });

    } catch (err) {
        console.error('STORY-SHARE ERROR:', err.message);
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: HEADERS });
    }
}