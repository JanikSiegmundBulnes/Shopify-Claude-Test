import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { normalizeDomain } from '../lib/domain'

/** Curated starting set: well-known stores whose product feeds are public. */
export const DEFAULT_SHOPS = ['allbirds.com', 'gymshark.com', 'kith.com', 'colourpop.com']

interface ShopsState {
  domains: string[]
  addShop: (input: string) => { isAdded: boolean; domain?: string; error?: string }
  removeShop: (domain: string) => void
  resetShops: () => void
}

export const useShopsStore = create<ShopsState>()(
  persist(
    (set, get) => ({
      domains: DEFAULT_SHOPS,
      addShop: (input) => {
        const domain = normalizeDomain(input)
        if (!domain) return { isAdded: false, error: 'Enter a valid store domain, e.g. allbirds.com' }
        const bare = (d: string) => d.replace(/^www\./, '')
        if (get().domains.some((d) => bare(d) === bare(domain))) {
          return { isAdded: false, domain, error: 'That shop is already in your list' }
        }
        set((s) => ({ domains: [...s.domains, domain] }))
        return { isAdded: true, domain }
      },
      removeShop: (domain) => set((s) => ({ domains: s.domains.filter((d) => d !== domain) })),
      resetShops: () => set({ domains: DEFAULT_SHOPS }),
    }),
    { name: 'bazaar:shops', version: 1 },
  ),
)
