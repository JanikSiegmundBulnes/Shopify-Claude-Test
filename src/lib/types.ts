/**
 * Unified catalog model. Every store's products.json is normalized into these
 * shapes so the rest of the app never touches raw Shopify payloads.
 * All money values are integer minor units (cents) to avoid float drift.
 */

export type Category =
  | 'Footwear'
  | 'Clothing'
  | 'Bags'
  | 'Accessories'
  | 'Beauty'
  | 'Food & Drink'
  | 'Home & Lifestyle'
  | 'Gift Cards'
  | 'Other'

export interface Store {
  /** Normalized hostname, e.g. "allbirds.com". Primary key for a store. */
  domain: string
  name: string
  currency: string
  description: string
}

export interface ProductImage {
  src: string
  width: number | null
  height: number | null
  alt: string
  variantIds: number[]
}

export interface ProductOption {
  name: string
  values: string[]
}

export interface ProductVariant {
  id: number
  title: string
  /** Selected value per option, aligned with Product.options. */
  optionValues: string[]
  sku: string | null
  priceCents: number
  compareAtCents: number | null
  isAvailable: boolean
  imageSrc: string | null
}

export interface Product {
  /** Globally unique across stores: `${storeDomain}:${id}` */
  uid: string
  id: number
  storeDomain: string
  storeName: string
  currency: string
  handle: string
  title: string
  description: string
  vendor: string
  productType: string
  category: Category
  tags: string[]
  options: ProductOption[]
  variants: ProductVariant[]
  images: ProductImage[]
  minPriceCents: number
  maxPriceCents: number
  /** Largest percentage discount across variants (0–100). */
  maxDiscountPct: number
  isAvailable: boolean
  hasOnlyDefaultVariant: boolean
  publishedAt: number
  url: string
  /** Lower-cased, accent-stripped text used by search. */
  searchText: string
}
