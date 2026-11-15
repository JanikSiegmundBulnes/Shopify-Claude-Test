import { useEffect, useState } from 'react'
import { CATEGORY_ORDER } from '../lib/categories'
import type { Category } from '../lib/types'
import { useFiltersStore } from '../store/filtersStore'

function PriceInput({ label, value, onCommit }: { label: string; value: number | null; onCommit: (v: number | null) => void }) {
  const [text, setText] = useState(value === null ? '' : String(value))
  useEffect(() => setText(value === null ? '' : String(value)), [value])
  const commit = () => {
    const n = Number.parseFloat(text)
    onCommit(text.trim() === '' || !Number.isFinite(n) || n < 0 ? null : n)
  }
  return (
    <label className="flex-1">
      <span className="mb-1 block text-xs text-stone-500">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-stone-400">$</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          placeholder="Any"
          className="h-10 w-full rounded-lg border border-stone-200 pr-2 pl-7 text-sm outline-none focus:border-stone-500"
        />
      </div>
    </label>
  )
}

function Toggle({ label, isChecked, onChange }: { label: string; isChecked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-1.5 text-sm">
      {label}
      <input type="checkbox" className="peer sr-only" checked={isChecked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-6 w-10 rounded-full bg-stone-200 transition peer-checked:bg-stone-900 peer-focus-visible:ring-2 peer-focus-visible:ring-stone-400 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
    </label>
  )
}

export function FilterPanel({ categoryCounts }: { categoryCounts: Partial<Record<Category, number>> }) {
  const f = useFiltersStore()
  const categories = CATEGORY_ORDER.filter((c) => (categoryCounts[c] ?? 0) > 0 || f.categories.includes(c))

  return (
    <div className="space-y-7">
      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wider text-stone-500 uppercase">Category</h3>
        {categories.length === 0 ? (
          <p className="text-sm text-stone-400">No categories yet</p>
        ) : (
          <ul className="space-y-0.5">
            {categories.map((c) => {
              const isChecked = f.categories.includes(c)
              return (
                <li key={c}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-stone-100">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => f.toggleCategory(c)}
                      className="h-4 w-4 rounded border-stone-300 accent-stone-900"
                    />
                    <span className="flex-1">{c}</span>
                    <span className="text-xs text-stone-400">{categoryCounts[c] ?? 0}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wider text-stone-500 uppercase">Price</h3>
        <div className="flex items-end gap-2">
          <PriceInput label="Min" value={f.minPrice} onCommit={(v) => f.setFilters({ minPrice: v })} />
          <span className="pb-2.5 text-stone-300">–</span>
          <PriceInput label="Max" value={f.maxPrice} onCommit={(v) => f.setFilters({ maxPrice: v })} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {([[null, 25], [25, 50], [50, 100], [100, null]] as const).map(([min, max]) => {
            const isActive = f.minPrice === min && f.maxPrice === max
            return (
              <button
                key={`${min}-${max}`}
                onClick={() => f.setFilters(isActive ? { minPrice: null, maxPrice: null } : { minPrice: min, maxPrice: max })}
                className={`rounded-full border px-2.5 py-1 text-xs ${isActive ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 hover:border-stone-400'}`}
              >
                {min === null ? `Under $${max}` : max === null ? `$${min}+` : `$${min}–${max}`}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold tracking-wider text-stone-500 uppercase">Availability</h3>
        <Toggle label="In stock only" isChecked={f.isInStockOnly} onChange={(v) => f.setFilters({ isInStockOnly: v })} />
        <Toggle label="On sale" isChecked={f.isOnSaleOnly} onChange={(v) => f.setFilters({ isOnSaleOnly: v })} />
      </section>
    </div>
  )
}
