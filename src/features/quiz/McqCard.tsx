import { Show, For, createSignal } from 'solid-js';
import type { QuizSession } from './store.ts';
import { easyMode } from '../../core/store/app.ts';
import { getLabel } from '../settings/keybinds.ts';
import { LatexText } from '../../components/LatexText.tsx';

const RATING_CSS: Record<number, string> = { 1: 'rating-again', 2: 'rating-hard', 3: 'rating-good', 4: 'rating-easy' };
const RATING_NAMES: Record<number, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };
const FLASH_CSS: Record<number, string> = { 1: 'flash-again', 2: 'flash-hard', 3: 'flash-good', 4: 'flash-easy' };

export function McqCard(props: { session: QuizSession; isPassage?: boolean }) {
  const s = props.session;

  function optionClass(opt: string): string {
    const st = s.state();
    if (st === 'answering' || st === 'idle') return 'option-btn';
    const q = s.question();
    if (!q) return 'option-btn';
    let cls = 'option-btn';
    if (opt === q.correct) cls += ' correct';
    if (opt === s.selected() && !s.isCorrect()) cls += ' wrong';
    return cls;
  }

  function feedbackFor(opt: string): { text: string; cls: string; explanation?: string } | null {
    const st = s.state();
    if (st === 'answering' || st === 'idle') return null;
    const q = s.question();
    if (!q) return null;

    if (s.skipped() && opt === q.correct) {
      return { text: q.correct, cls: 'option-feedback skip-fb', explanation: q.explanation };
    }
    if (opt === s.selected()) {
      if (s.isCorrect()) return { text: '', cls: 'option-feedback correct-fb', explanation: q.explanation };
      return { text: q.correct, cls: 'option-feedback wrong-fb', explanation: q.explanation };
    }
    return null;
  }

  const isRevealed = () => {
    const st = s.state();
    return st === 'revealed' || st === 'rated' || st === 'reviewing-history';
  };
  const showRating = () => s.state() === 'revealed' && !easyMode();
  const showActions = () => s.state() === 'revealed' && !easyMode();

  return (
    <div class="card">
      {/* Passage */}
      <Show when={props.isPassage && s.passage()}>
        <div class="passage" innerHTML={s.passage()} />
      </Show>

      {/* Question */}
      <Show when={s.question()}>
        <div class="question-header">
          <LatexText text={s.question()!.q} class="question-text" />
        </div>
      </Show>

      {/* Options */}
      <div class="options">
        <For each={s.options()}>
          {(opt) => {
            const fb = () => feedbackFor(opt);
            return (
              <div class="option-wrapper">
                <button
                  class={optionClass(opt)}
                  disabled={isRevealed()}
                  onClick={() => s.answer(opt)}
                >
                  <LatexText text={opt} />
                </button>
                <Show when={fb()}>
                  <div class={fb()!.cls}>
                    <Show when={fb()!.text}>
                      <LatexText text={fb()!.text} />
                    </Show>
                    <Show when={fb()!.explanation}>
                      <LatexText text={fb()!.explanation} class="explanation" />
                    </Show>
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
      </div>

      {/* Rating bar */}
      <Show when={showRating()}>
        <div class="rating-area">
          <For each={[1, 2, 3, 4]}>
            {(rating) => (
              <button class={`rating-btn ${RATING_CSS[rating]}`} onClick={() => s.rate(rating)}>
                <span class="rating-label">{RATING_NAMES[rating]}</span>
                <span class="rating-interval">{s.ratingLabels()[rating] ?? ''}</span>
              </button>
            )}
          </For>
        </div>
      </Show>

      {/* Card actions */}
      <Show when={showActions()}>
        <div class="card-actions">
          <button class="action-sm" onClick={() => s.undo()}>Undo</button>
          <button class="action-sm" onClick={() => s.suspend()}>Suspend</button>
          <button class="action-sm" onClick={() => s.bury()}>Bury</button>
        </div>
      </Show>

      {/* Leech warning */}
      <Show when={s.leechWarning()}>
        <span class="explanation" style="display:block;margin-top:8px">
          This card is a leech (frequently forgotten). Consider reviewing the material.
        </span>
      </Show>

      {/* History hint */}
      <Show when={s.state() === 'reviewing-history'}>
        <div class="key-hints" style="margin-top:12px">
          Reviewing previous — press <kbd>{getLabel('skip')}</kbd> or <kbd>{getLabel('forward')}</kbd> for next
        </div>
      </Show>


      {/* Done */}
      <Show when={s.state() === 'done'}>
        <div class="done-screen">
          <h3 class="done-title">Session Complete</h3>
          <Show when={s.score().attempted > 0}>
            <div class="done-stats">
              <span class="done-stat">{s.score().correct} / {s.score().attempted} correct</span>
              <span class="done-stat">{Math.round((s.score().correct / s.score().attempted) * 100)}% retention</span>
            </div>
          </Show>
          <div class="done-due">
            <span>{s.dueCount().newCount} new remaining</span>
            <span>{s.dueCount().total} total cards</span>
          </div>
          <div class="done-actions">
            <button class="action-sm" onClick={() => s.studyMore()}>Study More</button>
            <div class="done-add-new">
              {(() => {
                const [count, setCount] = createSignal(5);
                return <>
                  <input
                    type="number"
                    value={count()}
                    min="1"
                    class="new-cards-input"
                    onInput={(e) => setCount(Math.max(1, parseInt(e.currentTarget.value) || 1))}
                  />
                  <button class="action-sm" onClick={() => s.increaseNewCards(count())}>Add New</button>
                </>;
              })()}
            </div>
            <button class="action-sm" onClick={() => s.unburyAll()}>Unbury Cards</button>
          </div>
        </div>
      </Show>
    </div>
  );
}
