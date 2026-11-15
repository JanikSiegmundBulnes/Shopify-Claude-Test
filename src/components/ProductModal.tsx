import { useEffect, useMemo, useState } from 'react'
import { useAddToCart } from '../hooks/useAddToCart'
import { sizedImage } from '../lib/image'
import type { Product, ProductVariant } from '../lib/types'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, ExternalIcon, MinusIcon, PlusIcon } from './Icons'
import { Overlay } from './Overlay'
import { Price } from './Price'
import { MAX_QUANTITY } from '../lib/cart'

function findVariant(product: Product, selected: string[]): ProductVariant | undefined {
  return product.variants.find((v) => v.optionValues.every((val, i) => val === selected[i]))
}

function defaultVariant(product: Product): ProductVariant {
  return product.variants.find((v) => v.isAvailable) ?? product.variants[0]!
}

/**
 * Picks the variant that has `value` at option `index` and keeps as many of the
 * user's other selections as possible, preferring in-stock variants.
 */
function bestVariantFor(product: Product, selected: string[], index: number, value: string): ProductVariant | undefined {
  let best: ProductVariant | undefined
  let bestScore = -1
  for (const v of product.variants) {
    if (v.optionValues[index] !== value) continue
    const overlap = v.optionValues.filter((val, i) => i !== index && val === selected[i]).length
    const score = (v.isAvailable ? 100 : 0) + overlap
    if (score > bestScore) {
      best = v
      bestScore = score
    }
  }
  return best
}

export function ProductModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  return (
    <Overlay
      isOpen={!!product}
      onClose={onClose}
      label={product?.title ?? 'Product'}
      variant="modal"
      className="max-h-[94dvh] w-full overflow-hidden rounded-t-3xl sm:max-w-5xl sm:rounded-3xl"
    >
      {product && <ProductDetail key={product.uid} product={product} onClose={onClose} />}
    </Overlay>
  )
}

