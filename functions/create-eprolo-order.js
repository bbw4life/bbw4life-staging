// functions/create-eprolo-order.js
function md5(str) {
    function safeAdd(x, y) {
        const lsw = (x & 0xffff) + (y & 0xffff);
        const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xffff);
    }
    function bitRotateLeft(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
    function md5cmn(q, a, b, x, s, t) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
    function md5ff(a, b, c, d, x, s, t) { return md5cmn((b & c) | (~b & d), a, b, x, s, t); }
    function md5gg(a, b, c, d, x, s, t) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function md5hh(a, b, c, d, x, s, t) { return md5cmn(b ^ c ^ d, a, b, x, s, t); }
    function md5ii(a, b, c, d, x, s, t) { return md5cmn(c ^ (b | ~d), a, b, x, s, t); }

    const bytes = new TextEncoder().encode(str);
    const len8 = bytes.length;
    const len32 = Math.ceil((len8 + 9) / 64) * 16;
    const M = new Int32Array(len32);
    for (let i = 0; i < len8; i++) M[i >> 2] |= bytes[i] << ((i % 4) * 8);
    M[len8 >> 2] |= 0x80 << ((len8 % 4) * 8);
    M[len32 - 2] = len8 * 8;

    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (let i = 0; i < len32; i += 16) {
        const [a0, b0, c0, d0] = [a, b, c, d];
        a = md5ff(a,b,c,d,M[i+0],7,-680876936);   b = md5ff(d,a,b,c,M[i+1],12,-389564586);
        c = md5ff(c,d,a,b,M[i+2],17,606105819);   d = md5ff(b,c,d,a,M[i+3],22,-1044525330);
        a = md5ff(a,b,c,d,M[i+4],7,-176418897);   b = md5ff(d,a,b,c,M[i+5],12,1200080426);
        c = md5ff(c,d,a,b,M[i+6],17,-1473231341); d = md5ff(b,c,d,a,M[i+7],22,-45705983);
        a = md5ff(a,b,c,d,M[i+8],7,1770035416);   b = md5ff(d,a,b,c,M[i+9],12,-1958414417);
        c = md5ff(c,d,a,b,M[i+10],17,-42063);     d = md5ff(b,c,d,a,M[i+11],22,-1990404162);
        a = md5ff(a,b,c,d,M[i+12],7,1804603682);  b = md5ff(d,a,b,c,M[i+13],12,-40341101);
        c = md5ff(c,d,a,b,M[i+14],17,-1502002290);d = md5ff(b,c,d,a,M[i+15],22,1236535329);
        a = md5gg(a,b,c,d,M[i+1],5,-165796510);   b = md5gg(d,a,b,c,M[i+6],9,-1069501632);
        c = md5gg(c,d,a,b,M[i+11],14,643717713);  d = md5gg(b,c,d,a,M[i+0],20,-373897302);
        a = md5gg(a,b,c,d,M[i+5],5,-701558691);   b = md5gg(d,a,b,c,M[i+10],9,38016083);
        c = md5gg(c,d,a,b,M[i+15],14,-660478335); d = md5gg(b,c,d,a,M[i+4],20,-405537848);
        a = md5gg(a,b,c,d,M[i+9],5,568446438);    b = md5gg(d,a,b,c,M[i+14],9,-1019803690);
        c = md5gg(c,d,a,b,M[i+3],14,-187363961);  d = md5gg(b,c,d,a,M[i+8],20,1163531501);
        a = md5gg(a,b,c,d,M[i+13],5,-1444681467); b = md5gg(d,a,b,c,M[i+2],9,-51403784);
        c = md5gg(c,d,a,b,M[i+7],14,1735328473);  d = md5gg(b,c,d,a,M[i+12],20,-1926607734);
        a = md5hh(a,b,c,d,M[i+5],4,-378558);      b = md5hh(d,a,b,c,M[i+8],11,-2022574463);
        c = md5hh(c,d,a,b,M[i+11],16,1839030562); d = md5hh(b,c,d,a,M[i+14],23,-35309556);
        a = md5hh(a,b,c,d,M[i+1],4,-1530992060);  b = md5hh(d,a,b,c,M[i+4],11,1272893353);
        c = md5hh(c,d,a,b,M[i+7],16,-155497632);  d = md5hh(b,c,d,a,M[i+10],23,-1094730640);
        a = md5hh(a,b,c,d,M[i+13],4,681279174);   b = md5hh(d,a,b,c,M[i+0],11,-358537222);
        c = md5hh(c,d,a,b,M[i+3],16,-722521979);  d = md5hh(b,c,d,a,M[i+6],23,76029189);
        a = md5hh(a,b,c,d,M[i+9],4,-640364487);   b = md5hh(d,a,b,c,M[i+12],11,-421815835);
        c = md5hh(c,d,a,b,M[i+15],16,530742520);  d = md5hh(b,c,d,a,M[i+2],23,-995338651);
        a = md5ii(a,b,c,d,M[i+0],6,-198630844);   b = md5ii(d,a,b,c,M[i+7],10,1126891415);
        c = md5ii(c,d,a,b,M[i+14],15,-1416354905);d = md5ii(b,c,d,a,M[i+5],21,-57434055);
        a = md5ii(a,b,c,d,M[i+12],6,1700485571);  b = md5ii(d,a,b,c,M[i+3],10,-1894986606);
        c = md5ii(c,d,a,b,M[i+10],15,-1051523);   d = md5ii(b,c,d,a,M[i+1],21,-2054922799);
        a = md5ii(a,b,c,d,M[i+8],6,1873313359);   b = md5ii(d,a,b,c,M[i+15],10,-30611744);
        c = md5ii(c,d,a,b,M[i+6],15,-1560198380); d = md5ii(b,c,d,a,M[i+13],21,1309151649);
        a = md5ii(a,b,c,d,M[i+4],6,-145523070);   b = md5ii(d,a,b,c,M[i+11],10,-1120210379);
        c = md5ii(c,d,a,b,M[i+2],15,718787259);   d = md5ii(b,c,d,a,M[i+9],21,-343485551);
        a = safeAdd(a, a0); b = safeAdd(b, b0); c = safeAdd(c, c0); d = safeAdd(d, d0);
    }

    const hex = [];
    for (const n of [a, b, c, d]) {
        for (let j = 0; j < 4; j++) hex.push(((n >> (j * 8)) & 0xff).toString(16).padStart(2, '0'));
    }
    return hex.join('');
}

