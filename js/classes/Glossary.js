/**
 * Term Definer & Invisible Weighting system.
 *
 * Decoupled from hardcoded imports — accepts glossary data from project.
 */

export class Glossary {
  /**
   * @param {import('./State.js').State} state
   */
  constructor(state) {
    this.state = state;
    /** @type {Array<{term: string, def: string, source: string, hasImage?: boolean}>} */
    this.entries = [];
    /** @type {Array<{term: string, ts: number}>} */
    this.lookupLog = [];
    this.LOOKUP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Build the full glossary from project glossary data + user terms.
   * @param {Array<{term: string, def: string, hasImage?: boolean}>} projectGlossary
   */
  build(projectGlossary = []) {
    this.entries = [];

    for (const t of projectGlossary) {
      this.entries.push({
        term: t.term,
        def: t.def,
        source: 'project',
        hasImage: t.hasImage || t.isCrop || false,
      });
    }

    for (const t of this.state.userTerms) {
      this.entries.push({ term: t.term, def: t.def, source: 'user' });
    }

    this.entries.sort((a, b) => a.term.localeCompare(b.term));
  }

  /** Add a user-defined term */
  addUserTerm(term, def) {
    if (!term || !def) return;
    this.state.userTerms.push({ term, def });
    this._rebuildWithUserTerms();
    this.state.save();
  }

  /** Remove a user-defined term by name */
  removeUserTerm(termName) {
    this.state.userTerms = this.state.userTerms.filter(t => t.term !== termName);
    this._rebuildWithUserTerms();
    this.state.save();
  }

  /** Record a term lookup (for invisible weighting) */
  logLookup(term) {
    this.lookupLog.push({ term: term.toLowerCase(), ts: Date.now() });
    this._pruneLog();
  }

  /**
   * Check if a question was "assisted" by recent lookups.
   * @param {string} questionText
   * @returns {boolean}
   */
  checkAssisted(questionText) {
    this._pruneLog();
    if (this.lookupLog.length === 0) return false;
    const qt = questionText.toLowerCase();
    return this.lookupLog.some(l => {
      const words = l.term.split(/\s+/).filter(w => w.length >= 4);
      return words.some(w => qt.includes(w));
    });
  }

  /** Filter entries matching a query */
  filter(query) {
    if (!query.trim()) return this.entries;
    const q = query.toLowerCase();
    return this.entries.filter(t =>
      t.term.toLowerCase().includes(q) || t.def.toLowerCase().includes(q)
    );
  }

  /**
   * Sort entries so terms relevant to the given question text appear first.
   * @param {string} questionContext — question + answer text to match against
   * @returns {Array} sorted copy of entries
   */
  sortByRelevance(questionContext) {
    if (!questionContext) return this.entries;
    const ctx = questionContext.toLowerCase();
    const scored = this.entries.map(t => {
      const term = t.term.toLowerCase();
      const words = term.split(/\s+/).filter(w => w.length >= 3);
      let score = 0;
      if (ctx.includes(term)) score += 10;
      for (const w of words) {
        if (ctx.includes(w)) score += 3;
      }
      return { entry: t, score };
    });
    scored.sort((a, b) => b.score - a.score || a.entry.term.localeCompare(b.entry.term));
    return scored.map(s => s.entry);
  }

  /**
   * Set the current question context for relevance sorting.
   * Call this whenever a new question is shown.
   * @param {string} text — question + answer text
   */
  setQuestionContext(text) {
    this._questionContext = text || '';
  }

  _getContextTerms() {
    if (this._questionContext) {
      return this.sortByRelevance(this._questionContext);
    }
    return this.entries;
  }

  _pruneLog() {
    const cutoff = Date.now() - this.LOOKUP_WINDOW_MS;
    this.lookupLog = this.lookupLog.filter(l => l.ts > cutoff);
  }

  _rebuildWithUserTerms() {
    // Keep non-user entries, add fresh user entries
    this.entries = this.entries.filter(e => e.source !== 'user');
    for (const t of this.state.userTerms) {
      this.entries.push({ term: t.term, def: t.def, source: 'user' });
    }
    this.entries.sort((a, b) => a.term.localeCompare(b.term));
  }

  // === UI Methods ===

  /**
   * Render context-relevant terms as horizontal clickable tags.
   * Each tag links to a Google search definition.
   * @param {HTMLElement} container - #activity-terms element
   */
  renderContextTags(container) {
    if (!container) return;
    container.innerHTML = '';

    const relevant = this._getContextTerms().filter(t => {
      if (!this._questionContext) return false;
      const ctx = this._questionContext.toLowerCase();
      const term = t.term.toLowerCase();
      const words = term.split(/\s+/).filter(w => w.length >= 3);
      return ctx.includes(term) || words.some(w => ctx.includes(w));
    }).slice(0, 6);

    if (relevant.length === 0) return;

    for (const t of relevant) {
      const a = document.createElement('a');
      a.className = 'term-tag';
      a.textContent = t.term;
      a.href = 'https://www.google.com/search?q=' + encodeURIComponent(t.term + ' definition');
      a.target = '_blank';
      a.rel = 'noopener';
      a.addEventListener('click', () => this.logLookup(t.term));
      container.appendChild(a);
    }
  }

  /** Initialize (no panel needed anymore) */
  initPanel() {}
}
