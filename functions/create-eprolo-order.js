// functions/create-eprolo-order.js

async function md5(str) {
    const { createHash } = await import('node:crypto');
    return createHash('md5').update(str).digest('hex');
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
        const sign = await md5(apiKey + timestamp + apiSecret); // ← await ajouté

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