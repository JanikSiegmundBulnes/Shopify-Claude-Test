import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useFiltersStore } from '../store/filtersStore'
import { CloseIcon, SearchIcon } from './Icons'

export function SearchBar() {
  const query = useFiltersStore((s) => s.query)
  const setFilters = useFiltersStore((s) => s.setFilters)
  const [value, setValue] = useState(query)
  const debounced = useDebouncedValue(value, 200)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (debounced !== useFiltersStore.getState().query) setFilters({ query: debounced })
  }, [debounced, setFilters])

  // Reflect external resets (e.g. "clear search" in the empty state).
  // Only when the store differs from what we last pushed, so it can't clobber in-progress typing.
  useEffect(() => {
    if (query !== debounced) setValue(query)
  }, [query])

  // "/" focuses search, like most storefronts and dev tools.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && !target.isContentEditable) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <form
      role="search"
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault()
        setFilters({ query: value })
        if (location.pathname !== '/') navigate('/')
        inputRef.current?.blur()
      }}
    >
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-stone-400" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          if (location.pathname !== '/') navigate('/')
        }}
        placeholder="Search products, brands, shops…"
        aria-label="Search products across all shops"
        className="h-11 w-full rounded-full border border-stone-200 bg-stone-50 pr-10 pl-11 text-sm transition outline-none placeholder:text-stone-400 focus:border-stone-400 focus:bg-white focus:ring-4 focus:ring-stone-900/5 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            setValue('')
            setFilters({ query: '' })
            inputRef.current?.focus()
          }}
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
          aria-label="Clear search"
        >
          <CloseIcon width={16} height={16} />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute top-1/2 right-4 hidden -translate-y-1/2 rounded border border-stone-200 bg-white px-1.5 text-[11px] text-stone-400 sm:block">/</kbd>
      )}
    </form>
  )
}
