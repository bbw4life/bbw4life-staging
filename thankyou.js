// thankyou.js — BBW4LIFE Order Confirmation
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 BBW4LIFE thankyou.html LOADED - Starting verification...");

    const spinner   = document.getElementById('spinner');
    const messageEl = document.getElementById('message');
    const buttonsEl = document.getElementById('buttons');

    const urlParams  = new URLSearchParams(window.location.search);
    const sessionId  = urlParams.get('session_id');
    const orderID    = urlParams.get('token');
    const forceReset = urlParams.get('reset') === '1';

    console.log(`📌 sessionId: ${sessionId} | orderID: ${orderID} | forceReset: ${forceReset}`);

    // Force reset pour ce test
    if (forceReset) {
        sessionStorage.clear();
        console.log("🔄 sessionStorage cleared (forceReset)");
    }

    let payload = null;
    if (sessionId) payload = { provider: 'stripe',  sessionId };
    else if (orderID) payload = { provider: 'paypal', orderID  };

    if (!payload) {
        displayError("We're sorry, but we couldn't find your payment information. Please contact the BBW4LIFE support team for assistance — we're here for you.");
        spinner.style.display = "none";
        return;
    }

    console.log("🔄 Bypassing alreadyVerified check for debugging");

    try {
        const functionUrl = `${window.location.origin}/.netlify/functions/verify-payment`;
        console.log(`📡 Calling: ${functionUrl}`);

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log(`📡 Response status: ${response.status}`);

        if (response.status === 404) {
            throw new Error("We're experiencing a temporary issue with order verification. Please try again in a moment or contact BBW4LIFE support — we will make it right.");
        }

        const data = await response.json();
        console.log("📦 Data received:", data);

        if (!response.ok || !data.success) {
            throw new Error(data.error || "There was an issue verifying your order. Please contact BBW4LIFE support and we'll take care of you right away.");
        }

        // Sauvegarde après succès uniquement
        sessionStorage.setItem("paymentVerified", sessionId || orderID);

        showSuccess();
        console.log("🎉 VERIFICATION COMPLETED — Welcome to the BBW4LIFE family!");

    } catch (error) {
        console.error("❌ ERREUR COMPLETE:", error);
        displayError(error.message || "An unexpected error occurred. Please contact BBW4LIFE support and we'll resolve it for you.");
    } finally {
        spinner.style.display = "none";
    }
});

// ── Show success state + reveal all extra sections ──
function showSuccess() {
    document.getElementById('message').innerHTML = `
        <h1>Welcome to the BBW4LIFE Family! 💖</h1>
        <p>Your order has been confirmed — and we couldn't be more excited for you!</p>
        <p>✅ <strong>Your order is confirmed!</strong></p>
        <p>Your package is being prepared with care and will be on its way to you soon.</p>
        <p>📧 Please check your email inbox for your order details and tracking number.</p>
        <p>Remember: <em>Beauty Has No Sizes.</em> You made the right choice — for yourself. 🌸</p>
    `;
    document.getElementById('message').style.display  = 'block';
    document.getElementById('buttons').style.display  = 'block';

    // ✅ Appel direct — fiable, sans observer
    if (typeof revealExtraSections === 'function') {
        revealExtraSections();
    }
}

// ── Show error state ──
function displayError(message) {
    document.getElementById('message').innerHTML = `<p class="error">${message}</p>`;
    document.getElementById('message').style.display = 'block';
    document.getElementById('buttons').style.display = 'block';
}