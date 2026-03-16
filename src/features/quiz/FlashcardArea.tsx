import { Show, For, createSignal } from 'solid-js';
import type { Section } from '../../projects/types.ts';
import type { QuizSession } from './store.ts';
import { LatexHtml } from '../../components/LatexText.tsx';

const RATING_CSS: Record<number, string> = { 1: 'rating-again', 2: 'rating-hard', 3: 'rating-good', 4: 'rating-easy' };
const RATING_NAMES: Record<number, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };

export function FlashcardArea(props: { session: QuizSession; section: Section }) {
  const s = props.session;

  return (
    <div>
      <Show when={s.state() !== 'done'}>
        <div class="flashcard-container" onClick={() => s.flipFlash()}>
          <div class={`flashcard ${s.flashFlipped() ? 'flipped' : ''}`}>
            <div class="flashcard-face flashcard-front"><LatexHtml html={s.flashFront()} /></div>
            <div class="flashcard-face flashcard-back"><LatexHtml html={s.flashBack()} /></div>
          </div>
        </div>

        <Show when={!s.flashFlipped()}><p class="flashcard-hint">Flip to rate</p></Show>

        <Show when={s.flashFlipped() && s.flashCardId()}>
          <div class="flash-rating-area"><For each={[1, 2, 3, 4]}>{(rating) => <button type="button" class={`rating-btn ${RATING_CSS[rating]}`} onClick={(e) => { e.stopPropagation(); s.rateFlash(rating); }}><span class="rating-label">{RATING_NAMES[rating]}</span><span class="rating-interval">{s.ratingLabels()[rating] ?? ''}</span></button>}</For></div>
        </Show>

        <Show when={s.flashFlipped()}><p class="flashcard-hint">1-4 to rate</p></Show>
      </Show>

      <Show when={s.state() === 'done'}>
        <div class="done-screen">
          <h3 class="done-title">Session Complete</h3>
          <div class="done-due"><span>{s.dueCount().newCount} new remaining</span><span>{s.dueCount().total} total cards</span></div>
          <div class="done-actions">
            <button type="button" class="action-sm" onClick={() => s.studyMore()}>Study More</button>
            <div class="done-add-new">{(() => { const [count, setCount] = createSignal(5); return <><input type="number" value={count()} min="1" class="new-cards-input" onInput={(e) => setCount(Math.max(1, parseInt(e.currentTarget.value) || 1))} /><button type="button" class="action-sm" onClick={() => s.increaseNewCards(count())}>Add New</button></>; })()}</div>
            <button type="button" class="action-sm" onClick={() => s.unburyAll()}>Unbury Cards</button>
          </div>
        </div>
      </Show>
    </div>
  );
}
