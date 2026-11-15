import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { groupByStore, itemCount, totalsByCurrency } from '../lib/cart'
import { formatMoney, formatMultiCurrency } from '../lib/money'
import { useCartStore } from '../store/cartStore'
import { CartLine } from './CartLine'
import { BagIcon, CloseIcon, ExternalIcon, LockIcon } from './Icons'
import { Overlay } from './Overlay'

export function CartDrawer() {
  const items = useCartStore((s) => s.items)
  const isOpen = useCartStore((s) => s.isOpen)
  const closeCart = useCartStore((s) => s.closeCart)
  const markCheckoutOpened = useCartStore((s) => s.markCheckoutOpened)
  const [, setSearchParams] = useSearchParams()
  const groups = useMemo(() => groupByStore(items), [items])
  const totals = useMemo(() => totalsByCurrency(items), [items])
  const count = itemCount(items)
  const savings = groups.reduce((n, g) => n + g.savingsCents, 0)
  const isSingleCurrency = Object.keys(totals).length <= 1

  const openProduct = (uid: string) => {
    closeCart()
    setSearchParams((p) => {
      p.set('p', uid)
      return p
    })
  }

  return (
    <Overlay isOpen={isOpen} onClose={closeCart} label="Shopping cart" variant="drawer-right" className="h-full w-full max-w-md">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <h2 className="text-lg font-bold">
          Your cart <span className="font-normal text-stone-400">({count})</span>
        </h2>
        <button onClick={closeCart} data-autofocus className="rounded-full p-2 hover:bg-stone-100" aria-label="Close cart">
          <CloseIcon />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-stone-100 text-stone-400"><BagIcon width={28} height={28} /></span>
          <p className="font-semibold">Your cart is empty</p>
          <p className="max-w-xs text-sm text-stone-500">Add products from any of your shops — we'll keep them organised by store.</p>
          <button onClick={closeCart} className="mt-2 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-700">
            Keep browsing
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-5">
            {groups.length > 1 && (
              <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
                Your cart has items from <strong>{groups.length} shops</strong>. Each shop runs its own secure checkout, so you'll pay each one separately.
              </p>
            )}
            {groups.map((g) => (
              <section key={g.storeDomain} className="border-b border-stone-100 py-4 last:border-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">{g.storeName}</h3>
                  <span className="text-xs text-stone-500">{g.itemCount} item{g.itemCount === 1 ? '' : 's'}</span>
                </div>
                <ul className="divide-y divide-stone-100">
                  {g.items.map((item) => (
                    <CartLine key={item.key} item={item} onOpenProduct={openProduct} />
                  ))}
                </ul>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 p-3">
                  <div className="text-sm">
                    <span className="text-stone-500">Subtotal </span>
                    <span className="font-semibold tabular-nums">{formatMoney(g.subtotalCents, g.currency)}</span>
                  </div>
                  {g.items.some((i) => i.isAvailable) ? (
                    <a
                      href={g.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markCheckoutOpened(g.storeDomain)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold hover:border-stone-900"
                    >
                      Checkout here <ExternalIcon width={13} height={13} />
                    </a>
                  ) : (
                    <span className="text-xs text-stone-400">Nothing available</span>
                  )}
                </div>
              </section>
            ))}
          </div>

          <div className="space-y-3 border-t border-stone-200 bg-white p-5">
            {savings > 0 && isSingleCurrency && (
              <div className="flex justify-between text-sm text-rose-600">
                <span>You save</span>
                <span className="font-semibold tabular-nums">{formatMoney(savings, Object.keys(totals)[0] ?? 'USD')}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold tabular-nums">{formatMultiCurrency(totals)}</span>
            </div>
            <p className="text-xs text-stone-500">Shipping and taxes are calculated by each shop at checkout.</p>
            <Link
              to="/checkout"
              onClick={closeCart}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-stone-900 text-sm font-semibold text-white transition hover:bg-stone-700"
            >
              <LockIcon width={16} height={16} />
              {groups.length > 1 ? `Checkout · ${groups.length} shops` : 'Checkout'}
            </Link>
          </div>
        </>
      )}
    </Overlay>
  )
}
