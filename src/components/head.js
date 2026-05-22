// ═══════════════════════════════════════════════════════
//  BBW4LIFE — HEAD INJECTOR
//  SEO — Toutes les pages + Articles Blog
// ═══════════════════════════════════════════════════════

const SEO_MAP = {

    '/index.html': {
        title: 'BBW4LIFE — Beauty Has No Size | Plus Size Fashion & Confidence',
        description: 'BBW4LIFE — Beauty Has No Size. Discover bold plus size fashion, beauty and confidence for every curvy woman. Free shipping on orders over $75.',
        keywords: 'BBW4LIFE, plus size fashion, curvy woman, body positive, BBW style, plus size clothing, curvy fashion, body confidence, plus size outfits, BBW beauty, curvy woman fashion, body positive brand, plus size brand, BBW lifestyle, curvy woman confidence',
        og_image: 'https://bbw4life.com/public/og-home.jpg',
        canonical: 'https://bbw4life.com/index.html'
    },

    '/page/about.html': {
        title: 'About Us — BBW4LIFE · Beauty Has No Sizes',
        description: 'Discover who we are at BBW4LIFE. Our mission, our values, and why we believe Beauty Has No Sizes. A brand born from love for every curvy woman.',
        keywords: 'about BBW4LIFE, BBW4LIFE mission, plus size brand story, curvy woman brand, body positive brand, BBW4LIFE values, who is BBW4LIFE, plus size fashion brand, beauty has no sizes, BBW4LIFE story, curvy fashion brand, body positive mission, BBW4LIFE team, plus size empowerment brand, curvy woman community',
        og_image: 'https://bbw4life.com/public/og-home.jpg',
        canonical: 'https://bbw4life.com/page/about.html'
    },

    '/collections/bbw-features-products.html': {
        title: 'Featured Products — Beauty Has No Sizes | BBW4LIFE | Sizes S–6XL',
        description: 'Shop BBW4LIFE\'s Featured Products — hand-picked curvy fashion, beauty, and wellness for plus-size and BBW women. Sizes S to 6XL. Free shipping. 30-day returns. Secure checkout.',
        keywords: 'BBW4LIFE featured products, plus size fashion, curvy women, BBW best picks, body positive, size 6XL, plus size collection, curvy fashion featured, BBW4LIFE picks, plus size best sellers',
        og_image: 'https://bbw4life.com/public/vrlogo bbw4life.png',
        canonical: 'https://bbw4life.com/collections/bbw-features-products.html'
    },

    '/collections/bbw4life-all-collections.html': {
        title: 'All Collections — Beauty Has No Sizes | BBW4LIFE',
        description: 'Explore all BBW4LIFE collections — curvy dresses, plus-size fashion, beauty, and wellness for BBW women. Sizes S to 6XL. Free shipping. 30-day returns.',
        keywords: 'BBW4LIFE collections, plus size fashion, curvy women, BBW dresses, body positive, size 6XL, all collections BBW4LIFE, curvy fashion collections, plus size collections, BBW4LIFE all styles',
        og_image: 'https://bbw4life.com/public/vrlogo bbw4life.png',
        canonical: 'https://bbw4life.com/collections/bbw4life-all-collections.html'
    },

    '/collections/bbw4life-all-product.html': {
        title: 'All Products — Beauty Has No Sizes | BBW4LIFE | Sizes S–6XL',
        description: 'Shop the complete BBW4LIFE catalog — curvy fashion, beauty, and wellness for plus-size and BBW women. Sizes S to 6XL. Free shipping. 30-day returns. Secure checkout.',
        keywords: 'BBW4LIFE all products, plus size fashion, curvy women, BBW catalog, body positive, size 6XL, plus size collection, curvy fashion catalog, BBW4LIFE shop, plus size complete collection',
        og_image: 'https://cdn.shopify.com/s/files/1/0643/8263/2041/files/Support_Pillow_7_34cbe5a0-ea02-44e1-9021-6fc9a0f59e47.webp?v=1771884540',
        canonical: 'https://bbw4life.com/collections/bbw4life-all-product.html'
    },

    '/collections/bbw4life-pants-skirts.html': {
        title: 'Pants & Skirts — Beauty Has No Sizes | BBW4LIFE | Sizes S–6XL',
        description: 'Shop BBW4LIFE\'s Pants & Skirts collection — curvy fashion for plus-size and BBW women. Sizes S to 6XL. Free shipping. 30-day returns. Secure checkout.',
        keywords: 'BBW4LIFE pants skirts, plus size pants, curvy skirts, BBW fashion, body positive, size 6XL, plus size bottoms, curvy woman pants, BBW skirts, plus size pants collection',
        og_image: 'https://bbw4life.com/public/vrlogo bbw4life.png',
        canonical: 'https://bbw4life.com/collections/bbw4life-pants-skirts.html'
    },

    '/collections/curvy-beauty.html': {
        title: 'Curvy Beauty — Beauty Has No Sizes | BBW4LIFE | Sizes S–6XL',
        description: 'Shop BBW4LIFE\'s Curvy Beauty collection — beauty & wellness for plus-size and BBW women. Sizes S to 6XL. Free shipping. 30-day returns. Secure checkout.',
        keywords: 'BBW4LIFE curvy beauty, plus size beauty, curvy women wellness, BBW skincare, body positive, size 6XL, plus size beauty collection, curvy woman skincare, BBW wellness, plus size beauty brand',
        og_image: 'https://cdn.shopify.com/s/files/1/0643/8263/2041/files/Support_Pillow4_a9227abc-e102-4a7b-98f6-099ddcb7d64e.webp?v=1771884540',
        canonical: 'https://bbw4life.com/collections/curvy-beauty.html'
    },

    '/collections/curvy-dresses.html': {
        title: 'Curvy Dresses — Beauty Has No Sizes | BBW4LIFE | Sizes S–6XL',
        description: 'Shop BBW4LIFE\'s Curvy Dresses collection — designed for plus-size and BBW women. Elegant, bold, and comfortable dresses in sizes S to 6XL. Free shipping. 30-day returns. Secure checkout.',
        keywords: 'curvy dresses, plus size dresses, BBW dresses, plus size fashion, body positive dresses, size 6XL dresses, curvy women fashion, BBW4LIFE collection, plus size elegant dresses, curvy woman dress',
        og_image: 'https://bbw4life.com/public/vrlogo bbw4life.png',
        canonical: 'https://bbw4life.com/collections/curvy-dresses.html'
    },

    '/collections/curvy-woman.html': {
        title: 'Curvy Woman — Style & Comfort For Every Curve | BBW4LIFE | Sizes S–6XL',
        description: 'Shop BBW4LIFE\'s Curvy Woman collection — designed for plus-size and BBW women. Bold, comfortable styles in sizes S to 6XL. Free shipping. 30-day returns. Secure checkout.',
        keywords: 'curvy woman, plus size fashion, BBW clothing, curvy women style, plus size collection, BBW4LIFE, body positive, size 6XL, curvy woman outfits, plus size curvy woman fashion',
        og_image: 'https://bbw4life.com/public/vrlogo bbw4life.png',
        canonical: 'https://bbw4life.com/collections/curvy-woman.html'
    },

    '/collections/men-plus-size.html': {
        title: 'Main Plus Size — Men & Women | BBW4LIFE | Sizes M–5XL',
        description: 'Shop BBW4LIFE\'s Main Plus Size collection — the biggest plus-size selection for men and women. Pants, shoes, shirts, sweaters in sizes M to 5XL. Free shipping. 30-day returns.',
        keywords: 'plus size fashion, BBW clothing, plus size men, plus size women, BBW4LIFE, big sizes, 5XL clothing, plus size collection, main plus size, BBW4LIFE plus size men women',
        og_image: 'https://bbw4life.com/public/vrlogo bbw4life.png',
        canonical: 'https://bbw4life.com/collections/men-plus-size.html'
    },

    '/collections/most-popular.html': {
        title: 'Most Popular — Best Sellers | BBW4LIFE',
        description: 'Shop BBW4LIFE\'s Most Popular collection — our best-selling products loved by thousands of curvy women worldwide. Free shipping. 30-day returns.',
        keywords: 'most popular BBW4LIFE, best sellers plus size, curvy women trending, BBW4LIFE best picks, top rated plus size, curvy fashion best sellers, BBW trending products, plus size most loved, BBW4LIFE top products, curvy woman favorites',
        og_image: 'https://bbw4life.com/public/vrlogo bbw4life.png',
        canonical: 'https://bbw4life.com/collections/most-popular.html'
    },

    '/blog/article-featured.html': {
        title: 'Beauty Has No Sizes: The Movement That Is Redefining Beauty for Every Woman | BBW4LIFE Journal',
        description: 'Discover how thousands of BBW women around the world are reclaiming their confidence, celebrating their curves, and building a life they truly love — without changing who they are. Beauty Has No Sizes.',
        keywords: 'BBW beauty movement, plus size confidence, body positive curvy women, beauty has no sizes, BBW4LIFE, curvy woman self love, plus size body confidence, BBW movement 2026, body positive revolution, curvy woman empowerment, BBW self acceptance, plus size women confidence, beauty has no size movement, body positive identity, curvy woman pride, BBW4LIFE movement, body acceptance curvy, plus size self esteem, BBW women empowerment, curvy body confidence, body positive inspiration, plus size movement, BBW4LIFE featured, body confidence women, curvy woman movement, BBW movement article, body positive story, plus size revolution, curvy woman representation, BBW4LIFE confidence',
        og_image: 'https://cdn.shopify.com/s/files/1/0978/0353/4627/files/article_1.png?v=1775497369',
        canonical: 'https://bbw4life.com/blog/article-featured.html'
    },

    '/blog/article1.html': {
        title: 'Stop Dieting — Here Is How BBW Women Actually Take Care of Themselves | BBW4LIFE Journal',
        description: 'Forget crash diets and toxic fitness culture. Discover the real, science-backed approach to well-being that honors your curvy body, boosts your energy, and makes you feel unstoppable every single day.',
        keywords: 'BBW wellness, plus size self care, curvy women health, stop dieting BBW, body positive wellness, BBW4LIFE wellness, anti-diet plus size, curvy woman health tips, BBW self care routine, plus size wellness guide, body positive health, curvy woman body care, BBW diet free, plus size energy boost, curvy woman vitality, BBW4LIFE health, body positive self care, plus size fitness, curvy wellness tips, BBW4LIFE self care, body acceptance wellness, curvy woman self care, plus size health tips, BBW anti-diet movement, curvy body positive health, plus size healthy lifestyle, BBW wellness routine, body positive nutrition, curvy woman wellness guide, BBW4LIFE healthy living',
        og_image: 'https://cdn.shopify.com/s/files/1/0978/0353/4627/files/article2.png?v=1775497367',
        canonical: 'https://bbw4life.com/blog/article1.html'
    },

    '/blog/article2.html': {
        title: 'Nutrition for Curvy Women: Eat to Feel Amazing, Not to Shrink | BBW4LIFE Journal',
        description: 'Learn how to fuel your BBW body with the right foods that increase your energy, balance your hormones, and make you glow — no restriction, no guilt, just real nourishment for curvy women.',
        keywords: 'nutrition curvy women, balanced diet BBW, healthy eating curvy body, intuitive eating BBW, BBW4LIFE nutrition, plus size nutrition guide, curvy woman diet, BBW balanced meals, hormone balance diet, plus size food guide, body positive nutrition, curvy woman nourishment, BBW4LIFE food guide, plus size intuitive eating, curvy woman healthy eating, BBW hormone health, body positive eating, plus size meal plan, curvy woman energy food, BBW glow nutrition, body positive food guide, plus size wellness nutrition, curvy woman gut health, BBW4LIFE healthy eating, body positive meal, curvy nutrition tips, plus size hormone diet, BBW food freedom, curvy woman meal ideas, body positive anti-diet',
        og_image: 'https://cdn.shopify.com/s/files/1/0978/0353/4627/files/article3.png?v=1775497371',
        canonical: 'https://bbw4life.com/blog/article2.html'
    },

    '/blog/article3.html': {
        title: '7 Body Positive Affirmations That Actually Change How You See Yourself | BBW4LIFE Journal',
        description: 'Simple but powerful daily affirmations used by thousands of BBW women to silence the inner critic, rebuild self-worth, and wake up every morning feeling truly beautiful and confident.',
        keywords: 'body positive affirmations, daily affirmations plus size, self love curvy, body image BBW, BBW4LIFE mindset, affirmations curvy woman, plus size self worth, BBW morning affirmations, body confidence affirmations, curvy woman self esteem, BBW4LIFE affirmations, body positive mindset affirmations, plus size inner peace, curvy woman positivity, BBW self talk, body acceptance affirmations, plus size mental health, curvy woman confidence affirmations, BBW4LIFE self love, body positive daily practice, curvy woman empowerment affirmations, plus size self image, BBW confidence boost, body positive self worth, curvy woman inner critic, plus size affirmation list, BBW morning routine, body positive inner work, curvy woman healing, BBW4LIFE mindset shift',
        og_image: 'https://cdn.shopify.com/s/files/1/0978/0353/4627/files/article4.png?v=1775497367',
        canonical: 'https://bbw4life.com/blog/article3.html'
    },

    '/blog/article4.html': {
        title: 'How to Stop Letting Other People\'s Opinions Destroy Your Body Confidence | BBW4LIFE Journal',
        description: 'Every curvy woman has faced judgment. Here is the exact mindset framework that helps BBW women build unshakeable self-confidence — so no comment, no look, and no criticism can ever touch you again.',
        keywords: 'BBW body confidence, body shaming plus size, self confidence curvy women, emotional resilience BBW, BBW4LIFE mindset, stop caring opinions curvy, body shaming recovery, plus size confidence building, curvy woman resilience, BBW4LIFE confidence, body positive mindset shift, curvy woman emotional strength, BBW stop body shaming, plus size thick skin, curvy woman confidence tips, BBW inner strength, body positive emotional resilience, plus size self defense mindset, curvy woman unshakeable, BBW4LIFE emotional health, body shaming response, plus size mental strength, curvy woman judgment proof, BBW confidence framework, body positive confidence building, curvy woman social judgment, plus size thick skin tips, BBW4LIFE resilience, body positive strength, curvy woman body image healing',
        og_image: 'https://cdn.shopify.com/s/files/1/0978/0353/4627/files/article5.png?v=1775497369',
        canonical: 'https://bbw4life.com/blog/article4.html'
    },

    '/blog/article5.html': {
        title: 'PCOS and the Plus-Size Body: Understanding Your Hormones to Live Better | BBW4LIFE Journal',
        description: 'If you are a BBW woman with PCOS, your body is not broken — it just needs the right support. Discover gentle lifestyle changes that balance hormones, reduce symptoms, and help you feel in control again.',
        keywords: 'PCOS plus size women, BBW hormones, hormone balance BBW, PCOS nutrition, PCOS lifestyle BBW4LIFE, polycystic ovary syndrome plus size, PCOS curvy women, hormone health BBW, PCOS diet plus size, curvy woman PCOS, BBW4LIFE PCOS guide, PCOS body positive, plus size hormone health, curvy woman hormones, BBW PCOS symptoms, PCOS lifestyle changes, plus size PCOS management, curvy PCOS wellness, BBW hormone balance tips, body positive PCOS, plus size endocrine health, curvy woman hormonal health, BBW4LIFE hormone guide, PCOS self care plus size, curvy PCOS diet, body positive hormone balance, plus size PCOS tips, BBW wellness PCOS, curvy woman endocrine, BBW4LIFE wellness hormone',
        og_image: 'https://cdn.shopify.com/s/files/1/0978/0353/4627/files/article6.png?v=1775497368',
        canonical: 'https://bbw4life.com/blog/article5.html'
    },

    '/blog/article6.html': {
        title: 'Move Without Injury: Gentle Home Exercises for Plus-Size Women | BBW4LIFE Journal',
        description: 'No gym required. No judgment. Just simple, low-impact movements you can do at home that build strength, improve mobility, and make your curvy body feel incredible — starting today.',
        keywords: 'plus size home exercises, gentle workout curvy women, BBW fitness, low impact exercise, home workout no equipment, curvy woman exercise, BBW4LIFE fitness, plus size workout guide, gentle exercise plus size, body positive fitness, curvy woman home workout, BBW beginner exercise, low impact plus size, curvy fitness routine, BBW4LIFE workout, body positive movement, plus size strength training, curvy woman mobility, BBW gentle movement, low impact fitness curvy, plus size exercise at home, curvy woman fitness tips, BBW4LIFE movement guide, body positive exercise, plus size mobility workout, curvy woman strength, BBW fitness routine, body positive workout, curvy beginner workout, BBW4LIFE gentle fitness',
        og_image: 'https://cdn.shopify.com/s/files/1/0978/0353/4627/files/article7.png?v=1775497368',
        canonical: 'https://bbw4life.com/blog/article6.html'
    },

    '/blog/article7.html': {
        title: 'Plus Size Fashion 2026: The Outfits That Turn Heads Without Hiding Your Curves | BBW4LIFE Journal',
        description: 'This season is all about celebrating your shape. Discover the boldest, most flattering plus size fashion trends of 2026 — handpicked for BBW women who refuse to hide and love to shine.',
        keywords: 'plus size fashion 2026, curvy women outfits, BBW style guide, plus size trends, flattering curvy fashion, BBW4LIFE style, curvy fashion 2026, plus size outfit ideas 2026, BBW fashion trends, body positive fashion 2026, curvy woman style 2026, plus size trends 2026, BBW4LIFE fashion 2026, curvy fashion trends, plus size looks 2026, BBW outfit guide, curvy fashion inspiration, plus size style 2026, BBW trends this season, body positive style 2026, curvy woman outfit ideas, BBW4LIFE 2026 looks, plus size bold fashion, curvy fashion bold, BBW fashion season, body positive outfit ideas, curvy woman bold style, plus size flattering outfits, BBW style tips 2026, curvy woman fashion 2026',
        og_image: 'https://cdn.shopify.com/s/files/1/0978/0353/4627/files/article8.png?v=1775497368',
        canonical: 'https://bbw4life.com/blog/article7.html'
    },

    '/blog/article8.html': {
        title: 'How I Stopped Being Ashamed of My Body and Started Loving It | BBW4LIFE Journal',
        description: 'A raw, honest, and deeply inspiring story of one curvy woman who fought back against society\'s standards, found her confidence, and built a life she is proud of. A BBW4LIFE real story.',
        keywords: 'BBW real story, plus size body confidence, curvy woman self love, body positive transformation, BBW4LIFE real stories, body shame recovery, plus size confidence story, curvy woman journey, BBW4LIFE inspiration, body positive real story, curvy woman body acceptance, BBW transformation story, body shame healing, plus size personal story, curvy woman empowerment story, BBW4LIFE community story, body positive journey, curvy woman real life, BBW body love story, plus size love your body, curvy woman pride story, BBW4LIFE testimonial, body positive healing, curvy woman shame free, BBW real life story, plus size true story, body acceptance journey, curvy woman raw story, BBW4LIFE member story, body love journey',
        og_image: 'https://cdn.shopify.com/s/files/1/0978/0353/4627/files/article9.png?v=1775497370',
        canonical: 'https://bbw4life.com/blog/article8.html'
    },

    '/blog/article9.html': {
        title: 'The 10 Must-Have Wardrobe Pieces for Plus-Size Women Who Own Their Style | BBW4LIFE Journal',
        description: 'Building a wardrobe as a BBW woman doesn\'t have to be hard. These 10 essential pieces will transform how you look, how you feel, and how the world sees you — every single day.',
        keywords: 'BBW wardrobe essentials, plus size fashion must-haves, curvy woman style, BBW4LIFE fashion, plus size outfit ideas, curvy wardrobe guide, BBW essential clothing, plus size capsule wardrobe, curvy woman closet essentials, BBW4LIFE wardrobe, body positive wardrobe, curvy fashion essentials, plus size style staples, BBW closet must haves, curvy woman outfit essentials, BBW4LIFE style list, body positive closet, plus size wardrobe building, curvy fashion staples, BBW style essentials, body positive fashion staples, curvy woman fashion list, plus size style guide, BBW wardrobe building, curvy woman clothing must haves, BBW4LIFE clothing guide, body positive outfit guide, curvy closet essentials, plus size wardrobe basics, BBW fashion essentials',
        og_image: 'https://cdn.shopify.com/s/files/1/0978/0353/4627/files/article10.png?v=1775497369',
        canonical: 'https://bbw4life.com/blog/article9.html'
    },

    '/blog/article10.html': {
        title: 'BBW Style Guide: How to Dress Confidently for Every Occasion | BBW4LIFE Journal',
        description: 'From casual days to red-carpet moments — this complete BBW style guide shows you exactly how to dress for your curves, your personality, and your lifestyle, so you always look and feel like the queen you are.',
        keywords: 'BBW style guide, plus size fashion occasions, curvy woman dress code, BBW4LIFE fashion, plus size confident dressing, curvy woman every occasion, BBW outfit guide, plus size formal wear, curvy casual outfit, BBW party outfit, plus size work outfit, curvy woman style every occasion, BBW4LIFE dress guide, body positive style guide, curvy woman casual style, BBW formal outfit, plus size daily style, curvy fashion guide, BBW night out outfit, plus size event outfit, curvy date night outfit, BBW4LIFE complete style guide, body positive outfit guide, curvy woman confidence dressing, plus size brunch outfit, BBW weekend outfit, curvy fashion every day, plus size queen style, BBW4LIFE style tips, curvy woman fashion guide',
        og_image: 'https://cdn.shopify.com/s/files/1/0978/0353/4627/files/article16.png?v=1775497365',
        canonical: 'https://bbw4life.com/blog/article10.html'
    },

    '/blog/article11.html': {
        title: 'Plus-Size Dresses: How to Find the One Model That Flatters Every Single Curve | BBW4LIFE Journal',
        description: 'Not all dresses are created equal — and not all advice is made for you. This guide breaks down exactly which dress styles, cuts, and fabrics work best for BBW bodies, so you find your perfect match every time.',
        keywords: 'plus size dresses BBW, curvy woman dress guide, flattering dresses plus size, how to dress curvy body, BBW dress styles, plus size dress cuts, curvy dress shape guide, BBW4LIFE dress guide, best dresses for curves, plus size dress fit guide, curvy woman flattering dress, BBW dress types, body positive dress guide, plus size dress shape, curvy fashion dress tips, BBW4LIFE dress styles, body type dress guide, curvy woman best dress, plus size body type dress, BBW dress fabric guide, curvy woman dress shopping, BBW4LIFE flattering dress, body positive dress styles, curvy dress shopping guide, plus size dress buying guide, BBW dress recommendations, curvy woman dress cuts, body positive outfit dress, plus size dress tips, BBW fashion dress guide',
        og_image: 'https://cdn.shopify.com/s/files/1/0978/0353/4627/files/article11.png?v=1775497369',
        canonical: 'https://bbw4life.com/blog/article11.html'
    },

    '/blog/article12.html': {
        title: 'BBW and Seduction: Why Your Body Is a Gift, Not an Obstacle | BBW4LIFE Journal',
        description: 'Confidence is the most powerful thing a curvy woman can wear. Discover how BBW women around the world are embracing their sensuality, owning their beauty, and attracting love — on their own terms.',
        keywords: 'BBW seduction, curvy woman confidence, plus size sensuality, body confidence BBW, BBW4LIFE self love, curvy woman attractiveness, plus size beauty, BBW attraction, curvy woman seduction tips, BBW4LIFE confidence, body positive seduction, curvy woman love yourself, BBW body gift, plus size self worth, curvy woman beauty power, BBW4LIFE attraction, body positive love, curvy woman own your body, BBW confidence love, plus size attractive, curvy woman sensuality, BBW body acceptance seduction, body positive attractiveness, curvy woman magnetic, BBW4LIFE love story, body positive own your curves, curvy woman charm, BBW seduction confidence, plus size love life, BBW4LIFE body is a gift',
        og_image: 'https://cdn.shopify.com/s/files/1/0978/0353/4627/files/article17.png?v=1775497370',
        canonical: 'https://bbw4life.com/blog/article12.html'
    },

    '/blog/article13.html': {
        title: 'How to Dress as a BBW and Feel BEAUTIFUL — Not Just Covered | BBW4LIFE Journal',
        description: 'Stop dressing to hide. Start dressing to shine. This guide is for every curvy woman who is ready to walk into any room and own it — with outfits that celebrate exactly who she is.',
        keywords: 'how to dress BBW women, plus size fashion guide, curvy woman style, BBW outfit ideas, dress for your curves, body positive fashion, BBW4LIFE dress guide, stop hiding plus size, curvy woman beautiful outfits, BBW confidence dressing, body positive outfit ideas, curvy woman shine outfit, BBW4LIFE how to dress, plus size bold outfits, curvy woman own your style, BBW dress to impress, body positive fashion guide, curvy woman fashion confidence, BBW do not hide, plus size dress to shine, curvy woman bold fashion, BBW4LIFE confidence outfits, body positive style guide, curvy woman flattering outfits, BBW beautiful fashion, plus size shine outfits, curvy woman dress boldly, BBW4LIFE style confidence, body positive dressing tips, curvy woman fashion boldly',
        og_image: 'https://cdn.shopify.com/s/files/1/0978/0353/4627/files/article15.png?v=1775497367',
        canonical: 'https://bbw4life.com/blog/article13.html'
    },

    '/blog/article14.html': {
        title: 'BBW and Seduction: Your Body Is a Power, Not a Problem | BBW4LIFE Journal',
        description: 'Your curves are magnetic. Your energy is irresistible. This article is a love letter to every BBW woman who has ever been made to feel like she is too much — you are exactly enough.',
        keywords: 'BBW seduction, curvy women confidence, plus size seduction, body confidence BBW, BBW4LIFE, curvy women power, BBW self-love, plus size attraction, body is not a problem BBW, curvy woman power, BBW magnetic energy, plus size love yourself, curvy woman irresistible, BBW4LIFE empowerment, body positive power, curvy woman enough, BBW too much, body positive love letter, curvy woman self worth, BBW4LIFE curves power, body positive magnetic, curvy woman energy, BBW confidence power, plus size you are enough, curvy woman love letter, BBW4LIFE body power, body positive attraction, curvy woman body love, BBW strength curves, plus size magnetic beauty',
        og_image: 'https://cdn.shopify.com/s/files/1/0978/0353/4627/files/article16.png?v=1775497365',
        canonical: 'https://bbw4life.com/blog/article14.html'
    },

    '/blog/article15.html': {
        title: 'BBW4LIFE: Why Being a Big Beautiful Woman Is a Lifestyle, a Pride, and a Family | BBW4LIFE Journal',
        description: 'This is more than a fashion brand. BBW4LIFE is a movement born from love, built for women who deserve to be seen, celebrated, and cherished. Discover the story, the mission, and why thousands of women have made it their home.',
        keywords: 'BBW4LIFE movement, big beautiful woman lifestyle, plus size pride, BBW community, body positive movement, curvy woman confidence, BBW lifestyle, big beautiful woman community, BBW4LIFE family, plus size pride identity, curvy woman lifestyle, BBW4LIFE brand story, body positive family, big beautiful woman identity, curvy woman community, BBW4LIFE mission story, body positive lifestyle brand, curvy woman pride, BBW4LIFE love story, body positive identity, curvy woman family, BBW lifestyle brand, plus size family community, BBW4LIFE sisterhood, curvy woman sisterhood, body positive sisterhood, BBW4LIFE belonging, curvy woman belonging, plus size movement identity, BBW big beautiful woman',
        og_image: 'https://cdn.shopify.com/s/files/1/0978/0353/4627/files/article16.png?v=1775497365',
        canonical: 'https://bbw4life.com/blog/article15.html'
    }

};

