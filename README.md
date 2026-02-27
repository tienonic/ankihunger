# Study Tool — FSRS Spaced Repetition

Load any subject as a JSON file. Uses the FSRS algorithm (same as Anki) for scheduling MCQ and flashcard decks.

## Quick Start

```bash
npx serve .
# or: python -m http.server 8000
```

Open `http://localhost:3000`. Click "Connect Folder" on the launcher to save state as files in each project's directory.

## Modes

### MCQ (mc-quiz / passage-quiz)

FSRS spaced repetition with rating, card actions, and leech detection.

| Key | Action |
|-----|--------|
| `1-4` | Select answer / Rate |
| `D` x2 | Skip (rates as Again) |
| `Space` | Advance |
| `Z` | Undo |
| `S` | Suspend card |
| `B` | Bury card (until tomorrow) |
| `R` | View image |
| `A` | Previous question |

### Flashcards

FSRS-scheduled flashcard deck. Flip to reveal, then rate.

| Key | Action |
|-----|--------|
| `Space` / `F` | Flip card |
| `1-4` | Rate Again/Hard/Good/Easy (when flipped) |
| `D` | Flip or rate Good |

### Math (math-gen)

Random drills with streak tracking and step-by-step solutions.

| Key | Action |
|-----|--------|
| `Enter` | Submit |
| `Space` / `D` | Next problem |
| `D` x2 | Skip |

### Global

| Key | Action |
|-----|--------|
| `/` | Quick note (saved per-project with timestamp) |

## Data Storage

Click "Connect Folder" to grant filesystem access to the `projects/` directory. State saves as `state.json` inside each project's folder (cards, scores, glossary, notes, activity). Falls back to localStorage if not connected.

## Adding Projects

1. Create a `.json` file following the format in `projects/README.md`
2. Load via "Open Project File" or drag & drop
3. See `projects/example-chemistry.json` for a working example

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
│   │   ├── State.js            # Per-project state (filesystem + localStorage)
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
