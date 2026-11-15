import { beforeEach, describe, expect, it } from 'vitest'
import { normalizeProduct } from '../lib/normalize'
import { rawProduct, store } from '../lib/testFixtures'
import { useCartStore } from './cartStore'

const product = normalizeProduct(rawProduct(), store)!
const [inStock, soldOut] = [product.variants[0]!, product.variants[1]!]

beforeEach(() => useCartStore.setState({ items: [], checkoutOpenedAt: {} }))

describe('cartStore', () => {
  it('merges repeat adds of the same variant and caps quantity', () => {
    const { addItem } = useCartStore.getState()
    addItem(product, inStock, 2)
    addItem(product, inStock, 3)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0]!.quantity).toBe(5)
    addItem(product, inStock, 500)
    expect(useCartStore.getState().items[0]!.quantity).toBe(99)
  })

  it('refuses sold-out variants', () => {
    useCartStore.getState().addItem(product, soldOut, 1)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('removes a line when quantity drops to zero', () => {
    const s = useCartStore.getState()
    s.addItem(product, inStock, 1)
    s.setQuantity('allbirds.com:11', 0)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('clears one store after checkout', () => {
    const s = useCartStore.getState()
    s.addItem(product, inStock, 1)
    s.addItem({ ...product, uid: 'kith.com:1', storeDomain: 'kith.com' }, inStock, 1)
    s.markCheckoutOpened('allbirds.com')
    s.removeStore('allbirds.com')
    const after = useCartStore.getState()
    expect(after.items.map((i) => i.storeDomain)).toEqual(['kith.com'])
    expect(after.checkoutOpenedAt).toEqual({})
  })

  it('persists to localStorage', () => {
    useCartStore.getState().addItem(product, inStock, 1)
    const saved = JSON.parse(localStorage.getItem('bazaar:cart')!)
    expect(saved.state.items[0].variantId).toBe(11)
    expect(saved.state.isOpen).toBeUndefined()
  })
})
