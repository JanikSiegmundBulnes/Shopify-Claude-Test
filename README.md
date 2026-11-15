# Bazaar — all your Shopify shops, one cart

Browse products from several independent Shopify stores in one storefront, search and filter across all of them, build a single cart with items from different merchants, and check out with each shop.

## Quick start

Requires Node 20+ (tested on Node 22).

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

| Command | What it does |
| --- | --- |
| `npm test` | Unit + integration tests (Vitest, jsdom) |
| `npm run typecheck` | TypeScript strict check |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build at http://localhost:4173, proxy included |

## Trying it out

1. Open the app. Four default shops load: Allbirds, Gymshark, Kith, ColourPop.
2. **Search**: type in the header, or press <kbd>/</kbd>. It matches titles, brands, product types, categories and shop names, and ignores accents.
3. **Filter**: shop chips (top), category / price / in-stock / on-sale (sidebar; the "Filters" button on mobile), and sort.
4. **Product detail**: click a card. Pick options; sold-out combinations are crossed out. Set the quantity and add to cart. The URL updates (`?p=…`), so links work and the back button closes the modal.
5. **Quick add**: the `+` on a card adds single-variant products directly.
6. **Cart drawer**: items are grouped by shop, with per-shop subtotals, quantity steppers and a grand total.
7. **Checkout** (`/checkout`): one step per shop. "Checkout at {shop}" opens that shop's real Shopify checkout in a new tab with your items already in it. Afterwards, "I've ordered — clear these" removes that shop's items.
8. **My shops**: add any Shopify store by domain or URL (e.g. `rothys.com`, `https://deathwishcoffee.com/collections/all`), remove shops, or force a refresh.

## How it works

### Data pipeline (`src/lib`)

- **`shopifyClient.ts`** fetches `/meta.json` (store name and currency; optional) and pages through `/products.json?limit=250&page=n`, up to 4 pages (1,000 products) per store.
  - **CORS**: most Shopify storefronts send `Access-Control-Allow-Origin: *`, so the browser calls them directly. If a request is blocked, the client switches that store to the local proxy (`server/shopifyProxy.ts`, mounted in `vite dev` and `vite preview`).
  - **Rate limits / errors**: there's a 15 s timeout, and up to 3 retries with exponential backoff and jitter on 429/408/5xx, honouring `Retry-After`. Pages are spaced 250 ms apart, and at most 3 stores load at once. 404s, password-protected stores and non-Shopify HTML responses each get a clear error, and one failing store never blocks the others.
- **`normalize.ts`** maps every store's payload into one model (`types.ts`):
  - money as integer cents
  - Shopify's `Default Title` placeholder collapsed
  - variant images backfilled from the gallery
  - compare-at prices counted only when they're higher than the price
  - `body_html` turned into plain text (never injected as HTML)
  - `"Brand | slogan"` vendors and `A>B>C` product types cleaned up
- **`categories.ts`** maps inconsistent `product_type` values ("Low Top Sneakers", "Unisex>Accessories>Bottles", "Lip Gloss Duo") onto one shared set of categories. It falls back to the title, then the tags.
- **`catalogCache.ts`** caches catalogs in IndexedDB for 30 minutes (stale-while-revalidate). Revisits are instant and the network is spared.

### State (`src/store`, Zustand)

- **cartStore**: persisted to localStorage and synced across tabs. Lines are keyed by `store:variant`, so re-adding a variant merges the lines. Quantities are clamped to 1–99. Corrupted storage is sanitised on load.
- Whenever catalog data refreshes, cart lines are **re-checked against the live data**. Price changes are flagged ("Price dropped from …") and sold-out items are marked and left out of checkout.
- **catalogStore**: per-store status (loading / ready / error / refreshing), progress, abortable loads.
- **shopsStore**: the user's shop list (persisted). **filtersStore**, **uiStore**, **toastStore**.

### The checkout constraint

Each Shopify store has its own checkout, so one payment can't cover several merchants. Bazaar uses Shopify **cart permalinks** instead:

```
https://{shop}/cart/{variantId}:{qty},{variantId}:{qty}
```

The link creates a cart on that store and redirects straight to its checkout. I checked this against live stores: the link lands on `/checkouts/cn/…` with the items filled in. The checkout page walks the shopper through one step per merchant, tracks progress, and lets them clear each shop's items once they've ordered. Shipping, tax and discount codes stay with each merchant, as they must.

### Multi-currency

Each store's currency comes from `meta.json`. Totals are computed per currency and shown as `$120.00 + €40.00`; amounts in different currencies are never added together. Price-filter inputs are in each product's own currency.

## Project layout

```
server/shopifyProxy.ts   Allow-listed read-only proxy (CORS fallback; rejects non-public hosts)
src/lib/                 Pure logic: types, normalisation, client, cart math, search/filter
src/store/               Zustand stores
src/hooks/               useAllProducts, useAddToCart, scroll lock, debounce
src/components/          Header, SearchBar, StoreBar, FilterPanel, ProductCard, ProductModal,
                         CartDrawer, CartLine, ShopManager, Overlay (accessible modal/drawer), Toaster
src/pages/               ShopPage, CheckoutPage
```

## Notes and limits

- Deploying `dist/` as plain static files works for stores that allow CORS (all four defaults do). Stores that block CORS need the proxy, which only runs under `vite dev` / `vite preview`. To use it in production, host `server/shopifyProxy.ts`'s handler as a serverless function.
- Very large catalogs are capped at 1,000 products per store (`maxPages` in `fetchStoreCatalog`). The shop list shows "1000+" when a catalog is truncated.
- `/products.json` is a public but unofficial endpoint, and some stores disable it. Those stores show a clear error with a retry button.
