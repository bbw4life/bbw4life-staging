export default {
  async scheduled(event, env, ctx) {
    const res = await fetch(`${env.BASE_URL}/retry-pending-order`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    console.log('[CRON retry-pending]', JSON.stringify(data));
  }
};