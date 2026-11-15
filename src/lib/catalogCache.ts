import { createStore, del, get, set } from 'idb-keyval'
import type { StoreCatalog } from './shopifyClient'

/**
 * Catalogs can be several MB, which overflows localStorage, so they're cached
 * in IndexedDB. Every operation is best-effort: if IndexedDB is unavailable
 * (private mode, tests) the app just refetches.
 */
const CACHE_VERSION = 1
export const CACHE_TTL_MS = 30 * 60 * 1000

interface CacheEntry {
  version: number
  fetchedAt: number
  catalog: StoreCatalog
}

let idbStore: ReturnType<typeof createStore> | null = null
function getIdbStore() {
  if (typeof indexedDB === 'undefined') return null
  idbStore ??= createStore('bazaar-catalog', 'stores')
  return idbStore
}

export async function readCachedCatalog(
  domain: string,
): Promise<{ catalog: StoreCatalog; fetchedAt: number; isStale: boolean } | null> {
  const db = getIdbStore()
  if (!db) return null
  try {
    const entry = await get<CacheEntry>(domain, db)
    if (!entry || entry.version !== CACHE_VERSION) return null
    return { catalog: entry.catalog, fetchedAt: entry.fetchedAt, isStale: Date.now() - entry.fetchedAt > CACHE_TTL_MS }
  } catch {
    return null
  }
}

export async function writeCachedCatalog(domain: string, catalog: StoreCatalog): Promise<void> {
  const db = getIdbStore()
  if (!db) return
  try {
    await set(domain, { version: CACHE_VERSION, fetchedAt: Date.now(), catalog } satisfies CacheEntry, db)
  } catch {
    /* quota or private-mode errors are non-fatal */
  }
}

export async function deleteCachedCatalog(domain: string): Promise<void> {
  const db = getIdbStore()
  if (!db) return
  try {
    await del(domain, db)
  } catch {
    /* ignore */
  }
}
