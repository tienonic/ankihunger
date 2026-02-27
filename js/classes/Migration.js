/**
 * One-time SM-2 to FSRS localStorage migration.
 *
 * Maps old SM-2 card data to FSRS card format for the default project.
 */

import { State } from './State.js';

export class Migration {
  /**
   * Run migration if needed. Returns true if migration was performed.
   * @param {string} defaultSlug - slug of the default project
   * @param {import('./FSRS.js').FSRSEngine} engine
   */
  static run(defaultSlug, engine) {
    if (State.isMigrationDone()) return false;

    try {
      const oldCards = localStorage.getItem('srs-cards');
      if (!oldCards) {
        State.setMigrationDone();
        return false;
      }

      const sm2Cards = JSON.parse(oldCards);
      const newCards = {};

      for (const [id, card] of Object.entries(sm2Cards)) {
        const fsrsCard = engine.createCard();

        // Map ef -> difficulty (ef 1.3 -> d 10, ef 2.5 -> d 5)
        const ef = card.ef || 2.5;
        fsrsCard.difficulty = Math.max(1, Math.min(10, 10 - ((ef - 1.3) / 1.2) * 5));

        // Map interval -> stability
        fsrsCard.stability = Math.max(0.1, card.interval || 0);

        // Map nextReview -> due
        if (card.nextReview) {
          fsrsCard.due = new Date(card.nextReview);
        }

        // Determine state
        if (!card.reps || card.reps === 0) {
          fsrsCard.state = 0; // New
        } else if ((card.interval || 0) <= 1) {
          fsrsCard.state = 1; // Learning
        } else {
          fsrsCard.state = 2; // Review
        }

        fsrsCard.reps = card.reps || 0;
        fsrsCard.lapses = 0;

        newCards[id] = {
          fsrsCard,
          flags: { suspended: false, buried: false, leech: false },
          lapses: 0,
        };
      }

      // Save migrated cards under the default project
      const cardManagerData = {
        cards: newCards,
        newToday: 0,
        reviewsToday: 0,
        lastDate: new Date().toISOString().slice(0, 10),
      };
      localStorage.setItem(`proj-${defaultSlug}-cards`, JSON.stringify(cardManagerData));

      // Migrate scores
      const oldScores = localStorage.getItem('srs-scores');
      if (oldScores) {
        localStorage.setItem(`proj-${defaultSlug}-scores`, oldScores);
      }

      // Migrate user glossary
      const oldGlossary = localStorage.getItem('user-glossary');
      if (oldGlossary) {
        localStorage.setItem(`proj-${defaultSlug}-glossary`, oldGlossary);
      }

      State.setMigrationDone();
      return true;
    } catch (e) {
      console.error('Migration failed:', e);
      State.setMigrationDone();
      return false;
    }
  }
}
