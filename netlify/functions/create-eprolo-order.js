// create-eprolo-order.js

export async function onRequestPost(context) {
  const { request, env } = context;
  console.log("[EPROLO ORDER] Function invoked");

  try {
    let payload;
    try {
      payload = await request.json();
    } catch {
      throw new Error("No data received");
    }

    const { cart, shipping } = payload;
    if (!Array.isArray(cart) || cart.length === 0) throw new Error("Invalid cart data");

    const apiKey = env.EPROLO_API_KEY;
    const apiSecret = env.EPROLO_API_SECRET;
    if (!apiKey || !apiSecret) throw new Error("EPROLO_API_KEY or EPROLO_API_SECRET missing in env");

    const timestamp = Date.now();
    const sign = await md5(apiKey + timestamp + apiSecret);

    const uniqueOrderId = `ORDER_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // Nettoyage adresse (fixe le "AveToronto")
    const cleanAddress = (shipping.address || '').trim()
      .replace(/AveToronto/gi, 'Ave Toronto')
      .replace(/([a-zA-Z])(\d)/g, '$1 $2'); // ajoute espace si collé

    const orderBody = {
      order_id: uniqueOrderId,
      order_number: uniqueOrderId,
      note: "website order",
      shipping_name: shipping.fullName || `${shipping.firstName || ''} ${shipping.lastName || ''}`.trim(),
      shipping_phone: shipping.phone || "0000000000",
      shipping_country: shipping.country || 'Canada',
      shipping_country_code: shipping.countryCode || 'CA',
      shipping_address: cleanAddress,
      shipping_address2: "",
      shipping_city: shipping.city || '',
      shipping_province: shipping.state || '',
      shipping_province_code: shipping.provinceCode || shipping.state?.substring(0, 2).toUpperCase() || '',
      shipping_zip: shipping.postalCode || '',
      logistics_id: 1,
      shipping_method: shipping.shipping_method || "Standard Shipping",
      orderItemlist: cart.map(item => ({
        variantsid: item.variantsid || '',
        quantity: parseInt(item.quantity) || 1
      }))
    };

    const eproloUrl = `https://openapi.eprolo.com/add_order.html?sign=${sign}&timestamp=${timestamp}`;

    console.log("SENDING TO EPROLO:", JSON.stringify(orderBody, null, 2));
    console.log("URL utilisée:", eproloUrl);

    const eproloResponse = await fetch(eproloUrl, {
      method: "POST",
      headers: { "apiKey": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(orderBody)
    });

    const responseText = await eproloResponse.text();
    console.log(`[EPROLO] Status: ${eproloResponse.status}`);
    console.log(`[EPROLO] Réponse brute: ${responseText}`);

    let data = {};
    try { data = JSON.parse(responseText); } catch {}

    if (eproloResponse.ok && (data.code === 0 || data.code === "0")) {
      console.log("[EPROLO] ✅ Order created successfully");
      return jsonResponse(200, { success: true, message: data.msg || "Order sent to Eprolo successfully" });
    } else {
      const errorMsg = data.msg || responseText.trim() || "Eprolo order creation failed";
      console.error("[EPROLO] ❌ REJETÉ :", errorMsg);
      return jsonResponse(200, { success: false, error: errorMsg, code: data.code });
    }
  } catch (error) {
    console.error("[EPROLO ORDER ERROR]", error.message);
    return jsonResponse(500, { success: false, error: error.message });
  }
}

export async function onRequestGet() {
  return new Response('Method Not Allowed', { status: 405 });
}

// Helper MD5 (Web Crypto n'a pas MD5 nativement, on utilise une implémentation pure JS)
async function md5(text) {
  // Implémentation MD5 légère, sans dépendance externe
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

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json" }
  });
}