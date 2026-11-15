import { create } from 'zustand'
import { deleteCachedCatalog, readCachedCatalog, writeCachedCatalog } from '../lib/catalogCache'
import { fetchStoreCatalog, isAbortError, ShopifyError } from '../lib/shopifyClient'
import type { Product, Store } from '../lib/types'

export type LoadStatus = 'loading' | 'ready' | 'error'

export interface StoreState {
  domain: string
  status: LoadStatus
  store: Store | null
  products: Product[]
  /** Products parsed so far during an in-flight load. */
  loadedCount: number
  error: string | null
  fetchedAt: number | null
  isTruncated: boolean
  /** True while showing cached data and revalidating in the background. */
  isRefreshing: boolean
}

interface CatalogState {
  byDomain: Record<string, StoreState>
  /** Bumped whenever any store's products change; cheap memo key for derived lists. */
  revision: number
  syncShops: (domains: string[]) => void
  loadStore: (domain: string, opts?: { isForced?: boolean }) => Promise<void>
  refreshAll: () => void
}

const MAX_CONCURRENT_STORES = 3
const controllers = new Map<string, AbortController>()

// Tiny semaphore so adding many shops doesn't fire dozens of parallel requests.
let active = 0
const waiting: Array<() => void> = []
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT_STORES) await new Promise<void>((r) => waiting.push(r))
  active++
  try {
    return await fn()
  } finally {
    active--
    waiting.shift()?.()
  }
}

function initialState(domain: string): StoreState {
  return {
    domain,
    status: 'loading',
    store: null,
    products: [],
    loadedCount: 0,
    error: null,
    fetchedAt: null,
    isTruncated: false,
    isRefreshing: false,
  }
}

export const useCatalogStore = create<CatalogState>()((set, get) => {
  const patch = (domain: string, changes: Partial<StoreState>, hasProductChange = false) =>
    set((s) => {
      const current = s.byDomain[domain]
      if (!current) return s // store was removed mid-flight
      return {
        byDomain: { ...s.byDomain, [domain]: { ...current, ...changes } },
        revision: hasProductChange ? s.revision + 1 : s.revision,
      }
    })

  return {
    byDomain: {},
    revision: 0,

    syncShops: (domains) => {
      const { byDomain } = get()
      const removed = Object.keys(byDomain).filter((d) => !domains.includes(d))
      const added = domains.filter((d) => !byDomain[d])
      if (!removed.length && !added.length) return

      for (const d of removed) {
        controllers.get(d)?.abort()
        controllers.delete(d)
        void deleteCachedCatalog(d)
      }
      set((s) => {
        const next: Record<string, StoreState> = {}
        for (const d of domains) next[d] = s.byDomain[d] ?? initialState(d)
        return { byDomain: next, revision: s.revision + 1 }
      })
      for (const d of added) void get().loadStore(d)
    },

    loadStore: async (domain, opts = {}) => {
      controllers.get(domain)?.abort()
      const controller = new AbortController()
      controllers.set(domain, controller)

      if (!opts.isForced) {
        const cached = await readCachedCatalog(domain)
        if (controller.signal.aborted) return
        if (cached) {
          patch(
            domain,
            {
              status: 'ready',
              store: cached.catalog.store,
              products: cached.catalog.products,
              fetchedAt: cached.fetchedAt,
              isTruncated: cached.catalog.isTruncated,
              error: null,
              isRefreshing: cached.isStale,
            },
            true,
          )
          if (!cached.isStale) return
        }
      }

      const current = get().byDomain[domain]
      if (!current) return
      if (current.status !== 'ready') patch(domain, { status: 'loading', error: null, loadedCount: 0 })
      else patch(domain, { isRefreshing: true, error: null })

      try {
        const catalog = await withSlot(() =>
          fetchStoreCatalog(domain, {
            signal: controller.signal,
            onProgress: (n) => patch(domain, { loadedCount: n }),
          }),
        )
        patch(
          domain,
          {
            status: 'ready',
            store: catalog.store,
            products: catalog.products,
            isTruncated: catalog.isTruncated,
            fetchedAt: Date.now(),
            isRefreshing: false,
            error: null,
          },
          true,
        )
        void writeCachedCatalog(domain, catalog)
      } catch (err) {
        if (controller.signal.aborted || isAbortError(err)) return
        const message = err instanceof ShopifyError ? err.message : 'Something went wrong loading this store'
        const prev = get().byDomain[domain]
        // Keep showing previously loaded products if a background refresh fails.
        if (prev?.products.length) patch(domain, { isRefreshing: false, error: message })
        else patch(domain, { status: 'error', isRefreshing: false, error: message })
      } finally {
        if (controllers.get(domain) === controller) controllers.delete(domain)
      }
    },

    refreshAll: () => {
      for (const d of Object.keys(get().byDomain)) void get().loadStore(d, { isForced: true })
    },
  }
})

/** All loaded products, ordered by the shop list. */
export function selectAllProducts(byDomain: Record<string, StoreState>): Product[] {
  return Object.values(byDomain).flatMap((s) => s.products)
}
