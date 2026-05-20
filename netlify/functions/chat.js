const fetch = require('node-fetch');
const path  = require('path');
const fs    = require('fs');

/* ── Load products.data.json ── */
async function loadProductsData() {
  const localPaths = [
    path.join(process.cwd(), 'products.data.json'),
    path.join(process.cwd(), 'public', 'products.data.json'),
    path.join(process.cwd(), 'dist', 'products.data.json'),
    path.join(__dirname, '..', '..', 'products.data.json'),
    path.join(__dirname, '..', '..', 'public', 'products.data.json'),
  ];
  for (const p of localPaths) {
    try {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) { /* continue */ }
  }
  const siteUrl = process.env.SITE_URL || process.env.URL || 'https://bbw4life.com';
  const res = await fetch(`${siteUrl}/products.data.json`);
  if (!res.ok) throw new Error(`Cannot load products.data.json: ${res.status}`);
  return res.json();
}

async function loadSearchData() {
  const localPaths = [
    path.join(process.cwd(), 'search.data.json'),
    path.join(process.cwd(), 'public', 'search.data.json'),
    path.join(__dirname, '..', '..', 'search.data.json'),
    path.join(__dirname, '..', '..', 'public', 'search.data.json'),
  ];
  for (const p of localPaths) {
    try {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) { /* continue */ }
  }
  try {
    const siteUrl = process.env.SITE_URL || process.env.URL || 'https://bbw4life.com';
    const res = await fetch(`${siteUrl}/search.data.json`);
    if (res.ok) return res.json();
  } catch (e) { /* ignore */ }
  return null;
}

async function loadBlogArticles() {
  const localPaths = [
    path.join(process.cwd(), 'blog', 'blog-articles.json'),
    path.join(process.cwd(), 'public', 'blog', 'blog-articles.json'),
    path.join(__dirname, '..', '..', 'blog', 'blog-articles.json'),
    path.join(__dirname, '..', '..', 'public', 'blog', 'blog-articles.json'),
  ];
  for (const p of localPaths) {
    try {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) { /* continue */ }
  }
  try {
    const siteUrl = process.env.SITE_URL || process.env.URL || 'https://bbw4life.com';
    const res = await fetch(`${siteUrl}/blog/blog-articles.json`);
    if (res.ok) return res.json();
  } catch (e) { /* ignore */ }
  return null;
}

/* ── Build product index ── */
function buildProductIndex(rawData) {
  const allActive = rawData.filter(p => p.type !== 'settings' && p.id && p.active);
  const settings  = rawData.find(p => p.type === 'settings') || {};

  const products = allActive.map((item, index) => {
    const colorsWithImages = (item.colors || [])
      .filter(c => c.active !== false)
      .map(c => ({ name: c.name, hex: c.hex || '', image: c.image || item.image || '' }));

    const variantPrices = (item.variants || []).map(v => v.price).filter(Boolean);
    const minPrice = variantPrices.length ? Math.min(...variantPrices) : item.price;

    return {
      id:            item.id,
      productNumber: index + 1,
      title:         item.title,
      description:   item.description,
      price:         minPrice,
      maxPrice:      item.price,
      compare_price: item.compare_price,
      image:         item.image,
      colors:        colorsWithImages,
      sizes:         item.sizes || [],
      variants:      (item.variants || []).map(v => ({
        vid:   v.vid,
        color: v.color || null,
        size:  v.size  || null,
        price: v.price || item.price,
        image: v.image || colorsWithImages.find(c => c.name === v.color)?.image || item.image || ''
      })),
      discounts: {
        single: item.single_discount || 0,
        duo:    item.duo_discount    || 0,
        trio:   item.trio_discount   || 0
      },
      startDate:    item.start_date || '',
      endDate:      item.end_date   || '',
      rating:       item.rating        || null,
      reviewsCount: item.reviews_count || null,
      badge:        item.badge ? (item.badge.text || '') : '',
      url:          `/products/product${index + 1}.html`,
      cj_id:        item.cj_id
    };
  });

  return { products, settings };
}

/* ══════════════════════════════════════════════════════
   BADGE DETECTION
══════════════════════════════════════════════════════ */
function buildBadgeMap(products) {
  const map = new Map();
  for (const p of products) {
    const b = (p.badge || '').trim();
    if (b) map.set(b.toLowerCase(), b);
  }
  return map;
}

function detectBadgeQuery(message, badgeMap) {
  if (!badgeMap.size) return null;
  const q = message.toLowerCase().trim();
  const sorted = [...badgeMap.keys()].sort((a, b) => b.length - a.length);
  for (const badgeLower of sorted) {
    if (q.includes(badgeLower)) return badgeLower;
  }
  return null;
}

