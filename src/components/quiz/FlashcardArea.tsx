import { Show, For } from 'solid-js';
import type { Section } from '../../projects/types.ts';
import type { QuizSession } from '../../store/quiz.ts';

const RATING_CSS: Record<number, string> = { 1: 'rating-again', 2: 'rating-hard', 3: 'rating-good', 4: 'rating-easy' };
const RATING_NAMES: Record<number, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };
const STATE_NAMES: Record<number, string> = { 0: 'New', 1: 'Learning', 2: 'Review', 3: 'Relearning' };

export function FlashcardArea(props: { session: QuizSession; section: Section }) {
  const s = props.session;

  return (
    <div>
      <label class="flash-order-toggle">
        <input
          type="checkbox"
          checked={s.flashDefFirst()}
          onChange={(e) => s.setFlashDefFirst(e.currentTarget.checked)}
        />
        <span>definition first</span>
      </label>

      <div class="flashcard-container" onClick={() => s.flipFlash()}>
        <div class={`flashcard ${s.flashFlipped() ? 'flipped' : ''}`}>
          <div class="flashcard-face flashcard-front">
            <div innerHTML={s.flashFront()} />
          </div>
          <div class="flashcard-face flashcard-back">
            <div innerHTML={s.flashBack()} />
          </div>
        </div>
      </div>

      <Show when={!s.flashFlipped()}>
        <p class="flashcard-hint">Flip to rate</p>
      </Show>

      <Show when={s.flashFlipped() && s.flashCardId()}>
        <div class="flash-rating-area">
          <For each={[1, 2, 3, 4]}>
            {(rating) => (
              <button
                class={`rating-btn ${RATING_CSS[rating]}`}
                onClick={(e) => { e.stopPropagation(); s.rateFlash(rating); }}
              >
                <span class="rating-label">{RATING_NAMES[rating]}</span>
                <span class="rating-interval">{s.ratingLabels()[rating] ?? ''}</span>
              </button>
            )}
          </For>
        </div>
      </Show>

      <Show when={s.flashFlipped()}>
        <p class="flashcard-hint">1-4 to rate</p>
      </Show>

      <div class="flashcard-nav">
        <span class="flash-state-badge">{STATE_NAMES[s.cardState()] ?? 'New'}</span>
        <span class="flash-due-count">{s.dueCount().due} due</span>
        <span class="flash-due-count">{s.dueCount().total} total</span>
      </div>
    </div>
  );
}