function ProductDetail({ product, onClose }: { product: Product; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>(() => defaultVariant(product).optionValues)
  const [quantity, setQuantity] = useState(1)
  const [imageIndex, setImageIndex] = useState(0)
  const [isDescriptionExpanded, setDescriptionExpanded] = useState(false)
  const addToCart = useAddToCart()

  const variant = useMemo(
    () => (product.hasOnlyDefaultVariant ? product.variants[0] : findVariant(product, selected)),
    [product, selected],
  )
  const images = product.images

  // Jump the gallery to the selected variant's image.
  useEffect(() => {
    if (!variant?.imageSrc) return
    const idx = images.findIndex((img) => img.src === variant.imageSrc)
    if (idx >= 0) setImageIndex(idx)
  }, [variant, images])

  const selectValue = (index: number, value: string) => {
    const next = [...selected]
    next[index] = value
    const exact = findVariant(product, next)
    if (exact?.isAvailable) return setSelected(next)
    const fallback = bestVariantFor(product, selected, index, value)
    setSelected(fallback ? fallback.optionValues : next)
  }

  /**
   * Whether `value` is buyable given the selections in earlier options
   * (e.g. a size is crossed out only if it's sold out in the chosen color).
   */
  const isValueAvailable = (index: number, value: string) =>
    product.variants.some(
      (v) => v.isAvailable && v.optionValues[index] === value && v.optionValues.every((val, j) => j >= index || val === selected[j]),
    )

  const image = images[imageIndex]
  const canAdd = !!variant?.isAvailable
  const description = product.description
  const isLongDescription = description.length > 400

  return (
    <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-2 md:overflow-hidden">
      {/* Gallery */}
      <div className="relative bg-stone-100 md:h-full md:max-h-[94dvh]">
        <div className="relative aspect-[4/5] w-full md:aspect-auto md:h-full">
          {image ? (
            <img
              key={image.src}
              src={sizedImage(image.src, 1000)}
              alt={image.alt}
              className="animate-fade-in absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full min-h-64 place-items-center text-stone-400">No image</div>
          )}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setImageIndex((i) => (i - 1 + images.length) % images.length)}
                className="absolute top-1/2 left-3 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow hover:bg-white"
                aria-label="Previous image"
              >
                <ChevronLeftIcon />
              </button>
              <button
                onClick={() => setImageIndex((i) => (i + 1) % images.length)}
                className="absolute top-1/2 right-3 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow hover:bg-white"
                aria-label="Next image"
              >
                <ChevronRightIcon />
              </button>
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 px-4">
                {images.slice(0, 12).map((img, i) => (
                  <button
                    key={img.src}
                    onClick={() => setImageIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${i === imageIndex ? 'w-6 bg-stone-900' : 'w-1.5 bg-stone-900/30'}`}
                    aria-label={`Show image ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="flex min-h-0 flex-col md:max-h-[94dvh]">
        <div className="flex items-start justify-between gap-4 p-6 pb-0">
          <div className="min-w-0">
            <a
              href={`https://${product.storeDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold tracking-wider text-stone-500 uppercase hover:text-stone-900"
            >
              {product.storeName}
            </a>
            <h2 className="mt-1 text-2xl leading-tight font-bold tracking-tight text-balance">{product.title}</h2>
            {product.productType && <p className="mt-1 text-sm text-stone-500">{product.productType}</p>}
          </div>
          <button
            onClick={onClose}
            data-autofocus
            className="-mt-1 -mr-2 rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="flex items-center gap-3">
            <Price
              className="text-xl font-bold"
              cents={variant?.priceCents ?? product.minPriceCents}
              compareAtCents={variant?.compareAtCents}
              currency={product.currency}
            />
            {variant?.compareAtCents && (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">
                Save {Math.round(((variant.compareAtCents - variant.priceCents) / variant.compareAtCents) * 100)}%
              </span>
            )}
          </div>

          {product.options.map((opt, i) => (
            <fieldset key={opt.name}>
              <legend className="mb-2 text-sm">
                <span className="font-semibold">{opt.name}</span>
                {selected[i] && <span className="text-stone-500">: {selected[i]}</span>}
              </legend>
              <div className="flex flex-wrap gap-2">
                {opt.values.map((value) => {
                  const isSelected = selected[i] === value
                  const isAvailable = isValueAvailable(i, value)
                  return (
                    <button
                      key={value}
                      onClick={() => selectValue(i, value)}
                      aria-pressed={isSelected}
                      className={`min-w-11 rounded-xl border px-3 py-2 text-sm transition ${
                        isSelected
                          ? 'border-stone-900 bg-stone-900 text-white'
                          : isAvailable
                            ? 'border-stone-200 hover:border-stone-900'
                            : 'border-stone-200 text-stone-400 line-through decoration-stone-300 hover:border-stone-400'
                      }`}
                    >
                      {value}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}

          <div className="flex gap-3">
            <div className="flex h-12 items-center rounded-xl border border-stone-200">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="grid h-full w-11 place-items-center text-stone-600 disabled:text-stone-300"
                aria-label="Decrease quantity"
              >
                <MinusIcon width={16} height={16} />
              </button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
                disabled={quantity >= MAX_QUANTITY}
                className="grid h-full w-11 place-items-center text-stone-600 disabled:text-stone-300"
                aria-label="Increase quantity"
              >
                <PlusIcon width={16} height={16} />
              </button>
            </div>
            <button
              onClick={() => {
                if (!variant) return
                addToCart(product, variant, quantity)
                onClose()
              }}
              disabled={!canAdd}
              className="h-12 flex-1 rounded-xl bg-stone-900 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
            >
              {!variant ? 'Unavailable combination' : canAdd ? 'Add to cart' : 'Sold out'}
            </button>
          </div>

          <p className="text-xs text-stone-500">
            Sold and shipped by <span className="font-medium text-stone-700">{product.storeName}</span>. You'll complete payment on their secure Shopify checkout.
          </p>

          {description && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Description</h3>
              <p className={`text-sm leading-relaxed whitespace-pre-line text-stone-600 ${isDescriptionExpanded || !isLongDescription ? '' : 'line-clamp-6'}`}>
                {description}
              </p>
              {isLongDescription && (
                <button onClick={() => setDescriptionExpanded((v) => !v)} className="mt-1 text-sm font-medium underline">
                  {isDescriptionExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900"
          >
            View on {product.storeName} <ExternalIcon width={15} height={15} />
          </a>
        </div>
      </div>
    </div>
  )
}
