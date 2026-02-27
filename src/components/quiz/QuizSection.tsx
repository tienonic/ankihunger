import { Show, onMount, onCleanup } from 'solid-js';
import type { Section } from '../../projects/types.ts';
import { createQuizSession, sectionHandlers } from '../../store/quiz.ts';
import { McqCard } from './McqCard.tsx';
import { FlashcardArea } from './FlashcardArea.tsx';

export function QuizSection(props: { section: Section }) {
  const session = createQuizSession(props.section);

  onMount(() => {
    sectionHandlers.set(props.section.id, session);
    if (!session.flashMode()) {
      session.pickNextCard();
    }
  });

  onCleanup(() => {
    sectionHandlers.delete(props.section.id);
  });

  const hasFlash = () => props.section.hasFlashcards && (props.section.flashcards?.length ?? 0) > 0;
  const isPassage = () => props.section.type === 'passage-quiz';

  return (
    <div>
      {/* Score bar */}
      <div class="score-bar">
        <span>{session.score().correct}/{session.score().attempted}</span>
        <span class="srs-info">
          {session.dueCount().due} due · {session.dueCount().total} total
        </span>
      </div>

      {/* Mode toggle (quiz/flash tabs + reset) */}
      <Show when={hasFlash()}>
        <div class="mode-toggle">
          <button
            class={`mode-btn ${!session.flashMode() ? 'active' : ''}`}
            onClick={() => { if (session.flashMode()) session.toggleFlashMode(); }}
          >
            Quiz
          </button>
          <button
            class={`mode-btn ${session.flashMode() ? 'active' : ''}`}
            onClick={() => { if (!session.flashMode()) session.toggleFlashMode(); }}
          >
            Flashcards
          </button>
          <div class="mode-toggle-actions">
            <button
              class="reset-btn"
              onClick={() => session.resetSection()}
              title="Reset section progress"
            >
              reset
            </button>
          </div>
        </div>
      </Show>

      {/* Reset only (no flashcards) */}
      <Show when={!hasFlash()}>
        <div class="mode-toggle" style="justify-content:flex-end">
          <div class="mode-toggle-actions">
            <button
              class="reset-btn"
              onClick={() => session.resetSection()}
              title="Reset section progress"
            >
              reset
            </button>
          </div>
        </div>
      </Show>

      {/* Quiz or Flash content */}
      <Show when={!session.flashMode()}>
        <McqCard session={session} isPassage={isPassage()} />
      </Show>
      <Show when={session.flashMode()}>
        <FlashcardArea session={session} section={props.section} />
      </Show>
    </div>
  );
}
