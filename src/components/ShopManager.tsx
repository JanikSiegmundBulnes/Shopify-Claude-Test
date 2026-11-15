import { useState } from 'react'
import { useCatalogStore } from '../store/catalogStore'
import { useShopsStore } from '../store/shopsStore'
import { useUiStore } from '../store/uiStore'
import { useFiltersStore } from '../store/filtersStore'
import { AlertIcon, CheckIcon, CloseIcon, PlusIcon, RefreshIcon, Spinner, TrashIcon } from './Icons'
import { Overlay } from './Overlay'

/** Public Shopify storefronts known to expose /products.json, offered as one-click adds. */
const SUGGESTIONS = [
  'allbirds.com',
  'gymshark.com',
  'kith.com',
  'colourpop.com',
  'rothys.com',
  'deathwishcoffee.com',
  'chubbiesshorts.com',
  'puravidabracelets.com',
  'tentree.com',
  'brooklinen.com',
  'taylorstitch.com',
]

function timeAgo(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  return `${Math.round(mins / 60)} h ago`
}

export function ShopManager() {
  const isOpen = useUiStore((s) => s.isShopManagerOpen)
  const setOpen = useUiStore((s) => s.setShopManagerOpen)
  const domains = useShopsStore((s) => s.domains)
  const addShop = useShopsStore((s) => s.addShop)
  const removeShop = useShopsStore((s) => s.removeShop)
  const byDomain = useCatalogStore((s) => s.byDomain)
  const loadStore = useCatalogStore((s) => s.loadStore)
  const refreshAll = useCatalogStore((s) => s.refreshAll)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (value: string) => {
    const result = addShop(value)
    if (result.isAdded) {
      setInput('')
      setError(null)
    } else {
      setError(result.error ?? 'Could not add shop')
    }
  }

  const remove = (domain: string) => {
    removeShop(domain)
    const f = useFiltersStore.getState()
    if (f.stores.includes(domain)) f.toggleStore(domain)
  }

  const suggestions = SUGGESTIONS.filter((s) => !domains.includes(s))

  return (
    <Overlay
      isOpen={isOpen}
      onClose={() => setOpen(false)}
      label="Manage shops"
      variant="modal"
      className="max-h-[90dvh] w-full rounded-t-3xl sm:max-w-lg sm:rounded-3xl"
    >
      <div className="flex items-start justify-between p-6 pb-4">
        <div>
          <h2 className="text-xl font-bold">My shops</h2>
          <p className="mt-1 text-sm text-stone-500">Add any Shopify store by its domain. Products load straight from the shop.</p>
        </div>
        <button onClick={() => setOpen(false)} className="-mt-1 -mr-2 rounded-full p-2 hover:bg-stone-100" aria-label="Close">
          <CloseIcon />
        </button>
      </div>

      <form
        className="px-6"
        onSubmit={(e) => {
          e.preventDefault()
          submit(input)
        }}
      >
        <div className="flex gap-2">
          <input
            data-autofocus
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setError(null)
            }}
            placeholder="e.g. allbirds.com or https://shop.example.com"
            aria-label="Shop domain"
            aria-invalid={!!error}
            className="h-11 flex-1 rounded-xl border border-stone-200 px-4 text-sm outline-none focus:border-stone-500"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-11 items-center gap-1.5 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white hover:bg-stone-700 disabled:bg-stone-300"
          >
            <PlusIcon width={16} height={16} /> Add
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </form>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200">
          {domains.length === 0 && <li className="p-4 text-center text-sm text-stone-500">No shops yet — add one above.</li>}
          {domains.map((d) => {
            const s = byDomain[d]
            return (
              <li key={d} className="flex items-center gap-3 p-3 pl-4">
                <span className="flex-none">
                  {!s || s.status === 'loading' ? (
                    <Spinner className="text-stone-400" />
                  ) : s.status === 'error' ? (
                    <AlertIcon width={16} height={16} className="text-rose-500" />
                  ) : (
                    <CheckIcon width={16} height={16} className="text-emerald-600" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s?.store?.name ?? d}</p>
                  <p className="truncate text-xs text-stone-500">
                    {d}
                    {s?.status === 'ready' && ` · ${s.products.length}${s.isTruncated ? '+' : ''} products`}
                    {s?.status === 'ready' && s.fetchedAt && ` · updated ${timeAgo(s.fetchedAt)}`}
                    {s?.status === 'loading' && ` · loading${s.loadedCount ? ` ${s.loadedCount}` : ''}…`}
                  </p>
                  {s?.error && <p className="text-xs text-rose-600">{s.error}</p>}
                </div>
                <button
                  onClick={() => void loadStore(d, { isForced: true })}
                  disabled={s?.status === 'loading' || s?.isRefreshing}
                  className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40"
                  aria-label={`Reload ${d}`}
                  title="Reload"
                >
                  <RefreshIcon width={16} height={16} />
                </button>
                <button
                  onClick={() => remove(d)}
                  className="rounded-lg p-2 text-stone-500 hover:bg-rose-50 hover:text-rose-600"
                  aria-label={`Remove ${d}`}
                  title="Remove"
                >
                  <TrashIcon width={16} height={16} />
                </button>
              </li>
            )
          })}
        </ul>

        {suggestions.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-xs font-semibold tracking-wider text-stone-500 uppercase">Suggestions</h3>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="flex items-center gap-1 rounded-full border border-stone-200 px-3 py-1.5 text-xs hover:border-stone-900"
                >
                  <PlusIcon width={12} height={12} /> {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between border-t border-stone-100 px-6 py-4">
        <button onClick={refreshAll} className="flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900">
          <RefreshIcon width={15} height={15} /> Refresh all
        </button>
        <button onClick={() => setOpen(false)} className="rounded-xl bg-stone-900 px-5 py-2 text-sm font-semibold text-white hover:bg-stone-700">
          Done
        </button>
      </div>
    </Overlay>
  )
}
