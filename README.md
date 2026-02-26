# Sacramento County Ag Inspector — Study Tool

Interactive study tool for Sacramento County Agricultural Inspector exam prep. Features spaced repetition (SM-2), a term definer, keyboard shortcuts, and timed questions.

## Quick Start

ES modules require a local server (won't work via `file://`). Pick one:

```bash
# Option A: npx (no install)
npx serve .

# Option B: Python
python -m http.server 8000

# Option C: VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

Then open `http://localhost:3000` (or whatever port).

## Project Structure

```
study-tool/
├── index.html              # HTML structure (no inline JS/CSS)
├── css/
│   └── main.css            # All styles, organized by section
├── js/
│   ├── main.js             # Entry point — imports, wires up, initializes
│   ├── classes/
│   │   ├── Utils.js         # shuffle, pick, round2, imgLink, domPrefix
│   │   ├── SRS.js           # SM-2 spaced repetition engine
│   │   ├── State.js         # localStorage persistence
│   │   ├── Timer.js         # Per-question countdown timer
│   │   └── Glossary.js      # Term definer + invisible weighting
│   └── data/
│       ├── crops.js         # Crop/tree identification data + questions
│       ├── maps.js          # Map drawing scenarios
│       ├── math.js          # Math problem generators
│       ├── reading.js       # Reading comprehension passages
│       ├── conservation.js  # Protected species data
│       └── terms.js         # Curated glossary terms
```

## Adding Content

### Add a new crop/tree

Edit `js/data/crops.js` — append to the `crops` array:

```js
{ name: 'Fig', category: 'Tree fruit', leaf: '...', bark: '...', distinguish: '...' }
```

Quiz questions are auto-generated from this data.

### Add a comparison question

Append to `extraCropQuestions` in `js/data/crops.js`:

```js
{ q: 'Your question?', correct: 'Answer', wrong: ['A', 'B', 'C'], cropName: 'Fig', explanation: 'Brief reason.' }
```

### Add a reading passage

Edit `js/data/reading.js` — append to `readPassages`:

```js
{ text: 'Passage text...', source: 'Cal. Code §...', questions: [ { q: '...', correct: '...', wrong: ['...'], explanation: '...' } ] }
```

### Add a conservation species

Edit `js/data/conservation.js` — append to `conservationSpecies`:

```js
{ name: '...', scientific: '...', status: '...', habitat: '...', id_features: '...', inspector_action: '...', distinguish: '...' }
```

### Add a glossary term

Edit `js/data/terms.js` — append to `curatedTerms`:

```js
{ term: 'Term Name', def: 'Definition text.' }
```

Users can also add terms at runtime via the Term Definer panel.

### Add a math category

Edit `js/data/math.js` — create a generator function and add it to `mathGenerators`:

```js
function genGeometry() {
  // return { q, a, u, ex }
}
export const mathGenerators = { ..., geometry: genGeometry };
```

Then add a button in `index.html` inside `#math-cats`.

## Features

| Feature | Description |
|---------|-------------|
| **SM-2 Spaced Repetition** | Questions you miss come back sooner. Mastered ones fade. |
| **Term Definer** | Collapsible bottom panel. Search 50+ ag terms. Add your own. |
| **Invisible Weighting** | Looking up a term silently penalizes related questions in SRS. |
| **Don't Know Button** | Skip without guessing. Shows correct answer, SRS quality = 0. |
| **Question Timer** | Counts up per question. Red after 15s. Stops at 59s. Visual only. |
| **Keyboard Shortcuts** | `A` = back, `D` = forward/skip, `Space` = advance after answer. |
| **View Image** | Google Images link for crop/species identification. |
| **LocalStorage** | Scores, SRS state, and custom terms persist across sessions. |

## Sections

1. **Crop & Tree ID** — 15 crops, 57+ questions, flashcard mode
2. **Map Drawing** — 4 spatial reasoning scenarios with tips
3. **Math Practice** — Unit conversions, averages, percentages, decimals
4. **Reading Comp** — Legal/regulatory passages with cited CA code sources
5. **Conservation** — 6 protected Sacramento County species

## Architecture

```
State (localStorage) ←→ SRS (SM-2 engine)
                           ↑
                     QuizEngine (main.js)
                      ↗    ↑    ↘
               Glossary  Timer  Data files
```

- **SRS.js** — Pure algorithm, no DOM. Testable independently.
- **State.js** — Serialization layer. Knows about SRS + scores.
- **Glossary.js** — Manages terms + invisible weighting + panel UI.
- **Timer.js** — Lightweight interval wrapper.
- **main.js** — Orchestrator. All DOM wiring happens here.
- **data/** — Pure data exports. Edit these to change content.
