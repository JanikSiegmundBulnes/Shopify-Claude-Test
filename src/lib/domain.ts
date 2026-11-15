const HOSTNAME_RE = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

/**
 * Turns user input such as "https://www.Allbirds.com/collections/men" or
 * "kith.com/" into a bare hostname. Returns null if it isn't a valid public host.
 */
export function normalizeDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return null
  let host: string
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`).hostname
  } catch {
    return null
  }
  host = host.replace(/\.$/, '')
  if (!HOSTNAME_RE.test(host)) return null
  if (/(^|\.)(localhost|local|internal)$/.test(host)) return null
  return host
}

export function domainToName(domain: string): string {
  const base = domain.replace(/^(www|shop|store|us|eu|uk)\./, '').split('.')[0] ?? domain
  return base.charAt(0).toUpperCase() + base.slice(1)
}
