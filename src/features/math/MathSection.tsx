import './math.css';
import { Show, For, createEffect, onMount, onCleanup } from 'solid-js';
import type { Section } from '../../projects/types.ts';
import { createMathSession } from './store.ts';
import { sectionHandlers } from '../../core/store/sections.ts';
import { CATEGORY_LABELS } from '../../data/math.ts';
import { renderLatex } from '../../core/hooks/useLatex.ts';

export function MathSection(props: { section: Section }) {
  const session = createMathSession(props.section);

  let inputRef: HTMLInputElement | undefined;
  let questionRef: HTMLSpanElement | undefined;
  let feedbackRef: HTMLDivElement | undefined;
  let stepsRef: HTMLDivElement | undefined;

  onMount(() => { sectionHandlers.set(props.section.id, session); session.generateProblem(); });
  onCleanup(() => sectionHandlers.delete(props.section.id));

  createEffect(() => {
    session.problem();
    if (questionRef) { questionRef.textContent = session.problem()?.q ?? ''; renderLatex(questionRef); }
    if (session.state() === 'answering') setTimeout(() => inputRef?.focus(), 0);
  });

  createEffect(() => {
    const fb = session.feedback();
    if (feedbackRef && fb) { feedbackRef.innerHTML = fb.text; renderLatex(feedbackRef); }
  });

  createEffect(() => { if (session.showSteps() && stepsRef) setTimeout(() => { if (stepsRef) renderLatex(stepsRef); }, 0); });

  const submitAnswer = () => inputRef && session.checkAnswer(inputRef.value);

  return (
    <div>
      <div class="mode-toggle mode-toggle-actions-only"><span class="mode-toggle-actions">
          <button type="button" class={`pause-btn${session.paused() ? ' active' : ''}`} onClick={() => session.togglePause()} title={session.paused() ? 'Resume timer' : 'Pause timer'}>{session.paused() ? '\u25B6' : '\u23F8'}</button>
          <button type="button" class="reset-btn" onClick={() => session.resetSection()} title="Reset score and streak">Reset</button>
        </span></div>

      <div class="math-category-btns"><button type="button" class={session.category() === 'all' ? 'active' : ''} onClick={() => session.setCategory('all')}>All</button><For each={props.section.generators ?? Object.keys(CATEGORY_LABELS)}>{(gen) => <button type="button" class={session.category() === gen ? 'active' : ''} onClick={() => session.setCategory(gen)}>{CATEGORY_LABELS[gen] ?? gen}</button>}</For></div>

      <div class="card">
        <div class="question-header">
          <span class="question-text" ref={questionRef} />
          <Show when={session.state() === 'answering'}><span class={`timer${session.timer.seconds() >= 59 ? ' skull' : session.timer.seconds() >= 15 ? ' red' : ''}`}>{session.timer.seconds() >= 59 ? '\u{1F480}' : session.timer.seconds() + 's'}</span></Show>
        </div>

        <Show when={session.state() === 'answering'}>
          <div class="math-input"><input type="text" ref={inputRef} placeholder="Your answer" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); submitAnswer(); } }} /><button type="button" onClick={submitAnswer}>Submit</button></div>
          <button type="button" class="dk-btn" onClick={() => session.skipProblem()}>Skip</button>
        </Show>

        <Show when={session.state() === 'revealed' && session.feedback()}>
          <div class={`feedback${session.feedback() ? ` show ${session.feedback()!.type === 'correct' ? 'correct-fb' : session.feedback()!.type === 'wrong' ? 'wrong-fb' : 'skip-fb'}` : ''}`} ref={feedbackRef} />
        </Show>

        <Show when={session.state() === 'revealed'}>
          <button type="button" class="action-btn" onClick={() => session.nextProblem()}>Next Problem</button>
        </Show>

        <Show when={session.showSteps() && (session.problem()?.steps.length ?? 0) > 0}>
          <div class="math-steps" ref={stepsRef}>
            <h4>Step-by-Step Solution</h4>
            <ol><For each={session.problem()!.steps}>{(s) => <li innerHTML={s} />}</For></ol>
          </div>
        </Show>

      </div>
    </div>
  );
}
