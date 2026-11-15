import { MAX_QUANTITY, lineTotal, type CartItem } from '../lib/cart'
import { sizedImage } from '../lib/image'
import { formatMoney } from '../lib/money'
import { useCartStore } from '../store/cartStore'
import { MinusIcon, PlusIcon, TrashIcon } from './Icons'

export function CartLine({ item, onOpenProduct }: { item: CartItem; onOpenProduct?: (uid: string) => void }) {
  const setQuantity = useCartStore((s) => s.setQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const dismissPriceChange = useCartStore((s) => s.dismissPriceChange)
  const hasPriceChanged = item.previousUnitPriceCents !== null && item.previousUnitPriceCents !== item.unitPriceCents

  return (
    <li className={`flex gap-3 py-4 ${item.isAvailable ? '' : 'opacity-60'}`}>
      <button
        onClick={() => onOpenProduct?.(item.productUid)}
        className="h-24 w-20 flex-none overflow-hidden rounded-xl bg-stone-100"
        tabIndex={onOpenProduct ? 0 : -1}
        aria-label={`View ${item.productTitle}`}
      >
        {item.imageSrc && <img src={sizedImage(item.imageSrc, 200)} alt="" className="h-full w-full object-cover" loading="lazy" />}
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-2">
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm leading-snug font-medium">{item.productTitle}</p>
            {item.variantTitle && <p className="mt-0.5 text-xs text-stone-500">{item.variantTitle}</p>}
          </div>
          <p className="flex-none text-sm font-semibold tabular-nums">{formatMoney(lineTotal(item), item.currency)}</p>
        </div>

        {!item.isAvailable && <p className="mt-1 text-xs font-medium text-rose-600">Sold out — will be skipped at checkout</p>}
        {hasPriceChanged && (
          <p className="mt-1 text-xs text-amber-700">
            Price {item.unitPriceCents > item.previousUnitPriceCents! ? 'went up' : 'dropped'} from{' '}
            {formatMoney(item.previousUnitPriceCents!, item.currency)}{' '}
            <button onClick={() => dismissPriceChange(item.key)} className="underline">OK</button>
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex h-9 items-center rounded-lg border border-stone-200">
            <button
              onClick={() => setQuantity(item.key, item.quantity - 1)}
              className="grid h-full w-9 place-items-center text-stone-600 hover:text-stone-900"
              aria-label={item.quantity === 1 ? `Remove ${item.productTitle}` : 'Decrease quantity'}
            >
              {item.quantity === 1 ? <TrashIcon width={15} height={15} /> : <MinusIcon width={15} height={15} />}
            </button>
            <input
              value={item.quantity}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10)
                if (Number.isFinite(n) && n > 0) setQuantity(item.key, n)
              }}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              aria-label="Quantity"
              className="w-8 text-center text-sm font-semibold tabular-nums outline-none"
            />
            <button
              onClick={() => setQuantity(item.key, item.quantity + 1)}
              disabled={item.quantity >= MAX_QUANTITY || !item.isAvailable}
              className="grid h-full w-9 place-items-center text-stone-600 hover:text-stone-900 disabled:text-stone-300"
              aria-label="Increase quantity"
            >
              <PlusIcon width={15} height={15} />
            </button>
          </div>
          <button onClick={() => removeItem(item.key)} className="text-xs text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline">
            Remove
          </button>
        </div>
      </div>
    </li>
  )
}
