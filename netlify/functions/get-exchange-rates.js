// functions/get-exchange-rates.js

// Cache en mémoire (6 heures)
let cachedRates = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

export async function onRequestGet() {
  const now = Date.now();

  // Retourner le cache si encore valide
  if (cachedRates && (now - cacheTime) < CACHE_TTL) {
    return jsonResponse(200, { success: true, rates: cachedRates, cached: true });
  }

  // Appel API — exchangerate.host (gratuit, pas de clé requise)
  try {
    const res = await fetch('https://api.exchangerate.host/latest?base=USD');
    const json = await res.json();

    if (json && json.rates) {
      cachedRates = json.rates;
      cacheTime = now;
      return jsonResponse(200, { success: true, rates: cachedRates, cached: false });
    } else {
      throw new Error('Invalid response');
    }
  } catch (e) {
    return jsonResponse(500, { success: false, error: e.message });
  }
}

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}