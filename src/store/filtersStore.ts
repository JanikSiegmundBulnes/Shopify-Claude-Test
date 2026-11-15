import { create } from 'zustand'
import { DEFAULT_FILTERS, type CatalogFilters } from '../lib/catalogQuery'
import type { Category } from '../lib/types'

interface FiltersState extends CatalogFilters {
  setFilters: (changes: Partial<CatalogFilters>) => void
  toggleStore: (domain: string) => void
  toggleCategory: (category: Category) => void
  resetFilters: () => void
}

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

export const useFiltersStore = create<FiltersState>()((set) => ({
  ...DEFAULT_FILTERS,
  setFilters: (changes) => set(changes),
  toggleStore: (domain) => set((s) => ({ stores: toggle(s.stores, domain) })),
  toggleCategory: (category) => set((s) => ({ categories: toggle(s.categories, category) })),
  resetFilters: () => set((s) => ({ ...DEFAULT_FILTERS, query: s.query, sort: s.sort })),
}))
