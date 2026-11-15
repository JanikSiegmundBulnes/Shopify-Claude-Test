import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { cartKey, clampQuantity, createCartItem, reconcileWithCatalog, type CartItem } from '../lib/cart'
import type { Product, ProductVariant } from '../lib/types'

interface CartState {
  items: CartItem[]
  isOpen: boolean
  /** Stores whose checkout the user has opened from the checkout page. */
  checkoutOpenedAt: Record<string, number>
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void
  setQuantity: (key: string, quantity: number) => void
  removeItem: (key: string) => void
  removeStore: (storeDomain: string) => void
  clear: () => void
  markCheckoutOpened: (storeDomain: string) => void
  syncWithCatalog: (products: Map<string, Product>) => void
  dismissPriceChange: (key: string) => void
  openCart: () => void
  closeCart: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      checkoutOpenedAt: {},

      addItem: (product, variant, quantity = 1) => {
        if (!variant.isAvailable) return
        const key = cartKey(product.storeDomain, variant.id)
        const existing = get().items.find((i) => i.key === key)
        if (existing) {
          set((s) => ({
            items: s.items.map((i) => (i.key === key ? { ...i, quantity: clampQuantity(i.quantity + quantity) } : i)),
          }))
        } else {
          set((s) => ({ items: [...s.items, createCartItem(product, variant, quantity)] }))
        }
      },

      setQuantity: (key, quantity) => {
        if (quantity <= 0) return get().removeItem(key)
        set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, quantity: clampQuantity(quantity) } : i)) }))
      },

      removeItem: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),

      removeStore: (storeDomain) =>
        set((s) => {
          const { [storeDomain]: _removed, ...rest } = s.checkoutOpenedAt
          return { items: s.items.filter((i) => i.storeDomain !== storeDomain), checkoutOpenedAt: rest }
        }),

      clear: () => set({ items: [], checkoutOpenedAt: {} }),

      markCheckoutOpened: (storeDomain) =>
        set((s) => ({ checkoutOpenedAt: { ...s.checkoutOpenedAt, [storeDomain]: Date.now() } })),

      syncWithCatalog: (products) => {
        const next = reconcileWithCatalog(get().items, products)
        if (next !== get().items) set({ items: next })
      },

      dismissPriceChange: (key) =>
        set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, previousUnitPriceCents: null } : i)) })),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: 'bazaar:cart',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, checkoutOpenedAt: s.checkoutOpenedAt }),
      // Defend against corrupted or hand-edited storage.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CartState>
        const items = Array.isArray(p.items)
          ? p.items.filter(
              (i): i is CartItem =>
                !!i &&
                typeof i.key === 'string' &&
                typeof i.variantId === 'number' &&
                typeof i.unitPriceCents === 'number' &&
                typeof i.storeDomain === 'string',
            ).map((i) => ({ ...i, quantity: clampQuantity(i.quantity) }))
          : []
        return { ...current, items, checkoutOpenedAt: p.checkoutOpenedAt ?? {} }
      },
    },
  ),
)

// Keep the cart in sync across browser tabs.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'bazaar:cart') void useCartStore.persist.rehydrate()
  })
}
