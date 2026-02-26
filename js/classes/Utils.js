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
export function imgLink(name) {
  const url = 'https://www.google.com/search?tbm=isch&q=' +
    encodeURIComponent(name + ' plant identification');
  return `<a class="view-img" href="${url}" target="_blank" rel="noopener">View Image</a>`;
}

/** Get the DOM id prefix for a section name */
export function domPrefix(section) {
  if (section === 'reading') return 'read';
  if (section === 'conservation') return 'cons';
  return section;
}
