async function notifyTelegram(message) {
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch (e) {
    console.warn('[Telegram] Notification failed:', e.message);
  }
}

module.exports = { notifyTelegram };