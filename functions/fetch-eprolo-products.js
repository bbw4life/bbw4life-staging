// functions/fetch-eprolo-products.js — VERSION PARALLÈLE + CATÉGORIES

const CATEGORIES = [
  {
    category: "Beauty",
    subcategories: [
      { name: "Nails",     ids: ["31507085","31507084","31507050"] },
      { name: "Eyebrow",   ids: ["31507083","31507079","31507077"] },
      { name: "Lips",      ids: ["31507080","31507082"] },
      { name: "Makeup",    ids: ["31507075"] },
      { name: "Haircare",  ids: ["31507069","31507068","31507066"] },
      { name: "Skincare",  ids: ["31507047","31507042","31507040","31507037","31507030"] },
    ]
  },
  {
    category: "Main Plus Size",
    subcategories: [
      { name: "Pants",   ids: ["31507010","31506972","31506964","31506942"] },
      { name: "Shoes",   ids: ["31507005","31506999","31506996","31506987","31506961","31506959","31506957"] },
      { name: "Shirt",   ids: ["31506986","31506956","31506938"] },
      { name: "Sweater", ids: ["31506970","31506983","31506831"] },
    ]
  },
  {
    category: "Plus Size Woman",
    subcategories: [
      { name: "Shoes",         ids: ["31506995","31507001","31506993","31506990","31506877","31506874"] },
      { name: "Dresses",       ids: ["31506899","31506898","31506897","31506895","31506885","31506863","31506856","31506842","31506840","31506894"] },
      { name: "Bathrobe",      ids: ["31506891","31506893"] },
      { name: "Sexy",          ids: ["31506890","31506872","31506846","31506841"] },
      { name: "Breathable",    ids: ["31506880","31506879"] },
      { name: "Bikini",        ids: ["31506871","31506851","31506845","31506839","31506830","31506822"] },
      { name: "Plus Size Top", ids: ["31506857","31506854","31506868","31506889"] },
    ]
  },
];

const ALL_PRODUCT_ENTRIES = [];
CATEGORIES.forEach(cat => {
  cat.subcategories.forEach(sub => {
    sub.ids.forEach(id => {
      ALL_PRODUCT_ENTRIES.push({ id, category: cat.category, subcategory: sub.name });
    });
  });
});

const SEP = "═".repeat(80);
const SEP2 = "─".repeat(80);

// ── MD5 pure JS (remplace crypto.createHash('md5'), absent de Web Crypto) ──
async function md5(text) {
  function rotateLeft(n, s) { return (n << s) | (n >>> (32 - s)); }
  function toHex(n) {
    let s = '', v;
    for (let i = 0; i < 4; i++) {
      v = (n >>> (i * 8)) & 255;
      s += ('0' + v.toString(16)).slice(-2);
    }
    return s;
  }
  function utf8Encode(str) { return unescape(encodeURIComponent(str)); }

  const msg = utf8Encode(text);
  const msgLen = msg.length;
  const wordArray = [];
  for (let i = 0; i < msgLen - 3; i += 4) {
    wordArray.push(msg.charCodeAt(i) | (msg.charCodeAt(i + 1) << 8) | (msg.charCodeAt(i + 2) << 16) | (msg.charCodeAt(i + 3) << 24));
  }
  switch (msgLen % 4) {
    case 0: wordArray.push(0x80); break;
    case 1: wordArray.push(msg.charCodeAt(msgLen - 1) | 0x8000); break;
    case 2: wordArray.push(msg.charCodeAt(msgLen - 2) | (msg.charCodeAt(msgLen - 1) << 8) | 0x800000); break;
    case 3: wordArray.push(msg.charCodeAt(msgLen - 3) | (msg.charCodeAt(msgLen - 2) << 8) | (msg.charCodeAt(msgLen - 1) << 16) | 0x80000000); break;
  }
  while (wordArray.length % 16 !== 14) wordArray.push(0);
  wordArray.push(msgLen * 8);
  wordArray.push(0);

  const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const K = [];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);

  let a0 = 1732584193, b0 = -271733879, c0 = -1732584194, d0 = 271733878;

  for (let blockStart = 0; blockStart < wordArray.length; blockStart += 16) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + (wordArray[blockStart + g] || 0)) | 0;
      A = D; D = C; C = B;
      B = (B + rotateLeft(F, S[i])) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }

  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}

