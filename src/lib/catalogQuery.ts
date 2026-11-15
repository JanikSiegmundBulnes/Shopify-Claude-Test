import { foldText } from './normalize'
import type { Category, Product } from './types'

export type SortKey = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'discount' | 'title'

export const SORT_LABELS: Record<SortKey, string> = {
  featured: 'Featured',
  newest: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  discount: 'Biggest discount',
  title: 'Name A–Z',
}

export interface CatalogFilters {
  query: string
  stores: string[]
  categories: Category[]
  /** Whole currency units, as typed by the user. */
  minPrice: number | null
  maxPrice: number | null
  isInStockOnly: boolean
  isOnSaleOnly: boolean
  sort: SortKey
}

export const DEFAULT_FILTERS: CatalogFilters = {
  query: '',
  stores: [],
  categories: [],
  minPrice: null,
  maxPrice: null,
  isInStockOnly: false,
  isOnSaleOnly: false,
  sort: 'featured',
}

export function countActiveFilters(f: CatalogFilters): number {
  return (
    f.stores.length +
    f.categories.length +
    (f.minPrice !== null ? 1 : 0) +
    (f.maxPrice !== null ? 1 : 0) +
    (f.isInStockOnly ? 1 : 0) +
    (f.isOnSaleOnly ? 1 : 0)
  )
}

/**
 * Interleaves stores round-robin so the default view shows a mix of merchants
 * instead of one store's entire catalog followed by the next.
 */
export function interleaveByStore(products: Product[]): Product[] {
  const buckets = new Map<string, Product[]>()
  for (const p of products) {
    const list = buckets.get(p.storeDomain)
    if (list) list.push(p)
    else buckets.set(p.storeDomain, [p])
  }
  const lists = [...buckets.values()]
  const out: Product[] = []
  for (let i = 0; out.length < products.length; i++) {
    for (const list of lists) if (i < list.length) out.push(list[i]!)
  }
  return out
}

type Facet = 'stores' | 'categories' | null

function matches(p: Product, f: CatalogFilters, tokens: string[], skip: Facet): boolean {
  if (skip !== 'stores' && f.stores.length && !f.stores.includes(p.storeDomain)) return false
  if (skip !== 'categories' && f.categories.length && !f.categories.includes(p.category)) return false
  if (f.isInStockOnly && !p.isAvailable) return false
  if (f.isOnSaleOnly && p.maxDiscountPct <= 0) return false
  // A product matches a price range if any of its variants could.
  if (f.minPrice !== null && p.maxPriceCents < f.minPrice * 100) return false
  if (f.maxPrice !== null && p.minPriceCents > f.maxPrice * 100) return false
  for (const t of tokens) if (!p.searchText.includes(t)) return false
  return true
}

export function tokenize(query: string): string[] {
  return foldText(query).split(/\s+/).filter(Boolean)
}

/** Products are expected in "featured" order (see interleaveByStore). */
export function queryCatalog(products: Product[], f: CatalogFilters): Product[] {
  const tokens = tokenize(f.query)
  const result = products.filter((p) => matches(p, f, tokens, null))
  // Push sold-out items to the end without otherwise disturbing the chosen order.
  const byAvailability = (a: Product, b: Product) => Number(b.isAvailable) - Number(a.isAvailable)
  switch (f.sort) {
    case 'newest':
      return result.sort((a, b) => b.publishedAt - a.publishedAt)
    case 'price-asc':
      return result.sort((a, b) => byAvailability(a, b) || a.minPriceCents - b.minPriceCents)
    case 'price-desc':
      return result.sort((a, b) => byAvailability(a, b) || b.minPriceCents - a.minPriceCents)
    case 'discount':
      return result.sort((a, b) => b.maxDiscountPct - a.maxDiscountPct || byAvailability(a, b))
    case 'title':
      return result.sort((a, b) => a.title.localeCompare(b.title))
    case 'featured':
      return result.sort(byAvailability)
  }
}

/** Counts per facet value, computed as if that facet weren't applied (standard faceted search). */
export function facetCounts(products: Product[], f: CatalogFilters) {
  const tokens = tokenize(f.query)
  const stores: Record<string, number> = {}
  const categories: Partial<Record<Category, number>> = {}
  for (const p of products) {
    if (matches(p, f, tokens, 'stores')) stores[p.storeDomain] = (stores[p.storeDomain] ?? 0) + 1
    if (matches(p, f, tokens, 'categories')) categories[p.category] = (categories[p.category] ?? 0) + 1
  }
  return { stores, categories }
}
