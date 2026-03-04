export function shouldSkipReview(review: string): boolean {
  if (isMostlyNonText(review)) return true;
  if (hasManyNonLetterLines(review)) return true;

  return false;
}

function hasManyNonLetterLines(text: string): boolean {
  const lines = text.split('\n');

  const nonLetterLines = lines.filter((l) => !/[a-zA-ZąćęłńóśżźĄĆĘŁŃÓŚŻŹ]/.test(l));

  return lines.length >= 4 && nonLetterLines.length / lines.length > 0.6;
}

function isMostlyNonText(review: string): boolean {
  const letters = review.match(/[a-zA-ZąćęłńóśżźĄĆĘŁŃÓŚŻŹ]/g)?.length ?? 0;
  const total = review.length;

  // mniej niż 20% liter → śmieć
  return total > 0 && letters / total < 0.2;
}