export async function onRequestGet(context) {
  const { env } = context;
  const logs = [];
  const log = (msg) => { console.log(msg); logs.push(msg); };

  log(SEP);
  log("  EPROLO — RÉCUPÉRATION DES PRODUITS");
  log(`  Liste : ${ALL_PRODUCT_ENTRIES.length} produits`);
  log(SEP);

  try {
    const apiKey = env.EPROLO_API_KEY;
    const apiSecret = env.EPROLO_API_SECRET;

    const results = await Promise.all(
      ALL_PRODUCT_ENTRIES.map(async (entry) => {
        const { id: productId, category, subcategory } = entry;
        try {
          const timestamp = Date.now();
          const sign = await md5(apiKey + timestamp + apiSecret);

          const url = `https://openapi.eprolo.com/getproduct.html?sign=${sign}&timestamp=${timestamp}&id=${productId}`;

          const response = await fetch(url, { method: "GET", headers: { "apiKey": apiKey } });
          const responseText = await response.text();

          let data = {};
          try { data = JSON.parse(responseText); } catch {}

          if ((data.code === 0 || data.code === "0") && data.data) {
            log(`  ✅  ${productId}  →  OK  [${category} > ${subcategory}]`);
            return { ...data.data, category, subcategory };
          } else {
            const errMsg = data.msg || 'réponse invalide';
            log(`  ⚠️  ${productId}  →  ERREUR : ${errMsg}  [${category} > ${subcategory}]`);
            return null;
          }

        } catch (err) {
          log(`  ❌  ${productId}  →  EXCEPTION : ${err.message}  [${category} > ${subcategory}]`);
          return null;
        }
      })
    );

    const allProducts = results.filter(Boolean);

    log(SEP);
    log(`  TOTAL RÉCUPÉRÉS : ${allProducts.length} / ${ALL_PRODUCT_ENTRIES.length}`);
    log(SEP);

    allProducts.forEach((product, index) => {
      const varCount = product.variantlist ? product.variantlist.length : 0;

      log("");
      log(SEP);
      log(`  [${String(index + 1).padStart(2, '0')}]  ${product.title}`);
      log(`        ID : ${product.id}    |    Variants : ${varCount}    |    Cat: ${product.category} > ${product.subcategory}`);
      log(SEP2);

      if (varCount === 0) {
        log("        Aucun variant.");
        return;
      }

      const colorGroups = {};

      product.variantlist.forEach((variant) => {
        let color = (variant.option1 || 'N/A').replace(/ one$/i, '').trim();
        color = color.charAt(0).toUpperCase() + color.slice(1);

        const size = (variant.option2 || '').trim();
        const option3 = (variant.option3 || '').trim();

        if (!colorGroups[color]) colorGroups[color] = [];
        colorGroups[color].push({
          size,
          option3,
          id: variant.id,
          sku: variant.sku || 'N/A',
          price: variant.cost || 'N/A',
          weight: variant.weight || 'N/A',
          stock: variant.inventory_quantity || 'N/A'
        });
      });

      Object.entries(colorGroups).forEach(([color, variants]) => {
        log(`        🎨  ${color}  (${variants.length} taille(s))`);
        variants.forEach((v) => {
          const sizeStr = v.size ? `SIZE: ${v.size.padEnd(6)}` : `SIZE: ${'—'.padEnd(6)}`;
          const opt3Str = v.option3 ? `  |  OPT3: ${v.option3}` : '';
          log(`              ID: ${v.id}  |  ${sizeStr}  |  SKU: ${v.sku}  |  PRIX: $${v.price}  |  POIDS: ${v.weight}g  |  STOCK: ${v.stock}${opt3Str}`);
        });
        log("");
      });
    });

    log(SEP);
    log("  ✅  FIN DU LOG");
    log(SEP);

    return new Response(JSON.stringify({
      success: true,
      total: allProducts.length,
      logs: logs,
      products: allProducts,
      categories: CATEGORIES.map(cat => cat.category),
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    console.error("[EPROLO ERROR]", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message, logs }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}