import { useCallback } from 'react'
import type { Product, ProductVariant } from '../lib/types'
import { useCartStore } from '../store/cartStore'
import { useToastStore } from '../store/toastStore'

/** Adds to cart and confirms with a toast, without yanking the user into the drawer. */
export function useAddToCart() {
  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)
  const show = useToastStore((s) => s.show)

  return useCallback(
    (product: Product, variant: ProductVariant, quantity = 1) => {
      if (!variant.isAvailable) return
      addItem(product, variant, quantity)
      show({
        title: 'Added to cart',
        description: [product.title, product.hasOnlyDefaultVariant ? null : variant.title, `× ${quantity}`]
          .filter(Boolean)
          .join(' · '),
        imageSrc: variant.imageSrc ?? product.images[0]?.src,
        action: { label: 'View cart', onClick: openCart },
      })
    },
    [addItem, openCart, show],
  )
}
