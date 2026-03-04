export const recommendationsThresholds = {
  S: 10000,
  A: 5000,
  B: 1000,
};

export function getReviewTier(recommendationsCount: number /*must be over 1000*/) {
  if (recommendationsCount >= recommendationsThresholds.S) {
    return 'S';
  } else if (recommendationsCount >= recommendationsThresholds.A) {
    return 'A';
  } else if (recommendationsCount >= recommendationsThresholds.B) {
    return 'B';
  }
}
