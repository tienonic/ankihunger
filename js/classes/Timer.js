/**
 * Per-question timer.
 *
 * Counts up from 0. Turns red at 15 seconds. Shows skull at 59 seconds.
 * Accepts element directly instead of building ID from section name.
 */

export class Timer {
  constructor() {
    this._interval = null;
    this._seconds = 0;
    this._el = null;
  }

  /**
   * Start (or restart) the timer.
   * @param {string|HTMLElement} target - element ID string or element directly
   */
  start(target) {
    this.stop();
    this._seconds = 0;
    const el = typeof target === 'string'
      ? document.getElementById(target + '-timer')
      : target;
    this._el = el;
    if (!el) return;
    el.textContent = '0s';
    el.classList.remove('red');
    el.classList.remove('skull');

    this._interval = setInterval(() => {
      this._seconds++;
      if (this._seconds >= 59) {
        el.textContent = '\u{1F480}';
        el.classList.add('skull');
        this.stop();
        return;
      }
      el.textContent = this._seconds + 's';
      if (this._seconds >= 15) el.classList.add('red');
    }, 1000);
  }

  /** Stop the timer and return elapsed seconds */
  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    return this._seconds;
  }

  /** Get current elapsed seconds */
  get seconds() { return this._seconds; }
}
