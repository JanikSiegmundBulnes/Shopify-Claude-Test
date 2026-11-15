import type { Category } from './types'

/**
 * Stores use wildly different product_type conventions ("Shoes",
 * "Unisex>Accessories>Bottles>insulated", "Lip Gloss Duo", "Crewnecks"), so
 * we map them onto a small shared taxonomy. Rules are checked in order; the
 * first match wins, which lets specific terms ("sneaker") beat generic ones ("top").
 */
const RULES: Array<[Category, RegExp]> = [
  ['Gift Cards', /\bgift ?cards?\b|\be-?gift\b/],
  [
    'Footwear',
    /\b(shoes?|sneakers?|boots?|sandals?|slippers?|runners?|trainers?|footwear|loafers?|clogs?|slides?|mules?|flats|heels|cleats|high tops?|low tops?)\b/,
  ],
  [
    'Beauty',
    /\b(lip\w*|eye ?(shadow|liner|brow|lash|primer|pencil)s?|eyes|shadows?|mascara|liners?|palettes?|blush\w*|bronz\w*|foundations?|concealers?|highlight\w*|powders?|makeup|make-up|cosmetics?|skin ?care|serums?|moisturi[sz]er|cleansers?|brushes|nail\w*|gloss\w*|beauty|primers?|setting spray|fragrances?|perfumes?|cologne|balms?|brow\w*|lashes|face|body wash|lotion)\b/,
  ],
  ['Bags', /\b(bags?|backpacks?|totes?|duffel\w*|duffle\w*|pouch\w*|wallets?|purses?|crossbody|luggage|fanny packs?|sling)\b/],
  [
    'Accessories',
    /\b(accessor\w*|hats?|caps?|beanies?|socks?|gloves?|scarf|scarves|belts?|sunglasses|eyewear|jewel\w*|necklaces?|bracelets?|rings?|earrings?|bottles?|keychains?|watch(es)?|headbands?|laces|insoles?|umbrellas?|masks?|bandanas?|ties|straps?|phone cases?)\b/,
  ],
  [
    'Clothing',
    /\b(apparel|clothing|t-?shirts?|tees?|shirts?|tops?|hoodies?|hoody|sweat\w*|jackets?|coats?|pants|trousers|shorts|leggings?|joggers?|jeans|denim|skirts?|dress(es)?|sweaters?|knit\w*|tanks?|bras?|crew\w*|vests?|polos?|outerwear|fleece|underwear|boxers?|briefs|cardigans?|jerseys?|swim\w*|bodysuits?|unitards?|pullovers?|quarter[- ]zips?|zip[- ]ups?|onesies?|rompers?|jumpsuits?|blazers?|parkas?|anoraks?|bottoms|tights|loungewear|sleepwear|pajamas?|robes?|base ?layers?)\b/,
  ],
  [
    'Food & Drink',
    /\b(coffee|espresso|beans|tea|matcha|snacks?|chocolate|candy|food|beverages?|drinks?|sauces?|seasonings?|spices?|cold brew|k-?cups?|pods|protein|supplements?|nutrition)\b/,
  ],
  [
    'Home & Lifestyle',
    /\b(home|candles?|mugs?|cups?|books?|toys?|posters?|blankets?|towels?|stickers?|pillows?|decor|kitchen|games?|puzzles?|prints?|art|plush\w*|pets?|tumblers?|lifestyle|equipment|mats?)\b/,
  ],
]

export function categorize(productType: string, title: string, tags: string[]): Category {
  const type = productType.toLowerCase().replace(/[>/|_]/g, ' ')
  if (type.trim()) {
    for (const [cat, re] of RULES) if (re.test(type)) return cat
  }
  // product_type is often empty or brand-specific; fall back to title, then tags.
  const lowerTitle = title.toLowerCase()
  for (const [cat, re] of RULES) if (re.test(lowerTitle)) return cat
  const tagText = tags.join(' ').toLowerCase()
  for (const [cat, re] of RULES) if (re.test(tagText)) return cat
  return 'Other'
}

export const CATEGORY_ORDER: Category[] = [
  'Clothing',
  'Footwear',
  'Accessories',
  'Bags',
  'Beauty',
  'Food & Drink',
  'Home & Lifestyle',
  'Gift Cards',
  'Other',
]
