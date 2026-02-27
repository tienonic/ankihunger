# Study Tool — FSRS-Powered Spaced Repetition

A project-based study platform powered by the FSRS algorithm (same as Anki). Load any subject as a JSON project file, or use the built-in Sac County Ag Inspector deck.

## Quick Start

ES modules require a local server:

```bash
npx serve .
# or: python -m http.server 8000
# or: VS Code Live Server extension
```

Open `http://localhost:3000`.

## Two Modes

### MCQ Mode (mc-quiz / passage-quiz)
Full FSRS spaced repetition with card scheduling.

- **FSRS algorithm** — cards are scheduled based on your recall strength
- **Rating** — Again / Hard / Good / Easy with interval preview
- **Easy Mode** — toggle auto-rates by answer speed (< 3s Easy, < 8s Good, 40s+ Hard, 59s Again)
- **Card actions** — Undo (Z), Suspend (S), Bury (B)
- **State badges** — NEW / LEARNING / REVIEW / RELEARNING
- **Terms panel** — glossary sidebar with relevance sorting per question
- **Flashcards** — flip-card mode for sections that include them
- **Leech detection** — flags cards you keep forgetting

| Key | Action |
|-----|--------|
| `1-4` | Select answer A-D (answering) / Rate Again-Easy (revealed) |
| `D` x2 | Skip ("I Don't Know") — auto-rates as Again |
| `Space` | Advance after rating |
| `Z` | Undo last review |
| `S` | Suspend card |
| `B` | Bury card (until tomorrow) |
| `R` | View image (if available) |
| `A` | Previous question |

### Math Mode (math-gen)
Practice drills with streak tracking. No FSRS (problems are randomly generated).

- **Category filters** — focus on conversions, averages, percentages, or decimals
- **Streak tracking** — current streak and best streak displayed
- **Step-by-step solutions** — shown on wrong answers and skips
- **Timer** — per-question timer

| Key | Action |
|-----|--------|
| `Enter` | Submit answer |
| `Space` / `D` | Next problem |
| `D` x2 | Skip ("I Don't Know") |

## Adding Projects

1. Create a `.json` file following the schema in `projects/README.md`
2. Load it via the launcher: click "Open Project File" or drag & drop
3. See `projects/example-chemistry.json` for a complete example

Progress is saved per-project in localStorage. The last project auto-loads on refresh.

## Project Structure

```
study-tool/
├── index.html                  # Launcher + study app shell
├── css/main.css                # All styles (warm beige theme)
├── js/
│   ├── main.js                 # Orchestrator — two-mode architecture
│   ├── classes/
│   │   ├── FSRS.js             # ts-fsrs CDN wrapper
│   │   ├── CardManager.js      # Card state, suspend/bury/leech, pickNext
│   │   ├── Project.js          # Project loading + validation
│   │   ├── SectionRenderer.js  # Dynamic DOM generation (MCQ vs Math)
│   │   ├── RatingUI.js         # Again/Hard/Good/Easy button strip
│   │   ├── Stats.js            # Session tracking (reviews, retention)
│   │   ├── State.js            # Per-project localStorage
│   │   ├── Timer.js            # Per-question timer
│   │   ├── Glossary.js         # Term panel + relevance sorting
│   │   ├── Migration.js        # One-time SM-2 → FSRS migration
│   │   └── Utils.js            # shuffle, pick, imgLink, round2
│   └── data/
│       ├── default-project.js  # Builds Ag Inspector project from raw data
│       ├── crops-raw.js        # Crop/tree identification data
│       ├── conservation-raw.js # Protected species data
│       ├── maps-raw.js         # Map drawing scenarios
│       ├── reading-raw.js      # Reading comprehension passages
│       ├── terms-raw.js        # Curated glossary terms
│       └── math.js             # Math problem generators (with steps)
└── projects/
    ├── README.md               # Project file schema documentation
    └── example-chemistry.json  # Example project file
```

## Architecture

```
Launcher → Project.js (load/validate JSON)
              ↓
         loadProject()
         ┌────┴────┐
     MCQ Mode    Math Mode
     ┌───────┐   ┌──────────┐
     │ FSRS  │   │ Streaks  │
     │ Cards │   │ Steps    │
     │ Terms │   │ Category │
     │ Easy  │   │ Filters  │
     └───┬───┘   └────┬─────┘
         └─────┬──────┘
          Shared Layer
        ┌──────────────┐
        │ Timer, Score  │
        │ Skip, Next    │
        │ State (LS)    │
        └──────────────┘
```

## Modifying the Default Project

The built-in Sac County Ag Inspector project is assembled from raw data files in `js/data/`. To modify:

- **Crops**: Edit `js/data/crops-raw.js` — questions auto-generate from crop data
- **Conservation**: Edit `js/data/conservation-raw.js` — 4 questions per species
- **Reading**: Edit `js/data/reading-raw.js` — passage-based scenarios
- **Maps**: Edit `js/data/maps-raw.js` — spatial reasoning scenarios
- **Math**: Edit `js/data/math.js` — generator functions with step-by-step solutions
- **Terms**: Edit `js/data/terms-raw.js` — curated glossary entries
- **Assembly**: Edit `js/data/default-project.js` — builds the project from raw data
