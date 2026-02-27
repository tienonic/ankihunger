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
      {/* Mode toggle (quiz/flash tabs + reset) */}
      <Show when={hasFlash()}>
        <div class="mode-toggle">
          <button
            class={`mode-btn ${!session.flashMode() ? 'active' : ''}`}
            onClick={() => { if (session.flashMode()) session.toggleFlashMode(); }}
          >
            Quiz Mode
          </button>
          <button
            class={`mode-btn ${session.flashMode() ? 'active' : ''}`}
            onClick={() => { if (!session.flashMode()) session.toggleFlashMode(); }}
          >
            Flashcards
          </button>
          <span class="mode-toggle-actions">
            <Show when={session.currentImageLink()}>
              <a class="view-img" href={session.currentImageLink()} target="_blank" rel="noopener">View Image</a>
            </Show>
            <button
              class="reset-btn"
              onClick={() => session.resetSection()}
              title="Reset section progress"
            >
              Reset
            </button>
          </span>
        </div>
      </Show>

      {/* Reset only (no flashcards) */}
      <Show when={!hasFlash()}>
        <div class="mode-toggle mode-toggle-actions-only">
          <span class="mode-toggle-actions">
            <Show when={session.currentImageLink()}>
              <a class="view-img" href={session.currentImageLink()} target="_blank" rel="noopener">View Image</a>
            </Show>
            <button
              class="reset-btn"
              onClick={() => session.resetSection()}
              title="Reset section progress"
            >
              Reset
            </button>
          </span>
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
