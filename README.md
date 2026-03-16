# Study Tool

## Current Status

Active work-in-progress. The app is fully functional — FSRS scheduling, MCQ/flashcard/math modes, activity tracking, cram mode, and all core features work. There are known bugs being actively addressed. Contributions and feedback welcome.

---

Spaced repetition study app using the FSRS algorithm (same scheduling as Anki). Load any subject as a JSON file and study with MCQ quizzes, flashcards, and math drills. All card state persists locally in an IndexedDB-backed SQLite database.

Built with SolidJS, TypeScript, and Vite.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Pick a built-in project or drop a JSON file onto the launcher.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (port 3000, HMR) |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Serve the production build locally |

## Features

- **FSRS spaced repetition** — cards are scheduled using the Free Spaced Repetition Scheduler algorithm via ts-fsrs
- **Multiple quiz modes** — MCQ, passage-based reading comprehension, flashcards with 3D flip, and random math drills
- **Offline-first** — SQLite database runs in a Web Worker (wa-sqlite with IndexedDB backing). No server required
- **Activity tracking** — per-section or combined activity chart in the sidebar
- **Glossary** — context-aware term panel with relevance scoring and search
- **Notes** — quick timestamped notes per project (press `/`)
- **Customizable keybinds** — rebind any keyboard shortcut from the Keys panel
- **Settings** — tune FSRS parameters (desired retention, new cards per session, leech threshold)
- **Cram mode** — review all cards in a section by weakest stability, ignoring due dates
- **Easy mode** — auto-rates cards as Good for faster review
- **Zen mode** — hides score bar and progress indicators
- **Custom projects** — create your own subjects as JSON files (see `projects/README.md`)

## Keyboard Shortcuts

All shortcuts can be rebound via the **Keys** button in the header.

### MCQ / Quiz

| Default Key | Action |
|-------------|--------|
| `1`-`4` | Select answer / Rate card |
| `D` | Skip (double-tap) / Next |
| `Z` | Undo last action |
| `S` | Suspend card |
| `B` | Bury card (skip until tomorrow) |
| `R` | View image |
| `A` | Go back to previous question |

### Flashcards

| Default Key | Action |
|-------------|--------|
| `Space` / `F` | Flip card |
| `1`-`4` | Rate (Again / Hard / Good / Easy) |
| `D` | Flip or rate Good |

### Math

| Default Key | Action |
|-------------|--------|
| `Enter` | Submit answer |
| `D` | Skip / Next problem |

### Global

| Default Key | Action |
|-------------|--------|
| `/` | Open quick note |

## Adding Projects

1. Create a `.json` file following the format in [`projects/README.md`](projects/README.md)
2. Drop it onto the launcher or use "Open Project File"
3. See [`projects/example-chemistry.json`](projects/example-chemistry.json) for a working example

Custom projects are stored in localStorage.

## Architecture

```
src/
├── App.tsx                          # Root: launcher or study phase
├── main.tsx                         # Entry point
├── index.css                        # @import per-feature CSS + @theme tokens + responsive rules
├── core/                            # Shared infrastructure
│   ├── store/app.ts                 # Phase, active project/tab, toggles
│   ├── store/sections.ts            # sectionHandlers Map + keyboard routing
│   ├── hooks/                       # useWorker, useKeyboard, useTimer, useLatex
│   └── workers/                     # db.worker.ts (SQLite+FSRS), protocol.ts
├── features/                        # Self-contained feature folders
│   ├── launcher/                    # Project selection, file drop, recent projects
│   ├── quiz/                        # MCQ + flashcard (shared session/score/cram)
│   ├── math/                        # Math mode with categories + KaTeX
│   ├── activity/                    # Sidebar chart + stats widget
│   ├── glossary/                    # Terms dropdown with relevance scoring
│   ├── ai/                          # AI assistant panel (Claude CLI bridge)
│   ├── notes/                       # Note input (/ key)
│   └── settings/                    # FSRS settings, keybinds, tips
├── components/                      # Shared display components
│   ├── LatexText.tsx
│   └── layout/                      # StudyApp shell, Header, TopToggles, SectionsContainer
├── projects/                        # Data types, loader, registry, built-in projects
├── data/                            # Math problem generators
└── utils/                           # shuffle, formatting, ID helpers
```

### Key Design Decisions

- **Two-phase UI**: `appPhase` signal switches between `'launcher'` and `'study'` — no router needed
- **Worker-based persistence**: All database operations run in a Web Worker. Messages are serialized via a promise chain to prevent race conditions
- **Session factories**: `createQuizSession()` and `createMathSession()` produce independent signal bundles per section, stored in a `sectionHandlers` Map for keyboard routing
- **Module-level state**: Stores export signals directly rather than using context providers — simpler for a single-page app with no nested routing

## Tech Stack

| Library | Purpose |
|---------|---------|
| [SolidJS](https://www.solidjs.com/) | Reactive UI framework |
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | FSRS spaced repetition algorithm |
| [wa-sqlite](https://rhashimoto.github.io/wa-sqlite/) | SQLite compiled to WASM (IndexedDB VFS) |
| [KaTeX](https://katex.org/) | LaTeX math rendering |
| [Vite](https://vite.dev/) | Build tool + dev server |

## Browser Requirements

Requires a modern browser with Web Worker, SharedArrayBuffer, and IndexedDB support. The dev server sets the required COOP/COEP headers automatically.

