export function cleanSteamBBCode(text: string): string {
  return (
    text
      // normalize newlines
      .replace(/\r\n|\r/g, '\n')

      // remove BBCode tags like [b], [/h1], etc.
      // eslint-disable-next-line no-useless-escape
      .replace(/\[\/?[a-z0-9=_\-]+\]/gi, '')

      // remove leftover escape sequences
      .replace(/\t/g, ' ')

      // collapse multiple newlines
      .replace(/\n{2,}/g, '\n')

      // collapse multiple spaces
      .replace(/ {2,}/g, ' ')

      // trim
      .trim()
  );
}
