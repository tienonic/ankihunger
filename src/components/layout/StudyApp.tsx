import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { activeProject, activeTab, zenMode, syncActivity } from '../../store/app.ts';
import { useKeyboard } from '../../hooks/useKeyboard.ts';
import { workerApi } from '../../hooks/useWorker.ts';
import { entries as glossaryEntries } from '../../store/glossary.ts';
import { sectionHandlers } from '../../store/quiz.ts';
import { Header } from './Header.tsx';
import { TopToggles } from './TopToggles.tsx';
import { SectionsContainer } from './SectionsContainer.tsx';
import { TermsDropdown } from '../glossary/TermsDropdown.tsx';
import { NoteBox } from '../notes/NoteBox.tsx';

export function StudyApp() {
  useKeyboard();

  const isMathTab = () => {
    const project = activeProject();
    const tab = activeTab();
    if (!project || !tab) return false;
    return project.sections.find(s => s.id === tab)?.type === 'math-gen';
  };

  let canvasRef: HTMLCanvasElement | undefined;
  const [activityScore, setActivityScore] = createSignal(0);
  const [reviewStats, setReviewStats] = createSignal({ reviews: 0, retention: '0%' });
  const [sidebarScore, setSidebarScore] = createSignal({ correct: 0, attempted: 0, due: 0, total: 0 });

  // Activity chart data
  let chartEntries: { rating: number; correct: boolean }[] = [];

  async function loadActivity() {
    const project = activeProject();
    if (!project) return;
    let entries = await workerApi.getActivity(project.slug, 200) as any[];
    // Filter by active section when sync is off
    if (!syncActivity()) {
      const tab = activeTab();
      if (tab) entries = entries.filter((e: any) => e.section_id === tab);
    }
    chartEntries = entries.map((e: any) => ({ rating: e.rating, correct: !!e.correct })).reverse();

    // Calculate score
    let score = 0;
    for (const e of chartEntries) {
      if (!e.correct || e.rating === 1) score -= 2;
      else if (e.rating === 4) score += 4;
      else if (e.rating === 3) score += 3;
      else score += 1;
      score = Math.max(0, score);
    }
    setActivityScore(Math.round(score));

    // Review stats (row 1)
    const total = chartEntries.length;
    const goodEasy = chartEntries.filter(e => e.correct && e.rating >= 3).length;
    setReviewStats({
      reviews: total,
      retention: total > 0 ? Math.round(goodEasy / total * 100) + '%' : '0%',
    });

    drawChart();
  }

  async function loadSidebarScore() {
    const project = activeProject();
    const tab = activeTab();
    if (!project || !tab) return;
    const section = project.sections.find(s => s.id === tab);
    if (!section || section.type === 'math-gen') return;

    const scores = await workerApi.getScores(project.slug);
    const s = scores.find((sc: any) => sc.section_id === tab);
    const dueResult = await workerApi.countDue(project.slug, [tab]);
    setSidebarScore({
      correct: s?.correct ?? 0,
      attempted: s?.attempted ?? 0,
      due: dueResult.due + dueResult.newCount,
      total: section.cardIds.length,
    });
  }

  function niceYTicks(min: number, max: number, targetCount: number): number[] {
    const range = max - min;
    const rawStep = range / (targetCount - 1);
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / mag;
    let niceStep: number;
    if (residual <= 1.5) niceStep = 1 * mag;
    else if (residual <= 3.5) niceStep = 2 * mag;
    else if (residual <= 7.5) niceStep = 5 * mag;
    else niceStep = 10 * mag;

    const ticks: number[] = [];
    const start = Math.ceil(min / niceStep) * niceStep;
    for (let v = start; v <= max + niceStep * 0.01; v += niceStep) {
      ticks.push(Math.round(v));
    }
    if (!ticks.includes(0)) {
      ticks.push(0);
      ticks.sort((a, b) => a - b);
    }
    return ticks;
  }

  function drawChart() {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;
    const w = canvasRef.width;
    const h = canvasRef.height;
    ctx.clearRect(0, 0, w, h);

    const recent = chartEntries.slice(-50);
    if (recent.length === 0) return;

    // Cumulative scores (clamped at 0)
    const cumScores: number[] = [];
    let running = 0;
    for (const e of recent) {
      if (!e.correct || e.rating === 1) running -= 2;
      else if (e.rating === 4) running += 4;
      else if (e.rating === 3) running += 3;
      else if (e.rating === 2) running += 1;
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

    const toY = (val: number) => topPad + ((maxS - val) / rangeS) * plotH;
    const toX = (i: number) => leftPad + (i / (recent.length - 1 || 1)) * plotW;

    // Baseline at y=0
    const zeroY = Math.round(toY(0)) + 0.5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftPad, zeroY);
    ctx.lineTo(w - rightPad, zeroY);
    ctx.stroke();

    // Y-axis ticks
    const yTicks = niceYTicks(minS, maxS, 5);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const val of yTicks) {
      const y = toY(val);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftPad - 3, y);
      ctx.lineTo(leftPad, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillText(String(val), leftPad - 5, y);
    }

    // X-axis labels
    const n = recent.length;
    const xStep = n <= 10 ? 1 : n <= 25 ? 5 : 10;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < n; i++) {
      const qNum = i + 1;
      if (qNum === 1 || qNum === n || qNum % xStep === 0) {
        const x = toX(i);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, topPad + plotH);
        ctx.lineTo(x, topPad + plotH + 3);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillText(String(qNum), x, topPad + plotH + 4);
      }
    }

    // Score line
    ctx.strokeStyle = 'rgba(74, 127, 181, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = toX(i);
      const y = toY(cumScores[i]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Dots
    for (let i = 0; i < n; i++) {
      const x = toX(i);
      const y = toY(cumScores[i]);
      ctx.fillStyle = recent[i].correct ? '#4a8f5e' : '#b54a3f';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Reload activity when tab or sync setting changes
  createEffect(() => {
    activeTab();
    syncActivity();
    loadActivity();
    loadSidebarScore();
  });

  // Also refresh sidebar score when a quiz session updates due counts
  createEffect(() => {
    const tab = activeTab();
    if (!tab) return;
    const session = sectionHandlers.get(tab);
    if (session?.dueCount) session.dueCount();
    if (session?.score) session.score();
    loadSidebarScore();
  });

  // Periodic refresh
  const interval = setInterval(() => { loadActivity(); loadSidebarScore(); }, 5000);
  onCleanup(() => clearInterval(interval));

  return (
    <div class={zenMode() ? 'zen' : ''} id="study-app">
      <Header />
      <TopToggles />
      <NoteBox />

      <Show when={!isMathTab()}>
        <div class="sidebar-right">
          <Show when={glossaryEntries().length > 0}>
            <TermsDropdown />
          </Show>
          <div class="activity-widget">
            <div class="activity-score-label">{activityScore()}</div>
            <div class="activity-chart-wrap">
              <canvas ref={canvasRef} width="180" height="100" />
            </div>
            <div class="activity-widget-stats">
              <div class="activity-stats">
                <span class="stat-item">review: <strong>{reviewStats().reviews}</strong></span>
                <span class="stat-item">retention: <strong>{reviewStats().retention}</strong></span>
              </div>
              <div class="activity-stats">
                <span class="stat-item">score: <strong>{sidebarScore().correct}/{sidebarScore().attempted}</strong></span>
                <span class="stat-item">due: <strong>{sidebarScore().due}/{sidebarScore().total}</strong></span>
              </div>
            </div>
            <button
              class="activity-reset-btn"
              onClick={async () => {
                const p = activeProject();
                if (p) { await workerApi.clearActivity(p.slug); loadActivity(); }
              }}
            >
              reset
            </button>
          </div>
        </div>
      </Show>

      <main>
        <SectionsContainer />
      </main>
    </div>
  );
}
