import { formatMoney } from '../lib/money'

interface PriceProps {
  cents: number
  compareAtCents?: number | null
  currency: string
  /** Show "From" when variants have different prices. */
  isRange?: boolean
  className?: string
}

export function Price({ cents, compareAtCents, currency, isRange, className = '' }: PriceProps) {
  const isOnSale = !!compareAtCents && compareAtCents > cents
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1.5 ${className}`}>
      {isRange && <span className="text-xs font-normal text-stone-500">From</span>}
      <span className={isOnSale ? 'text-rose-600' : ''}>{formatMoney(cents, currency)}</span>
      {isOnSale && (
        <s className="text-[0.85em] font-normal text-stone-400">
          <span className="sr-only">Was </span>
          {formatMoney(compareAtCents, currency)}
        </s>
      )}
    </span>
  )
}
