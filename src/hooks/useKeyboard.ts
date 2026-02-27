import { onMount, onCleanup } from 'solid-js';
import { activeTab, activeProject, setNoteBoxVisible } from '../store/app.ts';
import { sectionHandlers } from '../store/quiz.ts';
import { matchesKey } from '../store/keybinds.ts';
import type { MathSession } from '../store/math.ts';

export function useKeyboard() {
  function handler(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName;

    // Block Space from toggling checkboxes
    if (e.code === 'Space' && tag === 'INPUT' &&
        (e.target as HTMLInputElement).type === 'checkbox') {
      e.preventDefault();
      return;
    }

    const tab = activeTab();
    const project = activeProject();
    if (!tab || !project) return;

    const section = project.sections.find(s => s.id === tab);
    if (!section) return;

    // For math mode, allow Enter from input fields (to submit answer)
    // but block other keys from input/textarea
    if (section.type === 'math-gen') {
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        return;
      }
    } else {
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    }

    // Note key: toggle note box
    if (matchesKey(e, 'note') && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      setNoteBoxVisible(true);
      return;
    }

    const session = sectionHandlers.get(tab);
    if (!session) return;

    if (section.type === 'math-gen') {
      handleMathKeyboard(e, session as MathSession);
    } else if (session.flashMode()) {
      handleFlashcardKeyboard(e, session);
    } else {
      handleMcqKeyboard(e, session);
    }
  }

  onMount(() => document.addEventListener('keydown', handler));
  onCleanup(() => document.removeEventListener('keydown', handler));
}

function handleMathKeyboard(e: KeyboardEvent, session: MathSession) {
  if (e.code === 'Space' || matchesKey(e, 'mathSubmit') || e.key === 'Enter') {
    e.preventDefault();
    if (session.state() === 'revealed') {
      session.nextProblem();
    } else if (session.state() === 'answering') {
      session.armSkip();
    }
  }
}

function handleFlashcardKeyboard(e: KeyboardEvent, session: NonNullable<ReturnType<typeof sectionHandlers.get>>) {
  const isFlipped = session.flashFlipped();

  // Flip card (Space)
  if (matchesKey(e, 'flipCard')) {
    e.preventDefault();
    session.flipFlash();
    return;
  }

  // 1-4: rate (only when flipped)
  if (isFlipped) {
    if (matchesKey(e, 'answer1')) { e.preventDefault(); session.rateFlash(1); return; }
    if (matchesKey(e, 'answer2')) { e.preventDefault(); session.rateFlash(2); return; }
    if (matchesKey(e, 'answer3')) { e.preventDefault(); session.rateFlash(3); return; }
    if (matchesKey(e, 'answer4')) { e.preventDefault(); session.rateFlash(4); return; }
  }

  // Skip key: rate Good shortcut when flipped, flip when not
  if (matchesKey(e, 'skip')) {
    e.preventDefault();
    if (isFlipped) {
      session.rateFlash(3); // Good
    } else {
      session.flipFlash();
    }
    return;
  }

  // Flip alt (F)
  if (matchesKey(e, 'flipAlt')) {
    e.preventDefault();
    session.flipFlash();
    return;
  }
}

function handleMcqKeyboard(e: KeyboardEvent, session: NonNullable<ReturnType<typeof sectionHandlers.get>>) {
  const st = session.state();

  // 1-4: answer or rate
  if (matchesKey(e, 'answer1') || matchesKey(e, 'answer2') || matchesKey(e, 'answer3') || matchesKey(e, 'answer4')) {
    e.preventDefault();
    const answerActions = ['answer1', 'answer2', 'answer3', 'answer4'] as const;
    const idx = answerActions.findIndex(a => matchesKey(e, a));
    if (idx < 0) return;
    if (st === 'answering') {
      const opts = session.options();
      if (opts[idx]) session.answer(opts[idx]);
    } else if (st === 'revealed') {
      session.rate(idx + 1);
    }
    return;
  }

  // Skip/advance (Space or skip key)
  if (e.code === 'Space' || matchesKey(e, 'skip')) {
    e.preventDefault();
    if (st === 'reviewing-history') {
      session.advanceFromHistory();
    } else if (st === 'rated') {
      session.pickNextCard();
    } else if (st === 'revealed') {
      // Must rate first in manual mode
    } else if (st === 'answering') {
      if (session.pending()) {
        session.skip();
      } else {
        session.skip();
      }
    }
    return;
  }

  // Undo
  if (matchesKey(e, 'undo')) {
    e.preventDefault();
    session.undo();
    return;
  }

  // Suspend
  if (matchesKey(e, 'suspend')) {
    e.preventDefault();
    session.suspend();
    return;
  }

  // Bury
  if (matchesKey(e, 'bury')) {
    e.preventDefault();
    session.bury();
    return;
  }

  // View image
  if (matchesKey(e, 'viewImage')) {
    const q = session.question();
    if (q) {
      const imgName = q.imageName || q.cropName;
      if (imgName) {
        window.open('https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(imgName), '_blank');
      }
    }
    return;
  }

  // Go back in history
  if (matchesKey(e, 'goBack')) {
    e.preventDefault();
    session.goBackHistory();
    return;
  }

  // Forward from history
  if (matchesKey(e, 'forward')) {
    if (st === 'reviewing-history') {
      e.preventDefault();
      session.advanceFromHistory();
    }
    return;
  }
}
