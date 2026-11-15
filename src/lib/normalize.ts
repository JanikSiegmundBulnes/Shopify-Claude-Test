import { categorize } from './categories'
import { htmlToText } from './html'
import { parseMoneyToCents } from './money'
import type { RawProduct, RawShopMeta, RawVariant } from './shopifyTypes'
import type { Product, ProductImage, ProductOption, ProductVariant, Store } from './types'
import { domainToName } from './domain'

export function normalizeStore(domain: string, meta: RawShopMeta | null): Store {
  const currency = meta?.currency && /^[A-Z]{3}$/.test(meta.currency) ? meta.currency : 'USD'
  return {
    domain,
    name: meta?.name?.trim() || domainToName(domain),
    currency,
    description: meta?.description?.trim() ?? '',
  }
}

export function foldText(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function normalizeTags(tags: RawProduct['tags']): string[] {
  if (!tags) return []
  const list = Array.isArray(tags) ? tags : tags.split(',')
  return list.map((t) => String(t).trim()).filter(Boolean)
}

/** Shopify's placeholder for products without real options. */
function isDefaultOption(name: string, values: string[]): boolean {
  return name === 'Title' && values.length === 1 && values[0] === 'Default Title'
}

function normalizeVariant(raw: RawVariant, optionCount: number): ProductVariant | null {
  const priceCents = parseMoneyToCents(raw.price)
  if (priceCents === null || typeof raw.id !== 'number') return null
  const compareAt = parseMoneyToCents(raw.compare_at_price)
  return {
    id: raw.id,
    title: raw.title ?? '',
    optionValues: [raw.option1, raw.option2, raw.option3]
      .slice(0, optionCount)
      .map((v) => v ?? ''),
    sku: raw.sku || null,
    priceCents,
    // Only treat compare-at as a discount when it's actually higher than the price.
    compareAtCents: compareAt !== null && compareAt > priceCents ? compareAt : null,
    // Older themes omit `available`; assume purchasable rather than hiding the product.
    isAvailable: raw.available !== false,
    imageSrc: raw.featured_image?.src ?? null,
  }
}

/**
 * Normalizes a raw products.json entry. Returns null for entries that can't
 * be sold (no variants with a valid price) so they never reach the UI.
 */
export function normalizeProduct(raw: RawProduct, store: Store): Product | null {
  if (!raw || typeof raw.id !== 'number' || !raw.title || !raw.handle) return null

  const rawOptions = (raw.options ?? []).filter((o) => o && o.name)
  const hasOnlyDefaultVariant =
    rawOptions.length === 0 ||
    (rawOptions.length === 1 && isDefaultOption(rawOptions[0]!.name, rawOptions[0]!.values ?? []))
  const options: ProductOption[] = hasOnlyDefaultVariant
    ? []
    : rawOptions.slice(0, 3).map((o) => ({ name: o.name, values: (o.values ?? []).map(String) }))

  const variants = (raw.variants ?? [])
    .map((v) => normalizeVariant(v, options.length))
    .filter((v): v is ProductVariant => v !== null)
  if (variants.length === 0) return null

  const images: ProductImage[] = (raw.images ?? [])
    .filter((img) => img && typeof img.src === 'string')
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((img) => ({
      src: img.src,
      width: img.width ?? null,
      height: img.height ?? null,
      alt: img.alt ?? raw.title,
      variantIds: img.variant_ids ?? [],
    }))

  // Fill in per-variant images from the gallery when featured_image is missing.
  for (const v of variants) {
    if (!v.imageSrc) v.imageSrc = images.find((img) => img.variantIds.includes(v.id))?.src ?? null
  }

  const prices = variants.map((v) => v.priceCents)
  const maxDiscountPct = Math.max(
    0,
    ...variants.map((v) =>
      v.compareAtCents ? Math.round(((v.compareAtCents - v.priceCents) / v.compareAtCents) * 100) : 0,
    ),
  )

  const tags = normalizeTags(raw.tags)
  const productType = (raw.product_type ?? '').split('>').map((s) => s.trim()).filter(Boolean).join(' › ')
  const vendor = (raw.vendor ?? '').split('|')[0]!.trim() || store.name
  const category = categorize(raw.product_type ?? '', raw.title, tags)
  const publishedAt = Date.parse(raw.published_at ?? raw.created_at ?? '') || 0

  return {
    uid: `${store.domain}:${raw.id}`,
    id: raw.id,
    storeDomain: store.domain,
    storeName: store.name,
    currency: store.currency,
    handle: raw.handle,
    title: raw.title.trim(),
    description: htmlToText(raw.body_html),
    vendor,
    productType,
    category,
    tags,
    options,
    variants,
    images,
    minPriceCents: Math.min(...prices),
    maxPriceCents: Math.max(...prices),
    maxDiscountPct,
    isAvailable: variants.some((v) => v.isAvailable),
    hasOnlyDefaultVariant,
    publishedAt,
    url: `https://${store.domain}/products/${encodeURIComponent(raw.handle)}`,
    // Tags are kept out of search: many stores use them for internal codes
    // ("akeneo_updated_at:…") that create noisy matches.
    searchText: foldText([raw.title, vendor, productType, category, store.name].join(' ')),
  }
}
