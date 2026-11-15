import { useMemo } from 'react'
import { interleaveByStore } from '../lib/catalogQuery'
import type { Product } from '../lib/types'
import { selectAllProducts, useCatalogStore } from '../store/catalogStore'

/** Every loaded product across all shops, in "featured" (interleaved) order. */
export function useAllProducts(): Product[] {
  const byDomain = useCatalogStore((s) => s.byDomain)
  const revision = useCatalogStore((s) => s.revision)
  // Keyed on revision, not byDomain, so progress updates during loading don't re-sort the catalog.
  return useMemo(() => interleaveByStore(selectAllProducts(byDomain)), [revision])
}

export function useProductIndex(): Map<string, Product> {
  const products = useAllProducts()
  return useMemo(() => new Map(products.map((p) => [p.uid, p])), [products])
}
