/**
 * Requests a resized rendition from Shopify's CDN. Shopify honours a `width`
 * query param on cdn.shopify.com and on stores' own /cdn/shop/ paths.
 */
export function sizedImage(src: string | null | undefined, width: number): string | undefined {
  if (!src) return undefined
  try {
    const url = new URL(src.startsWith('//') ? `https:${src}` : src)
    if (url.hostname.endsWith('shopify.com') || url.pathname.includes('/cdn/shop/')) {
      url.searchParams.set('width', String(width))
    }
    return url.toString()
  } catch {
    return src
  }
}
