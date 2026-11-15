import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { FilterPanel } from '../components/FilterPanel'
import { CloseIcon, FilterIcon, StoreIcon } from '../components/Icons'
import { Overlay } from '../components/Overlay'
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard'
import { StoreBar } from '../components/StoreBar'
import { useAllProducts } from '../hooks/useCatalog'
import { countActiveFilters, facetCounts, queryCatalog, SORT_LABELS, type SortKey } from '../lib/catalogQuery'
import { useCatalogStore } from '../store/catalogStore'
import { useFiltersStore } from '../store/filtersStore'
import { useUiStore } from '../store/uiStore'

const PAGE_SIZE = 48

export function ShopPage() {
  const products = useAllProducts()
  const byDomain = useCatalogStore((s) => s.byDomain)
  const filters = useFiltersStore(
    useShallow((s) => ({
      query: s.query,
      stores: s.stores,
      categories: s.categories,
      minPrice: s.minPrice,
      maxPrice: s.maxPrice,
      isInStockOnly: s.isInStockOnly,
      isOnSaleOnly: s.isOnSaleOnly,
      sort: s.sort,
    })),
  )
  const { setFilters, resetFilters, toggleCategory, toggleStore } = useFiltersStore.getState()
  const { isMobileFiltersOpen, setMobileFiltersOpen, setShopManagerOpen } = useUiStore()
  const [, setSearchParams] = useSearchParams()

  // Keep typing responsive on large catalogs: filtering runs at lower priority.
  const deferredFilters = useDeferredValue(filters)
  const results = useMemo(() => queryCatalog(products, deferredFilters), [products, deferredFilters])
  const counts = useMemo(() => facetCounts(products, deferredFilters), [products, deferredFilters])
  const isStale = deferredFilters !== filters

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  useEffect(() => setVisibleCount(PAGE_SIZE), [deferredFilters])

  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisibleCount((n) => n + PAGE_SIZE)
      },
      { rootMargin: '800px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [results.length, visibleCount])

  const openProduct = useCallback(
    (uid: string) =>
      setSearchParams((p) => {
        p.set('p', uid)
        return p
      }),
    [setSearchParams],
  )

  const storeStates = Object.values(byDomain)
  const isAnyLoading = storeStates.some((s) => s.status === 'loading')
  const isEverythingFailed = storeStates.length > 0 && storeStates.every((s) => s.status === 'error')
  const activeFilterCount = countActiveFilters(filters)
  const storeNames = Object.fromEntries(storeStates.map((s) => [s.domain, s.store?.name ?? s.domain]))
  const visible = results.slice(0, visibleCount)

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 sm:px-6">
      {!filters.query && activeFilterCount === 0 && storeStates.length > 0 && (
        <section className="pt-8 pb-2 sm:pt-12">
          <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
            All your favorite shops.<br className="hidden sm:block" /> <span className="text-stone-400">One cart.</span>
          </h1>
          <p className="mt-3 max-w-xl text-stone-600">
            Browse {products.length > 0 ? products.length.toLocaleString() : ''} products from {storeStates.length} independent
            Shopify stores, mix them in a single cart, and check out with each shop securely.
          </p>
        </section>
      )}

      <div className="sticky top-16 z-30 -mx-4 bg-[#fafaf9]/90 px-4 pt-4 pb-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <StoreBar counts={counts.stores} />
      </div>

      {storeStates.length === 0 ? (
        <div className="mx-auto mt-16 max-w-md text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-stone-100 text-stone-400"><StoreIcon width={28} height={28} /></span>
          <h2 className="mt-4 text-xl font-bold">No shops yet</h2>
          <p className="mt-2 text-stone-500">Add a Shopify store to start browsing its products here.</p>
          <button onClick={() => setShopManagerOpen(true)} className="mt-5 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white hover:bg-stone-700">
            Add your first shop
          </button>
        </div>
      ) : (
        <div className="mt-4 flex gap-10">
          <aside className="sticky top-36 hidden max-h-[calc(100dvh-10rem)] w-60 flex-none self-start overflow-y-auto pb-8 lg:block">
            <FilterPanel categoryCounts={counts.categories} />
            {activeFilterCount > 0 && (
              <button onClick={resetFilters} className="mt-6 text-sm font-medium underline">Clear all filters</button>
            )}
          </aside>

          <main className="min-w-0 flex-1">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="flex h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-medium lg:hidden"
              >
                <FilterIcon width={16} height={16} /> Filters
                {activeFilterCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-stone-900 px-1 text-[11px] text-white">{activeFilterCount}</span>}
              </button>
              <p className="text-sm text-stone-500" aria-live="polite">
                {isAnyLoading && products.length === 0 ? 'Loading products…' : (
                  <>
                    <span className="font-semibold text-stone-900">{results.length.toLocaleString()}</span> product{results.length === 1 ? '' : 's'}
                    {filters.query && <> for “<span className="text-stone-900">{filters.query}</span>”</>}
                  </>
                )}
              </p>
              <label className="ml-auto flex items-center gap-2 text-sm">
                <span className="hidden text-stone-500 sm:inline">Sort</span>
                <select
                  value={filters.sort}
                  onChange={(e) => setFilters({ sort: e.target.value as SortKey })}
                  className="h-10 rounded-full border border-stone-200 bg-white pr-8 pl-4 text-sm font-medium outline-none focus:border-stone-500"
                >
                  {Object.entries(SORT_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </label>
            </div>

            {activeFilterCount > 0 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {filters.stores.map((d) => (
                  <Pill key={d} label={storeNames[d] ?? d} onRemove={() => toggleStore(d)} />
                ))}
                {filters.categories.map((c) => (
                  <Pill key={c} label={c} onRemove={() => toggleCategory(c)} />
                ))}
                {filters.minPrice !== null && <Pill label={`Min $${filters.minPrice}`} onRemove={() => setFilters({ minPrice: null })} />}
                {filters.maxPrice !== null && <Pill label={`Max $${filters.maxPrice}`} onRemove={() => setFilters({ maxPrice: null })} />}
                {filters.isInStockOnly && <Pill label="In stock" onRemove={() => setFilters({ isInStockOnly: false })} />}
                {filters.isOnSaleOnly && <Pill label="On sale" onRemove={() => setFilters({ isOnSaleOnly: false })} />}
                <button onClick={resetFilters} className="px-2 text-sm text-stone-500 underline hover:text-stone-900">Clear all</button>
              </div>
            )}

            {isEverythingFailed ? (
              <EmptyState
                title="We couldn't reach your shops"
                body="Check your connection, or open My shops to retry or replace stores that are unavailable."
                action={{ label: 'Manage shops', onClick: () => setShopManagerOpen(true) }}
              />
            ) : results.length === 0 && isAnyLoading ? (
              <Grid>{Array.from({ length: 12 }, (_, i) => <ProductCardSkeleton key={i} />)}</Grid>
            ) : results.length === 0 ? (
              <EmptyState
                title="No products match"
                body={filters.query ? `Nothing found for “${filters.query}” with the current filters.` : 'Try removing a filter or two.'}
                action={{ label: 'Clear search & filters', onClick: () => { resetFilters(); setFilters({ query: '' }) } }}
              />
            ) : (
              <div className={`transition-opacity ${isStale ? 'opacity-60' : ''}`}>
                <Grid>
                  {visible.map((p, i) => (
                    <ProductCard key={p.uid} product={p} onOpen={openProduct} isPriority={i < 8} />
                  ))}
                  {isAnyLoading && visible.length < 12 && Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={`s${i}`} />)}
                </Grid>
                {visibleCount < results.length && (
                  <div ref={sentinelRef} className="mt-10 flex justify-center">
                    <button
                      onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                      className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold hover:border-stone-900"
                    >
                      Show more ({(results.length - visibleCount).toLocaleString()} left)
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      )}

      <Overlay
        isOpen={isMobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        label="Filters"
        variant="drawer-left"
        className="h-full w-[88vw] max-w-sm"
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <h2 className="text-lg font-bold">Filters</h2>
          <button onClick={() => setMobileFiltersOpen(false)} data-autofocus className="rounded-full p-2 hover:bg-stone-100" aria-label="Close filters">
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <FilterPanel categoryCounts={counts.categories} />
        </div>
        <div className="flex gap-3 border-t border-stone-100 p-4">
          <button onClick={resetFilters} className="h-11 flex-1 rounded-xl border border-stone-200 text-sm font-semibold">Clear</button>
          <button onClick={() => setMobileFiltersOpen(false)} className="h-11 flex-[2] rounded-xl bg-stone-900 text-sm font-semibold text-white">
            Show {results.length.toLocaleString()} products
          </button>
        </div>
      </Overlay>
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{children}</div>
}

function Pill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button onClick={onRemove} className="flex items-center gap-1.5 rounded-full bg-stone-900 py-1.5 pr-2.5 pl-3.5 text-xs font-medium text-white hover:bg-stone-700" aria-label={`Remove filter ${label}`}>
      {label} <CloseIcon width={13} height={13} />
    </button>
  )
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm text-stone-500">{body}</p>
      {action && (
        <button onClick={action.onClick} className="mt-5 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-700">
          {action.label}
        </button>
      )}
    </div>
  )
}
