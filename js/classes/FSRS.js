/**
 * FSRS wrapper around ts-fsrs CDN.
 *
 * Provides a stateless scheduler — call preview() or rate() with a card
 * and get back the updated card + review log.
 */

import {
  createEmptyCard,
  fsrs,
  Rating,
  State,
  generatorParameters,
} from 'https://cdn.jsdelivr.net/npm/ts-fsrs@5.2.3/dist/index.mjs';

export { Rating, State };

export class FSRSEngine {
  /**
   * @param {object} [config]
   * @param {number} [config.desired_retention=0.9]
   * @param {boolean} [config.enable_short_term=true]
   */
  constructor(config = {}) {
    const params = generatorParameters({
      request_retention: config.desired_retention ?? 0.9,
      enable_short_term: config.enable_short_term ?? true,
    });
    this._f = fsrs(params);
    this.leechThreshold = config.leech_threshold ?? 8;
  }

  /** Create a fresh FSRS card */
  createCard() {
    return createEmptyCard();
  }

  /**
   * Preview all four rating outcomes without mutating the card.
   * @param {object} card - FSRS card
   * @param {Date} [now]
   * @returns {{ [rating: number]: { card: object, log: object } }}
   */
  preview(card, now = new Date()) {
    return this._f.repeat(card, now);
  }

  /**
   * Rate a card and return the result for that specific rating.
   * @param {object} card - FSRS card
   * @param {number} rating - Rating.Again(1), Hard(2), Good(3), Easy(4)
   * @param {Date} [now]
   * @returns {{ card: object, log: object }}
   */
  rate(card, rating, now = new Date()) {
    const result = this._f.repeat(card, now);
    return result[rating];
  }

  /**
   * Format a card's scheduled interval as human-readable text.
   * @param {number} days
   * @returns {string}
   */
  formatInterval(days) {
    if (days < 1 / 24) {
      const mins = Math.max(1, Math.round(days * 24 * 60));
      return mins + 'm';
    }
    if (days < 1) {
      const hrs = Math.round(days * 24);
      return hrs + 'h';
    }
    if (days < 30) return Math.round(days) + 'd';
    if (days < 365) return Math.round(days / 30) + 'mo';
    return (days / 365).toFixed(1).replace(/\.0$/, '') + 'y';
  }

  /**
   * Compute the interval in days between now and the card's due date.
   * @param {object} card
   * @param {Date} [now]
   * @returns {number}
   */
  intervalDays(card, now = new Date()) {
    const due = new Date(card.due);
    return Math.max(0, (due - now) / 86400000);
  }

  /**
   * Check if a card is a leech (Anki formula).
   * @param {number} lapses
   * @returns {boolean}
   */
  isLeech(lapses) {
    const t = this.leechThreshold;
    if (lapses < t) return false;
    return (lapses - t) % Math.ceil(t / 2) === 0;
  }
}
