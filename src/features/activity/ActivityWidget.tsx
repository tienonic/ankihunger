import './activity.css';
import { Show } from 'solid-js';
import { activeProject } from '../../core/store/app.ts';
import { workerApi } from '../../core/hooks/useWorker.ts';
import {
  activityScore, reviewStats, sidebarScore,
  setCanvasRef, loadActivity, initActivityEffects,
} from './store.ts';

export function ActivityWidget(props: { isFlashMode: () => boolean; activeSession: () => any }) {
  initActivityEffects();

  return (
    <>
      <div class="activity-widget">
        <div class="activity-score-label">{activityScore()}</div>
        <div class="activity-chart-wrap">
          <canvas ref={el => setCanvasRef(el)} width="180" height="100" />
        </div>
        <div class="activity-widget-stats">
          <div class="activity-stats">
            <span class="stat-item">review: <strong>{reviewStats().reviews}</strong></span>
            <span class="stat-item">retention: <strong>{reviewStats().retention}</strong></span>
          </div>
          <div class="activity-stats">
            <span class="stat-item">score: <strong>{sidebarScore().correct} / {sidebarScore().attempted}</strong></span>
            <span class="stat-item">due: <strong>{sidebarScore().due} / {sidebarScore().total}</strong></span>
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
      <Show when={props.isFlashMode()}>
        {(() => {
          const s = props.activeSession()!;
          const due = () => s.dueCount();
          return (
            <div class="flash-sidebar-controls">
              <div class="activity-stats">
                <span class="stat-item">new: <strong>{due().newCount}</strong></span>
                <span class="stat-item">due: <strong>{due().due}</strong></span>
                <span class="stat-item">total: <strong>{due().total}</strong></span>
              </div>
              <div class="flash-sidebar-btns">
                <button class="action-sm flash-nav-btn" onClick={() => s.shuffleFlash()} title="Random card">shuffle</button>
                <button class="action-sm flash-nav-btn" onClick={() => s.resetSection()} title="Reset flashcard progress">reset</button>
              </div>
            </div>
          );
        })()}
      </Show>
    </>
  );
}
