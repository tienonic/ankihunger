import { onMount, onCleanup } from 'solid-js';
import { activeTab, activeProject, setNoteBoxVisible, termsOpen, easyMode } from '../store/app.ts';
import { sectionHandlers } from '../store/sections.ts';
import { matchesKey } from '../../features/settings/keybinds.ts';
import type { MathSession } from '../../features/math/store.ts';
import type { QuizSession } from '../../features/quiz/store.ts';

export function useKeyboard() {
  function handler(e: KeyboardEvent) {
    const tag = e.target instanceof Element ? e.target.tagName : '';

    // Block Space from toggling checkboxes
    if (e.code === 'Space' && e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      e.preventDefault();
      return;
    }

    const tab = activeTab();
    const project = activeProject();
    if (!tab || !project) return;

    const section = project.sections.find(s => s.id === tab);
    if (!section) return;

    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    // When terms panel is open, let the terms filter consume printable keys
    if (termsOpen() && !e.ctrlKey && !e.metaKey && !e.altKey &&
        (e.key.length === 1 || e.key === 'Backspace')) return;

    // Note key: toggle note box
    if (matchesKey(e, 'note') && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      setNoteBoxVisible(true);
      return;
    }

    // Ignore when modifier keys are held (Ctrl+1 = Firefox tab switch, not answer)
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const session = sectionHandlers.get(tab);
    if (!session) return;

    if (section.type === 'math-gen') {
      handleMathKeyboard(e, session);
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

function handleFlashcardKeyboard(e: KeyboardEvent, session: QuizSession) {
  const isFlipped = session.flashFlipped();

  if (matchesKey(e, 'flipCard')) {
    e.preventDefault();
    session.flipFlash();
    return;
  }

  if (isFlipped) {
    if (matchesKey(e, 'answer1')) { e.preventDefault(); session.rateFlash(1).catch(() => {}); return; }
    if (matchesKey(e, 'answer2')) { e.preventDefault(); session.rateFlash(2).catch(() => {}); return; }
    if (matchesKey(e, 'answer3')) { e.preventDefault(); session.rateFlash(3).catch(() => {}); return; }
    if (matchesKey(e, 'answer4')) { e.preventDefault(); session.rateFlash(4).catch(() => {}); return; }
  }

  if (matchesKey(e, 'skip')) {
    e.preventDefault();
    if (isFlipped) {
      session.rateFlash(3).catch(() => {}); // Good
    } else {
      session.flipFlash();
    }
    return;
  }

  if (matchesKey(e, 'flipAlt')) {
    e.preventDefault();
    session.flipFlash();
    return;
  }
}

function handleAnswerKey(e: KeyboardEvent, session: QuizSession, st: string) {
  e.preventDefault();
  const answerActions = ['answer1', 'answer2', 'answer3', 'answer4'] as const;
  const idx = answerActions.findIndex(a => matchesKey(e, a));
  if (idx < 0) return;
  if (st === 'answering') {
    const opts = session.options();
    if (opts[idx]) session.answer(opts[idx]).catch(() => {});
  } else if (st === 'revealed') {
    session.rate(idx + 1).catch(() => {});
  }
}

function handleSpaceKey(e: KeyboardEvent, session: QuizSession, st: string) {
  e.preventDefault();
  if (st === 'reviewing-history') {
    session.advanceFromHistory();
  } else if (st === 'rated') {
    session.pickNextCard().catch(() => {});
  } else if (st === 'revealed') {
    if (easyMode()) session.rate(session.isCorrect() ? 3 : 1).catch(() => {});
  } else if (st === 'answering') {
    session.skip().catch(() => {});
  }
}

function handleForwardKey(e: KeyboardEvent, session: QuizSession, st: string) {
  e.preventDefault();
  if (st === 'reviewing-history') {
    session.advanceFromHistory();
  } else if (st === 'rated') {
    session.pickNextCard().catch(() => {});
  } else if (st === 'revealed' && easyMode()) {
    session.rate(session.isCorrect() ? 3 : 1).catch(() => {});
  }
  // answering → do nothing (can't go forward without answering)
}

function handleMcqKeyboard(e: KeyboardEvent, session: QuizSession) {
  const st = session.state();
  if (matchesKey(e, 'answer1') || matchesKey(e, 'answer2') || matchesKey(e, 'answer3') || matchesKey(e, 'answer4')) { handleAnswerKey(e, session, st); return; }
  if (matchesKey(e, 'skip')) { handleSpaceKey(e, session, st); return; }
  if (matchesKey(e, 'undo')) { e.preventDefault(); session.undo().catch(() => {}); return; }
  if (matchesKey(e, 'suspend')) { e.preventDefault(); session.suspend().catch(() => {}); return; }
  if (matchesKey(e, 'bury')) { e.preventDefault(); session.bury().catch(() => {}); return; }
  if (matchesKey(e, 'viewImage')) { const link = session.currentImageLink(); if (link) window.open(link, '_blank', 'noopener,noreferrer'); return; }
  if (matchesKey(e, 'goBack')) { e.preventDefault(); session.goBackHistory(); return; }
  if (matchesKey(e, 'forward')) { handleForwardKey(e, session, st); return; }
}
