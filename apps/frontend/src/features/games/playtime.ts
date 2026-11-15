/** Steam playtime_forever is minutes; format as a compact human string. */
export function formatPlaytime(minutes: number): string {
  if (!minutes) return 'no playtime';
  const hours = minutes / 60;
  return hours < 1 ? '<1 h played' : `${Math.round(hours)} h played`;
}
