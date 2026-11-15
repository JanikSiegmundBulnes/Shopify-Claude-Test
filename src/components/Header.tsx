import { Link } from 'react-router-dom'
import { itemCount } from '../lib/cart'
import { useCartStore } from '../store/cartStore'
import { useUiStore } from '../store/uiStore'
import { useShopsStore } from '../store/shopsStore'
import { BagIcon, StoreIcon } from './Icons'
import { SearchBar } from './SearchBar'

export function Header() {
  const count = useCartStore((s) => itemCount(s.items))
  const openCart = useCartStore((s) => s.openCart)
  const shopCount = useShopsStore((s) => s.domains.length)
  const setShopManagerOpen = useUiStore((s) => s.setShopManagerOpen)

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link to="/" className="flex flex-none items-center gap-2" aria-label="Bazaar home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-stone-900 text-lg font-black text-white">B</span>
          <span className="hidden text-lg font-extrabold tracking-tight md:block">Bazaar</span>
        </Link>
        <div className="max-w-2xl flex-1">
          <SearchBar />
        </div>
        <div className="flex flex-none items-center gap-1 sm:gap-2">
          <button
            onClick={() => setShopManagerOpen(true)}
            className="flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            <StoreIcon />
            <span className="hidden lg:inline">My shops</span>
            <span className="hidden rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 sm:inline">{shopCount}</span>
          </button>
          <button
            onClick={openCart}
            className="relative flex h-11 items-center gap-2 rounded-full bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-700"
            aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`}
          >
            <BagIcon />
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span key={count} className="animate-bump grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-stone-900">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
