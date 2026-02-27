export interface CardRow {
  card_id: string;
  project_id: string;
  section_id: string;
  card_type: 'mcq' | 'passage' | 'flashcard';
  fsrs_state: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  last_review: string | null;
  suspended: number;
  buried: number;
  leech: number;
  updated_at: string;
  updated_by: string;
}

export interface ReviewLogRow {
  id: string;
  card_id: string;
  project_id: string;
  rating: number;
  review_time: string;
  elapsed_ms: number | null;
  new_state: number | null;
  new_stability: number | null;
  new_difficulty: number | null;
  scheduled_days: number | null;
  was_assisted: number;
  section_id: string | null;
  device_id: string;
}

export interface ScoreRow {
  project_id: string;
  section_id: string;
  correct: number;
  attempted: number;
  updated_at: string;
}

export interface ActivityRow {
  id: string;
  project_id: string;
  section_id: string | null;
  rating: number;
  correct: number;
  timestamp: string;
  device_id: string;
}

export interface NoteRow {
  id: string;
  project_id: string;
  text: string;
  created_at: string;
  device_id: string;
}

export interface UserTermRow {
  id: string;
  project_id: string;
  term: string;
  definition: string;
  created_at: string;
  deleted: number;
  device_id: string;
}

export interface FSRSParamsRow {
  project_id: string;
  weights_json: string;
  retention: number;
  updated_at: string | null;
}
