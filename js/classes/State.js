/**
 * Per-project persistence layer.
 *
 * Stored keys (per project slug):
 *   proj-<slug>-cards      — CardManager serialized data
 *   proj-<slug>-scores     — per-section {correct, attempted}
 *   proj-<slug>-glossary   — user-added terms
 *
 * Global keys:
 *   recent-projects        — [{name, slug, timestamp}]
 *   last-project           — slug of last opened project
 *   proj-data-<slug>       — project JSON (custom projects only)
 *   migration-done         — SM-2 migration flag
 */

export class State {
  /**
   * @param {string} slug - project slug for namespacing
   */
  constructor(slug) {
    this.slug = slug;
    /** @type {Object<string, {correct: number, attempted: number}>} */
    this.scores = {};
    /** @type {Array<{term: string, def: string}>} */
    this.userTerms = [];
  }

  /** Initialize score tracking for sections */
  initScores(sectionIds) {
    for (const id of sectionIds) {
      if (!this.scores[id]) {
        this.scores[id] = { correct: 0, attempted: 0 };
      }
    }
  }

  /** Save all state to localStorage */
  save(cardManager) {
    try {
      if (cardManager) {
        localStorage.setItem(`proj-${this.slug}-cards`, JSON.stringify(cardManager.toJSON()));
      }
      const s = {};
      for (const [k, v] of Object.entries(this.scores)) {
        s[k] = { c: v.correct, a: v.attempted };
      }
      localStorage.setItem(`proj-${this.slug}-scores`, JSON.stringify(s));
      localStorage.setItem(`proj-${this.slug}-glossary`, JSON.stringify(this.userTerms));
    } catch (e) { /* localStorage may be full or blocked */ }
  }

  /** Load state from localStorage. Returns raw card data for CardManager.fromJSON(). */
  load() {
    let cardData = null;
    try {
      const raw = localStorage.getItem(`proj-${this.slug}-cards`);
      if (raw) cardData = JSON.parse(raw);
    } catch (e) { /* ignore */ }

    try {
      const raw = localStorage.getItem(`proj-${this.slug}-scores`);
      if (raw) {
        const d = JSON.parse(raw);
        for (const k of Object.keys(d)) {
          if (!this.scores[k]) this.scores[k] = { correct: 0, attempted: 0 };
          this.scores[k].correct = d[k].c || 0;
          this.scores[k].attempted = d[k].a || 0;
        }
      }
    } catch (e) { /* ignore */ }

    try {
      const ut = localStorage.getItem(`proj-${this.slug}-glossary`);
      if (ut) this.userTerms = JSON.parse(ut);
    } catch (e) { /* ignore */ }

    return cardData;
  }

  /** Reset scores for a section */
  resetSection(sectionId) {
    if (this.scores[sectionId]) {
      this.scores[sectionId].correct = 0;
      this.scores[sectionId].attempted = 0;
    }
  }

  /** Save activity entries to localStorage (capped at 200) */
  saveActivity(entries) {
    try {
      const capped = entries.slice(-200);
      localStorage.setItem(`proj-${this.slug}-activity`, JSON.stringify(capped));
    } catch (e) { /* */ }
  }

  /** Load activity entries from localStorage */
  loadActivity() {
    try {
      const raw = localStorage.getItem(`proj-${this.slug}-activity`);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  /** Archive current activity with timestamp, then clear */
  archiveAndClearActivity() {
    try {
      const raw = localStorage.getItem(`proj-${this.slug}-activity`);
      if (raw) {
        const key = `proj-${this.slug}-activity-archive`;
        let archives = [];
        const existing = localStorage.getItem(key);
        if (existing) archives = JSON.parse(existing);
        archives.push({ timestamp: Date.now(), entries: JSON.parse(raw) });
        if (archives.length > 20) archives = archives.slice(-20);
        localStorage.setItem(key, JSON.stringify(archives));
      }
      localStorage.removeItem(`proj-${this.slug}-activity`);
    } catch (e) { /* */ }
  }

  // === Global helpers (static) ===

  static setLastProject(slug) {
    try { localStorage.setItem('last-project', slug); } catch (e) { /* */ }
  }

  static getLastProject() {
    try { return localStorage.getItem('last-project'); } catch (e) { return null; }
  }

  static clearLastProject() {
    try { localStorage.removeItem('last-project'); } catch (e) { /* */ }
  }

  static saveProjectData(slug, data) {
    try { localStorage.setItem(`proj-data-${slug}`, JSON.stringify(data)); } catch (e) { /* */ }
  }

  static getProjectData(slug) {
    try {
      const raw = localStorage.getItem(`proj-data-${slug}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  static addRecentProject(name, slug) {
    try {
      let list = [];
      const raw = localStorage.getItem('recent-projects');
      if (raw) list = JSON.parse(raw);
      list = list.filter(p => p.slug !== slug);
      list.unshift({ name, slug, timestamp: Date.now() });
      if (list.length > 10) list = list.slice(0, 10);
      localStorage.setItem('recent-projects', JSON.stringify(list));
    } catch (e) { /* */ }
  }

  static getRecentProjects() {
    try {
      const raw = localStorage.getItem('recent-projects');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  static isMigrationDone() {
    return localStorage.getItem('migration-done') === '1';
  }

  static setMigrationDone() {
    localStorage.setItem('migration-done', '1');
  }
}
