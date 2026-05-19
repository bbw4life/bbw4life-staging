/* ═══════════════════════════════════════════════════════════════
   BBW4LIFE — GEO-DETECT.JS
   Détecte le pays · Applique la langue · Traduit via Google
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var MAX_WAIT = 6000;

  /* ──────────────────────────────────────────────────────────
     1. GOOGLE TRANSLATE — Mode invisible
  ────────────────────────────────────────────────────────── */
  function injectGoogleTranslate() {
    /* Cookie Google Translate pour forcer la langue */
    window.googleTranslateElementInit = function () {};

    var script = document.createElement('script');
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.head.appendChild(script);

    /* Injecter le div caché requis par Google */
    var hiddenDiv = document.createElement('div');
    hiddenDiv.id = 'google_translate_element';
    hiddenDiv.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none;';
    document.body.appendChild(hiddenDiv);

    /* Masquer la barre Google Translate */
    var style = document.createElement('style');
    style.textContent = `
      .goog-te-banner-frame,
      .goog-te-balloon-frame,
      #goog-gt-tt,
      .goog-tooltip,
      .goog-tooltip:hover,
      .goog-te-ftab-float,
      .goog-te-menu-value:hover,
      .goog-te-gadget,
      .goog-te-gadget-icon,
      .goog-logo-link,
      .goog-te-banner-frame.skiptranslate {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
      }
      body { top: 0 !important; }
      iframe.goog-te-banner-frame { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  /* ──────────────────────────────────────────────────────────
     2. APPLIQUER LA TRADUCTION
  ────────────────────────────────────────────────────────── */
  function translateTo(langCode) {
    if (langCode === 'en') {
      /* Retour à l'anglais — supprimer le cookie Google */
      eraseCookie('googtrans');
      location.reload();
      return;
    }

    /* Définir le cookie Google Translate */
    setCookie('googtrans', '/en/' + langCode, 1);
    setCookie('googtrans', '/en/' + langCode, 1, '.'+location.hostname);

    /* Forcer Google Translate à appliquer la langue */
    var tries = 0;
    var interval = setInterval(function () {
      tries++;
      var select = document.querySelector('.goog-te-combo');
      if (select) {
        select.value = langCode;
        select.dispatchEvent(new Event('change'));
        clearInterval(interval);
      } else if (tries > 50) {
        clearInterval(interval);
        /* Fallback — reload avec cookie */
        location.reload();
      }
    }, 100);
  }

  /* ──────────────────────────────────────────────────────────
     3. COOKIES HELPERS
  ────────────────────────────────────────────────────────── */
  function setCookie(name, value, days, domain) {
    var expires = '';
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + date.toUTCString();
    }
    var domainStr = domain ? '; domain=' + domain : '';
    document.cookie = name + '=' + value + expires + '; path=/' + domainStr;
  }

  function eraseCookie(name) {
    setCookie(name, '', -1);
    setCookie(name, '', -1, '.' + location.hostname);
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  /* ──────────────────────────────────────────────────────────
     4. ÉCOUTER LES SÉLECTEURS DE LANGUE DU SITE
  ────────────────────────────────────────────────────────── */
  function bindLanguageSelectors() {

    /* Écoute tous les clics sur les options de langue */
    document.addEventListener('click', function (e) {
      var opt = e.target.closest('[data-lang]');
      if (!opt) return;
      var lang = opt.dataset.lang;
      if (lang) translateTo(lang);
    });

    /* Écoute les <select> de langue (footer) */
    document.addEventListener('change', function (e) {
      if (e.target.id === 'bbwFooterLangSelect') {
        translateTo(e.target.value);
      }
    });
  }

  /* ──────────────────────────────────────────────────────────
     5. APPLIQUER LE PAYS DÉTECTÉ AUX SÉLECTEURS
  ────────────────────────────────────────────────────────── */
  function applyGeoCountry(countryCode) {
    countryCode = (countryCode || 'us').toLowerCase();

    var allProducts    = window.__allProducts || [];
    var settings       = allProducts.find(function(p){ return p.type === 'settings'; }) || {};
    var countryCfg     = settings.country_selector  || {};
    var langCfg        = settings.language_selector || {};
    var countryOptions = countryCfg.options || [];
    var langOptions    = langCfg.options    || [];

    var found = countryOptions.find(function(o){ return o.code === countryCode; });
    if (!found) found = countryOptions.find(function(o){ return o.code === 'us'; });
    if (!found) return;

    var targetLang = found.lang || 'en';
    var foundLang  = langOptions.find(function(o){ return o.code === targetLang; });
    if (!foundLang) foundLang = langOptions.find(function(o){ return o.code === 'en'; });

    /* ── Footer country ── */
    var footerCountry = document.getElementById('bbwFooterCountrySelect');
    if (footerCountry) footerCountry.value = found.code;

    /* ── Footer lang ── */
    var footerLang = document.getElementById('bbwFooterLangSelect');
    if (footerLang && foundLang) footerLang.value = foundLang.code;

    /* ── Header desktop lang ── */
    var headerFlag  = document.getElementById('bbwLangFlag');
    var headerLabel = document.getElementById('bbwLangLabel');
    if (foundLang) {
      if (headerFlag)  headerFlag.textContent  = foundLang.flag;
      if (headerLabel) headerLabel.textContent = foundLang.label;
    }

    var desktopOpts = document.querySelectorAll('#bbwLangDropdown .bbw-lang-select__option');
    desktopOpts.forEach(function(btn){
      btn.classList.toggle('active', btn.dataset.lang === targetLang);
    });

    /* ── Header drawer mobile country ── */
    var drawerCountryFlag  = document.getElementById('bbwDrawerCountryFlag');
    var drawerCountryLabel = document.getElementById('bbwDrawerCountryLabel');
    if (drawerCountryFlag)  drawerCountryFlag.textContent  = found.flag;
    if (drawerCountryLabel) drawerCountryLabel.textContent = found.label;

    var drawerCountryOpts = document.querySelectorAll('#bbwDrawerCountryList .bbw-drawer__select-opt');
    drawerCountryOpts.forEach(function(btn){
      btn.classList.toggle('active', btn.dataset.country === found.code);
    });

    /* ── Header drawer mobile lang ── */
    var drawerLangFlag  = document.getElementById('bbwDrawerLangFlag');
    var drawerLangLabel = document.getElementById('bbwDrawerLangLabel');
    if (foundLang) {
      if (drawerLangFlag)  drawerLangFlag.textContent  = foundLang.flag;
      if (drawerLangLabel) drawerLangLabel.textContent = foundLang.name;
    }

    var drawerLangOpts = document.querySelectorAll('#bbwDrawerLangList .bbw-drawer__select-opt');
    drawerLangOpts.forEach(function(btn){
      btn.classList.toggle('active', btn.dataset.lang === targetLang);
    });

    /* ── Appliquer la traduction si pas déjà en cours ── */
    var currentCookie = getCookie('googtrans');
    var currentLang   = currentCookie ? currentCookie.split('/').pop() : 'en';

    if (currentLang !== targetLang) {
      translateTo(targetLang);
    }

    console.log('[BBW4LIFE Geo] Pays:', found.code, '| Langue:', targetLang);
  }

  /* ──────────────────────────────────────────────────────────
     6. FETCH GÉOLOCALISATION — Multi-fallback
  ────────────────────────────────────────────────────────── */
  function detectAndApply() {
    try {
      var cached = sessionStorage.getItem('bbw_geo_country');
      if (cached) {
        applyGeoCountry(cached);
        return;
      }
    } catch(e) {}

    /* API 1 — ipapi.co */
    fetch('https://ipapi.co/json/')
      .then(function(res){ return res.json(); })
      .then(function(data){
        var code = (data && data.country_code) ? data.country_code.toLowerCase() : null;
        if (code) {
          try { sessionStorage.setItem('bbw_geo_country', code); } catch(e) {}
          applyGeoCountry(code);
        } else {
          throw new Error('no code');
        }
      })
      .catch(function(){
        /* API 2 — ip-api.com */
        fetch('http://ip-api.com/json/')
          .then(function(res){ return res.json(); })
          .then(function(data){
            var code = (data && data.countryCode) ? data.countryCode.toLowerCase() : null;
            if (code) {
              try { sessionStorage.setItem('bbw_geo_country', code); } catch(e) {}
              applyGeoCountry(code);
            } else {
              throw new Error('no code');
            }
          })
          .catch(function(){
            /* Fallback final — USA */
            applyGeoCountry('us');
          });
      });
  }

  /* ──────────────────────────────────────────────────────────
     7. ATTENDRE __allProducts + DOM
  ────────────────────────────────────────────────────────── */
  function waitAndDetect() {
    var waited = 0;
    var interval = setInterval(function(){
      waited += 100;
      var allProducts = window.__allProducts || [];
      var settings    = allProducts.find(function(p){ return p.type === 'settings'; }) || {};
      var hasCfg      = settings.country_selector && settings.country_selector.options;

      if (hasCfg || waited >= MAX_WAIT) {
        clearInterval(interval);
        injectGoogleTranslate();
        bindLanguageSelectors();
        detectAndApply();
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitAndDetect);
  } else {
    waitAndDetect();
  }

})();