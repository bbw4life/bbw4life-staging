// functions/account-token.js

function normalizeEmail(email) {
  return (email || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

// Génère un token = HMAC-SHA256(email_normalisé, SECRET)
async function generateAccountToken(env, email) {
  const secret = env.ACCOUNT_TOKEN_SECRET;
  if (!secret) throw new Error('ACCOUNT_TOKEN_SECRET not configured');
  const normalized = normalizeEmail(email);

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(normalized)
  );

  return bufferToHex(signature);
}

// Vérifie que le token fourni correspond bien à l'email fourni
async function verifyAccountToken(env, email, token) {
  if (!email || !token) return false;
  const expected = await generateAccountToken(env, email);

  // Comparaison à temps constant pour éviter les timing attacks
  return timingSafeEqual(expected, token);
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Comparaison à temps constant (équivalent crypto.timingSafeEqual)
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export { generateAccountToken, verifyAccountToken, normalizeEmail };