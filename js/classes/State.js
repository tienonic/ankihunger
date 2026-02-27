/**
 * Per-project persistence layer.
 *
 * Primary storage: File System Access API
 *   projects/<folder>/state.json — all project state (cards, scores, glossary, notes, activity)
 *   projects/app-state.json      — global state (recent projects, last project)
 *
 * Fallback: localStorage (same keys as before for backwards compat)
 */

export class State {
  /**
   * @param {string} slug - project slug for namespacing
   * @param {string} [folder] - folder name under projects/ (defaults to slug)
   */
  constructor(slug, folder) {
    this.slug = slug;
    this.folder = folder || slug;
    /** @type {Object<string, {correct: number, attempted: number}>} */
    this.scores = {};
    /** @type {Array<{term: string, def: string}>} */
    this.userTerms = [];
    /** @type {Array<{text: string, time: string}>} */
    this.notes = [];
    /** @type {Array} */
    this.activity = [];
    /** @type {object|null} */
    this._cardData = null;
  }

  /** Initialize score tracking for sections */
  initScores(sectionIds) {
    for (const id of sectionIds) {
      if (!this.scores[id]) {
        this.scores[id] = { correct: 0, attempted: 0 };
      }
    }
  }

  /** Save all state — writes to filesystem (async) and localStorage (sync fallback) */
  save(cardManager) {
    const cardJSON = cardManager ? cardManager.toJSON() : this._cardData;
    this._cardData = cardJSON;

    // localStorage fallback (sync, always available)
    try {
      if (cardJSON) localStorage.setItem(`proj-${this.slug}-cards`, JSON.stringify(cardJSON));
      const s = {};
      for (const [k, v] of Object.entries(this.scores)) {
        s[k] = { c: v.correct, a: v.attempted };
      }
      localStorage.setItem(`proj-${this.slug}-scores`, JSON.stringify(s));
      localStorage.setItem(`proj-${this.slug}-glossary`, JSON.stringify(this.userTerms));
      localStorage.setItem(`proj-${this.slug}-notes`, JSON.stringify(this.notes));
      localStorage.setItem(`proj-${this.slug}-activity`, JSON.stringify(this.activity.slice(-200)));
    } catch (e) { /* */ }

    // Filesystem (async, fire-and-forget)
    this._saveToFile(cardJSON);
  }

  /** Load state. Tries filesystem first, falls back to localStorage. Returns card data. */
  load() {
    // localStorage (sync)
    this._loadFromLocalStorage();
    return this._cardData;
  }

  /** Async load from filesystem — call after constructor, before using data */
  async loadFromFile() {
    const data = await this._readFile();
    if (!data) return null;

    if (data.cards) this._cardData = data.cards;
    if (data.scores) {
      for (const k of Object.keys(data.scores)) {
        if (!this.scores[k]) this.scores[k] = { correct: 0, attempted: 0 };
        this.scores[k].correct = data.scores[k].c || 0;
        this.scores[k].attempted = data.scores[k].a || 0;
      }
    }
    if (data.glossary) this.userTerms = data.glossary;
    if (data.notes) this.notes = data.notes;
    if (data.activity) this.activity = data.activity;

    return this._cardData;
  }

