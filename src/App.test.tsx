import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { rawProduct } from './lib/testFixtures'
import { useCartStore } from './store/cartStore'
import { useCatalogStore } from './store/catalogStore'
import { useShopsStore } from './store/shopsStore'
import { useFiltersStore } from './store/filtersStore'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

const catalogs: Record<string, unknown> = {
  'shoes.com': {
    products: [
      rawProduct({ id: 1, title: 'Wool Runner', handle: 'wool-runner' }),
      rawProduct({
        id: 2,
        title: 'Gift Card',
        handle: 'gift-card',
        product_type: 'Gift Card',
        options: [{ name: 'Title', values: ['Default Title'] }],
        variants: [{ id: 21, title: 'Default Title', option1: 'Default Title', option2: null, option3: null, price: '50.00', available: true }],
      }),
    ],
  },
  'beauty.com': {
    products: [
      rawProduct({
        id: 3,
        title: 'Lip Gloss',
        handle: 'lip-gloss',
        product_type: 'Lip Gloss',
        options: [{ name: 'Title', values: ['Default Title'] }],
        variants: [{ id: 31, title: 'Default Title', option1: 'Default Title', option2: null, option3: null, price: '12.00', available: true }],
      }),
    ],
  },
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      if (url.hostname === 'broken.com') return json({}, 404)
      if (url.pathname === '/meta.json') return json({ name: url.hostname.split('.')[0]!.toUpperCase(), currency: 'USD' })
      return json(catalogs[url.hostname] ?? { products: [] })
    }),
  )
  // jsdom lacks IntersectionObserver
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} })
  localStorage.clear()
  useCartStore.setState({ items: [], isOpen: false, checkoutOpenedAt: {} })
  useCatalogStore.setState({ byDomain: {}, revision: 0 })
  useShopsStore.setState({ domains: ['shoes.com', 'beauty.com', 'broken.com'] })
  useFiltersStore.getState().resetFilters()
  useFiltersStore.setState({ query: '' })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App end-to-end (mocked network)', () => {
  it('loads multiple stores, shows per-store errors, and searches', async () => {
    renderApp()
    expect(await screen.findByText('Wool Runner')).toBeTruthy()
    expect(await screen.findByText('Lip Gloss')).toBeTruthy()
    // Failed store shows a retry chip instead of crashing the page.
    expect(await screen.findByText(/Retry/)).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/Search products/), { target: { value: 'gloss' } })
    await waitFor(() => expect(screen.queryByText('Wool Runner')).toBeNull(), { timeout: 2000 })
    expect(screen.getByText('Lip Gloss')).toBeTruthy()
  })

  it('adds items from two stores and checks out per merchant', async () => {
    renderApp()
    await screen.findByText('Lip Gloss')

    // Quick add a single-variant product.
    fireEvent.click(screen.getByLabelText('Add Lip Gloss to cart'))

    // Open a multi-variant product, pick a variant, add 2.
    fireEvent.click(screen.getByLabelText(/View Wool Runner/))
    const dialog = await screen.findByRole('dialog', { name: 'Wool Runner' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'White' }))
    fireEvent.click(within(dialog).getByLabelText('Increase quantity'))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to cart' }))

    const items = useCartStore.getState().items
    expect(items.map((i) => [i.storeDomain, i.variantId, i.quantity])).toEqual([
      ['beauty.com', 31, 1],
      ['shoes.com', 13, 2],
    ])

    act(() => useCartStore.getState().openCart())
    const cart = await screen.findByRole('dialog', { name: 'Shopping cart' })
    expect(within(cart).getByText(/items from/)).toBeTruthy()
    expect(within(cart).getByText(/\$203\.00/)).toBeTruthy() // 12 + 2 × 95.50
    const links = within(cart).getAllByRole('link', { name: /Checkout here/ }).map((a) => a.getAttribute('href'))
    expect(links).toEqual(['https://beauty.com/cart/31:1', 'https://shoes.com/cart/13:2'])
  })

  it('renders the checkout page with a step per store', async () => {
    renderApp()
    await screen.findByText('Lip Gloss')
    fireEvent.click(screen.getByLabelText('Add Lip Gloss to cart'))
    fireEvent.click(screen.getByLabelText('Add Gift Card to cart'))
    act(() => useCartStore.getState().openCart())
    fireEvent.click(await screen.findByRole('link', { name: /Checkout · 2 shops/ }))

    expect(await screen.findByRole('heading', { name: 'Checkout' })).toBeTruthy()
    const step = screen.getByRole('link', { name: /Checkout at BEAUTY/ })
    expect(step.getAttribute('href')).toBe('https://beauty.com/cart/31:1')
    fireEvent.click(step)
    fireEvent.click(await screen.findByRole('button', { name: /I've ordered/ }))
    expect(useCartStore.getState().items.map((i) => i.storeDomain)).toEqual(['shoes.com'])
  })

  it('shows an empty checkout state', async () => {
    renderApp('/checkout')
    expect(await screen.findByText('Your cart is empty')).toBeTruthy()
  })
})
