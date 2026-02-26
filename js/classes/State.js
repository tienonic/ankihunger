/**
 * Persistence layer — saves/loads all app state to localStorage.
 *
 * Stored keys:
 *   srs-cards      — SM-2 card records
 *   srs-scores     — per-section correct/attempted counts
 *   user-glossary  — user-added glossary terms
 */

export class State {
  constructor(srs, scores) {
    /** @type {import('./SRS.js').SRS} */
    this.srs = srs;
    /** @type {Object<string, {correct: number, attempted: number}>} */
    this.scores = scores;
    /** @type {Array<{term: string, def: string}>} */
    this.userTerms = [];
  }

  save() {
    try {
      localStorage.setItem('srs-cards', JSON.stringify(this.srs.cards));
      const s = {};
      for (const [k, v] of Object.entries(this.scores)) {
        s[k] = { c: v.correct, a: v.attempted };
      }
      localStorage.setItem('srs-scores', JSON.stringify(s));
      localStorage.setItem('user-glossary', JSON.stringify(this.userTerms));
    } catch (e) { /* localStorage may be full or blocked */ }
  }

  load() {
    try {
      const cards = localStorage.getItem('srs-cards');
      if (cards) this.srs.load(JSON.parse(cards));
    } catch (e) { /* ignore */ }

    try {
      const raw = localStorage.getItem('srs-scores');
      if (raw) {
        const d = JSON.parse(raw);
        for (const k of Object.keys(this.scores)) {
          if (d[k]) {
            this.scores[k].correct = d[k].c || 0;
            this.scores[k].attempted = d[k].a || 0;
          }
        }
      }
    } catch (e) { /* ignore */ }

    try {
      const ut = localStorage.getItem('user-glossary');
      if (ut) this.userTerms = JSON.parse(ut);
    } catch (e) { /* ignore */ }
  }
}
