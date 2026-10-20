const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

/**
 * aboutTheGame ze sklepowego API Steama zawiera HTML.
 * Bez renderowania surowego HTML (XSS) - zamykamy bloki w znaki nowe i usuwamy tagi.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|ul|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
