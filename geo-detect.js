/* ═══════════════════════════════════════════════════════════════
   BBW4LIFE — GEO-DETECT.JS  v2.1
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── CURRENCY SYSTEM ──
var _exchangeRates   = null;
var _currentCurrency = 'USD';
var _currentSymbol   = '$';
var _ratesFetched    = false;

  var STORAGE_LANG    = 'bbw_lang';
  var STORAGE_COUNTRY = 'bbw_country';
  var MAX_WAIT        = 6000;

  /* ══════════════════════════════════════════════════════════════
     0. CSS — masque TOUT ce que Google Translate peut afficher
        y compris le logo spinner injecté dynamiquement
  ══════════════════════════════════════════════════════════════ */
  (function injectHideStyle() {
    var css = [
      /* ── Barre iframe en haut de page ── */
      '.goog-te-banner-frame,',
      'iframe.goog-te-banner-frame,',
      '.skiptranslate > iframe,',
      '#\\:1\\.container,',

      /* ── Balloon / tooltip flottant ── */
      '.goog-te-balloon-frame,',
      '#goog-gt-tt,',
      '.goog-tooltip,',
      '.goog-tooltip:hover,',

      /* ── Gadget complet + logo spinner + lien Google ── */
      '.goog-te-gadget,',
      '.goog-te-gadget-icon,',
      '.goog-te-gadget-simple,',
      '.goog-logo-link,',
      '.goog-te-ftab-float,',
      '.goog-te-menu-value:hover,',
      '.goog-te-menu-frame,',

      /* ── Spinner / loader qui tourne ── */
      '.goog-te-spinner,',
      '.goog-te-spinner-pos,',
      '#goog-gt-,',

      /* ── Toutes les classes VIpgJd (logo Google Translate) ── */
      '.VIpgJd-ZVi9od-aZ2wEe,',
      '.VIpgJd-ZVi9od-aZ2wEe-wib3jc,',
      '.VIpgJd-ZVi9od-aZ2wEe-OiiCO,',
      '.VIpgJd-ZVi9od-ORHb,',
      '.VIpgJd-ZVi9od-SmfZ,',
      '.VIpgJd-yAWNEb-L7lbkb,',
      '[class^="VIpgJd"],',
      '[class*=" VIpgJd"],',

      /* ── Tous les id commençant par goog-gt ── */
      '[id^="goog-gt"],',

      /* ── Conteneur racine injecté par Google ── */
      '#google_translate_element,',
      '#google_translate_element2,',
      '.skiptranslate:not(font) {',
      '  display:         none !important;',
      '  visibility:      hidden !important;',
      '  height:          0 !important;',
      '  width:           0 !important;',
      '  max-height:      0 !important;',
      '  max-width:       0 !important;',
      '  overflow:        hidden !important;',
      '  pointer-events:  none !important;',
      '  opacity:         0 !important;',
      '  position:        absolute !important;',
      '  top:             -9999px !important;',
      '  left:            -9999px !important;',
      '}',

      /* ── Empêche le body de se décaler vers le bas ── */
      'body { top: 0 !important; }',
      'body.translated-ltr,',
      'body.translated-rtl { margin-top: 0 !important; }'
    ].join('\n');

    var style = document.createElement('style');
    style.id  = 'bbw-hide-google-translate';
    style.textContent = css;
    /* Injecter le plus tôt possible — avant <head> complet si besoin */
    (document.head || document.documentElement).appendChild(style);
  })();

  /* MutationObserver — force le masquage sur les éléments injectés APRÈS le load
     (le spinner apparaît souvent 1-2 s après l'init de Google Translate)        */
  (function watchGoogleInjects() {
    var SELECTORS_TO_HIDE = [
      '.goog-te-banner-frame',
      '.goog-te-gadget',
      '.goog-te-gadget-simple',
      '.goog-logo-link',
      '.goog-te-menu-frame',
      '.goog-te-spinner',
      '.goog-te-spinner-pos',
      '.VIpgJd-ZVi9od-aZ2wEe',
      '.VIpgJd-ZVi9od-aZ2wEe-OiiCO',
      '.VIpgJd-ZVi9od-ORHb',
      '.VIpgJd-ZVi9od-SmfZ',
      '.VIpgJd-yAWNEb-L7lbkb',
      '[class^="VIpgJd"]',
      '[class*=" VIpgJd"]',
      '[id^="goog-gt"]',
      '#goog-gt-',
      '#google_translate_element',
      '#google_translate_element2'
    ];

    function forceHide(el) {
      el.style.cssText += [
        'display:none!important',
        'visibility:hidden!important',
        'height:0!important',
        'width:0!important',
        'overflow:hidden!important',
        'opacity:0!important',
        'pointer-events:none!important',
        'position:absolute!important',
        'top:-9999px!important',
        'left:-9999px!important'
      ].join(';') + ';';
    }

    function scanAndHide() {
      SELECTORS_TO_HIDE.forEach(function (sel) {
        try {
          document.querySelectorAll(sel).forEach(forceHide);
        } catch (e) { /* ignorer les sélecteurs invalides */ }
      });
      /* Masquer aussi tout iframe dont src contient translate.google */
      document.querySelectorAll('iframe').forEach(function (f) {
        var src = f.src || '';
        if (src.indexOf('translate.google') !== -1 || src.indexOf('translate.googleapis') !== -1) {
          forceHide(f);
        }
      });
      /* Remettre body.top à 0 (Google force body à 40px) */
      if (document.body) document.body.style.top = '0';
    }

    /* Observer les mutations DOM pour attraper les éléments injectés tard */
    if (window.MutationObserver) {
      var observer = new MutationObserver(function (mutations) {
        var needed = false;
        mutations.forEach(function (m) {
          if (m.addedNodes.length) needed = true;
        });
        if (needed) scanAndHide();
      });
      var target = document.body || document.documentElement;
      observer.observe(target, { childList: true, subtree: true });
      /* Arrêter après 30 s pour ne pas consommer de ressources indéfiniment */
      setTimeout(function () { observer.disconnect(); }, 30000);
    }

    /* Scans progressifs pour attraper le logo/spinner tardif */
    scanAndHide();
    setTimeout(scanAndHide, 500);
    setTimeout(scanAndHide, 1000);
    setTimeout(scanAndHide, 3000);
    setTimeout(scanAndHide, 5000);
    setTimeout(scanAndHide, 8000);
  })();

  /* ══════════════════════════════════════════════════════════════
     1. COOKIES
  ══════════════════════════════════════════════════════════════ */
  function setCookie(name, value, days, domain) {
    var expires = '';
    if (days) {
      var d = new Date();
      d.setTime(d.getTime() + days * 86400000);
      expires = '; expires=' + d.toUTCString();
    }
    var dom = domain ? '; domain=' + domain : '';
    document.cookie = name + '=' + (value || '') + expires + '; path=/' + dom + '; SameSite=Lax';
  }

  function eraseCookie(name) {
    setCookie(name, '', -1);
    setCookie(name, '', -1, location.hostname);
    setCookie(name, '', -1, '.' + location.hostname);
  }

  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  /* ══════════════════════════════════════════════════════════════
     2. PERSISTANCE langue + pays  (localStorage + cookie)
  ══════════════════════════════════════════════════════════════ */
  function saveLang(code) {
    try { localStorage.setItem(STORAGE_LANG, code); } catch (e) {}
    /* Cookie googtrans nécessaire pour Google Translate */
    if (code && code !== 'en') {
      setCookie('googtrans', '/en/' + code, 365);
      setCookie('googtrans', '/en/' + code, 365, '.' + location.hostname);
    } else {
      eraseCookie('googtrans');
    }
  }

  function loadSavedLang() {
    try {
      var ls = localStorage.getItem(STORAGE_LANG);
      if (ls) return ls;
    } catch (e) {}
    /* Fallback : lire le cookie googtrans */
    var c = getCookie('googtrans');
    if (c) { var parts = c.split('/'); return parts[parts.length - 1] || 'en'; }
    return null;
  }

  function saveCountry(code) {
    try { localStorage.setItem(STORAGE_COUNTRY, code); } catch (e) {}
    try { sessionStorage.setItem('bbw_geo_country', code); } catch (e) {}
  }

  function loadSavedCountry() {
    try {
      var ls = localStorage.getItem(STORAGE_COUNTRY);
      if (ls) return ls;
    } catch (e) {}
    try { return sessionStorage.getItem('bbw_geo_country'); } catch (e) {}
    return null;
  }



  /* ══════════════════════════════════════════════════════════════
   CURRENCY — Fetch rates (une seule fois, cache localStorage 6h)
══════════════════════════════════════════════════════════════ */
function fetchExchangeRates(callback) {
  try {
    var cached   = localStorage.getItem('bbw_rates');
    var cachedAt = parseInt(localStorage.getItem('bbw_rates_at') || '0');
    var now      = Date.now();
    if (cached && (now - cachedAt) < 6 * 3600 * 1000) {
      _exchangeRates = JSON.parse(cached);
      _ratesFetched  = true;
      if (callback) callback(_exchangeRates);
      return;
    }
  } catch (e) {}

  fetch('/.netlify/functions/get-exchange-rates')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.success && data.rates) {
        _exchangeRates = data.rates;
        _ratesFetched  = true;
        try {
          localStorage.setItem('bbw_rates',    JSON.stringify(data.rates));
          localStorage.setItem('bbw_rates_at', Date.now().toString());
        } catch (e) {}
        if (callback) callback(_exchangeRates);
      }
    })
    .catch(function () {
      _exchangeRates = {
        USD: 1,    EUR: 0.92,  GBP: 0.79,  CAD: 1.36,  AUD: 1.53,
        DOP: 58.9, HTG: 132,   MXN: 17.2,  BRL: 4.97,  COP: 3950,
        NGN: 1580, GHS: 14.8,  KES: 129,   XOF: 604,   XAF: 604,
        MAD: 10.1, DZD: 134,   TND: 3.09,  EGP: 30.9,  AED: 3.67,
        SAR: 3.75, INR: 83.1,  CNY: 7.24,  JPY: 149,   KRW: 1330,
        SGD: 1.34, MYR: 4.72,  IDR: 15600, THB: 35.1,  VND: 24400,
        PLN: 4.02, RON: 4.57,  TRY: 32.3,  RUB: 91.5,  PKR: 278,
        BDT: 110,  PEN: 3.72,  ARS: 877,   CLP: 952,   NZD: 1.63,
        ZAR: 18.7, CDF: 2750
      };
      _ratesFetched = true;
      if (callback) callback(_exchangeRates);
    });
}

