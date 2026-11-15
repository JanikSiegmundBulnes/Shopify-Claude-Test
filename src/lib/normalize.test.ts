import { describe, expect, it } from 'vitest'
import { categorize } from './categories'
import { normalizeDomain } from './domain'
import { parseMoneyToCents, formatMultiCurrency } from './money'
import { normalizeProduct, normalizeStore } from './normalize'
import { rawProduct, store } from './testFixtures'

describe('parseMoneyToCents', () => {
  it.each([
    ['25.00', 2500],
    ['19.99', 1999],
    ['0.1', 10],
    [12, 1200],
    ['1234567.89', 123456789],
    [null, null],
    ['', null],
    ['abc', null],
    ['-5', null],
  ] as const)('%s -> %s', (input, expected) => expect(parseMoneyToCents(input)).toBe(expected))
})

describe('formatMultiCurrency', () => {
  it('joins totals in different currencies', () => {
    const s = formatMultiCurrency({ USD: 1000, EUR: 500 })
    expect(s).toContain('10.00')
    expect(s).toContain('5.00')
    expect(s).toContain(' + ')
  })
  it('falls back gracefully for an unknown currency code', () => {
    expect(() => formatMultiCurrency({ ZZZ: 100 })).not.toThrow()
  })
})

describe('normalizeDomain', () => {
  it.each([
    ['allbirds.com', 'allbirds.com'],
    ['https://www.Allbirds.com/collections/men?x=1', 'www.allbirds.com'],
    ['  kith.com/  ', 'kith.com'],
    ['shop.example.co.uk', 'shop.example.co.uk'],
  ])('%s -> %s', (input, expected) => expect(normalizeDomain(input)).toBe(expected))

  it.each(['', 'not a domain', 'localhost', '127.0.0.1', 'foo.local', 'http://', 'javascript:alert(1)'])('rejects %j', (input) =>
    expect(normalizeDomain(input)).toBeNull(),
  )
})

describe('normalizeStore', () => {
  it('uses meta when present', () => {
    expect(normalizeStore('kith.com', { name: 'Kith', currency: 'EUR' })).toMatchObject({ name: 'Kith', currency: 'EUR' })
  })
  it('falls back to domain name and USD when meta.json is unavailable', () => {
    expect(normalizeStore('www.colourpop.com', null)).toMatchObject({ name: 'Colourpop', currency: 'USD' })
  })
})

describe('normalizeProduct', () => {
  it('maps a multi-variant product into the unified model', () => {
    const p = normalizeProduct(rawProduct(), store)!
    expect(p.uid).toBe('allbirds.com:1')
    expect(p.category).toBe('Footwear')
    expect(p.minPriceCents).toBe(9550)
    expect(p.maxPriceCents).toBe(10000)
    expect(p.isAvailable).toBe(true)
    expect(p.hasOnlyDefaultVariant).toBe(false)
    expect(p.options.map((o) => o.name)).toEqual(['Color', 'Size'])
    expect(p.variants[0]!.optionValues).toEqual(['Black', '8'])
    // Images sorted by position, variant image backfilled from gallery.
    expect(p.images[0]!.src).toContain('a.jpg')
    expect(p.variants.find((v) => v.id === 13)!.imageSrc).toContain('b.jpg')
    expect(p.url).toBe('https://allbirds.com/products/wool-runner')
  })

  it('only counts compare_at_price above the price as a discount', () => {
    const p = normalizeProduct(rawProduct(), store)!
    expect(p.variants.find((v) => v.id === 11)!.compareAtCents).toBe(12000)
    expect(p.variants.find((v) => v.id === 13)!.compareAtCents).toBeNull()
    expect(p.maxDiscountPct).toBe(17)
  })

  it('strips HTML and scripts from descriptions', () => {
    const p = normalizeProduct(rawProduct(), store)!
    expect(p.description).toBe('Comfy shoes.')
  })

  it('collapses Shopify "Default Title" placeholder options', () => {
    const p = normalizeProduct(
      rawProduct({
        options: [{ name: 'Title', values: ['Default Title'] }],
        variants: [{ id: 5, title: 'Default Title', option1: 'Default Title', option2: null, option3: null, price: '22.00' }],
      }),
      store,
    )!
    expect(p.hasOnlyDefaultVariant).toBe(true)
    expect(p.options).toEqual([])
    expect(p.variants[0]!.optionValues).toEqual([])
    // `available` missing -> treat as purchasable
    expect(p.variants[0]!.isAvailable).toBe(true)
  })

  it('rejects products without a sellable variant', () => {
    expect(normalizeProduct(rawProduct({ variants: [] }), store)).toBeNull()
    expect(
      normalizeProduct(rawProduct({ variants: [{ id: 1, title: 'x', option1: null, option2: null, option3: null, price: 'n/a' }] }), store),
    ).toBeNull()
  })

  it('handles missing optional fields and comma-separated tags', () => {
    const p = normalizeProduct(
      rawProduct({ images: undefined, body_html: null, vendor: null, product_type: null, tags: 'x, y', published_at: null }),
      store,
    )!
    expect(p.images).toEqual([])
    expect(p.description).toBe('')
    expect(p.vendor).toBe('Allbirds')
    expect(p.tags).toEqual(['x', 'y'])
    expect(p.publishedAt).toBe(0)
  })

  it('cleans hierarchical product types and "Brand | slogan" vendors', () => {
    const p = normalizeProduct(rawProduct({ product_type: 'Unisex>Accessories>Bottles>insulated', vendor: 'Gymshark | Be a visionary.', title: 'Bottle' }), store)!
    expect(p.productType).toBe('Unisex › Accessories › Bottles › insulated')
    expect(p.vendor).toBe('Gymshark')
    expect(p.category).toBe('Accessories')
  })
})

describe('categorize', () => {
  it.each([
    ['Shoes', 'x', 'Footwear'],
    ['Low Top Sneakers', 'x', 'Footwear'],
    ['Lip Gloss Duo', 'x', 'Beauty'],
    ['Crewnecks', 'x', 'Clothing'],
    ['Mens>Tops>T-Shirts', 'x', 'Clothing'],
    ['Unisex>Accessories>Bottles', 'x', 'Accessories'],
    ['Eyewear', 'x', 'Accessories'],
    ['', 'Everyday Backpack', 'Bags'],
    ['', 'Mystery item', 'Other'],
    ['Gift Card', 'x', 'Gift Cards'],
    ['', 'Death Wish Ground Coffee', 'Food & Drink'],
  ] as const)('%s / %s -> %s', (type, title, expected) => expect(categorize(type, title, [])).toBe(expected))
})
