# Creating Study Projects

Drop `.json` files in this folder and load them via the "Open Project File" button in the launcher.

---

## Quick Start

1. Copy `example-chemistry.json` from this folder
2. Edit it with your own content
3. Open the study tool, click "Open Project File", select your `.json`
4. Study!

Your progress is saved per-project in localStorage. Reload the page and it auto-loads your last project.

---

## Project File Schema (v1)

```json
{
  "name": "Your Project Name",
  "version": 1,
  "config": {
    "desired_retention": 0.9,
    "new_per_session": 20,
    "leech_threshold": 8,
    "imageSearchSuffix": ""
  },
  "sections": [ ... ],
  "glossary": [ ... ]
}
```

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name shown in header and launcher |
| `version` | number | No | Schema version, always `1` for now |
| `config` | object | No | FSRS algorithm settings (defaults shown above) |
| `sections` | array | Yes | Array of section objects (see below) |
| `glossary` | array | No | Array of glossary term objects |

### Config Options

| Field | Default | Description |
|-------|---------|-------------|
| `desired_retention` | `0.9` | Target recall probability (0.0–1.0). Higher = more reviews, better retention |
| `new_per_session` | `20` | Max new cards introduced per day |
| `leech_threshold` | `8` | Number of lapses before a card is flagged as a leech |
| `imageSearchSuffix` | `""` | Appended to image search queries (e.g., `"plant identification"`) |

---

## Section Types

There are 3 section types. Each section needs an `id`, `name`, and `type`.

### 1. `mc-quiz` — Multiple Choice Quiz

Standard flashcard-style questions with one correct answer and 3 wrong answers.

```json
{
  "id": "elements",
  "name": "Element Identification",
  "type": "mc-quiz",
  "hasFlashcards": false,
  "hasImages": false,
  "questions": [
    {
      "q": "What is the atomic number of Carbon?",
      "correct": "6",
      "wrong": ["8", "12", "14"],
      "explanation": "Carbon has 6 protons in its nucleus.",
      "imageName": ""
    }
  ]
}
```

#### Question Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | The question text |
| `correct` | string | Yes | The correct answer |
| `wrong` | string[] | Yes | Exactly 3 wrong answers |
| `explanation` | string | No | Shown after answering (correct or wrong) |
| `imageName` | string | No | If set, adds a "View Image" Google Images link for this term |

> **Backward compat:** `cropName` is still accepted as an alias for `imageName`.

#### Optional Section Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `hasFlashcards` | boolean | `false` | Enable flashcard mode toggle |
| `hasImages` | boolean | `false` | Show "View Image" links (uses `imageName`) |
| `flashcards` | array | `[]` | Flashcard data (see Flashcards section below) |

### 2. `passage-quiz` — Passage-Based Quiz

Shows a reading passage, then asks multiple choice questions about it. Good for reading comprehension, legal text, case studies.

```json
{
  "id": "reactions",
  "name": "Chemical Reactions",
  "type": "passage-quiz",
  "instruction": "Read the passage, then answer the question.",
  "hasFlashcards": false,
  "hasImages": false,
  "scenarios": [
    {
      "passage": "In an exothermic reaction, energy is released to the surroundings, usually as heat. The products have less energy than the reactants. Common examples include combustion, neutralization, and many oxidation reactions. The enthalpy change (ΔH) for exothermic reactions is negative.",
      "source": "General Chemistry, Ch. 5",
      "questions": [
        {
          "q": "In an exothermic reaction, what happens to energy?",
          "correct": "Energy is released to the surroundings",
          "wrong": ["Energy is absorbed from surroundings", "Energy remains constant", "Energy is destroyed"],
          "explanation": "Exo = out. Energy flows out to surroundings."
        },
        {
          "q": "The enthalpy change (ΔH) for an exothermic reaction is:",
          "correct": "Negative",
          "wrong": ["Positive", "Zero", "Undefined"],
          "explanation": "Negative ΔH means energy was released."
        }
      ]
    }
  ],
  "tips": [
    "Read the entire passage before answering",
    "Look for keywords like 'shall', 'must', 'may' in legal texts"
  ]
}
```

