import { create } from 'zustand'

export interface Toast {
  id: number
  title: string
  description?: string
  imageSrc?: string | null
  action?: { label: string; onClick: () => void }
}

interface ToastState {
  toasts: Toast[]
  show: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (toast) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...toast, id }] }))
    setTimeout(() => get().dismiss(id), 3500)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
