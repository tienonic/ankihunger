/**
 * Term Definer & Invisible Weighting system.
 *
 * Manages the glossary (auto-extracted + curated + user terms),
 * the term panel UI, search/filter, and the invisible lookup penalty.
 *
 * When a user looks up a term, questions containing that term get a
 * reduced ease factor in the SRS — they'll appear more often for review
 * without the user knowing they were penalized.
 */

import { crops } from '../data/crops.js';
import { conservationSpecies } from '../data/conservation.js';
import { curatedTerms } from '../data/terms.js';

export class Glossary {
  /**
   * @param {import('./State.js').State} state
   */
  constructor(state) {
    this.state = state;
    /** @type {Array<{term: string, def: string, source: string, isCrop?: boolean}>} */
    this.entries = [];
    /** @type {Array<{term: string, ts: number}>} */
    this.lookupLog = [];
    this.LOOKUP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
  }

  /** Build the full glossary from all sources */
  build() {
    this.entries = [];
    const catDefs = {
      'Tree nut':              'Nut growing on a tree in a hard shell (almond, walnut, pistachio).',
      'Stone fruit':           'Drupe with fleshy fruit and a hard pit/stone (peach, plum, cherry).',
      'Pome fruit':            'Fruit with fleshy outer part and seeded core (apple, pear).',
      'Citrus':                'Evergreen tree producing acidic juicy fruit with leathery rind.',
      'Vine crop':             'Crop growing on woody/herbaceous vines, often trellised (grape).',
      'Vegetable (fruit crop)':'Botanically fruit, culinarily vegetable. Herbaceous annual (tomato).',
      'Small fruit':           'Low-growing fruit crop, often herbaceous (strawberry).',
    };
    const seenCats = {};

    // Auto-extract from crops
    for (const c of crops) {
      this.entries.push({ term: c.name, def: c.category + '. ' + c.distinguish, source: 'auto', isCrop: true });
      if (!seenCats[c.category] && catDefs[c.category]) {
        this.entries.push({ term: c.category, def: catDefs[c.category], source: 'auto' });
        seenCats[c.category] = true;
      }
    }

    // Auto-extract from conservation species
    for (const sp of conservationSpecies) {
      this.entries.push({ term: sp.name, def: sp.status + '. ' + sp.id_features, source: 'auto', isCrop: true });
    }

    // Curated terms
    for (const t of curatedTerms) {
      this.entries.push({ term: t.term, def: t.def, source: 'curated' });
    }

    // User terms
    for (const t of this.state.userTerms) {
      this.entries.push({ term: t.term, def: t.def, source: 'user' });
    }

    this.entries.sort((a, b) => a.term.localeCompare(b.term));
  }

  /** Add a user-defined term */
  addUserTerm(term, def) {
    if (!term || !def) return;
    this.state.userTerms.push({ term, def });
    this.build();
    this.state.save();
  }

  /** Remove a user-defined term by name */
  removeUserTerm(termName) {
    this.state.userTerms = this.state.userTerms.filter(t => t.term !== termName);
    this.build();
    this.state.save();
  }

  /** Record a term lookup (for invisible weighting) */
  logLookup(term) {
    this.lookupLog.push({ term: term.toLowerCase(), ts: Date.now() });
    this._pruneLog();
  }

  /**
   * Check if a question was "assisted" by recent lookups.
   * @param {string} questionText — question + answer text to match against
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

  _pruneLog() {
    const cutoff = Date.now() - this.LOOKUP_WINDOW_MS;
    this.lookupLog = this.lookupLog.filter(l => l.ts > cutoff);
  }

  // === UI Methods ===

  /** Render a list of terms into the #term-list element */
  renderList(terms) {
    const container = document.getElementById('term-list');
    if (!container) return;
    container.innerHTML = '';

    for (const t of terms.slice(0, 50)) {
      const div = document.createElement('div');
      div.className = 'term-item';
      let html = '<span class="term-actions">';
      if (t.isCrop) {
        const url = 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(t.term + ' plant identification');
        html += `<a class="term-img-link" href="${url}" target="_blank" rel="noopener">View</a>`;
      }
      if (t.source === 'user') {
        html += `<button class="term-remove" data-term="${t.term.replace(/"/g, '&quot;')}">&times;</button>`;
      }
      html += `</span><strong>${t.term}</strong><div class="term-def">${t.def}</div>`;
      div.innerHTML = html;
      div.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
          this.logLookup(t.term);
        }
      });
      container.appendChild(div);
    }

    // Delegated click for remove buttons
    container.querySelectorAll('.term-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeUserTerm(btn.dataset.term);
        this.renderList(this.entries);
      });
    });
  }

  /** Initialize the panel UI event listeners */
  initPanel() {
    const toggleBtn = document.getElementById('term-toggle-btn');
    const panel = document.getElementById('term-panel');
    const searchInput = document.getElementById('term-search');
    const addBtn = document.getElementById('add-term-btn');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('open');
        toggleBtn.innerHTML = panel.classList.contains('open')
          ? 'Term Definer &#9660;' : 'Term Definer &#9650;';
        if (panel.classList.contains('open')) this.renderList(this.entries);
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value;
        this.renderList(this.filter(q));
        if (q.length >= 3) this.logLookup(q);
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const ti = document.getElementById('new-term');
        const di = document.getElementById('new-def');
        this.addUserTerm(ti.value.trim(), di.value.trim());
        ti.value = '';
        di.value = '';
        this.renderList(this.entries);
      });
    }
  }
}
