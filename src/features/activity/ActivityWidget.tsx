import './activity.css';
import { Show, createSignal, onMount, onCleanup } from 'solid-js';
import { activeProject } from '../../core/store/app.ts';
import { workerApi } from '../../core/hooks/useWorker.ts';
import {
  activityScore, reviewStats, sidebarScore,
  setCanvasRef, loadActivity, initActivityEffects,
} from './store.ts';

export function ActivityWidget(props: { isFlashMode: () => boolean; activeSession: () => any }) {
  initActivityEffects();

  const timer = () => props.activeSession()?.timer;
  const seconds = () => timer()?.seconds() ?? 0;
  const isAnswering = () => props.activeSession()?.state?.() === 'answering';
  const paused = () => props.activeSession()?.paused?.() ?? false;
  const togglePause = () => props.activeSession()?.togglePause?.();

  const [resetMenuOpen, setResetMenuOpen] = createSignal(false);
  const [confirmAction, setConfirmAction] = createSignal<(() => void) | null>(null);

  let resetWrapRef: HTMLDivElement | undefined;
  const clickOutsideHandler = (e: MouseEvent) => { if (resetMenuOpen() && resetWrapRef && !resetWrapRef.contains(e.target as Node)) { setResetMenuOpen(false); setConfirmAction(null); } };
  onMount(() => document.addEventListener('mousedown', clickOutsideHandler));
  onCleanup(() => document.removeEventListener('mousedown', clickOutsideHandler));

  return (
    <>
      <div class="activity-widget">
        <div class="activity-score-row"><Show when={isAnswering()}><span class={`sidebar-timer${paused() ? ' paused' : ''}${seconds() >= 59 ? ' skull' : seconds() >= 15 ? ' red' : ''}`} onClick={() => togglePause()} title={paused() ? 'Resume timer' : 'Pause timer'}>{paused() ? '\u23F8' : seconds() >= 59 ? '\u{1F480}' : seconds() + 's'}</span></Show><div class="activity-score-label">{activityScore()}</div></div>
        <div class="activity-chart-wrap"><canvas ref={el => setCanvasRef(el)} width="210" height="120" /></div>
        <div class="activity-widget-stats">
          <div class="activity-stats"><span class="stat-item">review: <strong>{reviewStats().reviews}</strong></span><span class="stat-item">retention: <strong>{reviewStats().retention}</strong></span></div>
          <div class="activity-stats"><span class="stat-item">score: <strong>{sidebarScore().correct} / {sidebarScore().attempted}</strong></span><span class="stat-item">due: <strong>{sidebarScore().due} / {sidebarScore().total}</strong></span></div>
        </div>
        <div class="activity-reset-wrap" ref={resetWrapRef}>
          <button type="button" class="activity-reset-btn" onClick={() => setResetMenuOpen(v => !v)}>reset</button>
          <Show when={resetMenuOpen()}>
            <div class="reset-menu">
              <Show when={!confirmAction()} fallback={<div class="reset-confirm"><span class="reset-confirm-label">Are you sure?</span><div class="reset-confirm-btns"><button type="button" class="reset-confirm-yes" onClick={() => { confirmAction()?.(); setConfirmAction(null); setResetMenuOpen(false); }}>Yes</button><button type="button" class="reset-confirm-no" onClick={() => setConfirmAction(null)}>No</button></div></div>}>
                <button type="button" class="reset-menu-item" onClick={() => { setConfirmAction(() => async () => { const p = activeProject(); if (p) { await workerApi.clearActivity(p.slug); loadActivity(); } }); }}>Reset Graph</button>
                <button type="button" class="reset-menu-item" onClick={() => { setConfirmAction(() => () => { props.activeSession()?.resetSection?.(); }); }}>Reset Section</button>
              </Show>
            </div>
          </Show>
        </div>
      </div>
      <Show when={props.isFlashMode()}>
        {(() => { const s = props.activeSession()!; const due = () => s.dueCount(); return (<div class="flash-sidebar-controls"><div class="activity-stats"><span class="stat-item">new: <strong>{due().newCount}</strong></span><span class="stat-item">due: <strong>{due().due}</strong></span><span class="stat-item">total: <strong>{due().total}</strong></span></div><div class="flash-sidebar-btns"><button type="button" class="action-sm flash-nav-btn" onClick={() => s.shuffleFlash()} title="Random card">shuffle</button><button type="button" class="action-sm flash-nav-btn" onClick={() => s.resetSection()} title="Reset flashcard progress">reset</button></div></div>); })()}
      </Show>
    </>
  );
}
