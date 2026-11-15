import { useEffect } from 'react'

let lockCount = 0

/** Ref-counted so stacked overlays (e.g. modal over drawer) unlock correctly. */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return
    lockCount++
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    if (lockCount === 1) {
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbar}px`
    }
    return () => {
      lockCount--
      if (lockCount === 0) {
        document.body.style.overflow = ''
        document.body.style.paddingRight = ''
      }
    }
  }, [isLocked])
}
