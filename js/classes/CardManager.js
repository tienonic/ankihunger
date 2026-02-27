/**
 * Card state management layer.
 *
 * Stores FSRS cards with suspend/bury/leech flags, provides pickNext
 * priority queue, single-level undo, and serialization for localStorage.
 */

import { FSRSEngine, Rating, State } from './FSRS.js';

export class CardManager {
  /**
   * @param {FSRSEngine} engine
   * @param {object} [opts]
   * @param {number} [opts.newPerSession=20]
   */
  constructor(engine, opts = {}) {
    this.engine = engine;
    this.newPerSession = opts.newPerSession ?? 20;

    /** @type {Object<string, { fsrsCard: object, flags: { suspended: boolean, buried: boolean, leech: boolean }, lapses: number }>} */
    this.cards = {};

    /** @type {{ cardId: string, previousCard: object, previousFlags: object, previousLapses: number }|null} */
    this.undoEntry = null;

    this._newToday = 0;
    this._reviewsToday = 0;
    this._lastDate = this._todayStr();
  }

  /** Get or create a card entry */
  getOrCreate(id) {
    if (!this.cards[id]) {
      this.cards[id] = {
        fsrsCard: this.engine.createCard(),
        flags: { suspended: false, buried: false, leech: false },
        lapses: 0,
      };
    }
    return this.cards[id];
  }

  /**
   * Get interval preview labels for all 4 ratings.
   * @param {string} id
   * @returns {{ [rating: number]: string }}
   */
  getPreview(id) {
    const entry = this.getOrCreate(id);
    const result = this.engine.preview(entry.fsrsCard);
    const labels = {};
    for (const r of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
      const days = this.engine.intervalDays(result[r].card);
      labels[r] = this.engine.formatInterval(days);
    }
    return labels;
  }

  /**
   * Review a card with a given rating.
   * Pushes undo, applies FSRS, checks leech.
   * @param {string} id
   * @param {number} rating
   * @returns {{ card: object, isLeech: boolean }}
   */
  review(id, rating) {
    this._checkNewDay();
    const entry = this.getOrCreate(id);

    // Push undo
    this.undoEntry = {
      cardId: id,
      previousCard: structuredClone(entry.fsrsCard),
      previousFlags: { ...entry.flags },
      previousLapses: entry.lapses,
    };

    // Apply FSRS
    const result = this.engine.rate(entry.fsrsCard, rating);
    entry.fsrsCard = result.card;

    // Track lapses (Again on a Review/Relearning card)
    if (rating === Rating.Again && (result.log.state === State.Review || result.log.state === State.Relearning)) {
      entry.lapses++;
    }

    // Check leech
    let isLeech = false;
    if (this.engine.isLeech(entry.lapses)) {
      entry.flags.leech = true;
      isLeech = true;
    }

    this._reviewsToday++;
    return { card: entry.fsrsCard, isLeech };
  }

  /**
   * Undo the last review. Returns the cardId to re-show, or null.
   * @returns {string|null}
   */
  undo() {
    if (!this.undoEntry) return null;
    const { cardId, previousCard, previousFlags, previousLapses } = this.undoEntry;
    const entry = this.cards[cardId];
    if (entry) {
      entry.fsrsCard = previousCard;
      entry.flags = previousFlags;
      entry.lapses = previousLapses;
    }
    this.undoEntry = null;
    this._reviewsToday = Math.max(0, this._reviewsToday - 1);
    return cardId;
  }

  suspend(id) {
    const entry = this.getOrCreate(id);
    entry.flags.suspended = true;
  }

  unsuspend(id) {
    const entry = this.getOrCreate(id);
    entry.flags.suspended = false;
  }

  bury(id) {
    const entry = this.getOrCreate(id);
    entry.flags.buried = true;
  }

