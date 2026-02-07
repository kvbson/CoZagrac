export function trimText(text: string, maxChars: number) {
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

export function weightedMean(items: { vec: number[]; weight: number }[]): number[] {
  const len = items[0].vec.length;
  const out = Array(len).fill(0);
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);

  for (const { vec, weight } of items) {
    for (let i = 0; i < len; i++) {
      out[i] += vec[i] * weight;
    }
  }

  return out.map((v) => v / totalWeight);
}

export function l2Normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((a, b) => a + b * b, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function uniqueLimited<T>(arr: T[], limit: number, key: (v: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];

  for (const item of arr) {
    const k = key(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
      if (out.length >= limit) break;
    }
  }

  return out;
}

export function buildUserPreferenceText(params: {
  genres: string[];
  categories: string[];
  topGames: string[];
  playstyle: string[];
}) {
  return `
    User preferred game genres: ${params.genres.join(', ')}.
    User preferred game features: ${params.categories.join(', ')}.
    Most played games: ${params.topGames.join(', ')}.
    Playstyle signals: ${params.playstyle.join(', ')}.
    `.trim();
}
