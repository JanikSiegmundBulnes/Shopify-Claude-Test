import type { Product, ProductVariant } from './types'

export const MAX_QUANTITY = 99

export interface CartItem {
  /** `${storeDomain}:${variantId}`. One line per variant per store. */
  key: string
  storeDomain: string
  storeName: string
  currency: string
  productUid: string
  productHandle: string
  productTitle: string
  variantId: number
  /** Null for single-variant products ("Default Title"). */
  variantTitle: string | null
  imageSrc: string | null
  unitPriceCents: number
  compareAtCents: number | null
  quantity: number
  isAvailable: boolean
  /** Set when a catalog refresh found a different price than when the item was added. */
  previousUnitPriceCents: number | null
  addedAt: number
}

export interface CartGroup {
  storeDomain: string
  storeName: string
  currency: string
  items: CartItem[]
  itemCount: number
  subtotalCents: number
  savingsCents: number
  hasUnavailableItems: boolean
  checkoutUrl: string
}

export function cartKey(storeDomain: string, variantId: number): string {
  return `${storeDomain}:${variantId}`
}

export function clampQuantity(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(n)))
}

export function createCartItem(product: Product, variant: ProductVariant, quantity: number): CartItem {
  const image = variant.imageSrc ?? product.images[0]?.src ?? null
  return {
    key: cartKey(product.storeDomain, variant.id),
    storeDomain: product.storeDomain,
    storeName: product.storeName,
    currency: product.currency,
    productUid: product.uid,
    productHandle: product.handle,
    productTitle: product.title,
    variantId: variant.id,
    variantTitle: product.hasOnlyDefaultVariant ? null : variant.title,
    imageSrc: image,
    unitPriceCents: variant.priceCents,
    compareAtCents: variant.compareAtCents,
    quantity: clampQuantity(quantity),
    isAvailable: variant.isAvailable,
    previousUnitPriceCents: null,
    addedAt: Date.now(),
  }
}

/**
 * Shopify cart permalink: https://shop.com/cart/{variantId}:{qty},{variantId}:{qty}
 * Creates a cart pre-filled with these lines and sends the shopper straight
 * to that store's checkout.
 */
export function buildCheckoutUrl(storeDomain: string, items: Pick<CartItem, 'variantId' | 'quantity'>[]): string {
  const lines = items.map((i) => `${i.variantId}:${clampQuantity(i.quantity)}`).join(',')
  return `https://${storeDomain}/cart/${lines}`
}

export function lineTotal(item: CartItem): number {
  return item.unitPriceCents * item.quantity
}

export function itemCount(items: CartItem[]): number {
  return items.reduce((n, i) => n + i.quantity, 0)
}

/** Groups cart lines by merchant, preserving the order stores were first added. */
export function groupByStore(items: CartItem[]): CartGroup[] {
  const groups = new Map<string, CartGroup>()
  for (const item of items) {
    let g = groups.get(item.storeDomain)
    if (!g) {
      g = {
        storeDomain: item.storeDomain,
        storeName: item.storeName,
        currency: item.currency,
        items: [],
        itemCount: 0,
        subtotalCents: 0,
        savingsCents: 0,
        hasUnavailableItems: false,
        checkoutUrl: '',
      }
      groups.set(item.storeDomain, g)
    }
    g.items.push(item)
    g.itemCount += item.quantity
    g.subtotalCents += lineTotal(item)
    if (item.compareAtCents) g.savingsCents += (item.compareAtCents - item.unitPriceCents) * item.quantity
    if (!item.isAvailable) g.hasUnavailableItems = true
  }
  for (const g of groups.values()) {
    // Sold-out lines would make the store's checkout reject the whole permalink.
    g.checkoutUrl = buildCheckoutUrl(g.storeDomain, g.items.filter((i) => i.isAvailable))
  }
  return [...groups.values()]
}

/** Totals keyed by currency, since stores may price in different currencies. */
export function totalsByCurrency(items: CartItem[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const item of items) totals[item.currency] = (totals[item.currency] ?? 0) + lineTotal(item)
  return totals
}

/**
 * Refreshes cart lines against freshly loaded catalog data so prices and
 * availability shown in the cart match what the store will charge.
 * Returns the same array instance when nothing changed.
 */
export function reconcileWithCatalog(items: CartItem[], products: Map<string, Product>): CartItem[] {
  let hasChanged = false
  const next = items.map((item) => {
    const product = products.get(item.productUid)
    if (!product) return item
    const variant = product.variants.find((v) => v.id === item.variantId)
    const isAvailable = variant ? variant.isAvailable : false
    const price = variant?.priceCents ?? item.unitPriceCents
    const compareAt = variant ? variant.compareAtCents : item.compareAtCents
    if (isAvailable === item.isAvailable && price === item.unitPriceCents && compareAt === item.compareAtCents) {
      return item
    }
    hasChanged = true
    return {
      ...item,
      isAvailable,
      unitPriceCents: price,
      compareAtCents: compareAt,
      previousUnitPriceCents: price !== item.unitPriceCents ? item.unitPriceCents : item.previousUnitPriceCents,
    }
  })
  return hasChanged ? next : items
}
