/**
 * FSRS Rating UI — Again/Hard/Good/Easy button strip with interval preview.
 */

import { Rating } from './FSRS.js';

export class RatingUI {
  /**
   * @param {function(string, number): void} onRate - callback(sectionId, rating)
   */
  constructor(onRate) {
    this.onRate = onRate;
  }

  static LABELS = {
    [Rating.Again]: 'Again',
    [Rating.Hard]: 'Hard',
    [Rating.Good]: 'Good',
    [Rating.Easy]: 'Easy',
  };

  static KEYS = {
    [Rating.Again]: '1',
    [Rating.Hard]: '2',
    [Rating.Good]: '3',
    [Rating.Easy]: '4',
  };

  static CSS_CLASSES = {
    [Rating.Again]: 'rating-again',
    [Rating.Hard]: 'rating-hard',
    [Rating.Good]: 'rating-good',
    [Rating.Easy]: 'rating-easy',
  };

  /**
   * Render rating buttons into the rating area.
   * @param {string} sectionId
   * @param {{ [rating: number]: string }} intervals - preview intervals
   */
  show(sectionId, intervals) {
    const area = document.getElementById(sectionId + '-rating-area');
    if (!area) return;
    area.style.display = 'flex';
    area.innerHTML = '';

    for (const r of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
      const btn = document.createElement('button');
      btn.className = 'rating-btn ' + RatingUI.CSS_CLASSES[r];
      btn.innerHTML = `<span class="rating-label">${RatingUI.LABELS[r]}</span><span class="rating-interval">${intervals[r]}</span>`;
      btn.dataset.rating = r;
      btn.addEventListener('click', () => this.onRate(sectionId, r));
      area.appendChild(btn);
    }
  }

  /** Hide rating buttons */
  hide(sectionId) {
    const area = document.getElementById(sectionId + '-rating-area');
    if (area) {
      area.style.display = 'none';
      area.innerHTML = '';
    }
  }
}
