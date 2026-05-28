/* ============================================================
   BBW4LIFE — 404-extra.js
   ============================================================ */

'use strict';

/* ── Inject social links from settings if products.data.json is available ── */
(function () {
  fetch('/products.data.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var settings    = (Array.isArray(data) ? data : []).find(function (p) { return p.type === 'settings'; }) || {};
      var socialLinks = settings.social_links || {};

      /* Map social network → href */
      var socialMap = {
        facebook:  socialLinks.facebook,
        instagram: socialLinks.instagram,
        tiktok:    socialLinks.tiktok,
        youtube:   socialLinks.youtube,
        pinterest: socialLinks.pinterest,
        whatsapp:  socialLinks.whatsapp,
        twitter:   socialLinks.twitter
      };

      /* Apply to all drawer socials on this page (if drawer is present) */
      document.querySelectorAll('[data-social]').forEach(function (el) {
        var key = el.dataset.social;
        if (socialMap[key]) el.href = socialMap[key];
      });

      /* Inject free shipping threshold if any span present */
      var threshold = (settings.cart_drawer && settings.cart_drawer.free_shipping_threshold) || 75;
      document.querySelectorAll('.hdr-free-shipping-threshold').forEach(function (el) {
        el.textContent = threshold;
      });
    })
    .catch(function () {
      /* Silently fail — not critical on a 404 page */
    });
})();