  _loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(`proj-${this.slug}-cards`);
      if (raw) this._cardData = JSON.parse(raw);
    } catch (e) { /* */ }

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
    } catch (e) { /* */ }

    try {
      const ut = localStorage.getItem(`proj-${this.slug}-glossary`);
      if (ut) this.userTerms = JSON.parse(ut);
    } catch (e) { /* */ }

    try {
      const raw = localStorage.getItem(`proj-${this.slug}-notes`);
      if (raw) this.notes = JSON.parse(raw);
    } catch (e) { /* */ }

    try {
      const raw = localStorage.getItem(`proj-${this.slug}-activity`);
      if (raw) this.activity = JSON.parse(raw);
    } catch (e) { /* */ }
  }

  /** Reset scores for a section */
  resetSection(sectionId) {
    if (this.scores[sectionId]) {
      this.scores[sectionId].correct = 0;
      this.scores[sectionId].attempted = 0;
    }
  }

  /** Save activity entries (capped at 200) */
  saveActivity(entries) {
    this.activity = entries.slice(-200);
    try {
      localStorage.setItem(`proj-${this.slug}-activity`, JSON.stringify(this.activity));
    } catch (e) { /* */ }
    this._saveToFile(this._cardData);
  }

  /** Load activity entries */
  loadActivity() {
    if (this.activity.length) return this.activity;
    try {
      const raw = localStorage.getItem(`proj-${this.slug}-activity`);
      if (raw) this.activity = JSON.parse(raw);
    } catch (e) { /* */ }
    return this.activity;
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
      this.activity = [];
    } catch (e) { /* */ }
  }

  /** Append a timestamped note */
  saveNote(text) {
    this.notes.push({ text, time: new Date().toISOString() });
    try {
      localStorage.setItem(`proj-${this.slug}-notes`, JSON.stringify(this.notes));
    } catch (e) { /* */ }
    this._saveToFile(this._cardData);
  }

  /** Load all notes */
  loadNotes() {
    return this.notes;
  }

  // === File System Access API ===

  /** @type {FileSystemDirectoryHandle|null} */
  static _rootHandle = null;

  /** Prompt user to select the projects/ directory */
  static async requestAccess() {
    try {
      State._rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      // Persist handle in IndexedDB
      const db = await State._openIDB();
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(State._rootHandle, 'projects-dir');
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
      db.close();
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Try to restore a previously granted directory handle */
  static async restoreAccess() {
    try {
      const db = await State._openIDB();
      const tx = db.transaction('handles', 'readonly');
      const store = tx.objectStore('handles');
      const handle = await new Promise((res, rej) => {
        const req = store.get('projects-dir');
        req.onsuccess = () => res(req.result);
        req.onerror = rej;
      });
      db.close();
      if (!handle) return false;
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        State._rootHandle = handle;
        return true;
      }
      const req = await handle.requestPermission({ mode: 'readwrite' });
      if (req === 'granted') {
        State._rootHandle = handle;
        return true;
      }
    } catch (e) { /* */ }
    return false;
  }

  static hasAccess() {
    return !!State._rootHandle;
  }

  static async _openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('study-tool-fs', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('handles');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** Write state.json to the project's folder */
  async _saveToFile(cardJSON) {
    if (!State._rootHandle) return;
    try {
      const projDir = await State._rootHandle.getDirectoryHandle(this.folder, { create: true });
      const fileHandle = await projDir.getFileHandle('state.json', { create: true });
      const writable = await fileHandle.createWritable();
      const scores = {};
      for (const [k, v] of Object.entries(this.scores)) {
        scores[k] = { c: v.correct, a: v.attempted };
      }
      const data = {
        slug: this.slug,
        savedAt: new Date().toISOString(),
        cards: cardJSON || null,
        scores,
        glossary: this.userTerms,
        notes: this.notes,
        activity: this.activity.slice(-200),
      };
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
    } catch (e) { /* filesystem write failed, localStorage still has the data */ }
  }

  /** Read state.json from the project's folder */
  async _readFile() {
    if (!State._rootHandle) return null;
    try {
      const projDir = await State._rootHandle.getDirectoryHandle(this.folder);
      const fileHandle = await projDir.getFileHandle('state.json');
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch (e) {
      return null; // file doesn't exist yet
    }
  }

  // === Global state (filesystem + localStorage) ===

  static async _saveGlobal(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    if (!State._rootHandle) return;
    try {
      const fileHandle = await State._rootHandle.getFileHandle('app-state.json', { create: true });
      const file = await fileHandle.getFile();
      let data = {};
      try { data = JSON.parse(await file.text()); } catch (e) { /* */ }
      data[key] = value;
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
    } catch (e) { /* */ }
  }

  static async _loadGlobal(key) {
    if (State._rootHandle) {
      try {
        const fileHandle = await State._rootHandle.getFileHandle('app-state.json');
        const file = await fileHandle.getFile();
        const data = JSON.parse(await file.text());
        if (data[key] !== undefined) return data[key];
      } catch (e) { /* */ }
    }
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  static setLastProject(slug) {
    try { localStorage.setItem('last-project', slug); } catch (e) { /* */ }
    State._saveGlobal('last-project', slug);
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
      State._saveGlobal('recent-projects', list);
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
