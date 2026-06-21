// functions/get-eprolo-product-detail.js

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

async function handleRequest(context) {
  const { request, env } = context;
  console.log("[EPROLO PRODUCT DETAIL] Function invoked");

  try {
    let productId;
    const url = new URL(request.url);

    if (request.method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch {}
      productId = body.productid || body.productId || body.id;
    }

    if (!productId) {
      productId = url.searchParams.get('productid') ||
                  url.searchParams.get('productId') ||
                  url.searchParams.get('id');
    }

    if (!productId) throw new Error("Missing id in body or ?id=xxx");

    const apiKey = env.EPROLO_API_KEY;
    const apiSecret = env.EPROLO_API_SECRET;
    if (!apiKey || !apiSecret) throw new Error("EPROLO keys missing");

    const timestamp = Date.now();
    const sign = await md5(apiKey + timestamp + apiSecret);

    const eproloUrl = `https://openapi.eprolo.com/getproduct.html?sign=${sign}&timestamp=${timestamp}&id=${productId}`;

    console.log(`[EPROLO] Fetching product id: ${productId}`);
    console.log(`[EPROLO] URL: ${eproloUrl}`);

    const res = await fetch(eproloUrl, {
      method: "GET",
      headers: { "apiKey": apiKey }
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON from Eprolo");
    }

    console.log(`[EPROLO] Status: ${res.status}`);
    console.log(`[EPROLO] Response (first 300 chars): ${text.substring(0, 300)}...`);

    if (data.code !== "0") {
      throw new Error(data.msg || "Eprolo error");
    }

    const product = data.data;
    console.log(`\n=== PRODUIT TROUVÉ : ${product.title} (ID: ${product.id}) ===`);
    console.log("✅ VARIANTSID À UTILISER (copie-colle ces numéros dans products.data.json) :");

    product.variantlist.forEach(v => {
      console.log(`   → variantsid: ${v.id} | ${v.title} | Cost: $${v.cost} | Stock: ${v.inventory_quantity}`);
    });

    return new Response(JSON.stringify({
      success: true,
      productId: product.id,
      title: product.title,
      variantsCount: product.variantlist.length,
      message: "Check logs for correct variantsid"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[EPROLO PRODUCT DETAIL ERROR]", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestPost(context) {
  return handleRequest(context);
}

export async function onRequestGet(context) {
  return handleRequest(context);
}