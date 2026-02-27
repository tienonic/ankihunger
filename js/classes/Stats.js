/**
 * Stats tracking and display.
 *
 * Tracks total reviews and retention rate (% Good/Easy ratings).
 * Persisted per-project in localStorage.
 */

export class Stats {
  constructor() {
    this.sessionReviews = 0;
    this.sessionGoodEasy = 0;
    this._el = null;
    this._slug = null;
  }

  /** Bind to the stats bar element */
  bind(el) {
    this._el = el;
    this._update();
  }

  /** Load saved stats for a project */
  loadForProject(slug) {
    this._slug = slug;
    try {
      const raw = localStorage.getItem(`proj-${slug}-stats`);
      if (raw) {
        const d = JSON.parse(raw);
        this.sessionReviews = d.r || 0;
        this.sessionGoodEasy = d.g || 0;
      }
    } catch (e) { /* ignore */ }
    this._update();
  }

  /** Save stats to localStorage */
  _save() {
    if (!this._slug) return;
    try {
      localStorage.setItem(`proj-${this._slug}-stats`, JSON.stringify({
        r: this.sessionReviews,
        g: this.sessionGoodEasy,
      }));
    } catch (e) { /* ignore */ }
  }

  /**
   * Record a review.
   * @param {number} rating - 1=Again, 2=Hard, 3=Good, 4=Easy
   */
  record(rating) {
    this.sessionReviews++;
    if (rating >= 3) this.sessionGoodEasy++;
    this._save();
    this._update();
  }

  /** Undo the last recorded review */
  undoRecord(rating) {
    this.sessionReviews = Math.max(0, this.sessionReviews - 1);
    if (rating >= 3) this.sessionGoodEasy = Math.max(0, this.sessionGoodEasy - 1);
    this._save();
    this._update();
  }

  get retention() {
    if (this.sessionReviews === 0) return 0;
    return Math.round((this.sessionGoodEasy / this.sessionReviews) * 100);
  }

  _update() {
    if (!this._el) return;
    this._el.innerHTML =
      `<span class="stat-item">review: <strong>${this.sessionReviews}</strong></span>` +
      `<span class="stat-item">retention: <strong>${this.retention}%</strong></span>`;
  }
}