/* Convertir un montant USD → devise cible */
function convertPrice(usdAmount, currencyCode) {
  if (!_exchangeRates || !currencyCode || currencyCode === 'USD') return usdAmount;
  var rate = _exchangeRates[currencyCode];
  if (!rate) return usdAmount;
  return Math.round(usdAmount * rate * 100) / 100;
}

/* Formater un prix avec le bon symbole */
function formatPrice(amount, currencyCode, symbol) {
  var sym      = symbol || _currentSymbol || '$';
  var cur      = currencyCode || _currentCurrency || 'USD';
  var rtl      = ['ar', 'he', 'fa', 'ur'];
  var savedLang = loadSavedLang() || 'en';
  var isRtl    = rtl.indexOf(savedLang) !== -1;
  var decimals = ['JPY', 'KRW', 'IDR', 'VND', 'HTG', 'NGN', 'CDF'].indexOf(cur) !== -1 ? 0 : 2;
  var formatted = amount.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return isRtl ? formatted + ' ' + sym : sym + formatted;
}

/* ── Extraire le montant USD depuis un élément ── */
function extractUsd(el) {
  var usd = parseFloat(el.dataset.usdOriginal);
  if (!isNaN(usd) && usd > 0) return usd;
  return null;
}

/* ── Mettre à jour TOUS les prix dans TOUTES les pages ── */
function updateAllPrices(currencyCode, symbol) {
  _currentCurrency = currencyCode;
  _currentSymbol   = symbol;

  if (!_ratesFetched) {
    fetchExchangeRates(function () { updateAllPrices(currencyCode, symbol); });
    return;
  }

  /* ── Pattern $XX.XX simple ── */
  document.querySelectorAll('*').forEach(function (el) {
    if (el.children.length > 0) return;
    if (el.tagName === 'INPUT' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    var txt = (el.textContent || '').trim();
    if (!/^\$[\d,]+(\.\d{1,2})?$/.test(txt)) return;

    var usd = extractUsd(el);
    if (usd === null) {
      usd = parseFloat(txt.replace(/[$,]/g, ''));
      if (!isNaN(usd) && usd > 0) el.dataset.usdOriginal = usd;
    }
    if (isNaN(usd) || usd <= 0) return;
    el.textContent = formatPrice(convertPrice(usd, currencyCode), currencyCode, symbol);
  });

  /* ── Pattern "Subtotal: $XX.XX" ── */
  document.querySelectorAll('*').forEach(function (el) {
    if (el.children.length > 0) return;
    var txt   = (el.textContent || '').trim();
    var match = txt.match(/^(Subtotal:\s*)\$([0-9,]+(\.[0-9]{1,2})?)$/);
    if (!match) return;

    var usd = extractUsd(el);
    if (usd === null) {
      usd = parseFloat(match[2].replace(/,/g, ''));
      if (!isNaN(usd) && usd > 0) el.dataset.usdOriginal = usd;
    }
    if (isNaN(usd) || usd <= 0) return;
    el.textContent = match[1] + formatPrice(convertPrice(usd, currencyCode), currencyCode, symbol);
  });

  /* ── Pattern "+$XX.XX" (upsell) ── */
  document.querySelectorAll('*').forEach(function (el) {
    if (el.children.length > 0) return;
    var txt   = (el.textContent || '').trim();
    var match = txt.match(/^(\+\s*)\$([0-9,]+(\.[0-9]{1,2})?)$/);
    if (!match) return;

    var usd = extractUsd(el);
    if (usd === null) {
      usd = parseFloat(match[2].replace(/,/g, ''));
      if (!isNaN(usd) && usd > 0) el.dataset.usdOriginal = usd;
    }
    if (isNaN(usd) || usd <= 0) return;
    el.textContent = match[1] + formatPrice(convertPrice(usd, currencyCode), currencyCode, symbol);
  });

  /* ── Pattern "-$XX.XX" (savings) ── */
  document.querySelectorAll('*').forEach(function (el) {
    if (el.children.length > 0) return;
    var txt   = (el.textContent || '').trim();
    var match = txt.match(/^(-\s*)\$([0-9,]+(\.[0-9]{1,2})?)$/);
    if (!match) return;

    var usd = extractUsd(el);
    if (usd === null) {
      usd = parseFloat(match[2].replace(/,/g, ''));
      if (!isNaN(usd) && usd > 0) el.dataset.usdOriginal = usd;
    }
    if (isNaN(usd) || usd <= 0) return;
    el.textContent = match[1] + formatPrice(convertPrice(usd, currencyCode), currencyCode, symbol);
  });

  /* ── Pattern "Add: +$XX.XX" (cart page upsell footer) ── */
  document.querySelectorAll('*').forEach(function (el) {
    if (el.children.length > 0) return;
    var txt   = (el.textContent || '').trim();
    var match = txt.match(/^(Add:\s*\+\s*)\$([0-9,]+(\.[0-9]{1,2})?)$/);
    if (!match) return;

    var usd = extractUsd(el);
    if (usd === null) {
      usd = parseFloat(match[2].replace(/,/g, ''));
      if (!isNaN(usd) && usd > 0) el.dataset.usdOriginal = usd;
    }
    if (isNaN(usd) || usd <= 0) return;
    el.textContent = match[1] + formatPrice(convertPrice(usd, currencyCode), currencyCode, symbol);
  });

  /* ── Recalculer le sous-total depuis le panier (source de vérité) ── */
  updateCartSubtotal(currencyCode, symbol);
}

/* Recalculer le sous-total depuis localStorage */
function updateCartSubtotal(currencyCode, symbol) {
  try {
    var cart = JSON.parse(localStorage.getItem('cart') || '[]');
    var total = cart.reduce(function (sum, item) {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);
    var converted = convertPrice(total, currencyCode);
    var formatted = formatPrice(converted, currencyCode, symbol);

    /* Drawer */
    var subtotalEl = document.querySelector('.subtotal');
    if (subtotalEl) subtotalEl.textContent = 'Subtotal: ' + formatted;

    /* Cart page */
    var cpSubtotal = document.getElementById('cp-subtotal-val');
    var cpTotal    = document.getElementById('cp-total-val');
    var cpSticky   = document.getElementById('cp-sticky-total');
    if (cpSubtotal) cpSubtotal.textContent = formatted;
    if (cpTotal)    cpTotal.textContent    = formatted;
    if (cpSticky)   cpSticky.textContent   = formatted;
  } catch (e) {}
}

/* Exposer pour utilisation externe */
window.convertPrice    = convertPrice;
window.formatPrice     = formatPrice;
window.updateAllPrices = updateAllPrices;

  /* ══════════════════════════════════════════════════════════════
     3. GOOGLE TRANSLATE — injection + appel via combo select
  ══════════════════════════════════════════════════════════════ */
  function injectGoogleTranslate() {
    if (document.getElementById('google_translate_element')) return;

    /* Div caché requis par le script Google */
    var hiddenDiv = document.createElement('div');
    hiddenDiv.id = 'google_translate_element';
    document.body.appendChild(hiddenDiv);

    window.googleTranslateElementInit = function () {
      new google.translate.TranslateElement(
        { pageLanguage: 'en', autoDisplay: false },
        'google_translate_element'
      );
    };

    var s = document.createElement('script');
    s.src   = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════════════
     4. TRADUIRE — cœur de la logique
  ══════════════════════════════════════════════════════════════ */
 function translateTo(langCode) {
  if (!langCode) return;

  var settings3    = (window.__allProducts || []).find(function(p){ return p.type === 'settings'; }) || {};
  var autoTranslate = (settings3.auto_translate || 'yes').toLowerCase();

  if (autoTranslate === 'no' && window._geoAutoTranslating) {
    return;
  }


    langCode = langCode.toLowerCase().trim();

    /* Sauvegarder en premier — même avant le reload */
    saveLang(langCode);

    if (langCode === 'en') {
      /* Repasser en anglais : effacer cookie + reload */
      eraseCookie('googtrans');
      try { localStorage.removeItem(STORAGE_LANG); } catch (e) {}
      location.reload();
      return;
    }

    /* Essayer d'utiliser le combo déjà disponible */
    var tries   = 0;
    var maxTries = 80; /* ~12 s */
    var interval = setInterval(function () {
      tries++;
      var combo = document.querySelector('.goog-te-combo');
      if (combo) {
        combo.value = langCode;
        combo.dispatchEvent(new Event('change'));
        clearInterval(interval);
      } else if (tries >= maxTries) {
        clearInterval(interval);
        /* Dernier recours : cookie posé, on reload pour que Google l'applique */
        location.reload();
      }
    }, 150);
  }

  /* Exposer globalement (utilisé par header.js et footer.js) */
  window.translateTo = translateTo;

  /* ══════════════════════════════════════════════════════════════
     5. SYNCHRONISER TOUS LES SÉLECTEURS
        Appelé chaque fois que la langue ou le pays change
  ══════════════════════════════════════════════════════════════ */
  function syncAllSelectors(langCode, countryCode) {
    var allProducts    = window.__allProducts || [];
    var settings       = allProducts.find(function (p) { return p.type === 'settings'; }) || {};
    var langCfg        = settings.language_selector || {};
    var countryCfg     = settings.country_selector  || {};
    var langOptions    = langCfg.options    || [];
    var countryOptions = countryCfg.options || [];

    var foundLang    = langOptions.find(function (o) { return o.code === langCode; })
                       || langOptions.find(function (o) { return o.code === 'en'; });
    var foundCountry = countryCode
                       ? (countryOptions.find(function (o) { return o.code === countryCode; })
                          || countryOptions.find(function (o) { return o.code === 'us'; }))
                       : null;

    /* ── HEADER desktop lang ── */
    if (foundLang) {
      var hFlag  = document.getElementById('bbwHdrLangFlag');
      var hLabel = document.getElementById('bbwHdrLangLabel');
      if (hFlag)  hFlag.textContent  = foundLang.flag  || '';
      if (hLabel) hLabel.textContent = foundLang.label || foundLang.name || '';

      document.querySelectorAll('#bbwHdrLangDropdown .bbw-hdr-lang__option').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.lang === langCode);
      });
    }

    /* ── DRAWER mobile — LANGUE ── */
    if (foundLang) {
      var dLangFlag  = document.getElementById('bbwDrawerLangFlag');
      var dLangLabel = document.getElementById('bbwDrawerLangLabel');
      if (dLangFlag)  dLangFlag.textContent  = foundLang.flag || '';
      if (dLangLabel) dLangLabel.textContent = foundLang.name || '';

      document.querySelectorAll('#bbwDrawerLangList .bbw-drawer__select-opt').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.lang === langCode);
      });
    }

    /* ── DRAWER mobile — PAYS ── */
    if (foundCountry) {
      var dCFlag  = document.getElementById('bbwDrawerCountryFlag');
      var dCLabel = document.getElementById('bbwDrawerCountryLabel');
      if (dCFlag)  dCFlag.textContent  = foundCountry.flag  || '';
      if (dCLabel) dCLabel.textContent = foundCountry.label || foundCountry.name || '';

      document.querySelectorAll('#bbwDrawerCountryList .bbw-drawer__select-opt').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.country === countryCode);
      });
    }

    /* ── FOOTER custom dropdown — LANGUE ── */
    if (foundLang) {
      var fLangFlag  = document.getElementById('bbwLangFlag2');
      var fLangLabel = document.getElementById('bbwLangLabel2');
      if (fLangFlag)  fLangFlag.textContent  = foundLang.flag || '';
      if (fLangLabel) fLangLabel.textContent = foundLang.name || '';

      var fLangList = document.getElementById('bbwLangList');
      if (fLangList) {
        fLangList.querySelectorAll('li').forEach(function (li) {
          li.classList.toggle('active', li.dataset.value === langCode);
        });
      }

      var fLangSel = document.getElementById('bbwFooterLangSelect');
      if (fLangSel) fLangSel.value = langCode;
    }

    /* ── FOOTER custom dropdown — PAYS ── */
    if (foundCountry) {
      var fCFlag  = document.getElementById('bbwCountryFlag');
      var fCLabel = document.getElementById('bbwCountryLabel');
      if (fCFlag)  fCFlag.textContent  = foundCountry.flag || '';
      if (fCLabel) {
        var cur = foundCountry.currency ? ' | ' + foundCountry.currency : '';
        fCLabel.textContent = (foundCountry.name || '') + cur;
      }

      var fCList = document.getElementById('bbwCountryList');
      if (fCList) {
        fCList.querySelectorAll('li').forEach(function (li) {
          li.classList.toggle('active', li.dataset.value === countryCode);
        });
      }

      var fCSel = document.getElementById('bbwFooterCountrySelect');
      if (fCSel) fCSel.value = countryCode;
    }
  }

  /* ══════════════════════════════════════════════════════════════
     6. APPLIQUER UN PAYS (depuis géo ou sélection manuelle)
  ══════════════════════════════════════════════════════════════ */
  function applyCountry(countryCode, forceLangTranslate) {
    countryCode = (countryCode || 'us').toLowerCase();

    var allProducts    = window.__allProducts || [];
    var settings       = allProducts.find(function (p) { return p.type === 'settings'; }) || {};
    var countryCfg     = settings.country_selector  || {};
    var countryOptions = countryCfg.options || [];

    var found = countryOptions.find(function (o) { return o.code === countryCode; })
                || countryOptions.find(function (o) { return o.code === 'us'; });
    if (!found) return;

    saveCountry(found.code);

    var targetLang = found.lang || 'en';

    /* Si une langue est déjà sauvegardée manuellement, la respecter */
    var savedLang = loadSavedLang();
    var langToUse = savedLang || targetLang;

    syncAllSelectors(langToUse, found.code);

        // ── CURRENCY CONVERT ──
        var settings2   = (window.__allProducts || []).find(function(p){ return p.type === 'settings'; }) || {};
        var autoCurrency = (settings2.auto_currency || 'yes').toLowerCase() === 'yes';
        if (autoCurrency && found.currency) {
        // Extraire code et symbole depuis "USD $" ou "EUR €"
        var parts2   = found.currency.trim().split(' ');
        var curCode2 = parts2[0] || 'USD';
        var curSym2  = parts2[1] || '$';
        fetchExchangeRates(function () {
            updateAllPrices(curCode2, curSym2);
        });
        }

    /* Traduire seulement si pas encore traduit dans cette langue */
    if (forceLangTranslate || !savedLang) {
      var currentCookie = getCookie('googtrans');
      var currentLang   = currentCookie ? currentCookie.split('/').pop() : 'en';
      if (currentLang !== langToUse) {
        translateTo(langToUse);
      }
    }
  }

  window.applyGeoCountry = applyCountry; /* exposé pour compatibilité */

  /* ══════════════════════════════════════════════════════════════
     7. ÉCOUTER les clics/changements sur TOUS les sélecteurs
        → Met à jour les autres en cascade
  ══════════════════════════════════════════════════════════════ */
  function bindAllSelectors() {

    /* ── Clic sur un bouton [data-lang] (header dropdown + drawer) ── */
    document.addEventListener('click', function (e) {
      var opt = e.target.closest('[data-lang]');
      if (!opt) return;
      /* Ignorer les éléments qui ont aussi data-country (pour ne pas double-déclencher) */
      if (opt.dataset.country) return;
      var lang = (opt.dataset.lang || '').toLowerCase().trim();
      if (!lang) return;

      saveLang(lang);
      syncAllSelectors(lang, loadSavedCountry());
      translateTo(lang);
    });

    /* ── Clic sur un bouton [data-country] (drawer) ── */
    document.addEventListener('click', function (e) {
      var opt = e.target.closest('[data-country]');
      if (!opt) return;
      var country = (opt.dataset.country || '').toLowerCase().trim();
      var lang    = (opt.dataset.lang    || '').toLowerCase().trim();
      if (!country) return;

      saveCountry(country);
      if (lang) {
        saveLang(lang);
        syncAllSelectors(lang, country);
        translateTo(lang);
      } else {
        syncAllSelectors(loadSavedLang() || 'en', country);
      }
    });

    /* ── Select caché footer LANGUE ── */
    document.addEventListener('change', function (e) {
      if (e.target.id === 'bbwFooterLangSelect') {
        var lang = e.target.value;
        saveLang(lang);
        syncAllSelectors(lang, loadSavedCountry());
        translateTo(lang);
      }
    });

    /* ── Select caché footer PAYS ── */
    document.addEventListener('change', function (e) {
      if (e.target.id === 'bbwFooterCountrySelect') {
        var countryCode = e.target.value;
        saveCountry(countryCode);
        applyCountry(countryCode, false);
      }
    });

    /* ── Liste custom footer LANGUE (li cliqués) ── */
    var fLangList = document.getElementById('bbwLangList');
    if (fLangList) {
      fLangList.addEventListener('click', function (e) {
        var li = e.target.closest('li');
        if (!li) return;
        var lang = li.dataset.value;
        if (!lang) return;
        saveLang(lang);
        syncAllSelectors(lang, loadSavedCountry());
        translateTo(lang);
      });
    }

    /* ── Liste custom footer PAYS (li cliqués) ── */
    var fCountryList = document.getElementById('bbwCountryList');
    if (fCountryList) {
      fCountryList.addEventListener('click', function (e) {
        var li = e.target.closest('li');
        if (!li) return;
        var country = li.dataset.value;
        var lang    = li.dataset.lang;
        if (!country) return;
        saveCountry(country);
        if (lang) {
          saveLang(lang);
          syncAllSelectors(lang, country);
          translateTo(lang);
        } else {
          syncAllSelectors(loadSavedLang() || 'en', country);
        }
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════
     8. GÉOLOCALISATION — Multi-fallback (ipapi → ip-api → 'us')
  ══════════════════════════════════════════════════════════════ */
  function detectGeo() {
    /* Si une sélection manuelle existe, on ne force plus la géo */
    var savedCountry = loadSavedCountry();
    if (savedCountry) {
      applyCountry(savedCountry, false);
      return;
    }

    function apply(code) {
    saveCountry(code);
    var settings4    = (window.__allProducts || []).find(function(p){ return p.type === 'settings'; }) || {};
    var autoTranslate = (settings4.auto_translate || 'yes').toLowerCase();
    window._geoAutoTranslating = (autoTranslate === 'no');
    applyCountry(code, true);
    window._geoAutoTranslating = false;
    }

    fetch('https://ipapi.co/json/')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var c = d && d.country_code ? d.country_code.toLowerCase() : null;
        if (c) apply(c); else throw new Error('no code');
      })
      .catch(function () {
        fetch('https://ip-api.com/json/')
          .then(function (r) { return r.json(); })
          .then(function (d) {
            var c = d && d.countryCode ? d.countryCode.toLowerCase() : null;
            if (c) apply(c); else throw new Error('no code');
          })
          .catch(function () { apply('us'); });
      });
  }

  /* ══════════════════════════════════════════════════════════════
     9. RESTAURER la langue sauvegardée au chargement
        (AVANT la géodétection, pour ne pas l'écraser)
  ══════════════════════════════════════════════════════════════ */
  function restoreSavedState() {
    var savedLang    = loadSavedLang();
    var savedCountry = loadSavedCountry();

    if (savedLang || savedCountry) {
      syncAllSelectors(savedLang || 'en', savedCountry || 'us');
    }

    /* Si la page a été rechargée avec un cookie googtrans,
       Google Translate l'applique automatiquement — pas besoin d'appeler translateTo */
  }

  /* ══════════════════════════════════════════════════════════════
     10. INIT PRINCIPALE — attend __allProducts + DOM prêt
  ══════════════════════════════════════════════════════════════ */
  function waitAndInit() {
    var waited = 0;
    var interval = setInterval(function () {
      waited += 100;
      var allProducts = window.__allProducts || [];
      var settings    = allProducts.find(function (p) { return p.type === 'settings'; }) || {};
      var hasCfg      = settings.country_selector && settings.country_selector.options;

      if (hasCfg || waited >= MAX_WAIT) {
        clearInterval(interval);
        injectGoogleTranslate();
        bindAllSelectors();
        restoreSavedState();
        detectGeo();
        fetchExchangeRates(function (rates) {
        // Appliquer la devise sauvegardée si elle existe
        var savedCountry2 = loadSavedCountry();
        if (savedCountry2) {
            var allP      = window.__allProducts || [];
            var sett      = allP.find(function(p){ return p.type === 'settings'; }) || {};
            var cOpts     = (sett.country_selector || {}).options || [];
            var found2    = cOpts.find(function(o){ return o.code === savedCountry2; });
            if (found2 && found2.currency) {
            var parts3  = found2.currency.trim().split(' ');
            var code3   = parts3[0] || 'USD';
            var sym3    = parts3[1] || '$';
            updateAllPrices(code3, sym3);
            }
        }
        });
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitAndInit);
  } else {
    waitAndInit();
  }

})();