#### Section Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `instruction` | string | No | Heading shown above the passage. Default: `"Read the passage, then answer the question."` |

#### Scenario Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `passage` | string | Yes | The reading passage shown above the questions |
| `source` | string | No | Citation/source shown below the passage in italics |
| `questions` | array | Yes | Array of question objects (same format as mc-quiz) |

#### Optional Section Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `tips` | string[] | `[]` | Tips shown in a checklist card above the quiz |

### 3. `math-gen` — Generated Math Problems

Dynamically generates math problems. Uses built-in generators — you just list which ones to include.

```json
{
  "id": "math",
  "name": "Math Practice",
  "type": "math-gen",
  "hasFlashcards": false,
  "hasImages": false,
  "generators": ["conversion", "average", "percent", "decimal"]
}
```

#### Available Generators

| Generator | Description | Example |
|-----------|-------------|---------|
| `conversion` | Unit conversions (oz↔lb, ft↔mi, sqft↔acres) | "Convert 48 ounces to pounds" |
| `average` | Average of 3–6 random values | "Weights: 3.2, 5.1, 4.7. Average?" |
| `percent` | Percentage calculations | "15 out of 80 defective. Percentage?" |
| `decimal` | Basic decimal arithmetic | "3.14 + 2.86 = ?" |

Wrong answers show step-by-step solutions automatically.

---

## Flashcards

Any `mc-quiz` section can include flashcards by setting `hasFlashcards: true` and providing a `flashcards` array:

```json
{
  "id": "elements",
  "name": "Elements",
  "type": "mc-quiz",
  "hasFlashcards": true,
  "questions": [ ... ],
  "flashcards": [
    {
      "front": "Carbon",
      "back": "<strong>Atomic #:</strong> 6<br><strong>Symbol:</strong> C<br><strong>Group:</strong> Nonmetal"
    },
    {
      "front": "Oxygen",
      "back": "<strong>Atomic #:</strong> 8<br><strong>Symbol:</strong> O<br><strong>Group:</strong> Nonmetal"
    }
  ]
}
```

The `back` field supports HTML for formatting (`<strong>`, `<br>`, `<em>`, etc.).

---

## Glossary

The glossary appears in the right sidebar. Terms relevant to the current question are shown first.

```json
"glossary": [
  {
    "term": "Exothermic",
    "def": "A reaction that releases energy (heat) to the surroundings. ΔH is negative.",
    "hasImage": false
  },
  {
    "term": "Endothermic",
    "def": "A reaction that absorbs energy from the surroundings. ΔH is positive."
  },
  {
    "term": "Catalyst",
    "def": "Substance that speeds up a reaction without being consumed."
  }
]
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `term` | string | Yes | The term name |
| `def` | string | Yes | Definition text |
| `hasImage` | boolean | No | If `true`, adds a "View" link to Google Images for the term |

> **Backward compat:** `isCrop` is still accepted as an alias for `hasImage`.

Users can also add their own terms via the panel UI — those are saved in localStorage.

---

## Full Example: Chemistry 101

See `example-chemistry.json` in this folder for a complete working project.

---

## Tips for Creating Good Projects

- **3 wrong answers per question** — always exactly 3. Make them plausible but clearly wrong.
- **Keep explanations short** — 1-2 sentences. They show in a small feedback box.
- **Use `imageName`** for any visual subject — it creates a Google Images link so users can see what they're studying.
- **Group related questions into passage-quiz sections** when they share context (a reading passage, a case study, a diagram description).
- **Glossary terms are invisible study aids** — when a user looks up a term, the SRS quietly schedules related questions more frequently. This is a feature, not a bug.
- **Section IDs must be unique** within a project and should be simple lowercase strings (e.g., `"elements"`, `"reactions"`, `"math"`). No spaces or special characters.
