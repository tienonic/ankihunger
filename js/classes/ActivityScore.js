/**
 * Activity Score — tracks review performance and renders a mini chart.
 *
 * Data model: array of { t: timestamp_ms, r: rating_1_4, c: bool_correct, s: sectionId }
 * Score: weighted sum based on rating/correctness and recency.
 * Filters display to the active section when set via setSection().
 */

export class ActivityScore {
  constructor(canvasEl, scoreEl) {
    this.canvas = canvasEl;
    this.scoreEl = scoreEl;
    this.entries = [];
    this.score = 0;
    this._section = null;
  }

  load(entries) {
    this.entries = entries || [];
    this.score = this._calcScore();
  }

  setSection(sectionId) {
    this._section = sectionId || null;
    this.score = this._calcScore();
  }

  addEntry(rating, correct, sectionId) {
    this.entries.push({ t: Date.now(), r: rating, c: correct, s: sectionId || null });
    if (this.entries.length > 200) this.entries = this.entries.slice(-200);
    this.score = this._calcScore();
  }

  getScore() {
    return this.score;
  }

  toJSON() {
    return this.entries;
  }

  _filtered() {
    if (!this._section) return this.entries;
    return this.entries.filter(e => e.s === this._section);
  }

  render() {
    this.scoreEl.textContent = Math.round(this.score);
    this._drawChart();
  }

  _calcScore() {
    const now = Date.now();
    const DAY = 86400000;
    let total = 0;

    for (const e of this._filtered()) {
      let points;
      if (!e.c) {
        points = -2;
      } else if (e.r === 4) {
        points = 4;
      } else if (e.r === 3) {
        points = 3;
      } else if (e.r === 2) {
        points = 1;
      } else {
        points = -2;
      }

      const age = now - e.t;
      let weight;
      if (age < DAY) weight = 1.0;
      else if (age < 3 * DAY) weight = 0.7;
      else if (age < 7 * DAY) weight = 0.4;
      else weight = 0.2;

      total += points * weight;
    }

    return Math.max(0, total);
  }

  _drawChart() {
    const ctx = this.canvas.getContext('2d');
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    const recent = this._filtered().slice(-50);
    if (recent.length === 0) return;

    // Calculate cumulative scores for line (clamped at 0)
    const cumScores = [];
    let running = 0;
    for (const e of recent) {
      if (!e.c) running -= 2;
      else if (e.r === 4) running += 4;
      else if (e.r === 3) running += 3;
      else if (e.r === 2) running += 1;
      else running -= 2;
      running = Math.max(0, running);
      cumScores.push(running);
    }

    // Default scale: 0 to 20 minimum, expands if scores go higher
    const minS = 0;
    const maxS = Math.max(20, ...cumScores);
    const rangeS = maxS - minS || 1;
    const leftPad = 22;
    const rightPad = 6;
    const topPad = 6;
    const bottomPad = 14;
    const plotW = w - leftPad - rightPad;
    const plotH = h - topPad - bottomPad;

    // Helper: data value → canvas y
    const toY = (val) => topPad + ((maxS - val) / rangeS) * plotH;
    // Helper: question index (0-based) → canvas x
    const toX = (i) => leftPad + (i / (recent.length - 1 || 1)) * plotW;

    // Baseline at y=0 (bottom of chart)
    const zeroY = Math.round(toY(0)) + 0.5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftPad, zeroY);
    ctx.lineTo(w - rightPad, zeroY);
    ctx.stroke();

    // Y-axis: compute nice round ticks
    const yTicks = this._niceYTicks(minS, maxS, 5);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const val of yTicks) {
      const y = toY(val);
      // Tick mark
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftPad - 3, y);
      ctx.lineTo(leftPad, y);
      ctx.stroke();
      // Label
      ctx.fillText(val, leftPad - 5, y);
    }

    // X-axis: question number labels at sensible intervals
    const n = recent.length;
    const xStep = n <= 10 ? 1 : n <= 25 ? 5 : 10;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < n; i++) {
      const qNum = i + 1; // 1-based question number
      if (qNum === 1 || qNum === n || qNum % xStep === 0) {
        const x = toX(i);
        // Tick mark
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, topPad + plotH);
        ctx.lineTo(x, topPad + plotH + 3);
        ctx.stroke();
        // Label
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillText(qNum, x, topPad + plotH + 4);
      }
    }

    // Score line
    ctx.strokeStyle = 'rgba(74, 127, 181, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = toX(i);
      const y = toY(cumScores[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Dots
    for (let i = 0; i < n; i++) {
      const x = toX(i);
      const y = toY(cumScores[i]);
      ctx.fillStyle = recent[i].c ? '#4a8f5e' : '#b54a3f';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Compute nice round y-axis tick values spanning [min, max]. */
  _niceYTicks(min, max, targetCount) {
    const range = max - min;
    const rawStep = range / (targetCount - 1);
    // Round step to a "nice" number (1, 2, 5, 10, 20, 50, ...)
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / mag;
    let niceStep;
    if (residual <= 1.5) niceStep = 1 * mag;
    else if (residual <= 3.5) niceStep = 2 * mag;
    else if (residual <= 7.5) niceStep = 5 * mag;
    else niceStep = 10 * mag;

    const ticks = [];
    const start = Math.ceil(min / niceStep) * niceStep;
    for (let v = start; v <= max + niceStep * 0.01; v += niceStep) {
      ticks.push(Math.round(v));
    }
    // Always include zero
    if (!ticks.includes(0)) {
      ticks.push(0);
      ticks.sort((a, b) => a - b);
    }
    return ticks;
  }
}
