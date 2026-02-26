/**
 * SM-2 Spaced Repetition System.
 *
 * Manages card scheduling using the SM-2 algorithm. Each card tracks:
 *   - ef:        ease factor (starts at 2.5, min 1.3)
 *   - interval:  days until next review
 *   - reps:      consecutive correct count
 *   - nextReview: timestamp (ms) for next due date
 *   - assisted:   true if the user looked up related terms (invisible penalty)
 *
 * Quality scale: 0 (don't know) to 5 (perfect recall).
 */

import { pick } from './Utils.js';

export class SRS {
  constructor() {
    /** @type {Object<string, SRSCard>} */
    this.cards = {};
    this.maxNewPerSession = 15;
    this.newShown = {}; // section -> count
  }

  /** Get or create a card record */
  getCard(id) {
    if (!this.cards[id]) {
      this.cards[id] = { id, ef: 2.5, interval: 0, reps: 0, nextReview: 0, assisted: false };
    }
    return this.cards[id];
  }

  /**
   * Apply SM-2 algorithm to a card.
   * @param {SRSCard} card
   * @param {number} quality 0–5
   * @returns {SRSCard}
   */
  review(card, quality) {
    if (card.assisted && quality >= 3) quality = 3;

    if (quality >= 3) {
      if (card.reps === 0) card.interval = 1;
      else if (card.reps === 1) card.interval = 6;
      else card.interval = Math.round(card.interval * card.ef);
      card.reps++;
    } else {
      card.reps = 0;
      card.interval = 1;
    }

    card.ef += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    if (card.ef < 1.3) card.ef = 1.3;
    card.nextReview = Date.now() + card.interval * 86400000;
    return card;
  }

  /**
   * Pick the next card to show from a list of card IDs.
   * Priority: due cards > new cards > weakest cards.
   * @param {string[]} cardIds
   * @param {string} section
   * @returns {string} chosen card ID
   */
  pickNext(cardIds, section) {
    const now = Date.now();
    const due = [];
    const fresh = [];

    for (const id of cardIds) {
      const c = this.cards[id];
      if (!c) fresh.push(id);
      else if (c.nextReview <= now) due.push(c);
    }

    if (due.length > 0) {
      due.sort((a, b) => a.nextReview - b.nextReview);
      return due[0].id;
    }

    if (fresh.length > 0 && (this.newShown[section] || 0) < this.maxNewPerSession) {
      this.newShown[section] = (this.newShown[section] || 0) + 1;
      return pick(fresh);
    }

    // Fallback: card with lowest ease factor
    const all = cardIds.map(id => this.getCard(id));
    all.sort((a, b) => a.ef - b.ef);
    return all[0].id;
  }

  /** Count how many cards are due or new */
  countDue(cardIds) {
    const now = Date.now();
    let count = 0;
    for (const id of cardIds) {
      const c = this.cards[id];
      if (!c || c.nextReview <= now) count++;
    }
    return count;
  }

  /** Load cards from a plain object */
  load(data) {
    if (data && typeof data === 'object') this.cards = data;
  }

  /** Reset cards matching a prefix (e.g. 'crop-') */
  resetPrefix(prefix) {
    for (const key of Object.keys(this.cards)) {
      if (key.startsWith(prefix)) delete this.cards[key];
    }
    // Reset new card counter for matching section
    const section = prefix.replace('-', '');
    this.newShown[section] = 0;
  }
}
