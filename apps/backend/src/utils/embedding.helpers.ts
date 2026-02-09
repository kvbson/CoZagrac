export function trimText(text: string, maxChars: number) {
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

export function weightedMean(items: { vec: number[]; weight: number }[]): number[] {
  if (items.length === 0) {
    throw new Error('Cannot compute weighted mean of empty array');
  }

  const len = items[0].vec.length;

  for (const item of items) {
    if (item.vec.length !== len) {
      throw new Error(`All vectors must have same length. Expected ${len}, got ${item.vec.length}`);
    }
  }

  const totalWeight = items.reduce((s, i) => Math.abs(s) + Math.abs(i.weight), 0);

  if (totalWeight === 0) {
    return Array(len).fill(0);
  }

  const out = Array(len).fill(0);

  for (const { vec, weight } of items) {
    const normalizedWeight = weight / totalWeight;
    for (let i = 0; i < len; i++) {
      out[i] += vec[i] * normalizedWeight;
    }
  }

  return out;
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

export function meanOrZero(vectors: number[][], dim: number): number[] {
  if (!vectors.length) return Array(dim).fill(0);

  const out = Array(dim).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      out[i] += vec[i];
    }
  }

  return out.map((v) => v / vectors.length);
}

export function chunkReviews(reviews: string[], chunkSize = 5): string[] {
  const chunks: string[] = [];

  for (let i = 0; i < reviews.length; i += chunkSize) {
    chunks.push(
      reviews
        .slice(i, i + chunkSize)
        .map((t) => `- ${t}`)
        .join('\n'),
    );
  }

  return chunks;
}