/* ══════════════════════════════════════════════════════
   LANGUAGE DETECTION
══════════════════════════════════════════════════════ */
function detectLanguage(message, allowedLanguages) {
  const text = message.toLowerCase().trim();
  const words = text.split(/\s+/).map(w => w.replace(/[^a-záàâçèêëéíîïóôùûüñú]/gi, ''));

  let scores = { en: 0, fr: 0, es: 0, ar: 0, zh: 0, hi: 0, pt: 0, ru: 0, de: 0, ja: 0 };

  if (/[\u0600-\u06FF]/.test(text)) scores.ar += 10;
  if (/[\u4E00-\u9FFF\u3400-\u4DBF]/.test(text)) scores.zh += 10;
  if (/[\u0900-\u097F]/.test(text)) scores.hi += 10;
  if (/[\u0400-\u04FF]/.test(text)) scores.ru += 10;
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) scores.ja += 10;

  if (/\b(bonjour|bonsoir|salut|merci|comment|c'est|je|vous|nous|les|des|une|pour|avec|dans|sur|mais|très|aussi|peut|plus|produit|livraison|taille|couleur|disponible|combien|où|quand|prix|acheter|réduction)\b/.test(text)) scores.fr += 3;
  if (/[àâçèêëîïôùûü]/.test(text)) scores.fr += 3;
  ['je','tu','il','elle','nous','vous','ils','elles','le','la','les','un','une','des','du','et','est','sont','avec','dans','pour','sur','pas','plus','très','bien','aussi','mais','ou','donc','car','que','qui','quoi','comment','quand','où','pourquoi','quel','quelle','bonjour','merci','oui','non'].forEach(w => { if (words.includes(w)) scores.fr += 2; });

  if (/\b(hola|buenas|buenos|cómo|como|puedo|quiero|necesito|tienes|tengo|gracias|ayuda|precio|envío|producto|comprar|descuento|talla|disponible|cuánto|dónde|también)\b/.test(text)) scores.es += 3;
  if (/[áéíóúüñ¿¡]/.test(text)) scores.es += 3;
  ['yo','él','ella','nosotros','ellos','ellas','los','las','del','al','con','por','para','sobre','más','muy','también','pero','porque','quien','cuando','donde','hola','gracias','sí','tener','ser','estar','hacer','poder','querer'].forEach(w => { if (words.includes(w)) scores.es += 2; });

  if (/\b(olá|oi|obrigado|obrigada|como|você|produto|preço|comprar|ajuda|envio|disponível|desconto)\b/.test(text)) scores.pt += 3;
  if (/[ãõâêôáéíóúàü]/.test(text)) scores.pt += 2;
  ['você','nós','eles','elas','uma','por','para','com','mas','também','não','sim','obrigado','como','onde','quando','porque','produto','preço'].forEach(w => { if (words.includes(w)) scores.pt += 2; });

  if (/\b(hallo|guten|danke|bitte|wie|was|wo|wann|warum|ich|sie|wir|der|die|das|und|für|mit|auf|ist|sind|haben|kaufen|produkt|preis|versand|verfügbar|rabatt)\b/.test(text)) scores.de += 3;
  if (/[äöüß]/.test(text)) scores.de += 3;
  ['ich','du','er','sie','es','wir','ihr','der','die','das','und','ist','sind','mit','auf','für','von','zu','an','ein','eine','nicht','auch','aber','oder','wie','was','wo','wann'].forEach(w => { if (words.includes(w)) scores.de += 2; });

  if (/\b(hello|hi|hey|what|how|can|could|would|should|where|when|why|which|who|the|and|for|with|this|that|have|your|you|want|need|does|do|is|are|was|were|help|price|shipping|color|size|available|discount|product|buy|order)\b/.test(text)) scores.en += 3;
  ['i','you','he','she','it','we','they','the','a','an','is','are','was','were','have','has','had','do','does','did','will','would','can','could','should','may','might','and','or','but','for','with','at','by','from','to','in','on','of','that','this','what','how','when','where','why','who','which'].forEach(w => { if (words.includes(w)) scores.en += 1; });

  let detected = 'en';
  let best = 0;
  for (const [lang, score] of Object.entries(scores)) {
    if (score > best) { best = score; detected = lang; }
  }
  if (best === 0) detected = 'en';

  if (allowedLanguages && allowedLanguages.length > 0) {
    if (!allowedLanguages.includes(detected)) return 'en';
  }

  return detected;
}

function getLangName(code) {
  const names = { en: 'ENGLISH', fr: 'FRENCH', es: 'SPANISH', ar: 'ARABIC', zh: 'CHINESE', hi: 'HINDI', pt: 'PORTUGUESE', ru: 'RUSSIAN', de: 'GERMAN', ja: 'JAPANESE' };
  return names[code] || 'ENGLISH';
}

/* ══════════════════════════════════════════════════════
   SMART INTENT DETECTION
══════════════════════════════════════════════════════ */
function detectIntent(message) {
  const q = message.toLowerCase();

  const generalPatterns = [
    /fondateur|founder|qui.+(fond|cre[aé]t)|francenel|administrateur|admin/,
    /objectif|mission|but de bbw|about bbw|à propos/,
    /\bequipe\b|\bteam\b|\bstaff\b/,
    /c.est quoi bbw|what is bbw|what.s bbw4life/,
    /histoire|story|origin|origine/,
    /pourquoi.+(cre|fond|lanc)|why.+(creat|found|launch)/,
    /mouvement|movement|communauté|community|famille|family/,
    /beauté|beauty|courbes|curves|plus.?size|taille.+plus/,
    /conseils?|advice|astuce|tips?/,
    /confiance|confidence|acceptation|acceptance|estime de soi|self.esteem/,
    /stress|anxiet|depress|mental|moral/,
    /contact|joindre|reach|parler.+(humain|person|quelqu)|message|whatsapp|telegram/,
    /support|aide.+(équipe|team)/,
    /blog|article|post|read|lire/,
    /\bcompte\b|\baccount\b|\bcuenta\b/,
    /mon profil|my profile|mi perfil/,
    /mes commandes|my orders|mis pedidos/,
    /historique.+(commande|order|pedido)/,
    /mode.+paiement|payment method|método.+pago/,
    /changer.+(mot de passe|password|contraseña)/,
    /wishlist|liste.+(souhaits|envie)|saved items/,
    /suivre.+(commande|colis)|track.+(order|package)|rastrear/,
    /collection|catalogue|catalog|tous les produits|all products|todas las colecciones/,
    /frais.+(port|livraison)|shipping cost|costo.+envío/,
    /livraison|shipping.+info|delivery.+time|délai/,
    /taxes|impôts|impuestos/,
    /stripe|paypal|apple pay|google pay|carte.+crédit|credit card|tarjeta/,
    /privacy|confidentialit|privacidad|données.+person|personal.+data/,
    /remboursement|refund|reembolso|retour|return|devolution/,
    /conditions.+(utilisation|service|vente)|terms.+(service|conditions|use)|términos/,
    /disclaimer|avertissement|advertencia/,
    /politique|policy|politica/,
    /cookies|tracking|pistage/,
    /votre propre marque|votre propre collection|vous avez.+(marque|brand|collection propre)|est.ce que bbw.+(une marque|son propre)|avez.vous.+(marque|design)/i,
    /your own brand|your own collection|do you have.+(brand|own collection|your own)|is bbw.+(a brand|own brand)/i,
    /tienen.+(su propia marca|colección propia)|es bbw.+(una marca|marca propia)|tienen marca propia/i,
    /bbw.+(sa propre|son propre|leur propre).+(marque|collection|design)/i,
    /marque propre|propre marque|brand propre|own brand|marca propia/i,
    /curvafit|curva.?fit/i,
    /^(bonjour|bonsoir|salut|hello|hi|hey|hola|buenas|buenos|allo|yow|yo|wesh|cc)\b/,
    /^(merci|thank|thanks|gracias|ok|okay|d.accord|super|parfait|génial|great|bien|bueno)\b/,
  ];

  for (const pattern of generalPatterns) {
    if (pattern.test(q)) return 'general';
  }

  const productPatterns = [
    /acheter|buy|commander|order|comprar|pedir|ordenar/,
    /produit|product|article|producto|artículo/,
    /recommande.+(produit|article)|recommend.+(product|item)|recomienda.+(producto)/,
    /quel.+(produit|article)|which.+(product|item)|qué.+(producto)/,
    /montre.+(produit)|show.+(product|me)|muestra.+(producto)/,
    /robe|dress|vestido|chaussure|shoe|zapato|sandale|sandal|sandalia/,
    /soutien.gorge|bra|sujetador|bikini|maillot|swimsuit|traje.+baño/,
    /jean|pantalon|pant|trouser|short|shorts|veste|jacket|manteau/,
    /haut|top|chemise|shirt|blouse|pull|sweat|sweater|robe.+nuit|nightdress/,
    /lingerie|ensemble|set|peignoir|robe.+chambre|bathrobe/,
    /vernis|nail|ongle|mascara|eye|sourcil|eyebrow|brow|rouge.+lèvre|lipstick|lipgloss/,
    /soin|serum|crème|cream|masque|mask|huile|oil|nettoyant|cleanser/,
    /cheveux|hair|coiffure|shampooing|shampoo/,
    /beauty|beauté|maquillage|makeup/,
    /taille.+(disponible|dispo)|available.+(color|size)|qué.+(color|talla)/,
    /existe.+(couleur|taille)|come in.+(color|size)|viene.+(color|talla)/,
    /\$\d+|under \$|moins de \$|budget.+(produit|product)|menos de \$/,
    /combien.+(coûte|cost).+(ce|this|le|la)|cuánto.+(cuesta|vale)/,
    /best.?seller|meilleure?.+vente|más.+vendido|top.+vente/,
    /en promotion|in promotion|on sale|en promo/,
    /new.?arrival|nouvel?.+arriv|nueva?.+llegad/,
    /top.+deal|meilleure?.+offre|mejor.+oferta/,
  ];

  for (const pattern of productPatterns) {
    if (pattern.test(q)) return 'product';
  }

  return 'general';
}

/* ══════════════════════════════════════════════════════
   TOP STARTER REQUEST
══════════════════════════════════════════════════════ */
function isTopStarterRequest(message) {
  const q = message.toLowerCase();
  const patterns = [
    /produits?.+(pour commencer|pour débuter|pour démarrer)/,
    /pour.+(commencer|débuter|démarrer).+(mon style|ma garde.robe|ma beauté|ma transform)/,
    /par où commencer/,
    /que me recommandes.+pour commencer/,
    /quels? produits?.+commencer/,
    /pour bien commencer/,
    /je (suis |)nouveau.+(ici|cliente?)/,
    /kit.+(départ|débutant|starter)/,
    /pack.+(débutant|commencer|démarrer)/,
    /products?.+to (get started|start my journey|begin my journey)/,
    /where (do i |should i |can i |)(start|begin)/,
    /what.*recommend.*to start/,
    /best products?.+for (absolute )?beginners?/,
    /starter.+products?/,
    /i('m| am) new (here|to bbw4life)/,
    /to start my (journey|transformation|style journey)/,
    /get started (with|on) bbw4life/,
    /productos?.+(para empezar|para comenzar|para iniciar)/,
    /por dónde empezar/,
    /qué me recomiendas para empezar/,
    /soy nueva.+(aquí|cliente)/,
  ];
  return patterns.some(p => p.test(q));
}

/* ══════════════════════════════════════════════════════
   GREETING DETECTION
══════════════════════════════════════════════════════ */
function isGreeting(message) {
  const q = message.toLowerCase().trim();
  return /^(bonjour|bonsoir|salut|hello|hi|hey|hola|buenas|buenos|allo|yow|yo|wesh|cc|good morning|good evening|good afternoon|buenos días|buenas noches|buenas tardes)[\s!.,]*$/.test(q);
}


function detectGender(message) {
  const q = message.toLowerCase();
  
  const malePatterns = [
    /\b(homme|hommes|masculin|masculins|pour homme|pour les hommes|men|man|male|hombre|hombres|para hombre|masculino|garçon|garçons|boy|boys|chico|chicos|monsieur|messieurs|mec|mecs|gars)\b/,
    /\b(men'?s|menswear|pour lui|for him|para él|pour un homme|for a man)\b/,
    /\b(taille homme|size men|vêtement homme|clothing men|mode homme|fashion men|chaussure homme|men.?s shoe|zapatos hombre)\b/,
  ];
  
  const femalePatterns = [
    /\b(femme|femmes|féminin|pour femme|pour les femmes|women|woman|female|mujer|mujeres|para mujer|femenino|dame|dames|lady|ladies|señora|señoras)\b/,
    /\b(women'?s|womenswear|pour elle|for her|para ella|pour une femme|for a woman)\b/,
    /\b(taille femme|size women|vêtement femme|clothing women|mode femme|fashion women|chaussure femme|women.?s shoe|zapatos mujer)\b/,
  ];

  const hasMale   = malePatterns.some(p  => p.test(q));
  const hasFemale = femalePatterns.some(p => p.test(q));

  if (hasMale && !hasFemale) return 'male';
  if (hasFemale && !hasMale) return 'female';
  return null; // pas de genre détecté → pas de filtre
}

/* ══════════════════════════════════════════════════════
   BRAND QUERY DETECTION
══════════════════════════════════════════════════════ */
function isBrandQuery(message) {
  const q = message.toLowerCase();
  return /votre propre marque|votre propre collection|vous avez.+(marque|brand|collection propre)|est.ce que bbw.+(une marque|son propre)|avez.vous.+(marque|design)|your own brand|your own collection|do you have.+(brand|own collection|your own)|is bbw.+(a brand|own brand)|tienen.+(su propia marca|colección propia)|es bbw.+(una marca|marca propia)|tienen marca propia|bbw.+(sa propre|son propre|leur propre).+(marque|collection|design)|marque propre|propre marque|brand propre|own brand|marca propia/.test(q);
}



const MALE_PRODUCT_IDS = [
  'Pdg-Francenel-product35', // DrawstringPants
  'Pdg-Francenel-product36', // CropSlimPants
  'Pdg-Francenel-product37', // HaremPrints
  'Pdg-Francenel-product38', // LooseJeans
  'Pdg-Francenel-product39', // BritishLoafers
  'Pdg-Francenel-product40', // AirMesh Runners
  'Pdg-Francenel-product41', // LeatherCasuals
  'Pdg-Francenel-product42', // BusinessDress Shoes
  'Pdg-Francenel-product43', // HollowSneakers
  'Pdg-Francenel-product44', // TrendTrainers
  'Pdg-Francenel-product45', // PatentLoafers
  'Pdg-Francenel-product46', // CollarShirt
  'Pdg-Francenel-product47', // GeoPolo
  'Pdg-Francenel-product48', // StripedCollar Sweater
  'Pdg-Francenel-product49', // TurtleneckLux
  'Pdg-Francenel-product50', // HikeJacket
  'Pdg-Francenel-product51', // RoundNeck Sweatshirt
];

// Produits strictement féminins (exclure quand on demande homme)
const FEMALE_ONLY_IDS = [
  'Pdg-Francenel-product1',  // Glam Heels
  'Pdg-Francenel-product2',  // RetroRun Sneakers (unisex mais design féminin)
  'Pdg-Francenel-product3',  // BohoFlip
  'Pdg-Francenel-product4',  // PowerHeels
  'Pdg-Francenel-product5',  // WinterBoost Boots
  'Pdg-Francenel-product6',  // ColorStilettos
  'Pdg-Francenel-product7',  // NightChic Dress
  'Pdg-Francenel-product8',  // SlitLux Dress
  'Pdg-Francenel-product9',  // PlaidOverall
  'Pdg-Francenel-product10', // FloralFlounce
  'Pdg-Francenel-product11', // VintageSquare
  'Pdg-Francenel-product12', // PaisleyBelt
  'Pdg-Francenel-product13', // MeshDuo
  'Pdg-Francenel-product14', // MeshGlam
  'Pdg-Francenel-product15', // LinenBreeze
  'Pdg-Francenel-product16', // StripedMini
  'Pdg-Francenel-product17', // LoungeRobe
  'Pdg-Francenel-product18', // LaceNight
  'Pdg-Francenel-product19', // LaceThong
  'Pdg-Francenel-product20', // SolidSexy Bikini
  'Pdg-Francenel-product21', // CurveBikini
  'Pdg-Francenel-product22', // LeopardNight
  'Pdg-Francenel-product23', // SupportBra
  'Pdg-Francenel-product24', // LaceRomper
  'Pdg-Francenel-product25', // StripedBikini
  'Pdg-Francenel-product26', // TubeBikini
  'Pdg-Francenel-product27', // RuffleOne
  'Pdg-Francenel-product28', // BandageBikini
  'Pdg-Francenel-product29', // ContrastOne
  'Pdg-Francenel-product30', // PremiumBikini
  'Pdg-Francenel-product31', // IrregularTop
  'Pdg-Francenel-product32', // ChristmasSweat
  'Pdg-Francenel-product33', // DalmationShorts
  'Pdg-Francenel-product34', // LeopardShirt
];


/* ══════════════════════════════════════════════════════
   PRODUCT SEARCH
══════════════════════════════════════════════════════ */
function searchProducts(query, products, genderFilter) {
  if (!query) return { results: [], isVague: false };
  const q        = query.toLowerCase();
  const keywords = q.split(/\s+/).filter(k => k.length >= 2);

  // ── FILTRE GENRE STRICT ──
  let filteredProducts = products;
  if (genderFilter === 'male') {
    filteredProducts = products.filter(p => MALE_PRODUCT_IDS.includes(p.id));
  } else if (genderFilter === 'female') {
    filteredProducts = products.filter(p => !MALE_PRODUCT_IDS.includes(p.id));
  }

  const scored = products.map(p => {
    let score = 0;
    const searchText = `${p.title} ${p.description}`.toLowerCase();
    keywords.forEach(kw => {
      if (searchText.includes(kw)) score += 3;
      if (p.title.toLowerCase().includes(kw)) score += 2;
      p.colors.forEach(c => { if (c.name.toLowerCase().includes(kw)) score += 2; });
      p.sizes.forEach(s  => { if (String(s).toLowerCase().includes(kw)) score += 1; });
    });

    // Boost produits avec le mieux noté quand requête "meilleur / top / best"
if (/meilleur|best|top|plus vendu|most sold|más vendido|popular|populaire/.test(q)) {
  if (p.rating && p.rating >= 4.5) score += 8;
  if (p.reviewsCount && p.reviewsCount >= 50) score += 5;
}

    const badgeLower = (p.badge || '').toLowerCase();
    if ((q.includes('best seller') || q.includes('meilleure vente') || q.includes('meilleur vente') || q.includes('top vente') || q.includes('más vendido')) && badgeLower.includes('best seller')) score += 15;
    if ((q.includes('promotion') || q.includes('promo') || q.includes('on sale') || q.includes('en promo') || q.includes('in promotion')) && badgeLower.includes('promotion')) score += 15;
    if ((q.includes('new arrival') || q.includes('new arriv') || q.includes('nouvel') || q.includes('nouveau') || q.includes('nueva llegada')) && badgeLower.includes('new')) score += 15;
    if ((q.includes('top sale') || q.includes('top deal') || q.includes('meilleure offre') || q.includes('mejor oferta')) && (badgeLower.includes('top sale') || badgeLower.includes('best deal'))) score += 15;

    const themes = [
      { words: ['glam','heel','stiletto','cross strap','sandale'],      id: 'Pdg-Francenel-product1',  boost: 12 },
      { words: ['retrorun','sneaker','chunky','street','retro'],        id: 'Pdg-Francenel-product2',  boost: 12 },
      { words: ['boho','flip','sandal','summer','embroid'],             id: 'Pdg-Francenel-product3',  boost: 12 },
      { words: ['powerheels','stiletto pump','12cm','queen'],           id: 'Pdg-Francenel-product4',  boost: 12 },
      { words: ['winterboost','boot','ankle boot','court'],             id: 'Pdg-Francenel-product5',  boost: 12 },
      { words: ['colorstilett','stiletto flip flop','vibrant'],        id: 'Pdg-Francenel-product6',  boost: 12 },
      { words: ['nightchic','mock neck','long sleeve','dress'],         id: 'Pdg-Francenel-product7',  boost: 12 },
      { words: ['slitlux','cutout','slit','round neck'],                id: 'Pdg-Francenel-product8',  boost: 12 },
      { words: ['plaid','overall','dungaree','wide strap'],             id: 'Pdg-Francenel-product9',  boost: 12 },
      { words: ['floral','flounce','surplice','printed'],               id: 'Pdg-Francenel-product10', boost: 12 },
      { words: ['vintage','square neck','short sleeve','imprim'],       id: 'Pdg-Francenel-product11', boost: 12 },
      { words: ['paisley','belt','orange','belted'],                    id: 'Pdg-Francenel-product12', boost: 12 },
      { words: ['mesh duo','perspective','two piece','sheer'],          id: 'Pdg-Francenel-product13', boost: 12 },
      { words: ['meshglam','solid','stitching','maxi'],                 id: 'Pdg-Francenel-product14', boost: 12 },
      { words: ['linen','breeze','cotton','button.down'],               id: 'Pdg-Francenel-product15', boost: 12 },
      { words: ['striped','mini','v.neck','vneck'],                     id: 'Pdg-Francenel-product16', boost: 12 },
      { words: ['loungerobe','bathrobe','sleepwear','peignoir'],        id: 'Pdg-Francenel-product17', boost: 12 },
      { words: ['lacenight','nightdress','strap','night dress'],        id: 'Pdg-Francenel-product18', boost: 12 },
      { words: ['lacethong','lingerie','sheer skirt','set lingerie'],   id: 'Pdg-Francenel-product19', boost: 12 },
      { words: ['solid','bikini','high waist','swimsuit'],              id: 'Pdg-Francenel-product20', boost: 12 },
      { words: ['curvebikini','curve','swimwear','solid color'],        id: 'Pdg-Francenel-product21', boost: 12 },
      { words: ['leopard','mesh','pajama','pyjama'],                    id: 'Pdg-Francenel-product22', boost: 12 },
      { words: ['supportbra','bra','breathable','large cup'],           id: 'Pdg-Francenel-product23', boost: 12 },
      { words: ['laceromper','romper','jumpsuit','lace'],               id: 'Pdg-Francenel-product24', boost: 12 },
      { words: ['striped','print','stripes','swimwear'],                id: 'Pdg-Francenel-product25', boost: 12 },
      { words: ['tube','tube top','swimsuit','swimming'],               id: 'Pdg-Francenel-product26', boost: 12 },
      { words: ['ruffle','ruffle','one piece','v.neck swim'],           id: 'Pdg-Francenel-product27', boost: 12 },
      { words: ['bandage','bandage bikini','swimsuit'],                 id: 'Pdg-Francenel-product28', boost: 12 },
      { words: ['contrast','contrasting','one.piece','swim'],          id: 'Pdg-Francenel-product29', boost: 12 },
      { words: ['premium','plus size','swimsuit collection'],           id: 'Pdg-Francenel-product30', boost: 12 },
      { words: ['irregular','top','loose','round neck'],                id: 'Pdg-Francenel-product31', boost: 12 },
      { words: ['christmas','sweat','sweatshirt','casual'],             id: 'Pdg-Francenel-product32', boost: 12 },
      { words: ['dalmatian','dalmation','shorts','high waist'],         id: 'Pdg-Francenel-product33', boost: 12 },
      { words: ['leopard','shirt','irregular collar','blouse'],         id: 'Pdg-Francenel-product34', boost: 12 },
      { words: ['drawstring','pants','pockets','casual'],               id: 'Pdg-Francenel-product35', boost: 12 },
      { words: ['crop','slim','cropped','drawstring pants'],            id: 'Pdg-Francenel-product36', boost: 12 },
      { words: ['harem','printed','trouser','cuffed'],                  id: 'Pdg-Francenel-product37', boost: 12 },
      { words: ['loose','jeans','relaxed','denim'],                     id: 'Pdg-Francenel-product38', boost: 12 },
      { words: ['british','loafer','formal','tassel'],                  id: 'Pdg-Francenel-product39', boost: 12 },
      { words: ['airmesh','runner','sport','sneaker','mesh shoe'],      id: 'Pdg-Francenel-product40', boost: 12 },
      { words: ['leather','casual','flat','breathable'],                id: 'Pdg-Francenel-product41', boost: 12 },
      { words: ['business','formal','wedding','dress shoe'],            id: 'Pdg-Francenel-product42', boost: 12 },
      { words: ['hollow','mesh','big size','fashion shoe'],             id: 'Pdg-Francenel-product43', boost: 12 },
      { words: ['trendtrainer','outdoor','sport shoe','trainer'],       id: 'Pdg-Francenel-product44', boost: 12 },
      { words: ['patent','loafer','luxury','party shoe'],               id: 'Pdg-Francenel-product45', boost: 12 },
      { words: ['collar','shirt','button.down','chemise'],              id: 'Pdg-Francenel-product46', boost: 12 },
      { words: ['geo','polo','geometric','print polo'],                 id: 'Pdg-Francenel-product47', boost: 12 },
      { words: ['striped collar','sweater','knit','collar sweater'],   id: 'Pdg-Francenel-product48', boost: 12 },
      { words: ['turtleneck','lux','long sleeve','pull'],               id: 'Pdg-Francenel-product49', boost: 12 },
      { words: ['hike','jacket','waterproof','outdoor'],                id: 'Pdg-Francenel-product50', boost: 12 },
      { words: ['roundneck','sweatshirt','pullover','mens'],            id: 'Pdg-Francenel-product51', boost: 12 },
      { words: ['nail','glue','uv','adhesive'],                         id: 'Pdg-Francenel-product52', boost: 12 },
      { words: ['bow','nail','fake nail','almond'],                     id: 'Pdg-Francenel-product53', boost: 12 },
      { words: ['nail','repair','lotion','nourish'],                    id: 'Pdg-Francenel-product54', boost: 12 },
      { words: ['brow','eyebrow','pencil','waterproof'],                id: 'Pdg-Francenel-product55', boost: 12 },
      { words: ['mascara','volumizing','4d','lash'],                    id: 'Pdg-Francenel-product56', boost: 12 },
      { words: ['browkit','eyebrow kit','stencil','cream'],             id: 'Pdg-Francenel-product57', boost: 12 },
      { words: ['obsidian','lip','balm','moisture'],                    id: 'Pdg-Francenel-product58', boost: 12 },
      { words: ['lip gloss','tearoff','peel.off','long.lasting'],       id: 'Pdg-Francenel-product59', boost: 12 },
      { words: ['ginger','lemon','makeup remover','clean pad'],         id: 'Pdg-Francenel-product60', boost: 12 },
      { words: ['hair mask','repair','moisturize','smooth'],            id: 'Pdg-Francenel-product61', boost: 12 },
      { words: ['batana','oil','hair oil','glow'],                      id: 'Pdg-Francenel-product62', boost: 12 },
      { words: ['batanaboost','conditioner','hair growth','120ml'],     id: 'Pdg-Francenel-product63', boost: 12 },
      { words: ['poreclean','exfoliant','anti-acne','pore'],            id: 'Pdg-Francenel-product64', boost: 12 },
      { words: ['knuckle','white','serum','brightener'],                id: 'Pdg-Francenel-product65', boost: 12 },
      { words: ['propolis','glow','essence','brightening'],             id: 'Pdg-Francenel-product66', boost: 12 },
      { words: ['menglow','men','concealing','lazy cream'],             id: 'Pdg-Francenel-product67', boost: 12 },
      { words: ['ice','grid','silicone','cooling','facial'],            id: 'Pdg-Francenel-product68', boost: 12 },
    ];

    themes.forEach(t => {
      if (p.id === t.id && t.words.some(w => q.includes(w))) score += t.boost;
    });

    if ((q.includes('cheap') || q.includes('budget') || q.includes('pas cher') || q.includes('barato') || q.includes('économico')) && p.price < 20) score += 5;
    return { ...p, score };
  });

  const filtered = scored.filter(p => p.score > 0).sort((a, b) => b.score - a.score);
  if (filtered.length === 0) return { results: [], isVague: false };

  const topScore    = filtered[0].score;
  const secondScore = filtered[1]?.score || 0;
  const gap         = topScore - secondScore;

  if (topScore >= 14 && gap >= 6) return { results: filtered.slice(0, 1), isVague: false };
  if (filtered.length >= 3 && gap <= 4) return { results: filtered.slice(0, 4), isVague: true };
  return { results: filtered.slice(0, 2), isVague: false };
}

/* ── Format delivery dates ── */
function formatDelivery(startDate, endDate) {
  if (!startDate || !endDate) return null;
  try {
    const opts = { day: '2-digit', month: '2-digit', year: '2-digit' };
    const s = new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', opts);
    const e = new Date(endDate   + 'T00:00:00').toLocaleDateString('en-GB', opts);
    return `${s} – ${e}`;
  } catch (_) { return null; }
}

function buildSearchDataContext(searchData) {
  if (!searchData || !Array.isArray(searchData)) return '';
  const pages    = searchData.filter(i => i.type === 'page');
  const policies = searchData.filter(i => i.type === 'policy');
  const blogs    = searchData.filter(i => i.type === 'blog');
  let text = '';
  if (pages.length)    { text += '\nSITE PAGES:\n';    pages.forEach(p    => { text += `  • ${p.title} → ${p.url}\n`; }); }
  if (policies.length) { text += '\nPOLICIES:\n';      policies.forEach(p => { text += `  • ${p.title} → ${p.url}\n`; }); }
  if (blogs.length)    { text += '\nBLOG ARTICLES:\n'; blogs.forEach(p    => { text += `  • ${p.title} → ${p.url}\n`; }); }
  return text;
}

function buildBlogContext(blogData) {
  if (!blogData) return '';
  let articles = [];
  if (Array.isArray(blogData)) { articles = blogData; }
  else if (blogData.articles && Array.isArray(blogData.articles)) { articles = blogData.articles; }
  else if (typeof blogData === 'object') {
    for (const key of Object.keys(blogData)) { if (Array.isArray(blogData[key])) { articles = blogData[key]; break; } }
  }
  if (!articles.length) return '';
  let text = '\nBLOG ARTICLES:\n';
  articles.forEach(a => {
    const title   = a.title    || a.name    || 'Untitled';
    const url     = a.url      || a.slug    || a.link    || '/blog/blog.html';
    const summary = a.summary  || a.excerpt || a.description || '';
    const cat     = a.category || a.tag     || '';
    const date    = a.date     || a.published_at || '';
    text += `  • "${title}"`;
    if (cat)  text += ` [${cat}]`;
    if (date) text += ` (${date})`;
    text += ` → ${url}`;
    if (summary) text += `\n    Summary: ${summary.substring(0, 150)}${summary.length > 150 ? '...' : ''}`;
    text += '\n';
  });
  return text;
}

/* ══════════════════════════════════════════════════════
   PAGE NAVIGATION MAP — BBW4LIFE
══════════════════════════════════════════════════════ */
const PAGE_MAP = {
  '/index.html':                              { label: 'Home',                   icon: '🏠' },
  '/collections/bbw4life-all-product.html':   { label: 'Shop All',               icon: '🛍️' },
  '/collections/bbw4life-all-collections.html':{ label: 'Collections',           icon: '🗂️' },
  '/collections/curvy-woman.html':            { label: 'Curvy Woman',            icon: '💃' },
  '/collections/curvy-dresses.html':          { label: 'Curvy Dresses',          icon: '👗' },
  '/collections/curvy-beauty.html':           { label: 'Curvy Beauty',           icon: '💄' },
  '/collections/main-plus-size.html':         { label: 'Men Plus Size',          icon: '👔' },
  '/collections/bbw4life-pants-skirts.html':  { label: 'Pants & Shorts',         icon: '👖' },
  '/collections/most-popular.html':           { label: 'Most Popular',           icon: '🔥' },
  '/collections/bbw-features-products.html':  { label: 'BBW Featured',           icon: '✨' },
  '/blog/blog.html':                          { label: 'Blog',                   icon: '📝' },
  '/page/our-story.html':                     { label: 'Our Story',              icon: '💖' },
  '/page/about.html':                         { label: 'About Us',               icon: 'ℹ️' },
  '/page/contact.html':                       { label: 'Contact',                icon: '📩' },
  '/account.html':                            { label: 'My Account',             icon: '👤' },
  '/page/order-tracking.html':                { label: 'Order Tracking',         icon: '📦' },
  '/page/faq.html':                           { label: 'FAQ',                    icon: '❓' },
  '/policies/privacy.html':                   { label: 'Privacy Policy',         icon: '🔒' },
  '/policies/refund.html':                    { label: 'Refund Policy',          icon: '↩️' },
  '/policies/shipping.html':                  { label: 'Shipping Info',          icon: '🚚' },
  '/policies/terms.html':                     { label: 'Terms & Conditions',     icon: '📄' },
  '/page/disclaimer.html':                    { label: 'Medical Disclaimer',     icon: '⚕️' },
};

/* ══════════════════════════════════════════════════════
   BUILD SYSTEM PROMPT — BBW4LIFE
══════════════════════════════════════════════════════ */
function buildSystemPrompt(products, settings, contactInfo, searchData, blogData, badgeMap) {
  const contactEmails  = settings.contact_emails || {};
  const emailsText     = Object.entries(contactEmails).map(([k, v]) => `• ${k}: ${v}`).join('\n') || '• No emails configured';
  const promos         = settings.promos      || [];
  const shipping       = settings.cart_drawer || {};
  const taxRate        = settings.tax_rate      || 0.5;
  const shippingCost   = settings.shipping_cost || 40.0;
  const taxPercent     = Math.round(taxRate * 100);
  const freeShipThresh = shipping.free_shipping_threshold || 350;

  const promosText = promos.length
    ? promos.map(p => `• Code **[[${p.code}]]** → **${p.percent}% off** on ${p.items}+ items`).join('\n')
    : '• No active promo codes at this time';

  /* BBW Featured products — lus depuis settings, pas hardcodés */
  const jrgqCols      = (settings.jrgq_collections && settings.jrgq_collections.collections) || [];
  const featuredCol   = jrgqCols.find(c => c.id === 'bbw-features-products');
  const featuredIds   = (featuredCol && featuredCol.product_ids) || [];
  const EXCLUDED_IDS = featuredIds;

  const visibleProducts = products.filter(p => !EXCLUDED_IDS.includes(p.id));

  /* Titres des produits BBW Featured pour le prompt "brand coming soon" */
  const featuredTitles = EXCLUDED_IDS
    .map(id => products.find(p => p.id === id))
    .filter(Boolean)
    .map(p => `**${p.title}**`)
    .join(', ') || 'exclusive original designs';

  const catalogText = visibleProducts.map((p, i) => {
    const colorsList = p.colors.map(c => c.name).join(', ');
    const sizesList  = p.sizes.length ? p.sizes.join(', ') : 'No size needed';
    const discounts  = [
      p.discounts.single ? `1 item: -${p.discounts.single}%` : '',
      p.discounts.duo    ? `2 items: -${p.discounts.duo}%`   : '',
      p.discounts.trio   ? `3 items: -${p.discounts.trio}%`  : '',
    ].filter(Boolean).join(' | ') || 'No discount';
    const delivery  = formatDelivery(p.startDate, p.endDate) || 'Contact us';
    const rating    = p.rating ? `${p.rating}/5 (${p.reviewsCount || 0} reviews)` : 'N/A';
    const badgeLine = p.badge ? `\n  Badge: ${p.badge}` : '';
    return `
PRODUCT ${i + 1}:
  Title: ${p.title}
  Description: ${p.description}
  Price: $${p.price}${p.maxPrice !== p.price ? ` to $${p.maxPrice}` : ''} (was $${p.compare_price})
  Rating: ${rating}${badgeLine}
  Colors: ${colorsList || 'N/A'}
  Sizes: ${sizesList}
  Discounts: ${discounts}
  Delivery: ${delivery}
  Page: ${p.url}`;
  }).join('\n');

  const realBadgeList = [...badgeMap.values()].join(', ') || 'none';

  const topStarter      = settings.top_starter_products || {};
  const topStarterIds   = topStarter.product_ids || [];
  const topStarterLabel = topStarter.label || 'Best products to discover BBW4LIFE';
  const topStarterList  = topStarterIds
    .filter(id => !EXCLUDED_IDS.includes(id))
    .map(id => {
      const prod = visibleProducts.find(p => p.id === id);
      return prod ? `  • ${prod.title} → ${prod.url}` : null;
    }).filter(Boolean).join('\n');

  const contactChannels = [];
  if (contactInfo.hasWhatsapp) contactChannels.push('WhatsApp');
  if (contactInfo.hasTelegram) contactChannels.push('Telegram');
  contactChannels.push('Contact page');

  const searchContext = buildSearchDataContext(searchData);
  const blogContext   = buildBlogContext(blogData);

/* ── Shipping options depuis settings ── */
  const shippingOptions = [
    settings.shipping_standard_delay ? `• Standard (free over $${freeShipThresh}, ${settings.shipping_standard_delay})` : null,
    settings.shipping_dhl_delay      ? `• Express DHL (${settings.shipping_dhl_delay})`                                   : null,
    settings.shipping_priority_delay ? `• Priority (${settings.shipping_priority_delay})`                                 : null,
    settings.shipping_economy_delay  ? `• Economy (${settings.shipping_economy_delay})`                                   : null,
    settings.shipping_express_delay  ? `• Express (${settings.shipping_express_delay})`                                   : null,
  ].filter(Boolean).join('\n');

  const collectionsContext = `
COLLECTIONS:
  • Curvy Woman (34 styles: shoes, dresses, bathrobe, sexy, breathable, bikini, tops) → /collections/curvy-woman.html
  • Men Plus Size (18 styles: pants, shoes, shirts, sweaters) → /collections/main-plus-size.html
  • Curvy Beauty (17 styles: nails, eyebrow, lip, makeup, haircare, skincare) → /collections/curvy-beauty.html
  • Curvy Dresses (dresses, bathrobe, sexy, breathable) → /collections/curvy-dresses.html
  • Pants & Shorts (5 styles) → /collections/bbw4life-pants-skirts.html
  • Most Popular (community favorites) → /collections/most-popular.html
  • All Products (68 styles) → /collections/bbw4life-all-product.html
`;

  /* ── Brand section — dynamique selon plans_available ── */
  const plansAvailable = (settings.plans_available || 'no').toLowerCase().trim() === 'yes';

  const brandSection = plansAvailable ? `
═══════════════════════════════════════
🏷️ BBW4LIFE — OWN BRAND & COLLECTION
═══════════════════════════════════════
YES — BBW4LIFE IS AN ESTABLISHED BRAND with its own original designs.

When someone asks "do you have your own brand / your own collection / your own designs / est-ce que bbw4life a sa propre marque / tienen su propia marca":

Reply as a proud and warm brand ambassador. Key points to communicate naturally:
- **BBW4LIFE** is a real brand — not a reseller. We design our own pieces.
- Our collection was built around one mission: **Beauty Has No Sizes**
- Every piece is designed SPECIFICALLY for plus-size women — not adapted, but created FOR them
- The community votes for styles, colors and cuts — we bring them to life
- Available in **sizes S to 6XL**
- Founded on **June 18, 2025** by **Francenel**
- Categories available: dresses, shoes, lingerie, swimwear, beauty, tops, and more

Tone: proud, inspiring, like a real brand ambassador presenting something they genuinely believe in.
Invite them to discover the full collection.
Add 🔗[PAGE:/collections/bbw4life-all-product.html] at the end.
Add 🔗[PAGE:/collections/bbw-features-products.html] to show BBW Featured designs.
` : `
═══════════════════════════════════════
🏷️ BBW4LIFE — NEW BRAND, BEING BUILT
═══════════════════════════════════════
BBW4LIFE IS A NEW BRAND currently being built with heart and purpose.

When someone asks "do you have your own brand / your own collection / your own designs / est-ce que bbw4life a sa propre marque / tienen su propia marca":

Reply honestly but with warmth, excitement and pride — like someone sharing something beautiful in progress.
Key points to communicate naturally:
- Yes, **BBW4LIFE** is a new brand born from a real, deeply personal story
- We are going through legal procedures and brand-building steps to deliver the best possible service
- It takes time to do things right — the mission is clear: **Beauty Has No Sizes**
- In the meantime, our **BBW Featured** collection already presents our current original designs
- These designs include: ${featuredTitles}
- On each of these product pages, there is a **Request** button — clients can request one of our designs (size, color, custom details)
- The team contacts them within **24–48 hours** to finalize the custom order

Tone: genuine, optimistic, proud — never apologetic or uncertain. This is an exciting journey.
Make them feel they are part of something being built FOR THEM.
Add 🔗[PAGE:/collections/bbw-features-products.html] at the end so they can discover the BBW Featured collection.
`;

  return `You are **Berline**, the official AI assistant and stylist of **BBW4LIFE**.

═══════════════════════════════════════
🎯 YOUR IDENTITY & PERSONALITY
═══════════════════════════════════════
You are warm, human, motivating, and natural — never robotic or stiff.
Adapt your tone: casual when they are casual, caring when they share struggles.
You feel like a real friend who knows everything about BBW4LIFE.
Use emojis naturally — not on every sentence, only when it feels right.
KEEP RESPONSES SHORT — max 4-5 lines. No walls of text.

GREETINGS — when someone says hi, yow, hello, salut, hola, wesh, cc:
Reply warmly and naturally. Ask how you can help. No buttons, no lists. Just a human hello.
NEVER show contact or page buttons for simple greetings or small talk.

═══════════════════════════════════════
🌍 LANGUAGE RULE — ABSOLUTE — NO EXCEPTION
═══════════════════════════════════════
The backend has already detected the user's language and tells you which one to use.
You MUST reply in exactly that language — no mixing, no switching, no exception.
NEVER mix languages in your response.

═══════════════════════════════════════
✏️ FORMATTING RULES
═══════════════════════════════════════
Bold: **Francenel**, **BBW4LIFE**, product names, key prices.

🎟️ PROMO CODES — always: **[[CODE]]**
Example: Use **[[PAUL81]]** for **40% off** on 10+ items.
NEVER show a code without [[...]].

🔗 PAGE BUTTONS — place at END of reply: 🔗[PAGE:/url]
Frontend converts to a clickable button. NEVER write raw URLs. Say "button below".

Page URLs:
  Home → 🔗[PAGE:/index.html]
  Shop All → 🔗[PAGE:/collections/bbw4life-all-product.html]
  All Collections → 🔗[PAGE:/collections/bbw4life-all-collections.html]
  Curvy Woman → 🔗[PAGE:/collections/curvy-woman.html]
  Curvy Dresses → 🔗[PAGE:/collections/curvy-dresses.html]
  Curvy Beauty → 🔗[PAGE:/collections/curvy-beauty.html]
  Men Plus Size → 🔗[PAGE:/collections/main-plus-size.html]
  Pants & Shorts → 🔗[PAGE:/collections/bbw4life-pants-skirts.html]
  Most Popular → 🔗[PAGE:/collections/most-popular.html]
  BBW Featured → 🔗[PAGE:/collections/bbw-features-products.html]
  Blog → 🔗[PAGE:/blog/blog.html]
  Our Story → 🔗[PAGE:/page/our-story.html]
  About → 🔗[PAGE:/page/about.html]
  Contact → 🔗[PAGE:/page/contact.html]
  My Account → 🔗[PAGE:/account.html]
  Order Tracking → 🔗[PAGE:/page/order-tracking.html]
  FAQ → 🔗[PAGE:/page/faq.html]
  Privacy Policy → 🔗[PAGE:/policies/privacy.html]
  Refund Policy → 🔗[PAGE:/policies/refund.html]
  Shipping Info → 🔗[PAGE:/policies/shipping.html]
  Terms & Conditions → 🔗[PAGE:/policies/terms.html]
  Disclaimer → 🔗[PAGE:/page/disclaimer.html]
  Product N → 🔗[PAGE:/products/productN.html]

WHEN TO ADD 🔗[PAGE:...]:
✅ User asks to go to / visit a page → add that page button
✅ privacy / data / GDPR / cookies → add 🔗[PAGE:/policies/privacy.html]
✅ refund / return / remboursement / reembolso / cancel → add 🔗[PAGE:/policies/refund.html]
✅ shipping / livraison / envío → add 🔗[PAGE:/policies/shipping.html]
✅ terms / conditions / CGV / términos → add 🔗[PAGE:/policies/terms.html]
✅ disclaimer / medical / avertissement → add 🔗[PAGE:/page/disclaimer.html]
✅ account / orders / profile / password → add 🔗[PAGE:/account.html]
✅ track order / order tracking → add 🔗[PAGE:/page/order-tracking.html]
✅ faq / questions → add 🔗[PAGE:/page/faq.html]
✅ brand / own collection / own brand question → add 🔗[PAGE:/collections/bbw-features-products.html]
❌ NEVER for greetings, small talk, founder questions, general style advice

👇 CONTACT BUTTONS — shown when reply ends with 👇 on its own line.
Backend uses this to show WhatsApp / Telegram / Contact page buttons.

WHEN TO ADD 👇 — EVERY TIME one of these is detected, add 👇 NO EXCEPTION:
✅ comment vous contacter / joindre / écrire / rejoindre
✅ je veux parler à quelqu'un / un humain / un agent / un conseiller
✅ service client / support / aide équipe
✅ votre whatsapp / telegram / email
✅ how to contact / reach / message you
✅ I want to speak to someone / a human / an agent
✅ customer service / support
✅ your whatsapp / telegram / email
✅ cómo contactarlos / hablar con alguien / servicio al cliente
✅ su whatsapp / telegram / email

IMPORTANT: Even if the user asked about contact before → ALWAYS add 👇 again.
The frontend needs it EVERY TIME to show the buttons. Never skip it.
❌ NEVER add 👇 for: greetings, founder info, products, style advice, policies.

═══════════════════════════════════════
🚦 PRODUCT DISPLAY RULES
═══════════════════════════════════════
Show products ONLY when user explicitly asks to buy or names a specific product type.
NEVER suggest products for: greetings, contact, policies, general style info.
Specific → show 1 product only.
Vague (dress, shoes, something nice) → show up to 4, ask which one they mean.

═══════════════════════════════════════
🏷️ BADGE RULE — CRITICAL
═══════════════════════════════════════
The real badge texts in our catalog are: ${realBadgeList}
These are read directly from products.data.json. Do not invent others.

When the backend detects a badge query, it:
1. Identifies which badge the user means
2. Filters products strictly — ONLY products with that exact badge
3. Injects those products into your context below

Your job for badge queries:
- Describe the injected products naturally in the user's language
- Translate the badge name naturally (you already know how)
- NEVER mention or show products not injected for this badge
- If zero products injected → tell user honestly: no product has this badge currently

Badge queries are DIFFERENT from top-starter queries. Never confuse them.

═══════════════════════════════════════
🤝 CONTACT CHANNELS
═══════════════════════════════════════
Available: ${contactChannels.join(' · ')}

EMAILS — use ONLY these, NEVER invent:
${emailsText}

When contact is requested → reply warmly, mention buttons (👇), give right email if needed.
Vary your contact reply wording naturally each time.
Always end with 👇 on its own line for contact requests.

═══════════════════════════════════════
🏢 ABOUT BBW4LIFE & THE FOUNDER
═══════════════════════════════════════
**BBW4LIFE** was born on **June 18, 2025**, from a real and deeply personal story.

**Francenel** — founder and CEO of **BBW4LIFE** — was in a relationship with a plus-size woman who was incredibly beautiful, radiant, and full of life. Despite her confidence in herself, the weight of others' judgment began to wear her down. Day after day, looks, remarks, and criticism started to affect her — until she began considering changing herself, not for her own happiness, but to fit into a standard imposed by others.

**Founder photo:** ![PDG Francenel](https://cdn.shopify.com/s/files/1/0746/5346/6724/files/Pdg_Francenel.jpg?v=1778926866)

That moment changed everything. **Francenel** realized she wasn't alone — thousands of women live under the same pressure. Women who are magnificent, yet filled with self-doubt because of unrealistic beauty standards.

So he made a decision: create **BBW4LIFE**.

**Our mission:** To tell plus-size women a simple but essential truth — *You are beautiful as you are. Your body doesn't need to be corrected. Beauty has no sizes.*

**What we stand for:**
- A movement, not just a brand
- A space where every woman feels proud of her body
- A voice against judgment and imposed norms
- A community where no one is judged — only loved and supported
- Because every curve tells a story. Every body is unique.

**What we offer:**
- Plus-size fashion (shoes, dresses, lingerie, swimwear, tops, beauty)
- Style advice adapted for plus-size bodies
- Beauty & skincare recommendations
- A genuine community to share, exchange, and feel understood

When asked about "administrateur" or "admin" → same answer as founder. It refers to **Francenel**.
Give a warm, inspiring 3–4 line answer. Not too long. Make it feel real and human.

${brandSection}

═══════════════════════════════════════
🎟️ PROMO CODES
═══════════════════════════════════════
${promosText}
Free shipping over $${freeShipThresh}

═══════════════════════════════════════
💰 TAXES & SHIPPING
═══════════════════════════════════════
Tax: ${taxPercent}% at checkout. Standard shipping: $${shippingCost}.
Free shipping on orders over $${freeShipThresh}. Returns: 30 days.

Shipping options available at checkout:
${shippingOptions || '• Contact us for shipping options'}

═══════════════════════════════════════
👤 ACCOUNT PAGE
═══════════════════════════════════════
Profile, order history, order tracking, delivery addresses, payment methods, password change, wishlist.
Everything is in the account area. → 🔗[PAGE:/account.html]
Track your order → 🔗[PAGE:/page/order-tracking.html]

═══════════════════════════════════════
🔒 PRIVACY POLICY
═══════════════════════════════════════
- NEVER sell personal data. NEVER share data with advertisers. NEVER store card details.
- GDPR rights: access, correction, deletion, portability.
- Cookies: essential (required) · analytics (anonymized) · marketing (opt-in only).
When asked → 2–3 line reassuring answer + 🔗[PAGE:/policies/privacy.html]

═══════════════════════════════════════
↩️ REFUND POLICY
═══════════════════════════════════════
- Product returns: original condition, within 30 days.
- Refund processed up to 30 days after approval.
- Non-refundable: used or damaged items.
- Contact: support email with order number and purchase email.
When asked → 2–3 line clear answer + 🔗[PAGE:/policies/refund.html]

═══════════════════════════════════════
📄 TERMS & CONDITIONS
═══════════════════════════════════════
- Payments via Stripe or PayPal. Card details never stored by BBW4LIFE.
- Cancel subscription anytime.
- No guaranteed results — individual results vary.
When asked → 2–3 line clear answer + 🔗[PAGE:/policies/terms.html]

═══════════════════════════════════════
⚕️ DISCLAIMER
═══════════════════════════════════════
- Educational content only — NOT medical treatment.
- Consult a doctor if needed.
- BBW4LIFE NEVER sells pills, detox teas, or unregulated supplements.
When asked → 2–3 line caring answer + 🔗[PAGE:/page/disclaimer.html]

═══════════════════════════════════════
🗂️ COLLECTIONS
═══════════════════════════════════════
${collectionsContext}
When user asks to browse, see the catalog, or visit the shop → add 🔗[PAGE:/collections/bbw4life-all-product.html]
When user asks about a specific collection → add that collection's button.

═══════════════════════════════════════
🛍️ PRODUCT CATALOG
═══════════════════════════════════════
NEVER use internal IDs. Use exact product titles and prices.
Each product has a Badge field — use it to answer badge-related questions accurately.
${catalogText}

═══════════════════════════════════════
🏆 TOP STARTER PRODUCTS
═══════════════════════════════════════
Label: "${topStarterLabel}"
These are ONLY for when the client explicitly asks which products to start with, what to buy first, "par où commencer", "where do I start", "por dónde empezar", "I'm new here", etc.
This is NOT a badge query. Do NOT use this for "best seller" or similar questions.
Show ALL of these product cards — exactly in this order:
${topStarterList || '(none configured)'}

═══════════════════════════════════════
🌐 SITE CONTENT
═══════════════════════════════════════
${searchContext || '(not available)'}

═══════════════════════════════════════
📝 BLOG
═══════════════════════════════════════
${blogContext || '(not available)'}

═══════════════════════════════════════
🚫 ABSOLUTE RULES — NEVER BREAK
═══════════════════════════════════════
- Never write raw URLs or phone numbers in text
- Never invent prices, emails, or data
- Never promise guaranteed results
- Never reply in wrong language
- Never show products for non-product requests
- Never add 👇 for greetings, policies, or general info
- Never show promo codes without [[CODE]] format
- Never answer policy questions without the relevant 🔗[PAGE:...] button
- Never confuse badge queries (best seller, promo…) with top-starter queries
- Never confuse brand queries with product or badge queries
- Answer brand/own collection questions using ONLY the brand section above — never invent details
- NEVER answer questions about "CurvaFit" or "Curva Fit" — you have zero information about it. If asked, say clearly: "I don't have any information about CurvaFit." Nothing more.`;
}

/* ── Fallback / Error messages ── */
function getFallbackMessage(lang) {
  const msgs = {
    fr: "Je suis très sollicitée en ce moment 😅 Réessayez dans quelques secondes !",
    es: "Estoy muy ocupada en este momento 😅 ¡Inténtalo de nuevo en unos segundos!",
    de: "Ich bin gerade sehr beschäftigt 😅 Bitte versuche es in ein paar Sekunden erneut!",
    pt: "Estou muito ocupada agora 😅 Tente novamente em alguns segundos!",
    ar: "أنا مشغولة جداً الآن 😅 يرجى المحاولة مرة أخرى بعد ثوانٍ!",
    zh: "我现在很忙 😅 请几秒后再试！",
    hi: "मैं अभी बहुत व्यस्त हूँ 😅 कृपया कुछ सेकंड बाद पुनः प्रयास करें!",
    ru: "Я сейчас очень занята 😅 Пожалуйста, повторите попытку через несколько секунд!",
    ja: "ただいま混み合っています 😅 数秒後にもう一度お試しください！",
  };
  return msgs[lang] || "I'm a bit overloaded right now 😅 Please try again in a few seconds!";
}

function getErrorMessage(lang) {
  const msgs = {
    fr: "Désolée, j'ai un petit problème technique. Réessayez dans un instant ! 🙏",
    es: "Lo siento, tengo un pequeño problema técnico. ¡Inténtalo de nuevo! 🙏",
    de: "Entschuldigung, ich habe ein kleines technisches Problem. Bitte versuche es erneut! 🙏",
    pt: "Desculpe, estou com um pequeno problema técnico. Tente novamente! 🙏",
    ar: "عذراً، أواجه مشكلة تقنية بسيطة. يرجى المحاولة مرة أخرى! 🙏",
    zh: "抱歉，我遇到了一个小技术问题。请再试一次！🙏",
    hi: "क्षमा करें, मुझे एक छोटी तकनीकी समस्या है। कृपया पुनः प्रयास करें! 🙏",
    ru: "Извините, у меня небольшая техническая проблема. Пожалуйста, попробуйте снова! 🙏",
    ja: "申し訳ありません、少し技術的な問題が発生しています。もう一度お試しください！🙏",
  };
  return msgs[lang] || "Sorry, I'm having a little trouble right now. Please try again in a moment! 🙏";
}

/* ══════════════════════════════════════════════════════
   MODEL ROTATION STATE
══════════════════════════════════════════════════════ */
const MODELS = [
  'llama-3.3-70b-versatile',
  'moonshotai/kimi-k2-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3-32b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'moonshotai/kimi-k2-instruct-0905',
  'openai/gpt-oss-safeguard-20b',
  'llama-3.1-8b-instant',
  'meta-llama/llama-prompt-guard-2-22m',
];
let currentModelIndex = 0;

/* ══════════════════════════════════════════════════════
   MAIN HANDLER
══════════════════════════════════════════════════════ */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')   return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { message, history = [] } = JSON.parse(event.body);
    if (!message || message.trim().length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message is required' }) };
    }

    let products = [], settings = {};
    try {
      const rawData = await loadProductsData();
      const built   = buildProductIndex(rawData);
      products = built.products;
      settings = built.settings;
    } catch (err) {
      console.error('Could not load products.data.json:', err.message);
    }

    const allowedLanguages = (settings.allowed_languages && settings.allowed_languages.length > 0)
      ? settings.allowed_languages
      : ['en', 'fr', 'es', 'ar', 'zh', 'ht', 'hi', 'pt', 'ru', 'de', 'ja'];

    const userLang = detectLanguage(message, allowedLanguages);

    let searchData = null, blogData = null;
    try {
      [searchData, blogData] = await Promise.all([
        loadSearchData().catch(e   => { console.warn('search.data.json failed:', e.message);   return null; }),
        loadBlogArticles().catch(e => { console.warn('blog-articles.json failed:', e.message); return null; })
      ]);
    } catch (err) { console.warn('Could not load search/blog data:', err.message); }

    const contactSettings = settings.contact      || {};
    const socials         = settings.social_links || {};
    const contactInfo = {
      hasWhatsapp: !!(contactSettings.whatsapp_url || socials.whatsapp),
      hasTelegram: !!(contactSettings.telegram_url),
      whatsappUrl: contactSettings.whatsapp_url || socials.whatsapp || '',
      telegramUrl: contactSettings.telegram_url || '',
      contactPage: '/page/contact.html'
    };

    /* BBW Featured IDs — lus depuis settings */
    const jrgqCols    = (settings.jrgq_collections && settings.jrgq_collections.collections) || [];
    const featuredCol = jrgqCols.find(c => c.id === 'bbw-features-products');
    const featuredIds = (featuredCol && featuredCol.product_ids) || [];
    const EXCLUDED_IDS = featuredIds;

    const visibleProducts = products.filter(p => !EXCLUDED_IDS.includes(p.id));
    const badgeMap = buildBadgeMap(visibleProducts);

    const intent            = detectIntent(message);
    const topStarterRequest = isTopStarterRequest(message);
    const brandRequest      = isBrandQuery(message);

    const matchedBadge = !topStarterRequest && !brandRequest ? detectBadgeQuery(message, badgeMap) : null;
    const isBadgeQuery = !!matchedBadge;

    let relevantProducts = [], isVague = false;

    if (isBadgeQuery) {
      relevantProducts = visibleProducts.filter(p => (p.badge || '').toLowerCase().trim() === matchedBadge);
      isVague = false;
    } else if (topStarterRequest) {
      const topStarterIds = (settings.top_starter_products || {}).product_ids || [];
      relevantProducts = topStarterIds
        .filter(id => !EXCLUDED_IDS.includes(id))
        .map(id => visibleProducts.find(p => p.id === id))
        .filter(Boolean);
      isVague = false;
    } else if (intent === 'product' && !brandRequest) {
      const genderFilter = detectGender(message);
      const searchResult = searchProducts(message, visibleProducts, genderFilter);
      relevantProducts   = searchResult.results;
      isVague            = searchResult.isVague;
    }

    const EXPLICIT_CONTACT_PATTERNS = [
      /parler\s+(à\s+)?(un\s+)?(humain|agent|conseiller|quelqu|personne)/i,
      /joindre\s+(votre|l['']|notre)?\s*(équipe|support|service)/i,
      /contacter\s+(votre|l['']|notre)?\s*(équipe|support|service|team)/i,
      /laisser\s+un\s+message/i,
      /service\s+client/i,
      /comment\s+(vous\s+)?(contacter|joindre|écrire|rejoindre)/i,
      /je\s+veux\s+(vous\s+)?(contacter|écrire|parler)/i,
      /moyen\s+de\s+contact/i,
      /votre\s+(whatsapp|telegram|email|mail)\b/i,
      /speak\s+(to\s+)?(a\s+)?(human|agent|person|someone|real)/i,
      /contact\s+(your|the|our)?\s*(team|support|us|service)/i,
      /leave\s+(a\s+)?message/i,
      /customer\s+serv/i,
      /how\s+(can\s+I\s+)?(contact|reach|message)\s+(you|the\s+team)/i,
      /I\s+want\s+to\s+(contact|reach|talk\s+to)/i,
      /how\s+do\s+I\s+reach\s+you/i,
      /get\s+in\s+touch/i,
      /your\s+(whatsapp|telegram|email)\b/i,
      /hablar\s+(con\s+)?(un\s+)?(humano|agente|persona|alguien)/i,
      /contactar\s+(a\s+)?(su|tu|el|nuestro)?\s*(equipo|soporte|servicio)/i,
      /dejar\s+un\s+mensaje/i,
      /servicio\s+al\s+cliente/i,
      /cómo\s+(puedo\s+)?(contactar|escribir|hablar)/i,
      /su\s+(whatsapp|telegram|email)\b/i,
    ];

    const isContactIntent = !topStarterRequest && !isBadgeQuery && !brandRequest && intent !== 'product' && EXPLICIT_CONTACT_PATTERNS.some(p => p.test(message));

    const systemPrompt = buildSystemPrompt(visibleProducts, settings, contactInfo, searchData, blogData, badgeMap);

    const contactInstruction = isContactIntent
      ? '\n[CONTACT REQUEST: User wants to reach the team. You MUST end your reply with 👇 on its own line — no exception.]'
      : '';

    const vagueInstruction = isVague
      ? '\n[VAGUE PRODUCT: Show up to 4 products and ask which one they mean.]'
      : '\n[SPECIFIC PRODUCT: Show ONLY the 1 most relevant product.]';

    const topStarterInstruction = topStarterRequest
      ? '\n[TOP STARTER REQUEST: User asks which products to discover first or start with. Show ALL the top starter products from the TOP STARTER PRODUCTS section. Introduce them warmly. This is NOT a badge/best-seller question.]'
      : '';

    const badgeInstruction = isBadgeQuery
      ? `\n[BADGE QUERY: Backend detected badge "${matchedBadge}" and injected ONLY products with exactly this badge. Present ONLY those products. If none injected, say honestly no product has this badge right now. Translate the badge name naturally in the user's language.]`
      : '';

    const brandInstruction = brandRequest
      ? '\n[BRAND QUERY: User is asking about BBW4LIFE own brand/collection. Use ONLY the BBW4LIFE BRAND section in the system prompt to reply. Do NOT show product cards. Do NOT treat this as a product search.]'
      : '';

      const genderFilter2 = detectGender(message);
      const genderInstruction = genderFilter2 === 'male'
        ? '\n[GENDER FILTER: User asked for MEN products. Show ONLY men products. NEVER suggest women items — dresses, bikinis, lingerie, heels are strictly excluded.]'
        : genderFilter2 === 'female'
        ? '\n[GENDER FILTER: User asked for WOMEN products. Show ONLY women products. NEVER suggest men items — shirts, jeans, men shoes are strictly excluded.]'
        : '';

    const langName        = getLangName(userLang);
    const otherLangs      = ['ENGLISH','FRENCH','SPANISH','ARABIC','CHINESE','HINDI','PORTUGUESE','RUSSIAN','GERMAN','JAPANESE'].filter(l => l !== langName).join(', ');
    const langInstruction = `CRITICAL — ABSOLUTE RULE: You MUST reply 100% in ${langName}. NOT a single word in ${otherLangs}. The user wrote in ${langName} — respond ONLY in ${langName}, no exception, no matter what.`;

    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
      {
        role: 'user',
        content: `${message}\n\n[${langInstruction}]${(intent === 'product' && !topStarterRequest && !isBadgeQuery && !brandRequest) ? vagueInstruction : ''}${topStarterInstruction}${badgeInstruction}${brandInstruction}${contactInstruction}${genderInstruction}`
      }
    ];

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let groqResponse = null, usedModel = null, modelSuccess = false;

    for (let attempt = 0; attempt < MODELS.length; attempt++) {
      const idx   = (currentModelIndex + attempt) % MODELS.length;
      const model = MODELS[idx];
      let modelOk = false;

      for (let retry = 1; retry <= 2; retry++) {
        try {
          groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages: groqMessages, max_tokens: 400, temperature: 0.70, stream: false })
          });

          if (groqResponse.status === 429) {
            console.log(`[Chat] 429 on "${model}" (retry ${retry}/2)`);
            if (retry < 2) { await sleep(1500); continue; }
            currentModelIndex = (idx + 1) % MODELS.length;
            break;
          }
          if (!groqResponse.ok) { console.error(`[Chat] HTTP ${groqResponse.status} on "${model}"`); break; }

          usedModel = model; modelOk = true; modelSuccess = true; currentModelIndex = idx;
          break;
        } catch (fetchErr) {
          console.error(`[Chat] Fetch error on "${model}" (retry ${retry}/2):`, fetchErr.message);
          if (retry < 2) { await sleep(1000); continue; }
          break;
        }
      }
      if (modelOk) break;
    }

    if (!modelSuccess) {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ reply: getFallbackMessage(userLang), products: [], intent: 'general', isVague: false, showContact: false, contactInfo: null, pageButtons: [] })
      };
    }

    console.log(`[Chat] Model: ${usedModel} | Lang: ${userLang} | Badge: ${matchedBadge || 'none'} | TopStarter: ${topStarterRequest} | Brand: ${brandRequest}`);

    const data  = await groqResponse.json();
    const reply = data.choices?.[0]?.message?.content || getErrorMessage(userLang);

    const showContactButtons = !topStarterRequest && !isBadgeQuery && !brandRequest && intent !== 'product' && (isContactIntent || reply.includes('👇'));
    const cleanReply = reply.replace(/👇[\s]*/g, '').trim();

    const suppressPages = isGreeting(message);
    const pageMatches   = suppressPages ? [] : [...cleanReply.matchAll(/🔗\[PAGE:([^\]]+)\]/g)];
    const pageButtons   = pageMatches.map(m => {
      const url = m[1].trim();
      if (PAGE_MAP[url]) return { url, label: PAGE_MAP[url].label, icon: PAGE_MAP[url].icon };
      const pm = url.match(/^\/products\/product(\d+)\.html$/);
      if (pm) {
        const prod = visibleProducts[parseInt(pm[1], 10) - 1];
        return { url, label: prod ? prod.title : `Product ${pm[1]}`, icon: '🛍️' };
      }
      return { url, label: 'Visit Page', icon: '🔗' };
    });

    const finalReply = cleanReply.replace(/🔗\[PAGE:([^\]]+)\]/g, '').trim();

    const productCards = relevantProducts.map(p => ({
      title:         p.title,
      description:   p.description,
      price:         p.price,
      compare_price: p.compare_price,
      url:           p.url,
      image:         p.image,
      badge:         p.badge || '',
      colors:        p.colors.map(c => ({ name: c.name, hex: c.hex, image: c.image })),
      variants:      p.variants,
      sizes:         p.sizes,
      delivery:      formatDelivery(p.startDate, p.endDate),
      rating:        p.rating,
      reviewsCount:  p.reviewsCount,
      discounts:     p.discounts
    }));

    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        reply:       finalReply,
        products:    productCards,
        intent:      (topStarterRequest || isBadgeQuery) ? 'product' : intent,
        isVague,
        showContact: showContactButtons,
        contactInfo: showContactButtons ? {
          whatsapp: contactInfo.hasWhatsapp ? contactInfo.whatsappUrl : null,
          telegram: contactInfo.hasTelegram ? contactInfo.telegramUrl : null,
          page:     contactInfo.contactPage
        } : null,
        pageButtons
      })
    };

  } catch (error) {
    console.error('Chat function error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error', message: error.message }) };
  }
};