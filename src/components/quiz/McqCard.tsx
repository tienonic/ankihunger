import { Show, For } from 'solid-js';
import type { QuizSession } from '../../store/quiz.ts';
import { easyMode, tipsVisible } from '../../store/app.ts';
import { getLabel } from '../../store/keybinds.ts';

const RATING_CSS: Record<number, string> = { 1: 'rating-again', 2: 'rating-hard', 3: 'rating-good', 4: 'rating-easy' };
const RATING_NAMES: Record<number, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };
const STATE_LABELS: Record<number, string> = { 0: 'NEW', 1: 'LEARNING', 2: 'REVIEW', 3: 'RELEARNING' };
const STATE_CSS: Record<number, string> = { 0: 'state-new', 1: 'state-learning', 2: 'state-review', 3: 'state-relearning' };
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
      return { text: 'Answer: ' + q.correct, cls: 'option-feedback skip-fb', explanation: q.explanation };
    }
    if (opt === s.selected()) {
      if (s.isCorrect()) return { text: 'Correct!', cls: 'option-feedback correct-fb', explanation: q.explanation };
      return { text: 'Incorrect. Answer: ' + q.correct, cls: 'option-feedback wrong-fb', explanation: q.explanation };
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
      {/* Rating flash animation */}
      <Show when={s.ratingFlash().show}>
        <span class={`rating-flash show ${FLASH_CSS[s.ratingFlash().rating] ?? ''}`}>
          {RATING_NAMES[s.ratingFlash().rating] ?? ''}
        </span>
      </Show>

      {/* Passage */}
      <Show when={props.isPassage && s.passage()}>
        <div class="passage" innerHTML={s.passage()} />
      </Show>

      {/* Question + timer */}
      <Show when={s.question()}>
        <div class="question-header">
          <span class="question-text">{s.question()!.q}</span>
          <Show when={s.state() === 'answering'}>
            <span class={`timer${s.timer.seconds() >= 59 ? ' skull' : s.timer.seconds() >= 15 ? ' red' : ''}`}>
              {s.timer.seconds() >= 59 ? '\u{1F480}' : s.timer.seconds() + 's'}
            </span>
          </Show>
        </div>
      </Show>

      {/* Options */}
      <div class="options">
        <For each={s.options()}>
          {(opt) => {
            const fb = () => feedbackFor(opt);
            return (
              <button
                class={optionClass(opt)}
                disabled={isRevealed()}
                onClick={() => s.answer(opt)}
              >
                {opt}
                <Show when={fb()}>
                  <div class={fb()!.cls}>
                    <span>{fb()!.text}</span>
                    <Show when={fb()!.explanation}>
                      <span class="explanation">{fb()!.explanation}</span>
                    </Show>
                  </div>
                </Show>
              </button>
            );
          }}
        </For>
      </div>

      {/* Skip */}
      <Show when={s.state() === 'answering'}>
        <button class="dk-btn" onClick={() => s.skip()}>Skip</button>
      </Show>

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

      {/* State badge */}
      <Show when={showActions()}>
        <span class={`state-badge ${STATE_CSS[s.cardState()] ?? 'state-new'}`}>
          {STATE_LABELS[s.cardState()] ?? 'NEW'}
        </span>
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


      {/* Tips overlay */}
      <Show when={tipsVisible()}>
        <div class="key-hints" style="margin-top:12px">
          <kbd>1-4</kbd> answer/rate &middot; <kbd>{getLabel('skip')}</kbd> x2 skip &middot; <kbd>{getLabel('undo')}</kbd> undo &middot; <kbd>{getLabel('suspend')}</kbd> suspend &middot; <kbd>{getLabel('bury')}</kbd> bury &middot; <kbd>{getLabel('goBack')}</kbd> back &middot; <kbd>{getLabel('note')}</kbd> note
        </div>
      </Show>

      {/* Done */}
      <Show when={s.state() === 'done'}>
        <p style="text-align:center;color:var(--color-text-light);padding:20px 0">
          All cards reviewed for this session!
        </p>
      </Show>
    </div>
  );
}
