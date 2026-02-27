/** Format an interval in days to human readable text */
export function formatInterval(days: number): string {
  if (days < 1 / 24) return Math.max(1, Math.round(days * 24 * 60)) + 'm';
  if (days < 1) return Math.round(days * 24) + 'h';
  if (days < 30) return Math.round(days) + 'd';
  if (days < 365) return Math.round(days / 30) + 'mo';
  return (days / 365).toFixed(1).replace(/\.0$/, '') + 'y';
}

/** Round to 2 decimal places */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Build a Google Images search URL for a term */
export function imgLink(name: string, searchSuffix = ''): string {
  const q = searchSuffix ? name + ' ' + searchSuffix : name;
  return 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q);
}
