/* ═══════════════════════════════════════════════════════════════
   BBW4LIFE — FAQ PAGE — JavaScript
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  const SUGGESTION_BANK = [
    // Movement (8)
    { text: "What exactly is BBW4LIFE?", cat: "movement", catLabel: "Movement", keywords: ["bbw4life", "what is", "born", "founded", "mission"] },
    { text: "Is BBW4LIFE only for plus-size women?", cat: "movement", catLabel: "Movement", keywords: ["plus size", "women", "who can join"] },
    { text: "What values does BBW4LIFE stand for?", cat: "movement", catLabel: "Movement", keywords: ["values", "mission", "believe", "stand for", "pillars"] },
    { text: "Who is the founder of BBW4LIFE?", cat: "movement", catLabel: "Movement", keywords: ["founder", "who created", "pdg", "francenel", "origin"] },
    { text: "Is joining the BBW4LIFE movement free?", cat: "movement", catLabel: "Movement", keywords: ["free", "cost", "join", "price", "membership"] },
    { text: "Is BBW4LIFE available worldwide?", cat: "movement", catLabel: "Movement", keywords: ["worldwide", "countries", "global", "international"] },
    { text: "Where can I follow BBW4LIFE on social media?", cat: "movement", catLabel: "Movement", keywords: ["social media", "instagram", "tiktok", "facebook", "follow"] },
    { text: "Can brands or influencers collaborate with BBW4LIFE?", cat: "movement", catLabel: "Movement", keywords: ["collaborate", "partner", "brand", "ambassador", "influencer"] },

    // Products (12)
    { text: "Are the products sold on BBW4LIFE made by the brand itself?", cat: "products", catLabel: "Products", keywords: ["own brand", "made by", "original", "bbw4life products"] },
    { text: "When will the official BBW4LIFE brand products launch?", cat: "products", catLabel: "Products", keywords: ["launch", "coming soon", "release", "when", "bbw original"] },
    { text: "Can I request a personalized or custom product?", cat: "products", catLabel: "Products", keywords: ["custom", "personalized", "request", "design", "style", "wish"] },
    { text: "Where do the current products come from?", cat: "products", catLabel: "Products", keywords: ["partner", "platform", "supplier", "source", "where products"] },
    { text: "What sizes are available in your store?", cat: "products", catLabel: "Products", keywords: ["sizes", "plus size range", "what sizes", "available sizes"] },
    { text: "What colors and variants are available?", cat: "products", catLabel: "Products", keywords: ["colors", "variants", "options", "color", "choose"] },
    { text: "How do you ensure the quality of your products?", cat: "products", catLabel: "Products", keywords: ["quality", "reliable", "authentic", "genuine", "trust"] },
    { text: "Is there a size guide to help me choose the right size?", cat: "products", catLabel: "Products", keywords: ["size guide", "measure", "measurement", "fit", "body"] },
    { text: "Do you offer discounts or bundle deals?", cat: "products", catLabel: "Products", keywords: ["discount", "promo", "sale", "bundle", "deal", "offer"] },
    { text: "What if a product I want is out of stock?", cat: "products", catLabel: "Products", keywords: ["out of stock", "unavailable", "restock", "back", "when"] },
    { text: "Do you sell beauty and skincare products too?", cat: "products", catLabel: "Products", keywords: ["beauty", "skincare", "haircare", "makeup", "nail"] },
    { text: "Do you also have products for plus-size men?", cat: "products", catLabel: "Products", keywords: ["men", "men products", "plus size men", "clothing men"] },

    // Orders (8)
    { text: "What payment methods do you accept?", cat: "orders", catLabel: "Orders", keywords: ["payment", "visa", "mastercard", "paypal", "apple pay"] },
    { text: "How do I know my order was confirmed?", cat: "orders", catLabel: "Orders", keywords: ["order confirm", "confirmation", "email", "receipt", "purchase"] },
    { text: "How do I apply a promo code at checkout?", cat: "orders", catLabel: "Orders", keywords: ["promo code", "discount", "coupon", "apply", "enter"] },
    { text: "Can I cancel or modify my order after placing it?", cat: "orders", catLabel: "Orders", keywords: ["cancel", "modify", "change", "before shipping", "processing"] },
    { text: "Where can I find my invoice?", cat: "orders", catLabel: "Orders", keywords: ["invoice", "receipt", "billing", "proof of purchase", "download"] },
    { text: "Is it safe to pay on the BBW4LIFE website?", cat: "orders", catLabel: "Orders", keywords: ["secure", "safe", "payment", "checkout", "trust", "fraud"] },
    { text: "Can I order multiple products in the same cart?", cat: "orders", catLabel: "Orders", keywords: ["multiple items", "combine", "bundle", "checkout", "together"] },
    { text: "What currency are prices displayed in?", cat: "orders", catLabel: "Orders", keywords: ["currency", "usd", "euro", "price", "local currency", "exchange"] },

    // Shipping (10)
    { text: "Do you ship internationally?", cat: "shipping", catLabel: "Shipping", keywords: ["shipping", "delivery", "worldwide", "international", "countries"] },
    { text: "How much does shipping cost?", cat: "shipping", catLabel: "Shipping", keywords: ["shipping cost", "fee", "how much", "delivery price", "free"] },
    { text: "How long does delivery take?", cat: "shipping", catLabel: "Shipping", keywords: ["delivery time", "how long", "shipping takes", "days", "arrive"] },
    { text: "How can I track my order?", cat: "shipping", catLabel: "Shipping", keywords: ["track", "tracking number", "where is my package", "follow"] },
    { text: "What is your return policy?", cat: "shipping", catLabel: "Shipping", keywords: ["return", "refund", "money back", "not satisfied", "policy"] },
    { text: "How long does a refund take to process?", cat: "shipping", catLabel: "Shipping", keywords: ["refund time", "money back", "how long refund", "process"] },
    { text: "I received the wrong item. What do I do?", cat: "shipping", catLabel: "Shipping", keywords: ["wrong item", "incorrect order", "mistake", "error", "wrong size"] },
    { text: "My package arrived damaged. What should I do?", cat: "shipping", catLabel: "Shipping", keywords: ["damaged", "broken", "arrived bad", "condition", "package"] },
    { text: "Can I exchange an item for a different size?", cat: "shipping", catLabel: "Shipping", keywords: ["exchange", "size swap", "different size", "change received"] },
    { text: "My order hasn't arrived yet. What should I do?", cat: "shipping", catLabel: "Shipping", keywords: ["lost package", "not received", "delivery missing", "where is order"] },

    // Community (7)
    { text: "How do I join the BBW4LIFE community?", cat: "community", catLabel: "Community", keywords: ["join", "community", "member", "sign up", "register"] },
    { text: "Can I share my personal story with the community?", cat: "community", catLabel: "Community", keywords: ["share", "story", "testimonial", "experience", "journey"] },
    { text: "Can I participate in the community anonymously?", cat: "community", catLabel: "Community", keywords: ["anonymous", "privacy", "private", "identity", "name"] },
    { text: "How do you ensure the community stays kind and safe?", cat: "community", catLabel: "Community", keywords: ["safe", "judgment", "toxic", "harassment", "moderation"] },
    { text: "Does BBW4LIFE organize events or live sessions?", cat: "community", catLabel: "Community", keywords: ["events", "meetup", "gathering", "online", "workshop", "live"] },
    { text: "Can I reach the team directly on WhatsApp or Telegram?", cat: "community", catLabel: "Community", keywords: ["whatsapp", "telegram", "direct message", "chat", "contact"] },
    { text: "How do I subscribe to the BBW4LIFE newsletter?", cat: "community", catLabel: "Community", keywords: ["newsletter", "subscribe", "email", "updates", "notification"] },

    // Privacy (7)
    { text: "What personal data does BBW4LIFE collect?", cat: "privacy", catLabel: "Privacy", keywords: ["personal data", "information", "collect", "store", "privacy"] },
    { text: "Do you sell or share my personal data with third parties?", cat: "privacy", catLabel: "Privacy", keywords: ["sell data", "share", "third party", "information", "privacy"] },
    { text: "Can I request the deletion of my personal data?", cat: "privacy", catLabel: "Privacy", keywords: ["delete", "account", "remove", "forget me", "erase"] },
    { text: "Does your website use cookies?", cat: "privacy", catLabel: "Privacy", keywords: ["cookies", "browser data", "website tracking", "cookie"] },
    { text: "How do I unsubscribe from marketing emails?", cat: "privacy", catLabel: "Privacy", keywords: ["unsubscribe", "stop emails", "opt out", "marketing", "newsletter"] },
    { text: "Where can I find your Terms and Conditions?", cat: "privacy", catLabel: "Privacy", keywords: ["terms", "conditions", "legal", "policy", "use", "rules"] },
    { text: "What are my rights regarding my personal data?", cat: "privacy", catLabel: "Privacy", keywords: ["gdpr", "data protection", "rights", "access", "update", "correct"] },

    // Support (8)
    { text: "How can I contact the BBW4LIFE team?", cat: "support", catLabel: "Support", keywords: ["contact", "reach", "team", "email", "chat", "get in touch"] },
    { text: "How long does it take to get a response?", cat: "support", catLabel: "Support", keywords: ["response time", "reply", "how long", "wait", "hours", "fast"] },
    { text: "What are your customer support hours?", cat: "support", catLabel: "Support", keywords: ["hours", "open", "available", "schedule", "service", "when"] },
    { text: "I forgot my password. How do I recover my account?", cat: "support", catLabel: "Support", keywords: ["password", "forgot", "reset", "account", "login", "access"] },
    { text: "I'm experiencing a technical issue on the website. What should I do?", cat: "support", catLabel: "Support", keywords: ["technical issue", "bug", "error", "problem", "website", "not working"] },
    { text: "Can I speak with a real human, not a chatbot?", cat: "support", catLabel: "Support", keywords: ["human", "real person", "speak", "live agent", "not bot", "agent"] },
    { text: "How can I share feedback or a suggestion?", cat: "support", catLabel: "Support", keywords: ["feedback", "suggestion", "idea", "improve", "opinion", "experience"] },
    { text: "I'm a journalist or media professional. How do I reach BBW4LIFE?", cat: "support", catLabel: "Support", keywords: ["press", "media", "journalist", "interview", "article", "publication"] },
  ];

  
  const CAT_ICONS = {
    movement:  'fi fi-rr-heart',
    products:  'fi fi-rr-shopping-bag',
    orders:    'fi fi-rr-shopping-cart',
    shipping:  'fi fi-rr-truck-side',
    community: 'fi fi-rr-users',
    privacy:   'fi fi-rr-shield-check',
    support:   'fi fi-rr-life-ring',
  };

  /* ──────────────────────────────────────────
     1. ACCORDION
  ────────────────────────────────────────── */
  function initAccordion() {
    const items = document.querySelectorAll('.faq-item');

    items.forEach(item => {
      const btn    = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      if (!btn || !answer) return;

      btn.addEventListener('click', () => {
        const isOpen = btn.getAttribute('aria-expanded') === 'true';

        // Fermer tous les autres
        items.forEach(other => {
          if (other !== item) {
            const ob = other.querySelector('.faq-question');
            const oa = other.querySelector('.faq-answer');
            if (ob) ob.setAttribute('aria-expanded', 'false');
            if (oa) oa.classList.remove('faq-answer--open');
          }
        });

        // Toggle current
        btn.setAttribute('aria-expanded', !isOpen);
        answer.classList.toggle('faq-answer--open', !isOpen);

        // Scroll léger si nécessaire
        if (!isOpen) {
          setTimeout(() => {
            const top = item.getBoundingClientRect().top + window.scrollY - 120;
            if (item.getBoundingClientRect().top < 80) {
              window.scrollTo({ top, behavior: 'smooth' });
            }
          }, 100);
        }
      });
    });
  }

  /* ──────────────────────────────────────────
     2. CATEGORY FILTER
  ────────────────────────────────────────── */
  function initCategoryFilter() {
    const tabs   = document.querySelectorAll('.faq-tab');
    const groups = document.querySelectorAll('.faq-group');
    const items  = document.querySelectorAll('.faq-item');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const cat = tab.dataset.cat;

        // Active tab style
        tabs.forEach(t => t.classList.remove('faq-tab--active'));
        tab.classList.add('faq-tab--active');

        // Close all open answers
        closeAllAnswers();

        if (cat === 'all') {
          groups.forEach(g => {
            g.style.display = '';
            g.style.animation = 'faqFadeUp 0.45s ease both';
          });
          items.forEach(i => i.classList.remove('faq-item--hidden'));
        } else {
          groups.forEach(g => {
            const show = g.dataset.group === cat;
            g.style.display = show ? '' : 'none';
            if (show) g.style.animation = 'faqFadeUp 0.45s ease both';
          });
          items.forEach(i => {
            i.classList.toggle('faq-item--hidden', i.dataset.cat !== cat);
          });
        }

        // Reset search
        const input = document.getElementById('faqSearchInput');
        if (input && input.value) {
          input.value = '';
          handleSearch('');
        }

        updateNoResults();
      });
    });
  }

  /* ──────────────────────────────────────────
     3. SEARCH + SUGGESTIONS
  ────────────────────────────────────────── */
  function initSearch() {
    const input      = document.getElementById('faqSearchInput');
    const clearBtn   = document.getElementById('faqSearchClear');
    const suggestBox = document.getElementById('faqSuggestions');

    if (!input) return;

    input.addEventListener('input', () => {
      const val = input.value.trim();
      handleSearch(val);
      renderSuggestions(val);

      if (val.length > 0) {
        clearBtn && clearBtn.classList.add('visible');
      } else {
        clearBtn && clearBtn.classList.remove('visible');
      }
    });

    input.addEventListener('focus', () => {
      const val = input.value.trim();
      if (val.length >= 1) renderSuggestions(val);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        input.value = '';
        handleSearch('');
        clearBtn && clearBtn.classList.remove('visible');
        hideSuggestions();
        input.blur();
        return;
      }
      // Navigation clavier dans les suggestions
      if (suggestBox && suggestBox.classList.contains('visible')) {
        const items = suggestBox.querySelectorAll('.faq-suggestion-item');
        let activeIdx = [...items].findIndex(i => i.classList.contains('faq-suggestion--active'));

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          activeIdx = Math.min(activeIdx + 1, items.length - 1);
          items.forEach((item, idx) => item.classList.toggle('faq-suggestion--active', idx === activeIdx));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          activeIdx = Math.max(activeIdx - 1, 0);
          items.forEach((item, idx) => item.classList.toggle('faq-suggestion--active', idx === activeIdx));
        } else if (e.key === 'Enter') {
          if (activeIdx >= 0) {
            e.preventDefault();
            items[activeIdx].click();
          }
        }
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        handleSearch('');
        clearBtn.classList.remove('visible');
        hideSuggestions();
        input.focus();
      });
    }

    // Fermer suggestions en cliquant dehors
    document.addEventListener('click', e => {
      if (!e.target.closest('.faq-search-wrap')) {
        hideSuggestions();
      }
    });
  }

  
  function renderSuggestions(query) {
    const suggestBox = document.getElementById('faqSuggestions');
    if (!suggestBox) return;

    if (!query || query.length < 1) {
      hideSuggestions();
      return;
    }

    const q = query.toLowerCase();

    // Score chaque suggestion
    const scored = SUGGESTION_BANK
      .map(entry => {
        let score = 0;
        const textLow = entry.text.toLowerCase();

        if (textLow.startsWith(q)) score += 10;
        else if (textLow.includes(q)) score += 6;

        entry.keywords.forEach(kw => {
          if (kw.includes(q)) score += 3;
          if (kw.startsWith(q)) score += 2;
        });

        return { ...entry, score };
      })
      .filter(e => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 7); // max 7 suggestions

    if (scored.length === 0) {
      hideSuggestions();
      return;
    }

    // Build HTML
    suggestBox.innerHTML = `
      <div class="faq-suggestions-title">Suggestions</div>
      ${scored.map(entry => {
        const highlighted = highlightSuggestion(entry.text, query);
        const icon = CAT_ICONS[entry.cat] || 'fi fi-rr-question';
        return `
          <button class="faq-suggestion-item" data-cat="${entry.cat}" data-text="${escapeAttr(entry.text)}">
            <span class="faq-suggestion-icon"><i class="${icon}"></i></span>
            <span class="faq-suggestion-text">${highlighted}</span>
            <span class="faq-suggestion-cat">${entry.catLabel}</span>
            <span class="faq-suggestion-arrow"><i class="fi fi-rr-arrow-small-right"></i></span>
          </button>
        `;
      }).join('')}
    `;

    // Attacher les events clicks
    suggestBox.querySelectorAll('.faq-suggestion-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const questionText = btn.dataset.text;
        const cat          = btn.dataset.cat;

        // Fermer suggestions
        hideSuggestions();

        // Vider search input
        const input = document.getElementById('faqSearchInput');
        if (input) {
          input.value = '';
          const clearBtn = document.getElementById('faqSearchClear');
          clearBtn && clearBtn.classList.remove('visible');
        }

        // Reset search results
        handleSearch('');

        // Naviguer vers la question
        navigateToQuestion(questionText, cat);
      });
    });

    suggestBox.classList.add('visible');
  }

  function hideSuggestions() {
    const suggestBox = document.getElementById('faqSuggestions');
    if (suggestBox) suggestBox.classList.remove('visible');
  }

  
  function highlightSuggestion(text, query) {
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  
  function navigateToQuestion(questionText, cat) {
    // 1. Afficher tous les groupes si besoin
    const groups = document.querySelectorAll('.faq-group');
    const allItems = document.querySelectorAll('.faq-item');

    // Réinitialiser les tabs
    document.querySelectorAll('.faq-tab').forEach(t => t.classList.remove('faq-tab--active'));
    const allTab = document.querySelector('.faq-tab[data-cat="all"]');
    if (allTab) allTab.classList.add('faq-tab--active');

    // Afficher tous les groupes
    groups.forEach(g => {
      g.style.display = '';
      g.style.animation = '';
    });
    allItems.forEach(i => i.classList.remove('faq-item--hidden'));

    // 2. Trouver l'item correspondant
    let targetItem = null;
    allItems.forEach(item => {
      const questionSpan = item.querySelector('.faq-question span:first-child');
      if (!questionSpan) return;

      // Comparaison flexible (case-insensitive, trailing ?)
      const normalize = s => s.toLowerCase().replace(/[?!.]/g, '').trim();
      if (normalize(questionSpan.textContent) === normalize(questionText)) {
        targetItem = item;
      }
    });

    if (!targetItem) {
      // Fallback: chercher par cat + partial match
      allItems.forEach(item => {
        if (item.dataset.cat === cat && !targetItem) {
          const qSpan = item.querySelector('.faq-question span:first-child');
          if (qSpan) {
            const partialMatch = questionText.toLowerCase().split(' ').slice(0, 4).join(' ');
            if (qSpan.textContent.toLowerCase().includes(partialMatch)) {
              targetItem = item;
            }
          }
        }
      });
    }

    if (!targetItem) return;

    // 3. Fermer tous les autres et ouvrir celui-ci
    closeAllAnswers();

    const btn = targetItem.querySelector('.faq-question');
    const ans = targetItem.querySelector('.faq-answer');
    if (btn && ans) {
      btn.setAttribute('aria-expanded', 'true');
      ans.classList.add('faq-answer--open');
    }

    // 4. Highlight visuel temporaire
    targetItem.classList.add('faq-highlight');
    setTimeout(() => targetItem.classList.remove('faq-highlight'), 3000);

    // 5. Scroll vers la question
    setTimeout(() => {
      const offset = 120;
      const top = targetItem.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }, 80);

    updateNoResults();
  }

  function handleSearch(query) {
    const hint   = document.getElementById('faqSearchHint');
    const items  = document.querySelectorAll('.faq-item');
    const groups = document.querySelectorAll('.faq-group');

    // Reset active tab to "All"
    const tabs = document.querySelectorAll('.faq-tab');
    tabs.forEach(t => t.classList.remove('faq-tab--active'));
    const allTab = document.querySelector('.faq-tab[data-cat="all"]');
    if (allTab) allTab.classList.add('faq-tab--active');

    if (!query || query.length < 2) {
      // Reset
      items.forEach(item => {
        item.classList.remove('faq-item--hidden', 'faq-highlight');
        restoreText(item);
      });
      groups.forEach(g => g.style.display = '');
      closeAllAnswers();
      if (hint) {
        hint.textContent = '';
        hint.className = 'faq-search-hint';
      }
      updateNoResults();
      return;
    }

    const q   = query.toLowerCase();
    let found = 0;

    items.forEach(item => {
      const keywords = (item.dataset.keywords || '').toLowerCase();
      const qText    = item.querySelector('.faq-question span:first-child');
      const aText    = item.querySelector('.faq-answer-inner');
      const qStr     = qText ? qText.textContent.toLowerCase() : '';
      const aStr     = aText ? aText.textContent.toLowerCase() : '';
      const match    = qStr.includes(q) || aStr.includes(q) || keywords.includes(q);

      if (match) {
        item.classList.remove('faq-item--hidden');
        item.classList.add('faq-highlight');
        highlightText(item, query);
        found++;

        // Auto-open if only 1-2 results
        if (found <= 2) {
          const btn = item.querySelector('.faq-question');
          const ans = item.querySelector('.faq-answer');
          if (btn && ans) {
            btn.setAttribute('aria-expanded', 'true');
            ans.classList.add('faq-answer--open');
          }
        }
      } else {
        item.classList.add('faq-item--hidden');
        item.classList.remove('faq-highlight');
        restoreText(item);
        // Close
        const btn = item.querySelector('.faq-question');
        const ans = item.querySelector('.faq-answer');
        if (btn) btn.setAttribute('aria-expanded', 'false');
        if (ans) ans.classList.remove('faq-answer--open');
      }
    });

    // Show/hide groups that have visible items
    groups.forEach(g => {
      const visibleItems = g.querySelectorAll('.faq-item:not(.faq-item--hidden)');
      g.style.display = visibleItems.length > 0 ? '' : 'none';
    });

    // Hint message
    if (hint) {
      if (found === 0) {
        hint.textContent = `No result for "${query}"`;
        hint.className = 'faq-search-hint no-results';
      } else {
        hint.textContent = `${found} question${found > 1 ? 's' : ''} found for "${query}"`;
        hint.className = 'faq-search-hint has-results';
      }
    }

    updateNoResults();
  }

  
  function highlightText(item, query) {
    const btn = item.querySelector('.faq-question span:first-child');
    if (!btn) return;

    if (!btn.dataset.original) {
      btn.dataset.original = btn.textContent;
    }

    const original = btn.dataset.original;
    const regex    = new RegExp(`(${escapeRegex(query)})`, 'gi');
    btn.innerHTML  = original.replace(regex, '<mark class="faq-mark">$1</mark>');
  }

  function restoreText(item) {
    const btn = item.querySelector('.faq-question span:first-child');
    if (!btn || !btn.dataset.original) return;
    btn.textContent = btn.dataset.original;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ──────────────────────────────────────────
     4. NO RESULTS STATE
  ────────────────────────────────────────── */
  function updateNoResults() {
    const noResults = document.getElementById('faqNoResults');
    const groups    = document.querySelectorAll('.faq-group');
    const visible   = [...groups].some(g => g.style.display !== 'none');
    if (noResults) noResults.style.display = visible ? 'none' : 'block';
  }

  /* ──────────────────────────────────────────
     5. CLOSE ALL ANSWERS
  ────────────────────────────────────────── */
  function closeAllAnswers() {
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('.faq-answer').forEach(ans => {
      ans.classList.remove('faq-answer--open');
    });
  }

  /* ──────────────────────────────────────────
     6. HERO PARTICLES
  ────────────────────────────────────────── */
  function initHeroParticles() {
    const container = document.getElementById('faqHeroParticles');
    if (!container) return;

    const colors = [
      'rgba(192, 56, 94, 0.50)',
      'rgba(201, 150, 62, 0.55)',
      'rgba(212, 80, 110, 0.40)',
      'rgba(232, 188, 106, 0.50)',
      'rgba(123, 63, 110, 0.40)',
      'rgba(253, 240, 226, 0.60)'
    ];

    if (!document.getElementById('faq-ptcl-style')) {
      const style = document.createElement('style');
      style.id = 'faq-ptcl-style';
      style.textContent = `
        @keyframes faqPtclFloat {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          15%  { opacity: 0.90; }
          85%  { opacity: 0.45; }
          100% { transform: translateY(var(--fy)) translateX(var(--fx)) scale(0.35); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    function createParticle() {
      const p = document.createElement('span');
      const size = Math.random() * 6 + 2;
      const x    = Math.random() * 100;
      const dur  = Math.random() * 10 + 6;
      const del  = Math.random() * 5;
      const col  = colors[Math.floor(Math.random() * colors.length)];
      const fx   = (Math.random() - 0.5) * 100 + 'px';
      const fy   = -(Math.random() * 140 + 60) + 'px';

      p.style.cssText = `
        position: absolute;
        left: ${x}%;
        bottom: 10%;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${col};
        pointer-events: none;
        --fx: ${fx};
        --fy: ${fy};
        animation: faqPtclFloat ${dur}s ${del}s ease-in-out infinite;
      `;
      container.appendChild(p);
    }

    for (let i = 0; i < 26; i++) createParticle();
  }

  /* ──────────────────────────────────────────
     7. SCROLL REVEAL — groups & tabs
  ────────────────────────────────────────── */
  function initScrollReveal() {
    const targets = document.querySelectorAll('.faq-group, .faq-tabs-wrap, .faq-cta-inner');
    if (!targets.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = el.classList.contains('faq-group')
            ? ([...document.querySelectorAll('.faq-group')].indexOf(el)) * 80
            : 0;
          setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          }, delay);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    targets.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(32px)';
      el.style.transition = 'opacity 0.70s ease, transform 0.70s ease';
      observer.observe(el);
    });
  }

  /* ──────────────────────────────────────────
     8. EMOTIONAL TOUCH — floating hearts on answers open
  ────────────────────────────────────────── */
  function initEmotionalTouch() {
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const isOpening = btn.getAttribute('aria-expanded') === 'false';
        if (!isOpening) return;

        const rect = btn.getBoundingClientRect();
        for (let i = 0; i < 5; i++) {
          spawnHeart(rect.left + Math.random() * rect.width, rect.top + window.scrollY);
        }
      });
    });
  }

  function spawnHeart(x, y) {
    const heart = document.createElement('span');
    const size  = Math.random() * 14 + 8;
    const dx    = (Math.random() - 0.5) * 70;
    const dur   = Math.random() * 0.8 + 0.7;
    const emojis = ['❤️', '💖', '✨', '💕', '🌸'];
    heart.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    Object.assign(heart.style, {
      position: 'fixed',
      left: x + 'px',
      top: y + 'px',
      fontSize: size + 'px',
      pointerEvents: 'none',
      zIndex: '9999',
      transition: `transform ${dur}s ease, opacity ${dur}s ease`,
      opacity: '1',
      userSelect: 'none'
    });
    document.body.appendChild(heart);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        heart.style.transform = `translate(${dx}px, -80px) scale(0.3)`;
        heart.style.opacity   = '0';
      });
    });

    setTimeout(() => heart.remove(), dur * 1000 + 100);
  }

  /* ──────────────────────────────────────────
     9. INIT ALL
  ────────────────────────────────────────── */
  function init() {
    if (!document.querySelector('.faq-hero-section')) return;

    initAccordion();
    initCategoryFilter();
    initSearch();
    initHeroParticles();
    initScrollReveal();
    initEmotionalTouch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();