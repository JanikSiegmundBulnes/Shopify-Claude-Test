import { normalizeProduct, normalizeStore } from './normalize'
import type { RawProductsResponse, RawShopMeta } from './shopifyTypes'
import type { Product, Store } from './types'

export const PAGE_SIZE = 250
const REQUEST_TIMEOUT_MS = 15_000
const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 600
const MAX_BACKOFF_MS = 10_000
/** Pause between paginated requests to the same store, to stay well under rate limits. */
const PAGE_DELAY_MS = 250

export class ShopifyError extends Error {
  readonly status: number | null
  readonly isRetryable: boolean

  constructor(message: string, status: number | null, isRetryable: boolean) {
    super(message)
    this.name = 'ShopifyError'
    this.status = status
    this.isRetryable = isRetryable
  }
}

type Resource = 'products' | 'meta'
type Transport = 'direct' | 'proxy'

function buildUrl(transport: Transport, domain: string, resource: Resource, page = 1): string {
  if (transport === 'proxy') {
    const params = new URLSearchParams({ domain, resource })
    if (resource === 'products') {
      params.set('page', String(page))
      params.set('limit', String(PAGE_SIZE))
    }
    return `/api/shopify?${params}`
  }
  return resource === 'products'
    ? `https://${domain}/products.json?limit=${PAGE_SIZE}&page=${page}`
    : `https://${domain}/meta.json`
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(t)
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

function backoffDelay(attempt: number, retryAfterHeader: string | null): number {
  const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : NaN
  if (Number.isFinite(retryAfter) && retryAfter >= 0) return Math.min(retryAfter * 1000, MAX_BACKOFF_MS)
  const exp = BASE_BACKOFF_MS * 2 ** attempt
  return Math.min(exp + Math.random() * exp * 0.3, MAX_BACKOFF_MS)
}

function describeStatus(status: number): string {
  if (status === 404) return 'Store not found, or its product feed is disabled'
  if (status === 401 || status === 403) return 'Store is password-protected or blocks access'
  if (status === 429) return 'Rate limited by the store, try again shortly'
  if (status >= 500) return `Store responded with a server error (${status})`
  return `Request failed (${status})`
}

/**
 * Fetches JSON with a timeout and retries for transient failures
 * (network errors, timeouts, 429, 5xx). Honours Retry-After when visible.
 * Network-level failures (CORS, DNS) are thrown as TypeError so the caller
 * can decide whether to switch transport.
 */
export async function fetchJsonWithRetry<T>(
  url: string,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
    try {
      const res = await fetchImpl(url, { signal: combined, headers: { Accept: 'application/json' } })
      if (res.ok) {
        const text = await res.text()
        try {
          return JSON.parse(text) as T
        } catch {
          // Non-Shopify sites often return an HTML page with a 200.
          throw new ShopifyError("This site didn't return Shopify product data", res.status, false)
        }
      }
      const isRetryable = res.status === 429 || res.status === 408 || res.status >= 500
      lastError = new ShopifyError(describeStatus(res.status), res.status, isRetryable)
      if (!isRetryable || attempt === MAX_RETRIES) throw lastError
      await sleep(backoffDelay(attempt, res.headers.get('retry-after')), signal)
    } catch (err) {
      if (signal?.aborted) throw signal.reason ?? err
      if (err instanceof ShopifyError) {
        if (!err.isRetryable || attempt === MAX_RETRIES) throw err
        continue
      }
      const isTimeout = err instanceof DOMException && err.name === 'TimeoutError'
      lastError = isTimeout ? new ShopifyError('The store took too long to respond', null, true) : err
      // TypeError = network/CORS failure. Retrying the same URL rarely helps, so surface it immediately.
      if (err instanceof TypeError || attempt === MAX_RETRIES) throw lastError
      await sleep(backoffDelay(attempt, null), signal)
    }
  }
  throw lastError
}

export interface FetchStoreOptions {
  maxPages?: number
  signal?: AbortSignal
  onProgress?: (loaded: number) => void
  fetchImpl?: typeof fetch
}

export interface StoreCatalog {
  store: Store
  products: Product[]
  isTruncated: boolean
}

/**
 * Loads a store's metadata and products. Tries the store directly first (most
 * Shopify storefronts send `Access-Control-Allow-Origin: *`) and falls back to
 * the local proxy if the browser blocks the request.
 */
export async function fetchStoreCatalog(domain: string, opts: FetchStoreOptions = {}): Promise<StoreCatalog> {
  const { maxPages = 4, signal, onProgress, fetchImpl = fetch } = opts
  let transport: Transport = 'direct'

  const unreachable = () => new ShopifyError("Couldn't reach this store (network or CORS blocked)", null, true)
  const request = async <T,>(resource: Resource, page?: number): Promise<T> => {
    try {
      return await fetchJsonWithRetry<T>(buildUrl(transport, domain, resource, page), signal, fetchImpl)
    } catch (err) {
      if (!(err instanceof TypeError)) throw err
      if (transport === 'proxy') throw unreachable()
      transport = 'proxy'
      try {
        return await fetchJsonWithRetry<T>(buildUrl(transport, domain, resource, page), signal, fetchImpl)
      } catch (proxyErr) {
        // A 404 here means the proxy route doesn't exist (static hosting), not that the store is missing.
        if (proxyErr instanceof TypeError || (proxyErr instanceof ShopifyError && proxyErr.status === 404)) throw unreachable()
        throw proxyErr
      }
    }
  }

  // meta.json is optional: it gives a nicer name and the currency.
  let meta: RawShopMeta | null = null
  try {
    meta = await request<RawShopMeta>('meta')
  } catch (err) {
    if (isAbortError(err) || signal?.aborted) throw err
  }
  const store = normalizeStore(domain, meta)

  const products: Product[] = []
  const seen = new Set<number>()
  let isTruncated = false
  for (let page = 1; page <= maxPages; page++) {
    if (page > 1) await sleep(PAGE_DELAY_MS, signal)
    const data = await request<RawProductsResponse>('products', page)
    if (!data || !Array.isArray(data.products)) {
      throw new ShopifyError("This site didn't return Shopify product data", null, false)
    }
    for (const raw of data.products) {
      // Pages can shift while we paginate; dedupe by id.
      if (seen.has(raw.id)) continue
      const p = normalizeProduct(raw, store)
      if (p) {
        seen.add(raw.id)
        products.push(p)
      }
    }
    onProgress?.(products.length)
    if (data.products.length < PAGE_SIZE) break
    if (page === maxPages) isTruncated = true
  }

  return { store, products, isTruncated }
}
