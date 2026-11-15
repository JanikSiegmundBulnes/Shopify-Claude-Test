/**
 * Converts a store's body_html into safe plain text. Product descriptions come
 * from third parties, so we never inject them as HTML.
 */
export function htmlToText(html: string | null | undefined, maxLength = 3000): string {
  if (!html) return ''
  let text: string
  if (typeof DOMParser !== 'undefined') {
    // DOMParser builds an inert document: scripts don't run and images don't load.
    const doc = new DOMParser().parseFromString(
      html.replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '$&\n').replace(/<br\s*\/?>/gi, '\n'),
      'text/html',
    )
    doc.querySelectorAll('script,style,noscript,iframe').forEach((el) => el.remove())
    text = doc.body.textContent ?? ''
  } else {
    text = html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  }
  text = text
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text
}
