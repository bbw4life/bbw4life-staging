// functions/create-stripe-session.js
import Stripe from 'stripe';
import { saveTempOrder } from './temp-orders-store.js';

// ── Fetch settings from products.data.json ──────────────────────────
async function getSettings(env) {
  try {
    const BASE_URL = env.BASE_URL || '';
    const res = await fetch(`${BASE_URL}/products.data.json`);
    if (!res.ok) throw new Error('Failed to fetch products.data.json');
    const data = await res.json();
    const settings = data.find(p => p.type === 'settings') || {};
    return settings;
  } catch (err) {
    console.warn('[STRIPE] Could not load products.data.json, using defaults:', err.message);
    return {};
  }
}

// ── Compute effective shipping & tax based on settings ───────────────
function computeTotals(cart, settings, shippingMethod) {
  const cd = settings.cart_drawer || {};
  const SHIPPING_COST = parseFloat(settings.shipping_cost) || 10.00;
  const TAX_RATE = parseFloat(settings.tax_rate) || 0.00;
  const freeShippingThreshold = parseFloat(cd.free_shipping_threshold) || 0;

  const subtotal = cart.reduce((sum, item) => {
    return sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0);
  }, 0);

  const isFreeMethod = ['Standard Shipping', 'Economy Shipping'].includes(shippingMethod);
  const isFreeByThreshold = freeShippingThreshold > 0 && subtotal >= freeShippingThreshold;

  const isFree = isFreeMethod || isFreeByThreshold;

  return {
    subtotal: subtotal,
    shippingCost: isFree ? 0 : SHIPPING_COST,
    taxAmount: isFree ? 0 : subtotal * TAX_RATE,
  };
}

// ── Enforce free promo items (price = 0) from settings ───────────────
function sanitizeCart(cart, settings) {
  const cd = settings.cart_drawer || {};
  const buyQty = parseInt(cd.promo_buy_quantity) || 0;
  const getQty = parseInt(cd.promo_get_quantity) || 0;

  if (!buyQty || !getQty) return cart;

  const paidItems = cart.filter(i => !i.isFreePromo);
  const paidQty = paidItems.reduce((sum, i) => sum + (parseInt(i.quantity) || 0), 0);

  return cart.map(item => {
    if (item.isFreePromo) {
      if (paidQty >= buyQty) {
        return { ...item, price: 0 };
      } else {
        return { ...item, isFreePromo: false };
      }
    }
    return item;
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      throw new Error("No data received");
    }

    const { cart: rawCart, shipping } = body;

    if (!Array.isArray(rawCart) || rawCart.length === 0) throw new Error("Invalid cart data");

    const settings = await getSettings(env);
    const cart = sanitizeCart(rawCart, settings);
    const shippingMethod = shipping?.shipping_method || 'Standard Shipping';
    const { subtotal, shippingCost, taxAmount } = computeTotals(cart, settings, shippingMethod);

    const lineItems = cart.map(item => {
      const price = parseFloat(item.price);
      const qty = parseInt(item.quantity);
      if (price < 0 || !qty) throw new Error("Invalid item");

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.isFreePromo ? `🎁 FREE: ${item.title}` : item.title,
            images: item.image ? [item.image] : []
          },
          unit_amount: Math.round(price * 100)
        },
        quantity: qty
      };
    });

    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Shipping' },
          unit_amount: Math.round(shippingCost * 100)
        },
        quantity: 1
      });
    }

    if (taxAmount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Taxes' },
          unit_amount: Math.round(taxAmount * 100)
        },
        quantity: 1
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${env.BASE_URL}/thankyou.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.BASE_URL}/checkout.html`,
    });

    // ── Stocker cart + shipping complets dans le Sheet temporaire (clé = session.id) ──
    await saveTempOrder(env, session.id, cart, shipping);

    return jsonResponse(200, { success: true, sessionId: session.id });

  } catch (error) {
    console.error("[STRIPE SESSION ERROR]", error.message);
    return jsonResponse(500, { success: false, error: error.message });
  }
}

export async function onRequestGet() {
  return new Response('Method Not Allowed', { status: 405 });
}

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json" }
  });
}