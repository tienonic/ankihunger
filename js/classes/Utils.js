/**
 * Shared utility functions used across all modules.
 */

/** Fisher-Yates shuffle — returns a new array */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick a random element from an array */
export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Round to 2 decimal places */
export function round2(n) {
  return Math.round(n * 100) / 100;
}

/** Build a Google Images search URL for a term */
export function imgLink(name, searchSuffix = '') {
  const q = searchSuffix ? name + ' ' + searchSuffix : name;
  const url = 'https://www.google.com/search?tbm=isch&q=' +
    encodeURIComponent(q);
  return `<a class="view-img" href="${url}" target="_blank" rel="noopener">View Image</a>`;
}

/** Format an interval in days to human readable text */
export function formatInterval(days) {
  if (days < 1 / 24) return Math.max(1, Math.round(days * 24 * 60)) + 'm';
  if (days < 1) return Math.round(days * 24) + 'h';
  if (days < 30) return Math.round(days) + 'd';
  if (days < 365) return Math.round(days / 30) + 'mo';
  return (days / 365).toFixed(1).replace(/\.0$/, '') + 'y';
}