function cfResponse(statusCode, body) {
    return new Response(JSON.stringify(body), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function onRequestPost(context) {
    const { request, env } = context;
    console.log("[EPROLO ORDER] Function invoked");

    try {
        const body = await request.json();
        if (!body) throw new Error("No data received");
        const { cart, shipping } = body;
        if (!Array.isArray(cart) || cart.length === 0) throw new Error("Invalid cart data");

        const apiKey = env.EPROLO_API_KEY;
        const apiSecret = env.EPROLO_API_SECRET;
        if (!apiKey || !apiSecret) throw new Error("EPROLO_API_KEY or EPROLO_API_SECRET missing in env");

        const timestamp = Date.now();
        const sign = md5(apiKey + timestamp + apiSecret);

        const uniqueOrderId = `ORDER_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

        const cleanAddress = (shipping.address || '').trim()
            .replace(/AveToronto/gi, 'Ave Toronto')
            .replace(/([a-zA-Z])(\d)/g, '$1 $2');

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
            shipping_province_code: shipping.provinceCode || shipping.state?.substring(0,2).toUpperCase() || '',
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
            return cfResponse(200, { success: true, message: data.msg || "Order sent to Eprolo successfully" });
        } else {
            const errorMsg = data.msg || responseText.trim() || "Eprolo order creation failed";
            console.error("[EPROLO] ❌ REJETÉ :", errorMsg);
            return cfResponse(200, { success: false, error: errorMsg, code: data.code });
        }
    } catch (error) {
        console.error("[EPROLO ORDER ERROR]", error.message);
        return cfResponse(500, { success: false, error: error.message });
    }
}