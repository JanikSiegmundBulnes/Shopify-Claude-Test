import { useCatalogStore } from '../store/catalogStore'
import { useFiltersStore } from '../store/filtersStore'
import { useUiStore } from '../store/uiStore'
import { AlertIcon, PlusIcon, RefreshIcon, Spinner } from './Icons'

/** Horizontal shop selector that doubles as per-store loading/error status. */
export function StoreBar({ counts }: { counts: Record<string, number> }) {
  const byDomain = useCatalogStore((s) => s.byDomain)
  const loadStore = useCatalogStore((s) => s.loadStore)
  const selected = useFiltersStore((s) => s.stores)
  const toggleStore = useFiltersStore((s) => s.toggleStore)
  const setFilters = useFiltersStore((s) => s.setFilters)
  const setShopManagerOpen = useUiStore((s) => s.setShopManagerOpen)
  const stores = Object.values(byDomain)

  const chip = 'flex h-9 flex-none items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition whitespace-nowrap'

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6">
      <button
        onClick={() => setFilters({ stores: [] })}
        className={`${chip} ${selected.length === 0 ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white hover:border-stone-400'}`}
        aria-pressed={selected.length === 0}
      >
        All shops
      </button>
      {stores.map((s) => {
        const isSelected = selected.includes(s.domain)
        const name = s.store?.name ?? s.domain
        if (s.status === 'error') {
          return (
            <button
              key={s.domain}
              onClick={() => void loadStore(s.domain, { isForced: true })}
              title={s.error ?? undefined}
              className={`${chip} border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-400`}
            >
              <AlertIcon width={15} height={15} />
              {name}
              <span className="flex items-center gap-1 text-xs opacity-80"><RefreshIcon width={13} height={13} />Retry</span>
            </button>
          )
        }
        return (
          <button
            key={s.domain}
            onClick={() => toggleStore(s.domain)}
            disabled={s.status === 'loading'}
            aria-pressed={isSelected}
            title={s.error ? `Showing cached products. ${s.error}` : undefined}
            className={`${chip} ${isSelected ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white hover:border-stone-400'} disabled:cursor-wait disabled:opacity-70`}
          >
            {s.status === 'loading' || s.isRefreshing ? <Spinner /> : null}
            {name}
            <span className={`text-xs ${isSelected ? 'text-stone-300' : 'text-stone-400'}`}>
              {s.status === 'loading' ? (s.loadedCount || '…') : (counts[s.domain] ?? 0)}
            </span>
          </button>
        )
      })}
      <button
        onClick={() => setShopManagerOpen(true)}
        className={`${chip} border-dashed border-stone-300 text-stone-600 hover:border-stone-500 hover:text-stone-900`}
      >
        <PlusIcon width={15} height={15} /> Add shop
      </button>
    </div>
  )
}
