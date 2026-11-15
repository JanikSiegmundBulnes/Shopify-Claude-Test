/** Parses Shopify's decimal price strings ("25.00") into integer cents. */
export function parseMoneyToCents(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number.parseFloat(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

const formatters = new Map<string, Intl.NumberFormat>()

export function formatMoney(cents: number, currency: string): string {
  let fmt = formatters.get(currency)
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency })
    } catch {
      // Unknown currency code from a store's meta.json; fall back to a plain number.
      fmt = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    formatters.set(currency, fmt)
  }
  return fmt.format(cents / 100)
}

/** Formats a per-currency total map, e.g. "$120.00 + €40.00". */
export function formatMultiCurrency(totals: Record<string, number>): string {
  const entries = Object.entries(totals)
  if (entries.length === 0) return formatMoney(0, 'USD')
  return entries.map(([cur, cents]) => formatMoney(cents, cur)).join(' + ')
}
