# Study Tool — FSRS Spaced Repetition

Load any subject as a JSON file. Uses the FSRS algorithm (same as Anki) for scheduling.

## Quick Start

```bash
npx serve .
# or: python -m http.server 8000
```

Open `http://localhost:3000`.

## Modes

### MCQ (mc-quiz / passage-quiz)

FSRS spaced repetition with rating, card actions, flashcards, and leech detection.

| Key | Action |
|-----|--------|
| `1-4` | Select answer / Rate |
| `D` x2 | Skip (rates as Again) |
| `Space` | Advance / Flip flashcard |
| `Z` | Undo |
| `S` | Suspend card |
| `B` | Bury card (until tomorrow) |
| `R` | View image |
| `A` | Previous question |

### Math (math-gen)

Random drills with streak tracking and step-by-step solutions.

| Key | Action |
|-----|--------|
| `Enter` | Submit |
| `Space` / `D` | Next problem |
| `D` x2 | Skip |

## Adding Projects

1. Create a `.json` file following the format in `projects/README.md`
2. Load via "Open Project File" or drag & drop
3. See `projects/example-chemistry.json` for a working example

Progress saves per-project in localStorage.

## Project Structure

```
study-tool/
├── index.html
├── css/main.css
├── js/
│   ├── main.js                 # App orchestrator
│   ├── classes/
│   │   ├── FSRS.js             # ts-fsrs wrapper
│   │   ├── CardManager.js      # Card state, suspend/bury/leech
│   │   ├── Project.js          # Project loading + validation
│   │   ├── SectionRenderer.js  # DOM generation
│   │   ├── RatingUI.js         # Again/Hard/Good/Easy buttons
│   │   ├── Stats.js            # Session stats
│   │   ├── State.js            # Per-project localStorage
│   │   ├── Timer.js            # Per-question timer
│   │   ├── Glossary.js         # Term panel + relevance sorting
│   │   ├── ActivityScore.js    # Activity trendline
│   │   ├── Migration.js        # SM-2 → FSRS migration
│   │   └── Utils.js            # shuffle, pick, imgLink, round2
│   └── data/
│       └── math.js             # Math problem generators
└── projects/
    ├── README.md               # Project file format docs
    ├── example-chemistry.json  # Example project
    ├── registry.js             # Built-in project registry
    └── ag-inspector/           # Built-in Ag Inspector project
        ├── builder.js          # Assembles project from raw data
        ├── crops-raw.js        # Crop/tree identification
        ├── conservation-raw.js # Protected species
        ├── maps-raw.js         # Map drawing scenarios
        ├── reading-raw.js      # Reading comprehension
        └── terms-raw.js        # Glossary terms
```
