import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CartLine } from '../components/CartLine'
import { BagIcon, CheckIcon, ChevronLeftIcon, ExternalIcon, LockIcon } from '../components/Icons'
import { groupByStore, itemCount, totalsByCurrency } from '../lib/cart'
import { formatMoney, formatMultiCurrency } from '../lib/money'
import { useCartStore } from '../store/cartStore'

/**
 * Shopify doesn't support a single checkout across independent stores, so we
 * run a guided multi-merchant flow: one step per shop, each handing off to that
 * shop's own checkout via a cart permalink with the lines pre-filled.
 */
export function CheckoutPage() {
  const items = useCartStore((s) => s.items)
  const checkoutOpenedAt = useCartStore((s) => s.checkoutOpenedAt)
  const markCheckoutOpened = useCartStore((s) => s.markCheckoutOpened)
  const removeStore = useCartStore((s) => s.removeStore)
  const [, setSearchParams] = useSearchParams()
  const groups = useMemo(() => groupByStore(items), [items])
  const totals = useMemo(() => totalsByCurrency(items), [items])
  const openedCount = groups.filter((g) => checkoutOpenedAt[g.storeDomain]).length
  const openProduct = (uid: string) => setSearchParams({ p: uid })

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-stone-100 text-stone-400"><BagIcon width={28} height={28} /></span>
        <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-stone-500">Nothing to check out yet. Find something you love across your shops.</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white hover:bg-stone-700">
          Start shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-24 sm:px-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900">
        <ChevronLeftIcon width={16} height={16} /> Continue shopping
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Checkout</h1>
      <p className="mt-2 max-w-2xl text-stone-600">
        {groups.length === 1
          ? `Your items are from ${groups[0]!.storeName}. You'll pay on their secure Shopify checkout.`
          : `Your cart spans ${groups.length} independent shops. Each one ships and bills separately, so you'll complete ${groups.length} quick checkouts — your items are already pre-filled in each.`}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <ol className="space-y-5">
          {groups.map((g, idx) => {
            const openedAt = checkoutOpenedAt[g.storeDomain]
            const availableItems = g.items.filter((i) => i.isAvailable)
            return (
              <li key={g.storeDomain} className={`rounded-3xl border bg-white p-5 sm:p-6 ${openedAt ? 'border-emerald-200' : 'border-stone-200'}`}>
                <div className="flex items-start gap-4">
                  <span className={`grid h-9 w-9 flex-none place-items-center rounded-full text-sm font-bold ${openedAt ? 'bg-emerald-500 text-white' : 'bg-stone-900 text-white'}`}>
                    {openedAt ? <CheckIcon width={18} height={18} /> : idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-lg font-bold">{g.storeName}</h2>
                      <span className="text-sm text-stone-500">{g.storeDomain}</span>
                    </div>
                    <ul className="mt-1 divide-y divide-stone-100">
                      {g.items.map((item) => <CartLine key={item.key} item={item} onOpenProduct={openProduct} />)}
                    </ul>

                    <div className="mt-2 flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm">
                        <span className="text-stone-500">Subtotal · {g.itemCount} item{g.itemCount === 1 ? '' : 's'} </span>
                        <span className="font-bold tabular-nums">{formatMoney(g.subtotalCents, g.currency)}</span>
                        {g.hasUnavailableItems && <p className="text-xs text-rose-600">Sold-out items won't be sent to {g.storeName}.</p>}
                      </div>
                      {availableItems.length === 0 ? (
                        <span className="text-sm text-stone-400">No available items</span>
                      ) : openedAt ? (
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={g.checkoutUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-stone-300 px-4 text-sm font-semibold hover:border-stone-900"
                          >
                            Reopen <ExternalIcon width={14} height={14} />
                          </a>
                          <button
                            onClick={() => removeStore(g.storeDomain)}
                            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
                          >
                            <CheckIcon width={16} height={16} /> I've ordered — clear these
                          </button>
                        </div>
                      ) : (
                        <a
                          href={g.checkoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => markCheckoutOpened(g.storeDomain)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-700"
                        >
                          <LockIcon width={16} height={16} /> Checkout at {g.storeName} <ExternalIcon width={14} height={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        <aside className="h-fit space-y-4 rounded-3xl bg-stone-900 p-6 text-white lg:sticky lg:top-24">
          <h2 className="font-bold">Order summary</h2>
          <dl className="space-y-2 text-sm">
            {groups.map((g) => (
              <div key={g.storeDomain} className="flex justify-between gap-3">
                <dt className="truncate text-stone-300">{g.storeName}</dt>
                <dd className="tabular-nums">{formatMoney(g.subtotalCents, g.currency)}</dd>
              </div>
            ))}
          </dl>
          <div className="flex items-baseline justify-between border-t border-white/15 pt-4">
            <span className="text-sm text-stone-300">{itemCount(items)} items</span>
            <span className="text-2xl font-bold tabular-nums">{formatMultiCurrency(totals)}</span>
          </div>
          <p className="text-xs leading-relaxed text-stone-400">
            Shipping, taxes and discount codes are applied by each shop on its own checkout page.
          </p>
          {groups.length > 1 && (
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-stone-300">
                <span>Checkout progress</span>
                <span>{openedCount} / {groups.length} shops</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${(openedCount / groups.length) * 100}%` }} />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