  /**
   * Pick the next card to show from a list of IDs.
   * Priority: Learning/Relearning due > Review due > New (capped) > weakest
   * @param {string[]} cardIds
   * @returns {string|null}
   */
  pickNext(cardIds) {
    this._checkNewDay();
    const now = new Date();
    const learning = [];
    const reviewDue = [];
    const fresh = [];

    for (const id of cardIds) {
      const entry = this.cards[id];
      if (!entry) {
        fresh.push(id);
        continue;
      }
      if (entry.flags.suspended || entry.flags.buried) continue;

      const card = entry.fsrsCard;
      const due = new Date(card.due);

      if (card.state === State.Learning || card.state === State.Relearning) {
        if (due <= now) learning.push({ id, due });
      } else if (card.state === State.Review) {
        if (due <= now) reviewDue.push({ id, due });
      }
      // State.New cards that exist in this.cards but haven't been reviewed yet
      // are treated as fresh
      if (card.state === State.New) fresh.push(id);
    }

    // 1. Learning/Relearning due (oldest first)
    if (learning.length > 0) {
      learning.sort((a, b) => a.due - b.due);
      return learning[0].id;
    }

    // 2. Review due (oldest first)
    if (reviewDue.length > 0) {
      reviewDue.sort((a, b) => a.due - b.due);
      return reviewDue[0].id;
    }

    // 3. New cards (capped)
    if (fresh.length > 0 && this._newToday < this.newPerSession) {
      this._newToday++;
      return fresh[Math.floor(Math.random() * fresh.length)];
    }

    // 4. Weakest card (lowest stability)
    const available = cardIds.filter(id => {
      const e = this.cards[id];
      return !e || (!e.flags.suspended && !e.flags.buried);
    });
    if (available.length === 0) return null;

    let weakest = available[0];
    let lowestStability = Infinity;
    for (const id of available) {
      const e = this.cards[id];
      if (!e) return id; // new card
      const s = e.fsrsCard.stability ?? Infinity;
      if (s < lowestStability) {
        lowestStability = s;
        weakest = id;
      }
    }
    return weakest;
  }

  /**
   * Count cards available (due + new) from a list.
   * @param {string[]} cardIds
   * @returns {{ due: number, newCount: number, total: number }}
   */
  countDue(cardIds) {
    const now = new Date();
    let due = 0;
    let newCount = 0;
    for (const id of cardIds) {
      const entry = this.cards[id];
      if (!entry) { newCount++; continue; }
      if (entry.flags.suspended || entry.flags.buried) continue;
      const d = new Date(entry.fsrsCard.due);
      if (d <= now) due++;
    }
    return { due, newCount, total: due + newCount };
  }

  /** Get the FSRS State for a card (New/Learning/Review/Relearning) */
  getState(id) {
    const entry = this.cards[id];
    if (!entry) return State.New;
    return entry.fsrsCard.state;
  }

  get reviewsToday() { return this._reviewsToday; }

  /** Serialize for localStorage */
  toJSON() {
    return {
      cards: this.cards,
      newToday: this._newToday,
      reviewsToday: this._reviewsToday,
      lastDate: this._lastDate,
    };
  }

  /** Deserialize from localStorage */
  fromJSON(data) {
    if (!data) return;
    if (data.cards) {
      this.cards = {};
      for (const [id, entry] of Object.entries(data.cards)) {
        this.cards[id] = {
          fsrsCard: entry.fsrsCard,
          flags: entry.flags || { suspended: false, buried: false, leech: false },
          lapses: entry.lapses || 0,
        };
        // Restore Date objects
        if (typeof this.cards[id].fsrsCard.due === 'string') {
          this.cards[id].fsrsCard.due = new Date(this.cards[id].fsrsCard.due);
        }
        if (typeof this.cards[id].fsrsCard.last_review === 'string') {
          this.cards[id].fsrsCard.last_review = new Date(this.cards[id].fsrsCard.last_review);
        }
      }
    }
    this._newToday = data.newToday || 0;
    this._reviewsToday = data.reviewsToday || 0;
    this._lastDate = data.lastDate || this._todayStr();
    this._checkNewDay();
  }

  /** Reset cards matching a prefix */
  resetPrefix(prefix) {
    for (const key of Object.keys(this.cards)) {
      if (key.startsWith(prefix)) delete this.cards[key];
    }
  }

  _todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  _checkNewDay() {
    const today = this._todayStr();
    if (this._lastDate !== today) {
      this._lastDate = today;
      this._newToday = 0;
      this._reviewsToday = 0;
      // Unbury all cards on new day
      for (const entry of Object.values(this.cards)) {
        entry.flags.buried = false;
      }
    }
  }
}
