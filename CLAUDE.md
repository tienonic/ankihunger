# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server (port 3000, HMR)
npm run build        # tsc -b && vite build (typecheck + production bundle)
npm run preview      # Preview production build
```

No test runner configured. Verify changes with `npm run build` (catches all TS errors).

## Architecture

SolidJS + TypeScript app with Vite. FSRS spaced repetition for flashcards/MCQ via ts-fsrs running inside a Web Worker with wa-sqlite (IndexedDB-backed).

### Two-Phase UI

`store/app.ts` has `appPhase` signal: `'launcher'` → `'study'`.
- **Launcher** (`components/launcher/`): project selection from registry or file drop
- **Study** (`components/layout/StudyApp.tsx`): header, tabs, sidebar, quiz/math sections

### Worker Architecture

`workers/db.worker.ts` — SQLite database in a Web Worker using wa-sqlite with IDBBatchAtomicVFS. All FSRS card state, scores, activity, notes, and review logs live in SQLite. Communication via typed request/response protocol (`workers/protocol.ts`). The hook `hooks/useWorker.ts` provides `workerApi` with typed methods and promise-based messaging.

Vite requires COOP/COEP headers for SharedArrayBuffer (wa-sqlite). These are set in `vite.config.ts`.

The WASM file must be at `public/wa-sqlite-async.wasm` — the worker locates it via `'/' + file`.

### State & Stores

Module-level signals (not context providers). Each store file exports signals and functions directly:
- `store/app.ts` — appPhase, activeProject, activeTab, easyMode, zenMode, syncActivity, noteBoxVisible, tipsVisible
- `store/project.ts` — project loading, registry/recent projects, worker card registration
- `store/quiz.ts` — `createQuizSession(section)` factory producing per-section quiz state. `sectionHandlers` Map stores active sessions for keyboard routing.
- `store/math.ts` — `createMathSession(section)` factory for math mode
- `store/glossary.ts` — glossary entries, relevance scoring, search filtering

### Quiz Session Pattern

`createQuizSession()` returns a bag of signals + async actions (pickNextCard, answer, rate, undo, suspend, bury, flashcard operations). Each section gets its own session instance stored in `sectionHandlers` Map keyed by section ID.

### Card ID Scheme

| Section Type | Card ID Format |
|---|---|
| mc-quiz | `{sectionId}-{questionIndex}` |
| passage-quiz | `{sectionId}-{scenarioIdx}-{questionIdx}` |
| flashcards | `{sectionId}-flash-{cardIndex}` |
| math-gen | None (generated dynamically) |

Built by the project loader at load time. `section.cardIds` = MCQ cards, `section.flashCardIds` = flashcard deck.

### Keyboard Routing

`hooks/useKeyboard.ts` — global keydown handler checks section type, delegates to MCQ/flashcard/math handlers. `/` opens note box. Space on checkboxes is blocked globally.

### Project Data

Built-in projects in `projects/<folder>/` with a `builder.ts` assembling from raw data modules. Registry in `projects/registry.ts`. Custom projects loaded via file drop, stored in localStorage as `proj-data-<slug>`.

## Conventions

- CSS in `src/index.css` using Tailwind v4 with `@theme` block for design tokens (warm beige palette). Old class names preserved (`.card`, `.option-btn`, `.rating-btn`, `.mode-toggle`, `.score-bar`).
- ts-fsrs `repeat()` returns `IPreview` — needs `as unknown as Record<number, ...>` cast for rating enum indexing.
- Worker messages serialize via promise chain — INIT must complete before LOAD_PROJECT.
- Activity entries capped at 200 per project.
- `index.old.html` and `js/` are the old vanilla JS codebase kept for reference.
