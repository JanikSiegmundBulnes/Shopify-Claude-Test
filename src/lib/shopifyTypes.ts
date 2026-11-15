/** Raw shapes returned by a Shopify storefront's public JSON endpoints. */

export interface RawImage {
  id: number
  src: string
  width?: number | null
  height?: number | null
  position?: number
  variant_ids?: number[]
  alt?: string | null
}

export interface RawVariant {
  id: number
  title: string
  option1: string | null
  option2: string | null
  option3: string | null
  sku?: string | null
  available?: boolean
  price: string | number
  compare_at_price?: string | number | null
  featured_image?: RawImage | null
  position?: number
}

export interface RawOption {
  name: string
  position?: number
  values: string[]
}

export interface RawProduct {
  id: number
  title: string
  handle: string
  body_html?: string | null
  published_at?: string | null
  created_at?: string | null
  vendor?: string | null
  product_type?: string | null
  tags?: string[] | string | null
  variants?: RawVariant[]
  images?: RawImage[]
  options?: RawOption[]
}

export interface RawProductsResponse {
  products: RawProduct[]
}

export interface RawShopMeta {
  name?: string
  currency?: string
  domain?: string
  url?: string
  description?: string
  money_format?: string
}
