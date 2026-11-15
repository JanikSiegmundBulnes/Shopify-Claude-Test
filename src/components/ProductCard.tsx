import { memo, useState } from 'react'
import { sizedImage } from '../lib/image'
import type { Product } from '../lib/types'
import { useAddToCart } from '../hooks/useAddToCart'
import { Price } from './Price'
import { PlusIcon } from './Icons'

interface ProductCardProps {
  product: Product
  onOpen: (uid: string) => void
  isPriority?: boolean
}

export const ProductCard = memo(function ProductCard({ product: p, onOpen, isPriority }: ProductCardProps) {
  const [hasImageError, setHasImageError] = useState(false)
  const addToCart = useAddToCart()
  const primary = p.images[0]
  const secondary = p.images[1]
  const cheapest = p.variants.reduce((a, b) => (b.priceCents < a.priceCents ? b : a))
  const onlyVariant = p.variants.length === 1 ? p.variants[0]! : null
  const canQuickAdd = !!onlyVariant?.isAvailable

  return (
    <article className="group relative flex flex-col">
      <button
        onClick={() => onOpen(p.uid)}
        className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-stone-100 text-left focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label={`View ${p.title} from ${p.storeName}`}
      >
        {primary && !hasImageError ? (
          <>
            <img
              src={sizedImage(primary.src, 600)}
              alt={primary.alt}
              loading={isPriority ? 'eager' : 'lazy'}
              decoding="async"
              onError={() => setHasImageError(true)}
              className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] ${secondary ? 'group-hover:opacity-0' : ''}`}
            />
            {secondary && (
              <img
                src={sizedImage(secondary.src, 600)}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="grid h-full place-items-center text-sm text-stone-400">No image</div>
        )}
        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5">
          {p.maxDiscountPct > 0 && p.isAvailable && (
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">−{p.maxDiscountPct}%</span>
          )}
          {!p.isAvailable && <span className="rounded-full bg-stone-900/80 px-2 py-0.5 text-[11px] font-semibold text-white">Sold out</span>}
        </div>
      </button>

      {canQuickAdd && (
        <button
          onClick={() => addToCart(p, onlyVariant!)}
          className="absolute top-2.5 right-2.5 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-stone-900 shadow-md transition hover:scale-105 hover:bg-stone-900 hover:text-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          aria-label={`Add ${p.title} to cart`}
          title="Quick add"
        >
          <PlusIcon width={18} height={18} />
        </button>
      )}

      <div className="mt-3 flex flex-1 flex-col gap-0.5 px-0.5">
        <p className="truncate text-[11px] font-semibold tracking-wider text-stone-500 uppercase">
          {p.storeName}
          {p.vendor && p.vendor.toLowerCase() !== p.storeName.toLowerCase() && <span className="font-normal normal-case"> · {p.vendor}</span>}
        </p>
        <button onClick={() => onOpen(p.uid)} className="line-clamp-2 text-left text-sm leading-snug font-medium text-stone-900 hover:underline">
          {p.title}
        </button>
        <Price
          className="mt-1 text-sm font-semibold"
          cents={p.minPriceCents}
          compareAtCents={cheapest.compareAtCents}
          currency={p.currency}
          isRange={p.minPriceCents !== p.maxPriceCents}
        />
        {p.options[0] && p.options[0].values.length > 1 && (
          <p className="text-xs text-stone-400">
            {p.options[0].values.length} {p.options[0].name.toLowerCase()}
            {p.options[0].name.toLowerCase().endsWith('s') ? '' : 's'}
          </p>
        )}
      </div>
    </article>
  )
})

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] rounded-2xl bg-stone-200/70" />
      <div className="mt-3 h-3 w-1/3 rounded bg-stone-200/70" />
      <div className="mt-2 h-4 w-4/5 rounded bg-stone-200/70" />
      <div className="mt-2 h-4 w-1/4 rounded bg-stone-200/70" />
    </div>
  )
}
