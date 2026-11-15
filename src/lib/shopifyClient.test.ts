import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchJsonWithRetry, fetchStoreCatalog, ShopifyError } from './shopifyClient'
import { rawProduct } from './testFixtures'

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

/** Runs a promise to completion while advancing fake timers through backoff sleeps. */
async function settle<T>(p: Promise<T>): Promise<T> {
  let result: { ok: true; v: T } | { ok: false; e: unknown } | undefined
  p.then((v) => (result = { ok: true, v }), (e) => (result = { ok: false, e }))
  while (!result) await vi.advanceTimersByTimeAsync(500)
  if (!result.ok) throw result.e
  return result.v
}

describe('fetchJsonWithRetry', () => {
  it('retries 429 and 5xx then succeeds', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({}, 429, { 'Retry-After': '1' }))
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ ok: 1 }))
    await expect(settle(fetchJsonWithRetry('u', undefined, fetchImpl))).resolves.toEqual({ ok: 1 })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('does not retry a 404 and explains it', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json({}, 404))
    await expect(settle(fetchJsonWithRetry('u', undefined, fetchImpl))).rejects.toThrow(/not found/i)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('gives up after max retries', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => json({}, 500))
    await expect(settle(fetchJsonWithRetry('u', undefined, fetchImpl))).rejects.toBeInstanceOf(ShopifyError)
    expect(fetchImpl).toHaveBeenCalledTimes(4)
  })

  it('rejects HTML responses from non-Shopify sites', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('<html>hi</html>', { status: 200 }))
    await expect(settle(fetchJsonWithRetry('u', undefined, fetchImpl))).rejects.toThrow(/Shopify/)
  })

  it('surfaces network/CORS failures immediately', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(settle(fetchJsonWithRetry('u', undefined, fetchImpl))).rejects.toBeInstanceOf(TypeError)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})

describe('fetchStoreCatalog', () => {
  const page = (start: number, count: number) => ({
    products: Array.from({ length: count }, (_, i) => rawProduct({ id: start + i, handle: `p${start + i}` })),
  })

  it('paginates until a short page and uses meta.json', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.includes('meta.json')) return json({ name: 'Allbirds', currency: 'USD' })
      if (url.includes('page=1')) return json(page(1, 250))
      if (url.includes('page=2')) return json(page(251, 10))
      throw new Error('unexpected ' + url)
    })
    const onProgress = vi.fn()
    const result = await settle(fetchStoreCatalog('allbirds.com', { fetchImpl, onProgress }))
    expect(result.store.name).toBe('Allbirds')
    expect(result.products).toHaveLength(260)
    expect(result.isTruncated).toBe(false)
    expect(onProgress).toHaveBeenLastCalledWith(260)
  })

  it('flags truncation at maxPages and dedupes shifted pages', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.includes('meta.json')) return json({}, 404)
      return json(page(url.includes('page=1') ? 1 : 200, 250))
    })
    const result = await settle(fetchStoreCatalog('x.com', { fetchImpl, maxPages: 2 }))
    expect(result.isTruncated).toBe(true)
    expect(result.products).toHaveLength(449) // 1..250 + 200..449, overlap removed
    expect(result.store.name).toBe('X')
  })

  it('falls back to the proxy when the direct request is blocked', async () => {
    const urls: string[] = []
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      urls.push(url)
      if (url.startsWith('https://')) throw new TypeError('Failed to fetch')
      if (url.includes('resource=meta')) return json({ name: 'Proxied' })
      return json(page(1, 3))
    })
    const result = await settle(fetchStoreCatalog('kith.com', { fetchImpl }))
    expect(result.store.name).toBe('Proxied')
    expect(result.products).toHaveLength(3)
    // After the first CORS failure, later requests go straight to the proxy.
    expect(urls.filter((u) => u.startsWith('https://'))).toHaveLength(1)
  })

  it('reports a friendly error when neither direct nor proxy works', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(settle(fetchStoreCatalog('nope.com', { fetchImpl }))).rejects.toThrow(/Couldn't reach/)
  })

  it('rejects responses without a products array', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => (String(input).includes('meta') ? json({}) : json({ foo: 1 })))
    await expect(settle(fetchStoreCatalog('x.com', { fetchImpl }))).rejects.toThrow(/Shopify product data/)
  })

  it('aborts cleanly', async () => {
    const controller = new AbortController()
    const fetchImpl = vi.fn<typeof fetch>((_input, init) => {
      return new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal!.reason)))
    })
    const p = fetchStoreCatalog('x.com', { fetchImpl, signal: controller.signal })
    controller.abort()
    await expect(settle(p)).rejects.toHaveProperty('name', 'AbortError')
  })
})
