// functions/get-product-stock.js

const INTERNAL_TO_CJ = {
  'Pdg-Francenel-product1':  '31246341',
  'Pdg-Francenel-product2':  '31246339',
  'Pdg-Francenel-product3':  '31246387',
  'Pdg-Francenel-product4':  '31246342',
  'Pdg-Francenel-product5':  '31246386',
  'Pdg-Francenel-product6':  '31350659',
  'Pdg-Francenel-product7':  '31246232',
  'Pdg-Francenel-product8':  '31246385',
  'Pdg-Francenel-product9':  '31246336',
  'Pdg-Francenel-product10': '31246377',
  'Pdg-Francenel-product11': '31246323',
  'Pdg-Francenel-product12': '31246335',
  'Pdg-Francenel-product13': '31246346',
  'Pdg-Francenel-product14': '31246417',
  'Pdg-Francenel-product15': '31246429',
  'Pdg-Francenel-product16': '31246437',
};

// ── MD5 pure JS (remplace crypto.createHash('md5'), absent de Web Crypto) ──
async function md5(text) {
  function rotateLeft(n, s) { return (n << s) | (n >>> (32 - s)); }
  function toHex(n) {
    let s = '', v;
    for (let i = 0; i < 4; i++) {
      v = (n >>> (i * 8)) & 255;
      s += ('0' + v.toString(16)).slice(-2);
    }
    return s;
  }
  function utf8Encode(str) { return unescape(encodeURIComponent(str)); }

  const msg = utf8Encode(text);
  const msgLen = msg.length;
  const wordArray = [];
  for (let i = 0; i < msgLen - 3; i += 4) {
    wordArray.push(msg.charCodeAt(i) | (msg.charCodeAt(i + 1) << 8) | (msg.charCodeAt(i + 2) << 16) | (msg.charCodeAt(i + 3) << 24));
  }
  switch (msgLen % 4) {
    case 0: wordArray.push(0x80); break;
    case 1: wordArray.push(msg.charCodeAt(msgLen - 1) | 0x8000); break;
    case 2: wordArray.push(msg.charCodeAt(msgLen - 2) | (msg.charCodeAt(msgLen - 1) << 8) | 0x800000); break;
    case 3: wordArray.push(msg.charCodeAt(msgLen - 3) | (msg.charCodeAt(msgLen - 2) << 8) | (msg.charCodeAt(msgLen - 1) << 16) | 0x80000000); break;
  }
  while (wordArray.length % 16 !== 14) wordArray.push(0);
  wordArray.push(msgLen * 8);
  wordArray.push(0);

  const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const K = [];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);

  let a0 = 1732584193, b0 = -271733879, c0 = -1732584194, d0 = 271733878;

  for (let blockStart = 0; blockStart < wordArray.length; blockStart += 16) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + (wordArray[blockStart + g] || 0)) | 0;
      A = D; D = C; C = B;
      B = (B + rotateLeft(F, S[i])) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }

  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export async function onRequestOptions() {
  return new Response('', { status: 200, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const rawParam = url.searchParams.get('cj_id');

  if (!rawParam) {
    return new Response(JSON.stringify({ success: false, error: 'Missing cj_id parameter' }), {
      status: 400,
      headers: CORS_HEADERS
    });
  }

  const cj_id = INTERNAL_TO_CJ[rawParam] || rawParam;

  try {
    const apiKey = env.EPROLO_API_KEY;
    const apiSecret = env.EPROLO_API_SECRET;

    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ success: false, error: 'EPROLO API credentials not configured' }), {
        status: 500,
        headers: CORS_HEADERS
      });
    }

    const timestamp = Date.now();
    const sign = await md5(apiKey + timestamp + apiSecret);

    const eproloUrl = `https://openapi.eprolo.com/getproduct.html?sign=${sign}&timestamp=${timestamp}&id=${cj_id}`;

    const response = await fetch(eproloUrl, {
      method: 'GET',
      headers: { 'apiKey': apiKey }
    });

    const responseText = await response.text();

    let data = {};
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[get-product-stock] JSON parse error:', responseText.slice(0, 200));
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON from EPROLO API' }), {
        status: 500,
        headers: CORS_HEADERS
      });
    }

    if ((data.code === 0 || data.code === '0') && data.data) {
      const product = data.data;
      const variants = product.variantlist || [];

      const totalStock = variants.reduce((sum, v) => {
        return sum + (parseInt(v.inventory_quantity) || 0);
      }, 0);

      return new Response(JSON.stringify({
        success: true,
        cj_id: cj_id,
        internal_id: rawParam,
        totalStock: totalStock,
        variantCount: variants.length
      }), { status: 200, headers: CORS_HEADERS });
    }

    const errMsg = data.msg || 'Product not found';
    console.warn(`[get-product-stock] EPROLO error for cj_id=${cj_id}: ${errMsg}`);
    return new Response(JSON.stringify({
      success: false,
      cj_id: cj_id,
      internal_id: rawParam,
      totalStock: null,
      error: errMsg
    }), { status: 200, headers: CORS_HEADERS });

  } catch (error) {
    console.error('[get-product-stock] Error:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
}