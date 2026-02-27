# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running

Static site — requires a local server for ES modules:
```bash
npx serve .
```
Opens at `http://localhost:3000`. No build step, no dependencies to install.

## Architecture

**main.js** is the sole orchestrator (~1500 lines). It imports all classes, manages global state (`project`, `engine`, `cardMgr`, `state`, `timer`, `glossary`, `stats`, `ratingUI`), and handles two completely separate execution paths:

- **MCQ mode** (mc-quiz / passage-quiz): FSRS spaced repetition, 4-point rating, card actions (undo/suspend/bury), leech detection
- **Math mode** (math-gen): streak tracking, category filters, step-by-step solutions — no FSRS

**Flashcards** are a sub-mode of MCQ sections with their own FSRS deck (`flashCardIds` separate from `cardIds`).

### Key Flow

1. `initLauncher()` → user picks project (registry or file drop)
2. `loadProject(data)` → creates Project, FSRSEngine, CardManager, State
3. `State.loadFromFile()` (filesystem) or `state.load()` (localStorage fallback)
4. `SectionRenderer.render()` builds all section DOM dynamically
5. `wireEvents()` sets up delegated click/keyboard handlers
6. `activateTab(sectionId)` switches between sections

### Dual Storage (State.js)

Primary: File System Access API → `projects/<folder>/state.json`
Fallback: localStorage (always written as sync backup)

`save()` writes both. `loadFromFile()` tries filesystem first. Directory handle persisted in IndexedDB across sessions via `requestAccess()`/`restoreAccess()`.

### Card ID Scheme

| Section Type | Card ID Format |
|---|---|
| mc-quiz | `{sectionId}-{questionIndex}` |
| passage-quiz | `{sectionId}-{scenarioIdx}-{questionIdx}` |
| flashcards | `{sectionId}-flash-{cardIndex}` |
| math-gen | None (generated dynamically) |

Built by `Project._buildCardIds()` at load time. `section.cardIds` = MCQ cards, `section.flashCardIds` = flashcard deck.

### CardManager Priority Queue (pickNext)

1. Learning/Relearning due (oldest first)
2. Review due (oldest first)
3. New cards (capped at `newPerSession`, default 20)
4. Weakest card (lowest stability)

### Keyboard Routing

`handleKeyboard()` → checks mode → delegates to `handleMcqKeyboard()`, `handleFlashcardKeyboard()`, or `handleMathKeyboard()`. Space on checkboxes is globally blocked (preventDefault) to avoid accidental toggles.

### Event Wiring

All section events use delegated listeners on `#sections-container` with `data-*` attributes (`data-action`, `data-section`, `data-mode`). No per-element listeners on dynamic content.

## Project Registry

Built-in projects live in `projects/<folder>/` with a `builder.js` that assembles from raw data modules. Registry entries in `projects/registry.js` map `slug` → `folder` → `loader()`.

Custom projects are loaded via file picker/drag-drop and stored in localStorage (`proj-data-<slug>`). Their FSRS state saves to `projects/<slug>/state.json` when filesystem is connected.

## Conventions

- All CSS in single `css/main.css` with numbered section comments
- CSS variables defined in `:root` for theming (warm beige palette)
- No framework — vanilla JS with ES modules
- Scores compressed as `{c, a}` (correct, attempted) in storage
- Activity entries capped at 200 per project
