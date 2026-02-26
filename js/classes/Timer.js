/**
 * Per-question timer.
 *
 * Counts up from 0. Turns red at 15 seconds. Stops at 59 seconds.
 * Purely visual — does not affect scoring.
 */

import { domPrefix } from './Utils.js';

export class Timer {
  constructor() {
    this._interval = null;
    this._seconds = 0;
  }

  /** Start (or restart) the timer for a section */
  start(section) {
    this.stop();
    this._seconds = 0;
    const el = document.getElementById(domPrefix(section) + '-timer');
    if (!el) return;
    el.textContent = '0s';
    el.classList.remove('red');

    this._interval = setInterval(() => {
      if (this._seconds >= 59) { this.stop(); return; }
      this._seconds++;
      el.textContent = this._seconds + 's';
      if (this._seconds >= 15) el.classList.add('red');
    }, 1000);
  }

  /** Stop the timer */
  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }
}
