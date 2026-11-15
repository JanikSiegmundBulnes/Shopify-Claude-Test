import { useEffect } from 'react'
import { Route, Routes, useSearchParams } from 'react-router-dom'
import { CartDrawer } from './components/CartDrawer'
import { Header } from './components/Header'
import { ProductModal } from './components/ProductModal'
import { ShopManager } from './components/ShopManager'
import { Toaster } from './components/Toaster'
import { useProductIndex } from './hooks/useCatalog'
import type { Product } from './lib/types'
import { CheckoutPage } from './pages/CheckoutPage'
import { ShopPage } from './pages/ShopPage'
import { useCartStore } from './store/cartStore'
import { useCatalogStore } from './store/catalogStore'
import { useShopsStore } from './store/shopsStore'

/** Keeps the catalog in step with the user's shop list. */
function useShopSync() {
  const domains = useShopsStore((s) => s.domains)
  const syncShops = useCatalogStore((s) => s.syncShops)
  useEffect(() => syncShops(domains), [domains, syncShops])
}

/** Re-prices cart lines whenever fresh catalog data arrives. */
function useCartReconciliation(index: Map<string, Product>) {
  const syncWithCatalog = useCartStore((s) => s.syncWithCatalog)
  useEffect(() => {
    if (index.size) syncWithCatalog(index)
  }, [index, syncWithCatalog])
}

export default function App() {
  useShopSync()
  const index = useProductIndex()
  useCartReconciliation(index)

  const [searchParams, setSearchParams] = useSearchParams()
  const productUid = searchParams.get('p')
  const product = productUid ? (index.get(productUid) ?? null) : null

  const closeProduct = () =>
    setSearchParams((p) => {
      p.delete('p')
      return p
    })

  return (
    <div className="min-h-dvh bg-[#fafaf9] text-stone-900">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Header />
      <div id="main">
        <Routes>
          <Route path="/" element={<ShopPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="*" element={<ShopPage />} />
        </Routes>
      </div>
      <ProductModal product={product} onClose={closeProduct} />
      <CartDrawer />
      <ShopManager />
      <Toaster />
    </div>
  )
}
