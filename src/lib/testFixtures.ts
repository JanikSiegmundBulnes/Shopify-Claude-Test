import type { RawProduct } from './shopifyTypes'
import type { Store } from './types'

export const store: Store = { domain: 'allbirds.com', name: 'Allbirds', currency: 'USD', description: '' }

export function rawProduct(overrides: Partial<RawProduct> = {}): RawProduct {
  return {
    id: 1,
    title: 'Wool Runner',
    handle: 'wool-runner',
    body_html: '<p>Comfy <strong>shoes</strong>.</p><script>alert(1)</script>',
    published_at: '2025-01-02T00:00:00Z',
    vendor: 'Allbirds',
    product_type: 'Shoes',
    tags: ['a', 'b'],
    options: [
      { name: 'Color', values: ['Black', 'White'] },
      { name: 'Size', values: ['8', '9'] },
    ],
    variants: [
      { id: 11, title: 'Black / 8', option1: 'Black', option2: '8', option3: null, price: '100.00', compare_at_price: '120.00', available: true },
      { id: 12, title: 'Black / 9', option1: 'Black', option2: '9', option3: null, price: '100.00', compare_at_price: null, available: false },
      { id: 13, title: 'White / 8', option1: 'White', option2: '8', option3: null, price: '95.50', compare_at_price: '90.00', available: true },
    ],
    images: [
      { id: 2, src: 'https://cdn.shopify.com/b.jpg', position: 2, variant_ids: [13] },
      { id: 1, src: 'https://cdn.shopify.com/a.jpg', position: 1, variant_ids: [] },
    ],
    ...overrides,
  }
}
