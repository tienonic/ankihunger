import { onMount, onCleanup } from 'solid-js';
import { activeTab, activeProject, setNoteBoxVisible } from '../store/app.ts';
import { sectionHandlers } from '../store/quiz.ts';
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
        // Only Enter is handled from input in math mode (component handles it via onKeyDown)
        return;
      }
    } else {
      // Non-math: skip all input/textarea
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    }

    // / key: toggle note box
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
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
  if (e.code === 'Space' || e.key === 'd' || e.key === 'D' || e.key === 'Enter') {
    e.preventDefault();
    if (session.state() === 'revealed') {
      session.nextProblem();
    } else if (session.state() === 'answering') {
      // armSkip: first press sets pending, second press skips
      session.armSkip();
    }
  }
}

function handleFlashcardKeyboard(e: KeyboardEvent, session: NonNullable<ReturnType<typeof sectionHandlers.get>>) {
  const isFlipped = session.flashFlipped();

  // Space: flip
  if (e.code === 'Space') {
    e.preventDefault();
    session.flipFlash();
    return;
  }

  // 1-4: rate (only when flipped)
  if (isFlipped && e.key >= '1' && e.key <= '4') {
    e.preventDefault();
    const ratings = [1, 2, 3, 4];
    session.rateFlash(ratings[parseInt(e.key) - 1]);
    return;
  }

  // D: rate Good shortcut when flipped, flip when not
  if (e.key === 'd' || e.key === 'D') {
    e.preventDefault();
    if (isFlipped) {
      session.rateFlash(3); // Good
    } else {
      session.flipFlash();
    }
    return;
  }

  // F: flip
  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    session.flipFlash();
    return;
  }
}

function handleMcqKeyboard(e: KeyboardEvent, session: NonNullable<ReturnType<typeof sectionHandlers.get>>) {
  const st = session.state();

  // 1-4: answer or rate
  if (e.key >= '1' && e.key <= '4') {
    e.preventDefault();
    if (st === 'answering') {
      const opts = session.options();
      const idx = parseInt(e.key) - 1;
      if (opts[idx]) session.answer(opts[idx]);
    } else if (st === 'revealed') {
      session.rate(parseInt(e.key));
    }
    return;
  }

  // Space/D: skip (double-tap) or advance
  if (e.code === 'Space' || e.key === 'd' || e.key === 'D') {
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
        // Set pending — next press will skip
        // We need a way to set pending. For now, use skip on double-tap.
        // The pending signal is read-only from outside, but we can call skip directly
        // Actually, in the old code, pending is toggled on first press, skip on second.
        // We'll just call skip() which handles the flow correctly.
        session.skip();
      }
    } else if (st === 'done') {
      // No action
    }
    return;
  }

  // Z — undo
  if (e.key === 'z' || e.key === 'Z') {
    e.preventDefault();
    session.undo();
    return;
  }

  // S — suspend
  if (e.key === 's' || e.key === 'S') {
    e.preventDefault();
    session.suspend();
    return;
  }

  // B — bury
  if (e.key === 'b' || e.key === 'B') {
    e.preventDefault();
    session.bury();
    return;
  }

  // R — view image
  if (e.key === 'r' || e.key === 'R') {
    const q = session.question();
    if (q) {
      const imgName = q.imageName || q.cropName;
      if (imgName) {
        window.open('https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(imgName), '_blank');
      }
    }
    return;
  }

  // A — go back in history
  if (e.key === 'a' || e.key === 'A') {
    e.preventDefault();
    session.goBackHistory();
    return;
  }

  // ArrowRight — forward from history
  if (e.key === 'ArrowRight') {
    if (st === 'reviewing-history') {
      e.preventDefault();
      session.advanceFromHistory();
    }
    return;
  }
}
