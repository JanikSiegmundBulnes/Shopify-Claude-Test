import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'

interface OverlayProps {
  isOpen: boolean
  onClose: () => void
  label: string
  variant: 'modal' | 'drawer-right' | 'drawer-left'
  children: ReactNode
  className?: string
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea,[tabindex]:not([tabindex="-1"])'

/**
 * Shared accessible overlay: portal, backdrop, Esc to close, scroll lock,
 * focus trap, and focus restore on close.
 */
export function Overlay({ isOpen, onClose, label, variant, children, className = '' }: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useBodyScrollLock(isOpen)

  useEffect(() => {
    if (!isOpen) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const first = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel
    first?.focus({ preventScroll: true })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      } else if (e.key === 'Tab' && panel) {
        const nodes = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null)
        if (!nodes.length) return
        const firstNode = nodes[0]!
        const lastNode = nodes[nodes.length - 1]!
        if (e.shiftKey && document.activeElement === firstNode) {
          e.preventDefault()
          lastNode.focus()
        } else if (!e.shiftKey && document.activeElement === lastNode) {
          e.preventDefault()
          firstNode.focus()
        }
      }
    }
    panel?.addEventListener('keydown', onKey)
    return () => {
      panel?.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.({ preventScroll: true })
    }
  }, [isOpen])

  if (!isOpen) return null

  const position =
    variant === 'modal'
      ? 'items-end sm:items-center justify-center sm:p-6'
      : variant === 'drawer-right'
        ? 'justify-end'
        : 'justify-start'
  const panelAnim =
    variant === 'modal' ? 'animate-pop-in' : variant === 'drawer-right' ? 'animate-slide-in-right' : 'animate-slide-in-left'

  return createPortal(
    <div className={`fixed inset-0 z-50 flex ${position}`}>
      <div className="animate-fade-in absolute inset-0 bg-stone-950/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`relative flex flex-col bg-white shadow-2xl outline-none ${panelAnim} ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