/* ─── Schema.org BlogPosting pour les articles ─── */
function injectBlogSchema() {
    const path = window.location.pathname;
    if (!/\/blog\/article/.test(path)) return;

    const seo = SEO_MAP[path];
    if (!seo) return;

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        'headline': seo.title,
        'description': seo.description,
        'image': seo.og_image,
        'url': seo.canonical,
        'publisher': {
            '@type': 'Organization',
            'name': 'BBW4LIFE',
            'logo': {
                '@type': 'ImageObject',
                'url': 'https://bbw4life.com/public/vrlogo bbw4life.png'
            }
        },
        'mainEntityOfPage': seo.canonical
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
}

/* ─── Injection head.html global ─── */
function injectGlobalHead() {
    return fetch('/src/components/head.html')
        .then(r => r.text())
        .then(html => {
            const temp = document.createElement('div');
            temp.innerHTML = html;
            Array.from(temp.children).forEach(el => {
                document.head.appendChild(el.cloneNode(true));
            });
        })
        .catch(err => console.error('[Head] Failed to load head.html:', err));
}

/* ─── Injection SEO selon page ─── */
function injectPageSEO() {
    const path = window.location.pathname;

    let seo = SEO_MAP[path];

    /* Pages produit dynamiques */
    if (!seo && /\/products\/product\d+\.html/.test(path)) {
        seo = {
            title: 'Product | BBW4LIFE — Plus Size Fashion',
            description: 'Discover this stunning plus size piece at BBW4LIFE. Bold, beautiful and made for your curves. Sizes XL to 6XL. Free shipping. 30-day returns.',
            keywords: 'plus size product, curvy fashion, BBW4LIFE, plus size clothing, curvy woman outfit, body positive fashion',
            og_image: 'https://bbw4life.com/public/og-home.jpg',
            canonical: 'https://bbw4life.com' + path
        };
    }

    /* ── CORRECTION : si pas de map, dispatcher avec document.title (pas seo.title) ── */
    if (!seo) {
        setTimeout(function() {
            document.dispatchEvent(new CustomEvent('seo:ready', {
                detail: { title: document.title }
            }));
        }, 500);
        return;
    }

    /* Title */
    document.title = seo.title;

    /* Helper : crée ou met à jour une meta */
    function setMeta(selector, attr, value) {
        let el = document.querySelector(selector);
        if (!el) {
            el = document.createElement('meta');
            document.head.appendChild(el);
        }
        el.setAttribute(attr, value);
    }

    /* Meta de base */
    setMeta('meta[name="description"]',   'content', seo.description);
    setMeta('meta[name="keywords"]',      'content', seo.keywords);
    setMeta('meta[name="robots"]',        'content', 'index, follow');

    /* Open Graph */
    setMeta('meta[property="og:title"]',       'content', seo.title);
    setMeta('meta[property="og:description"]', 'content', seo.description);
    setMeta('meta[property="og:image"]',       'content', seo.og_image);
    setMeta('meta[property="og:url"]',         'content', seo.canonical);

    /* Twitter Card */
    setMeta('meta[name="twitter:title"]',       'content', seo.title);
    setMeta('meta[name="twitter:description"]', 'content', seo.description);
    setMeta('meta[name="twitter:image"]',       'content', seo.og_image);

    /* Canonical */
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
    }
    canonical.href = seo.canonical;

    /* ── Dispatch seo:ready avec délai pour laisser le temps au fetch breadcrumb ── */
    setTimeout(function() {
        document.dispatchEvent(new CustomEvent('seo:ready', {
            detail: { title: seo.title }
        }));
    }, 500);
}

/* ─── Lancer tout ─── */
injectGlobalHead().then(() => {
    injectPageSEO();
    injectBlogSchema();
});