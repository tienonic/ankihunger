CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  config_json TEXT NOT NULL,
  is_builtin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cards (
  card_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  card_type TEXT NOT NULL CHECK(card_type IN ('mcq','passage','flashcard')),
  fsrs_state INTEGER DEFAULT 0,
  due TEXT DEFAULT (datetime('now')),
  stability REAL DEFAULT 0,
  difficulty REAL DEFAULT 0,
  elapsed_days INTEGER DEFAULT 0,
  scheduled_days INTEGER DEFAULT 0,
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  last_review TEXT,
  suspended INTEGER DEFAULT 0,
  buried INTEGER DEFAULT 0,
  leech INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by TEXT DEFAULT 'local'
);

CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due);
CREATE INDEX IF NOT EXISTS idx_cards_section ON cards(section_id);
CREATE INDEX IF NOT EXISTS idx_cards_project ON cards(project_id);

CREATE TABLE IF NOT EXISTS review_log (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  review_time TEXT NOT NULL,
  elapsed_ms INTEGER,
  new_state INTEGER,
  new_stability REAL,
  new_difficulty REAL,
  scheduled_days INTEGER,
  was_assisted INTEGER DEFAULT 0,
  section_id TEXT,
  device_id TEXT DEFAULT 'local'
);

CREATE TABLE IF NOT EXISTS scores (
  project_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  correct INTEGER DEFAULT 0,
  attempted INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (project_id, section_id)
);

CREATE TABLE IF NOT EXISTS activity (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  section_id TEXT,
  rating INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  device_id TEXT DEFAULT 'local'
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  device_id TEXT DEFAULT 'local'
);

CREATE TABLE IF NOT EXISTS user_terms (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  deleted INTEGER DEFAULT 0,
  device_id TEXT DEFAULT 'local'
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS hotkeys (
  action TEXT PRIMARY KEY,
  binding TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT 'global',
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS fsrs_params (
  project_id TEXT PRIMARY KEY,
  weights_json TEXT NOT NULL,
  retention REAL DEFAULT 0.9,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
