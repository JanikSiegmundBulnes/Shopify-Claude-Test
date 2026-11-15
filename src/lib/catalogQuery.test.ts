import { describe, expect, it } from 'vitest'
import { DEFAULT_FILTERS, facetCounts, interleaveByStore, queryCatalog } from './catalogQuery'
import { normalizeProduct } from './normalize'
import { rawProduct } from './testFixtures'
import type { Product } from './types'

function make(domain: string, id: number, title: string, price: string, type = 'Shoes', isAvailable = true): Product {
  return normalizeProduct(
    rawProduct({
      id,
      title,
      product_type: type,
      published_at: new Date(2025, 0, id).toISOString(),
      options: [{ name: 'Title', values: ['Default Title'] }],
      variants: [{ id: id * 10, title: 'Default Title', option1: 'Default Title', option2: null, option3: null, price, available: isAvailable }],
    }),
    { domain, name: domain.split('.')[0]!, currency: 'USD', description: '' },
  )!
}

const a1 = make('a.com', 1, 'Wool Runner', '100.00')
const a2 = make('a.com', 2, 'Tree Dasher', '20.00', 'Shoes', false)
const a3 = make('a.com', 3, 'Crème Hoodie', '60.00', 'Hoodies')
const b1 = make('b.com', 4, 'Lip Gloss', '12.00', 'Lip Gloss')
const all = interleaveByStore([a1, a2, a3, b1])

describe('interleaveByStore', () => {
  it('round-robins stores', () => {
    expect(all.map((p) => p.id)).toEqual([1, 4, 2, 3])
  })
})

describe('queryCatalog', () => {
  const q = (f: Partial<typeof DEFAULT_FILTERS>) => queryCatalog(all, { ...DEFAULT_FILTERS, ...f }).map((p) => p.id)

  it('searches across title, store and category, accent-insensitively', () => {
    expect(q({ query: 'creme' })).toEqual([3])
    expect(q({ query: 'WOOL run' })).toEqual([1])
    expect(q({ query: 'beauty' })).toEqual([4])
    expect(q({ query: 'b' })).toContain(4) // store name "b"
    expect(q({ query: 'nothing-matches' })).toEqual([])
  })

  it('filters by store, category, price and flags', () => {
    expect(q({ stores: ['b.com'] })).toEqual([4])
    expect(q({ categories: ['Clothing'] })).toEqual([3])
    expect(q({ minPrice: 50 })).toEqual([1, 3])
    expect(q({ minPrice: 15, maxPrice: 60 })).toEqual([3, 2])
    expect(q({ isInStockOnly: true })).not.toContain(2)
  })

  it('sorts, pushing sold-out items last for featured/price sorts', () => {
    expect(q({ sort: 'price-asc' })).toEqual([4, 3, 1, 2])
    expect(q({ sort: 'price-desc' })).toEqual([1, 3, 4, 2])
    expect(q({ sort: 'newest' })).toEqual([4, 3, 2, 1])
    expect(q({ sort: 'title' })).toEqual([3, 4, 2, 1])
    expect(q({ sort: 'featured' })).toEqual([1, 4, 3, 2])
  })

  it('does not mutate the input list', () => {
    const before = all.map((p) => p.id)
    q({ sort: 'price-asc' })
    expect(all.map((p) => p.id)).toEqual(before)
  })
})

describe('facetCounts', () => {
  it('counts each facet ignoring its own selection', () => {
    const counts = facetCounts(all, { ...DEFAULT_FILTERS, stores: ['b.com'], categories: ['Beauty'] })
    expect(counts.stores).toEqual({ 'b.com': 1 })
    expect(counts.categories).toEqual({ Beauty: 1 })
    const c2 = facetCounts(all, { ...DEFAULT_FILTERS, stores: ['a.com'] })
    expect(c2.stores).toEqual({ 'a.com': 3, 'b.com': 1 })
    expect(c2.categories).toEqual({ Footwear: 2, Clothing: 1 })
  })
})
