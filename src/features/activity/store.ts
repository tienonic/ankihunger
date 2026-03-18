import { createSignal, createEffect, onCleanup, batch, untrack } from 'solid-js';
import { activeProject, activeTab, syncActivity } from '../../core/store/app.ts';
import { workerApi } from '../../core/hooks/useWorker.ts';
import { sectionHandlers, handlerVersion } from '../../core/store/sections.ts';


const [activityScore, setActivityScore] = createSignal(0);
const [reviewStats, setReviewStats] = createSignal({ reviews: 0, retention: '0%' });
const [sidebarScore, setSidebarScore] = createSignal({ correct: 0, attempted: 0, due: 0, total: 0 });

export { activityScore, reviewStats, sidebarScore };

let canvasRef: HTMLCanvasElement | undefined;
let chartEntries: { rating: number; correct: boolean }[] = [];

export function setCanvasRef(el: HTMLCanvasElement) {
  canvasRef = el;
}

function updateScoreSignals() {
  let score = 0;
  for (const e of chartEntries) {
    if (!e.correct || e.rating === 1) score -= 2;
    else if (e.rating === 4) score += 4;
    else if (e.rating === 3) score += 3;
    else score += 1;
    score = Math.max(0, score);
  }
  const total = chartEntries.length;
  const goodEasy = chartEntries.filter(e => e.correct && e.rating >= 3).length;
  batch(() => {
    setActivityScore(Math.round(score));
    setReviewStats({ reviews: total, retention: total > 0 ? Math.round(goodEasy / total * 100) + '%' : '0%' });
  });
}

export async function loadActivity() {
  const project = activeProject();
  if (!project) return;
  const slug = project.slug;
  try {
    let entries = await workerApi.getActivity(slug, 200);
    if (activeProject()?.slug !== slug) return; // Project changed while fetching
    if (!syncActivity()) {
      const tab = activeTab();
      if (tab) entries = entries.filter((e) => e.section_id === tab);
    }
    chartEntries = entries.map((e) => ({ rating: e.rating, correct: !!e.correct })).reverse();
    updateScoreSignals();
    drawChart();
  } catch {
    // Background refresh — keep stale data on failure
  }
}

async function loadSidebarScore() {
  const project = activeProject();
  const tab = activeTab();
  if (!project || !tab) return;
  const slug = project.slug;
  const section = project.sections.find(s => s.id === tab);
  if (!section || section.type === 'math-gen') return;

  try {
    const cardType = section.type === 'passage-quiz' ? 'passage' as const : 'mcq' as const;
    const [scores, dueResult] = await Promise.all([
      workerApi.getScores(slug),
      workerApi.countDue(slug, [tab], cardType),
    ]);
    const s = scores.find((sc) => sc.section_id === tab);
    if (activeTab() !== tab || activeProject()?.slug !== slug) return; // Stale result — tab or project changed
    setSidebarScore({
      correct: s?.correct ?? 0,
      attempted: s?.attempted ?? 0,
      due: dueResult.due + dueResult.newCount,
      total: dueResult.total,
    });
  } catch {
    // Background refresh — keep stale data on failure
  }
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

function computeCumScores(entries: { rating: number; correct: boolean }[]): number[] {
  const cumScores: number[] = [];
  let running = 0;
  for (const e of entries) {
    if (!e.correct || e.rating === 1) running -= 2;
    else if (e.rating === 4) running += 4;
    else if (e.rating === 3) running += 3;
    else running += 1;
    running = Math.max(0, running);
    cumScores.push(running);
  }
  return cumScores;
}

function drawChartAxes(ctx: CanvasRenderingContext2D, leftPad: number, rightPad: number, topPad: number, plotH: number, w: number, toY: (v: number) => number, minS: number, maxS: number) {
  const zeroY = Math.round(toY(0)) + 0.5;
  ctx.strokeStyle = 'rgba(45, 42, 38, 0.2)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(leftPad, zeroY); ctx.lineTo(w - rightPad, zeroY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(leftPad + 0.5, topPad); ctx.lineTo(leftPad + 0.5, topPad + plotH); ctx.stroke();
  const yTicks = niceYTicks(minS, maxS, 5);
  ctx.fillStyle = 'rgba(45, 42, 38, 0.45)'; ctx.font = '7px sans-serif';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (const val of yTicks) {
    const y = toY(val);
    ctx.strokeStyle = 'rgba(45, 42, 38, 0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(leftPad - 3, y); ctx.lineTo(leftPad, y); ctx.stroke();
    ctx.fillStyle = 'rgba(45, 42, 38, 0.45)'; ctx.fillText(String(val), leftPad - 5, y);
  }
}

function drawChartData(ctx: CanvasRenderingContext2D, n: number, toX: (i: number) => number, toY: (v: number) => number, cumScores: number[], recent: { correct: boolean }[], topPad: number, plotH: number) {
  const xStep = n <= 10 ? 1 : n <= 25 ? 5 : 10;
  ctx.fillStyle = 'rgba(45, 42, 38, 0.45)'; ctx.font = '7px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let i = 0; i < n; i++) {
    const qNum = i + 1;
    if (qNum === 1 || qNum === n || qNum % xStep === 0) {
      const x = toX(i);
      ctx.strokeStyle = 'rgba(45, 42, 38, 0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, topPad + plotH); ctx.lineTo(x, topPad + plotH + 3); ctx.stroke();
      ctx.fillStyle = 'rgba(45, 42, 38, 0.45)'; ctx.fillText(String(qNum), x, topPad + plotH + 4);
    }
  }
  ctx.strokeStyle = 'rgba(74, 127, 181, 0.8)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = 0; i < n; i++) { const x = toX(i); const y = toY(cumScores[i]); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.stroke();
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = recent[i].correct ? '#3d7a4f' : '#a84036';
    ctx.beginPath(); ctx.arc(toX(i), toY(cumScores[i]), 3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawChart() {
  if (!canvasRef) return;
  const ctx = canvasRef.getContext('2d');
  if (!ctx) return;
  const w = canvasRef.width; const h = canvasRef.height;
  ctx.clearRect(0, 0, w, h);
  const recent = chartEntries.slice(-50);
  if (recent.length === 0) return;
  const cumScores = computeCumScores(recent);
  const minS = 0; const maxS = Math.max(20, ...cumScores); const rangeS = maxS - minS || 1;
  const leftPad = 22; const rightPad = 6; const topPad = 6;
  const plotW = w - leftPad - rightPad; const plotH = h - topPad - 14;
  const toY = (val: number) => topPad + ((maxS - val) / rangeS) * plotH;
  const toX = (i: number) => leftPad + (i / (recent.length - 1 || 1)) * plotW;
  drawChartAxes(ctx, leftPad, rightPad, topPad, plotH, w, toY, minS, maxS);
  drawChartData(ctx, recent.length, toX, toY, cumScores, recent, topPad, plotH);
}

export function pushChartEntry(rating: number, correct: boolean) {
  chartEntries.push({ rating, correct });
  updateScoreSignals();
  drawChart();
}

export function initActivityEffects() {
  createEffect(() => {
    activeTab();
    syncActivity();
    loadActivity();
    loadSidebarScore();
  });

  createEffect(() => {
    handlerVersion();
    const tab = untrack(() => activeTab());
    if (!tab) return;
    const session = sectionHandlers.get(tab);
    if (session?.dueCount) session.dueCount();
    if (session?.score) session.score();
    untrack(() => { loadActivity(); loadSidebarScore(); });
  });

  const interval = setInterval(() => { loadActivity(); loadSidebarScore(); }, 5000);
  onCleanup(() => clearInterval(interval));
}
