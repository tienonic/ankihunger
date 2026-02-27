import { Show, For, createEffect, onMount, onCleanup } from 'solid-js';
import type { Section } from '../../projects/types.ts';
import { createMathSession } from '../../store/math.ts';
import { sectionHandlers } from '../../store/quiz.ts';
import { CATEGORY_LABELS } from '../../data/math.ts';
import { renderLatex } from '../../hooks/useLatex.ts';

export function MathSection(props: { section: Section }) {
  const session = createMathSession(props.section);

  let inputRef: HTMLInputElement | undefined;
  let questionRef: HTMLSpanElement | undefined;
  let feedbackRef: HTMLDivElement | undefined;
  let stepsRef: HTMLDivElement | undefined;

  onMount(() => {
    sectionHandlers.set(props.section.id, session as any);
    session.generateProblem();
  });

  onCleanup(() => {
    sectionHandlers.delete(props.section.id);
  });

  // Render LaTeX in question when problem changes
  createEffect(() => {
    session.problem(); // track dependency
    if (questionRef) {
      questionRef.textContent = session.problem()?.q ?? '';
      renderLatex(questionRef);
    }
    // Focus input on new problem
    if (session.state() === 'answering') {
      setTimeout(() => inputRef?.focus(), 0);
    }
  });

  // Render LaTeX in feedback when it changes
  createEffect(() => {
    const fb = session.feedback();
    if (feedbackRef && fb) {
      feedbackRef.innerHTML = fb.text;
      renderLatex(feedbackRef);
    }
  });

  // Render LaTeX in steps when shown
  createEffect(() => {
    if (session.showSteps() && stepsRef) {
      // Small delay to ensure DOM is ready
      setTimeout(() => { if (stepsRef) renderLatex(stepsRef); }, 0);
    }
  });

  function handleInputKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      submitAnswer();
    }
  }

  function submitAnswer() {
    if (!inputRef) return;
    session.checkAnswer(inputRef.value);
  }

  function skip() {
    session.skipProblem();
  }

  function feedbackClass() {
    const fb = session.feedback();
    if (!fb) return 'feedback';
    return `feedback show ${fb.type === 'correct' ? 'correct-fb' : fb.type === 'wrong' ? 'wrong-fb' : 'skip-fb'}`;
  }

  const categories = () => props.section.generators ?? Object.keys(CATEGORY_LABELS);

  return (
    <div>
      {/* Reset button */}
      <div class="mode-toggle mode-toggle-actions-only">
        <span class="mode-toggle-actions">
          <button
            class="reset-btn"
            onClick={() => session.resetSection()}
            title="Reset score and streak"
          >
            Reset
          </button>
        </span>
      </div>

      {/* Category filter buttons */}
      <div class="math-category-btns">
        <button
          class={session.category() === 'all' ? 'active' : ''}
          onClick={() => session.setCategory('all')}
        >
          All
        </button>
        <For each={categories()}>
          {(gen) => (
            <button
              class={session.category() === gen ? 'active' : ''}
              onClick={() => session.setCategory(gen)}
            >
              {CATEGORY_LABELS[gen] ?? gen}
            </button>
          )}
        </For>
      </div>

      {/* Quiz card */}
      <div class="card">
        <div class="question-header">
          <span class="question-text" ref={questionRef} />
          <Show when={session.state() === 'answering'}>
            <span class={`timer${session.timer.seconds() >= 59 ? ' skull' : session.timer.seconds() >= 15 ? ' red' : ''}`}>
              {session.timer.seconds() >= 59 ? '\u{1F480}' : session.timer.seconds() + 's'}
            </span>
          </Show>
        </div>

        {/* Answer input + submit */}
        <Show when={session.state() === 'answering'}>
          <div class="math-input">
            <input
              type="text"
              ref={inputRef}
              placeholder="Your answer"
              onKeyDown={handleInputKey}
            />
            <button onClick={submitAnswer}>Submit</button>
          </div>
          <button class="dk-btn" onClick={skip}>Skip</button>
        </Show>

        {/* Feedback */}
        <Show when={session.state() === 'revealed' && session.feedback()}>
          <div class={feedbackClass()} ref={feedbackRef} />
        </Show>

        {/* Steps */}
        <Show when={session.showSteps() && (session.problem()?.steps.length ?? 0) > 0}>
          <div class="math-steps" ref={stepsRef}>
            <h4>Step-by-Step Solution</h4>
            <ol>
              <For each={session.problem()!.steps}>
                {(s) => <li innerHTML={s} />}
              </For>
            </ol>
          </div>
        </Show>

      </div>
    </div>
  );
}
