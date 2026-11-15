import { create } from 'zustand'

interface UiState {
  isShopManagerOpen: boolean
  isMobileFiltersOpen: boolean
  setShopManagerOpen: (isOpen: boolean) => void
  setMobileFiltersOpen: (isOpen: boolean) => void
}

export const useUiStore = create<UiState>()((set) => ({
  isShopManagerOpen: false,
  isMobileFiltersOpen: false,
  setShopManagerOpen: (isOpen) => set({ isShopManagerOpen: isOpen }),
  setMobileFiltersOpen: (isOpen) => set({ isMobileFiltersOpen: isOpen }),
}))
