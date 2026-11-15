import { describe, expect, it } from 'vitest'
import { DEFAULT_FILTERS, queryCatalog, SORT_LABELS } from '../lib/catalogQuery'
import { normalizeProduct } from '../lib/normalize'
import { rawProduct, store } from '../lib/testFixtures'
import type { Product } from '../lib/types'

function product(id: number, title: string, price: string, compareAt: string | null, available = true): Product {
  return normalizeProduct(
    rawProduct({
      id, title, handle: `p-${id}`,
      options: [{ name: 'Title', values: ['Default Title'] }],
      variants: [{ id: id * 10, title: 'Default Title', option1: 'Default Title', option2: null,
        option3: null, price, compare_at_price: compareAt, available }],
    }),
    store,
  )!
}

const bySavings = (products: Product[]) =>
  queryCatalog(products, { ...DEFAULT_FILTERS, sort: 'savings' as never }).map((p) => p.id)

describe('F-02 sort by savings', () => {
  it('AC-1: offers "Biggest savings"', () => {
    expect((SORT_LABELS as Record<string, string>).savings).toBe('Biggest savings')
  })
  it('AC-2: absolute saving, not percent', () => {
    const cap = product(2, 'Cap', '10.00', '20.00')         // 50 %, saves 1000
    const jacket = product(1, 'Jacket', '150.00', '200.00') // 25 %, saves 5000
    expect(bySavings([cap, jacket])).toEqual([1, 2])
  })
  it('AC-3: products without saving come last', () => {
    expect(bySavings([product(3, 'Sock', '5.00', null), product(4, 'Tee', '20.00', '25.00')])).toEqual([4, 3])
  })
  it('AC-4: unavailable variants do not count', () => {
    expect(bySavings([product(5, 'Boot', '50.00', '100.00', false), product(6, 'Belt', '30.00', '35.00')])).toEqual([6, 5])
  })
  it('AC-5: equal savings ordered by title', () => {
    expect(bySavings([product(7, 'Zebra', '10.00', '20.00'), product(8, 'Apple', '10.00', '20.00')])).toEqual([8, 7])
  })
})