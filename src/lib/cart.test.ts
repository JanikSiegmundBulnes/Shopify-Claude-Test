import { describe, expect, it } from 'vitest'
import {
  buildCheckoutUrl,
  clampQuantity,
  createCartItem,
  groupByStore,
  itemCount,
  reconcileWithCatalog,
  totalsByCurrency,
  type CartItem,
} from './cart'
import { normalizeProduct } from './normalize'
import { rawProduct, store } from './testFixtures'
import type { Product } from './types'

const product = normalizeProduct(rawProduct(), store)!
const other = normalizeProduct(rawProduct({ id: 99, title: 'Lip Kit' }), {
  domain: 'colourpop.com',
  name: 'ColourPop',
  currency: 'EUR',
  description: '',
})!

function item(p: Product, variantIndex: number, qty: number): CartItem {
  return createCartItem(p, p.variants[variantIndex]!, qty)
}

describe('clampQuantity', () => {
  it.each([
    [0, 1],
    [-3, 1],
    [2.7, 2],
    [500, 99],
    [NaN, 1],
    [Infinity, 1],
  ])('%s -> %s', (n, expected) => expect(clampQuantity(n)).toBe(expected))
})

describe('cart grouping and totals', () => {
  const items = [item(product, 0, 2), item(other, 0, 1), item(product, 2, 1)]

  it('groups by store preserving insertion order', () => {
    const groups = groupByStore(items)
    expect(groups.map((g) => g.storeDomain)).toEqual(['allbirds.com', 'colourpop.com'])
    expect(groups[0]!.items).toHaveLength(2)
    expect(groups[0]!.itemCount).toBe(3)
    expect(groups[0]!.subtotalCents).toBe(2 * 10000 + 9550)
    expect(groups[0]!.savingsCents).toBe(2 * 2000)
  })

  it('counts items and totals per currency', () => {
    expect(itemCount(items)).toBe(4)
    expect(totalsByCurrency(items)).toEqual({ USD: 29550, EUR: 10000 })
    expect(totalsByCurrency([])).toEqual({})
  })

  it('builds Shopify cart permalinks and skips sold-out lines', () => {
    expect(buildCheckoutUrl('kith.com', [{ variantId: 1, quantity: 2 }, { variantId: 3, quantity: 1 }])).toBe(
      'https://kith.com/cart/1:2,3:1',
    )
    const soldOut = { ...item(product, 1, 1), isAvailable: false }
    const [g] = groupByStore([item(product, 0, 1), soldOut])
    expect(g!.checkoutUrl).toBe('https://allbirds.com/cart/11:1')
    expect(g!.hasUnavailableItems).toBe(true)
  })

  it('omits the variant title for default-variant products', () => {
    const single = normalizeProduct(
      rawProduct({
        options: [{ name: 'Title', values: ['Default Title'] }],
        variants: [{ id: 5, title: 'Default Title', option1: 'Default Title', option2: null, option3: null, price: '1.00' }],
      }),
      store,
    )!
    expect(createCartItem(single, single.variants[0]!, 1).variantTitle).toBeNull()
    expect(item(product, 0, 1).variantTitle).toBe('Black / 8')
  })
})

describe('reconcileWithCatalog', () => {
  it('returns the same array when nothing changed', () => {
    const items = [item(product, 0, 1)]
    expect(reconcileWithCatalog(items, new Map([[product.uid, product]]))).toBe(items)
  })

  it('updates price and availability and records the previous price', () => {
    const items = [item(product, 0, 1)]
    const updated: Product = {
      ...product,
      variants: product.variants.map((v) => (v.id === 11 ? { ...v, priceCents: 8000, isAvailable: false } : v)),
    }
    const [next] = reconcileWithCatalog(items, new Map([[product.uid, updated]]))
    expect(next).toMatchObject({ unitPriceCents: 8000, previousUnitPriceCents: 10000, isAvailable: false })
  })

  it('marks a line unavailable when its variant disappears', () => {
    const items = [item(product, 0, 1)]
    const updated: Product = { ...product, variants: product.variants.filter((v) => v.id !== 11) }
    expect(reconcileWithCatalog(items, new Map([[product.uid, updated]]))[0]!.isAvailable).toBe(false)
  })

  it('leaves lines alone when their store is not loaded', () => {
    const items = [item(product, 0, 1)]
    expect(reconcileWithCatalog(items, new Map())).toBe(items)
  })
})
