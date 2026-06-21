process.removeAllListeners('warning');
const https = require('https');
// Cache en mémoire (6 heures)
let cachedRates = null;
let cacheTime   = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

exports.handler = async function () {
  const now = Date.now();

  // Retourner le cache si encore valide
  if (cachedRates && (now - cacheTime) < CACHE_TTL) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, rates: cachedRates, cached: true })
    };
  }

  // Appel API — exchangerate.host (gratuit, pas de clé requise)
  return new Promise((resolve) => {
    https.get('https://api.exchangerate.host/latest?base=USD', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json && json.rates) {
            cachedRates = json.rates;
            cacheTime   = now;
            resolve({
              statusCode: 200,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ success: true, rates: cachedRates, cached: false })
            });
          } else {
            throw new Error('Invalid response');
          }
        } catch (e) {
          resolve({
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, error: e.message })
          });
        }
      });
    }).on('error', (e) => {
      resolve({
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: e.message })
      });
    });
  });
};