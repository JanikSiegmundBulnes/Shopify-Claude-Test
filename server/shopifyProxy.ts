import type { Plugin, Connect } from 'vite'

/**
 * Fallback proxy for stores that don't send CORS headers on /products.json.
 * Mounted on both the dev server and `vite preview`.
 *
 *   GET /api/shopify?domain=allbirds.com&resource=products&page=1&limit=250
 *
 * Only Shopify's public read-only JSON endpoints are reachable, and only on
 * public hostnames, so this can't be used as an open proxy.
 */
const ALLOWED_RESOURCES: Record<string, string> = {
  products: '/products.json',
  meta: '/meta.json',
}

const HOSTNAME_RE = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/
const UPSTREAM_TIMEOUT_MS = 15_000

export function isPublicHostname(host: string): boolean {
  if (!HOSTNAME_RE.test(host)) return false
  return !/(^|\.)(localhost|local|internal|lan|home|corp)$/.test(host)
}

const handler: Connect.NextHandleFunction = async (req, res, next) => {
  if (!req.url?.startsWith('/api/shopify')) return next()

  const send = (status: number, body: unknown, headers: Record<string, string> = {}) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
    res.end(typeof body === 'string' ? body : JSON.stringify(body))
  }

  const url = new URL(req.url, 'http://localhost')
  const domain = (url.searchParams.get('domain') ?? '').toLowerCase()
  const path = ALLOWED_RESOURCES[url.searchParams.get('resource') ?? '']

  if (!path) return send(400, { error: 'Unknown resource' })
  if (!isPublicHostname(domain)) return send(400, { error: 'Invalid domain' })

  const upstream = new URL(`https://${domain}${path}`)
  if (path === '/products.json') {
    const page = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? '250')
    upstream.searchParams.set('page', String(Number.isInteger(page) && page > 0 ? page : 1))
    upstream.searchParams.set('limit', String(Number.isInteger(limit) && limit > 0 && limit <= 250 ? limit : 250))
  }

  try {
    const r = await fetch(upstream, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (Bazaar dev proxy)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
    const extra: Record<string, string> = {}
    const retryAfter = r.headers.get('retry-after')
    if (retryAfter) extra['Retry-After'] = retryAfter
    send(r.status, await r.text(), extra)
  } catch (err) {
    send(502, { error: `Upstream request failed: ${(err as Error).message}` })
  }
}

export function shopifyProxyPlugin(): Plugin {
  return {
    name: 'shopify-proxy',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}
