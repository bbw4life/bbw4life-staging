/* ═══════════════════════════════════════════════════════════════
   BBW4LIFE — GEO-DETECT.JS  v2.1
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

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
        • Sauvegarde la langue
        • Applique via le combo Google Translate
        • Si pas prêt, réessaie pendant 8 s avant reload
  ══════════════════════════════════════════════════════════════ */
  function translateTo(langCode) {
    if (!langCode) return;
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

    /* Convertir les prix vers la devise du pays */
    convertPricesForCountry(found.code);
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
   6b. CONVERSION MONNAIE — via exchangerate-api (gratuit, open)
══════════════════════════════════════════════════════════════ */
var _ratesCache     = {};
var _ratesFetched   = false;
var _ratesCallbacks = [];

var RATES_KEY     = 'bbw_fx_rates';
var RATES_EXP_KEY = 'bbw_fx_expires';
var RATES_TTL     = 24 * 60 * 60 * 1000; /* 24h en ms */

function fetchRates(callback) {
  if (_ratesFetched) { callback(_ratesCache); return; }
  try {
    var expires = parseInt(localStorage.getItem(RATES_EXP_KEY) || '0');
    var saved   = localStorage.getItem(RATES_KEY);
    if (saved && Date.now() < expires) {
      _ratesCache   = JSON.parse(saved);
      _ratesFetched = true;
      callback(_ratesCache);
      return;
    }
  } catch (e) {}

  _ratesCallbacks.push(callback);
  if (_ratesCallbacks.length > 1) return;

  fetch('https://open.er-api.com/v6/latest/USD')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data && data.rates) {
        _ratesCache   = data.rates;
        _ratesFetched = true;
        try {
          localStorage.setItem(RATES_KEY,     JSON.stringify(data.rates));
          localStorage.setItem(RATES_EXP_KEY, Date.now() + RATES_TTL);
        } catch (e) {}
        _ratesCallbacks.forEach(function (cb) { cb(_ratesCache); });
        _ratesCallbacks = [];
      }
    })
    .catch(function () {
      _ratesCallbacks.forEach(function (cb) { cb({}); });
      _ratesCallbacks = [];
    });
}

function convertPricesForCountry(countryCode) {
  var allProducts    = window.__allProducts || [];
  var settings       = allProducts.find(function (p) { return p.type === 'settings'; }) || {};
  var countryOptions = (settings.country_selector && settings.country_selector.options) || [];

  var found = countryOptions.find(function (o) { return o.code === countryCode; });
  if (!found || !found.currency) return;

  var currencyCode = found.currency.trim().split(/\s+/)[0].toUpperCase();
  var symbol       = found.currency.trim().split(/\s+/).slice(1).join(' ') || currencyCode;

  /* ── Sélecteurs CSS ciblés dans votre site ── */
  var PRICE_SELECTORS = [
    '.current-price',
    '.compare-price',
    '.cs-price',
    '.cs-compare-price',
    '.bd-total-price',
    '#satc-price',
    '.bbwpg-card__price',
    '.bbwpg-card__compare',
    '.rv-card__price',
    '.rv-card__compare',
    '.fs-price',
    '.fs-compare',
    '.prog-price',
    '.paul-reservation-price-label',
    '#p2-upsell-total',
    '.p2-upsell-new',
    '.p2-upsell-old',
    '#cp-subtotal-val',
    '#cp-total-val',
    '#cp-sticky-total',
    '#cp-savings-val',
    '#cp-upsell-total-display',
    '.cp-item-price-col',
    '.cp-item-line-total',
    '.cp-extra-card__price',
    '.cp-extra-card__compare',
    '.drawer-extra-card__price',
    '.drawer-extra-card__compare',
    '.subtotal',
    '.cart-item .item-meta p'
  ];

  function extractUSD(text) {
    if (!text) return null;
    var match = text.match(/\$\s*([\d,]+\.?\d*)/);
    if (!match) return null;
    return parseFloat(match[1].replace(',', ''));
  }

  function ensureUsdStored(el) {
    if (!el.dataset.usdPrice) {
      var usd = extractUSD(el.textContent);
      if (usd !== null) el.dataset.usdPrice = usd;
    }
    return parseFloat(el.dataset.usdPrice);
  }

  function formatText(el, amount, sym) {
    var original = el.dataset.originalText || el.textContent;
    if (!el.dataset.originalText) el.dataset.originalText = original;
    if (original.includes(':')) {
      var prefix = original.split('$')[0];
      return prefix + sym + ' ' + amount;
    }
    if (original.includes('/')) {
      var suffix = original.split('$')[1].replace(/[\d.,]+/, '').trim();
      return sym + ' ' + amount + ' ' + suffix;
    }
    return sym + ' ' + amount;
  }

  function applyUSD(el) {
    var usd = parseFloat(el.dataset.usdPrice);
    if (isNaN(usd)) return;
    var original = el.dataset.originalText;
    if (original) {
      el.textContent = original;
    } else {
      el.textContent = '$' + usd.toFixed(2);
    }
  }

  if (currencyCode === 'USD') {
    PRICE_SELECTORS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        applyUSD(el);
      });
    });
    return;
  }

  fetchRates(function (rates) {
    var rate = rates[currencyCode];
    if (!rate) return;

    PRICE_SELECTORS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        var usd = ensureUsdStored(el);
        if (isNaN(usd)) return;
        var converted = (usd * rate).toFixed(2);
        el.textContent = formatText(el, converted, symbol);
      });
    });
  });
}

window.convertPricesForCountry = convertPricesForCountry;


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
      applyCountry(code, true);
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

        var autoTranslate = (settings.language_selector && settings.language_selector.auto_translate
          ? settings.language_selector.auto_translate
          : 'no').toLowerCase().trim();

        if (autoTranslate === 'yes') {
          detectGeo();
        } else {
          /* Pas de géo auto — mais on sync les sélecteurs avec ce qui est déjà sauvegardé */
          var savedL = loadSavedLang();
          var savedC = loadSavedCountry();
          if (savedL || savedC) {
            syncAllSelectors(savedL || 'en', savedC || 'us');
          }
        }
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitAndInit);
  } else {
    waitAndInit();
  }

})(); 