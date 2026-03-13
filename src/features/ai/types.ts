export interface PerformanceCard {
  card_id: string;
  section_id: string;
  card_type: string;
  fsrs_state: number;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
}

export interface SectionScore {
  section_id: string;
  correct: number;
  attempted: number;
}

export interface ReviewEntry {
  card_id: string;
  rating: number;
  review_time: string;
  section_id: string;
  new_state: number;
  new_stability: number;
  new_difficulty: number;
}

export interface PerformanceSummary {
  projectName: string;
  sections: {
    id: string;
    name: string;
    accuracy: number;
    attempted: number;
    weakCards: number;
    avgStability: number;
  }[];
  weakCards: {
    cardId: string;
    sectionId: string;
    lapses: number;
    stability: number;
    difficulty: number;
  }[];
  recentAccuracy: number;
  totalReviews: number;
  totalCards: number;
}

export interface GeneratedQuestion {
  q: string;
  correct: string;
  wrong: string[];
  explanation?: string;
}

export type AITab = 'insights' | 'generate' | 'targeted';
