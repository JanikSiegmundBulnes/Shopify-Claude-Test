import { createPortal } from 'react-dom'
import { sizedImage } from '../lib/image'
import { useToastStore } from '../store/toastStore'
import { CheckIcon, CloseIcon } from './Icons'

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="animate-pop-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-stone-900 p-3 text-white shadow-xl">
          {t.imageSrc ? (
            <img src={sizedImage(t.imageSrc, 120)} alt="" className="h-12 w-12 flex-none rounded-lg bg-stone-700 object-cover" />
          ) : (
            <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-emerald-500"><CheckIcon width={16} height={16} /></span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{t.title}</p>
            {t.description && <p className="truncate text-xs text-stone-300">{t.description}</p>}
          </div>
          {t.action && (
            <button
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-stone-900 hover:bg-stone-200"
              onClick={() => {
                t.action!.onClick()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
          <button className="text-stone-400 hover:text-white" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <CloseIcon width={16} height={16} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
