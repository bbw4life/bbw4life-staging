export default {
  async scheduled(event, env, ctx) {
    const res = await fetch(`${env.BASE_URL}/detect-abandoned-cart`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    console.log('[CRON detect-abandoned-cart]', JSON.stringify(data));
  }
};