export type WorkerRequest =
  | { type: 'INIT' }
  | { type: 'LOAD_PROJECT'; projectId: string; sectionIds: string[]; cardIds: { sectionId: string; cardId: string; cardType: 'mcq' | 'passage' | 'flashcard' }[] }
  | { type: 'PICK_NEXT'; projectId: string; sectionIds: string[]; newPerSession: number; cardType?: 'mcq' | 'passage' | 'flashcard' }
  | { type: 'PICK_NEXT_OVERRIDE'; projectId: string; sectionIds: string[]; cardType?: 'mcq' | 'passage' | 'flashcard'; excludeIds?: string[] }
  | { type: 'RESET_NEW_COUNT' }
  | { type: 'PREVIEW_RATINGS'; cardId: string; retention?: number }
  | { type: 'REVIEW_CARD'; cardId: string; projectId: string; sectionId: string; rating: number; elapsedMs: number; retention?: number }
  | { type: 'UNDO_REVIEW'; cardId: string }
  | { type: 'SUSPEND_CARD'; cardId: string }
  | { type: 'BURY_CARD'; cardId: string }
  | { type: 'UNBURY_ALL'; projectId: string }
  | { type: 'COUNT_DUE'; projectId: string; sectionIds: string[]; cardType?: 'mcq' | 'passage' | 'flashcard' }
  | { type: 'UPDATE_SCORE'; projectId: string; sectionId: string; correct: boolean }
  | { type: 'GET_SCORES'; projectId: string }
  | { type: 'RESET_SECTION'; projectId: string; sectionId: string }
  | { type: 'ADD_ACTIVITY'; projectId: string; sectionId: string; rating: number; correct: boolean }
  | { type: 'GET_ACTIVITY'; projectId: string; limit?: number }
  | { type: 'CLEAR_ACTIVITY'; projectId: string }
  | { type: 'ADD_NOTE'; projectId: string; text: string }
  | { type: 'GET_HOTKEYS' }
  | { type: 'SET_HOTKEY'; action: string; binding: string; context: string }
  | { type: 'GET_REVIEW_LOG'; projectId: string; limit?: number }
  | { type: 'SET_FSRS_PARAMS'; projectId: string; retention: number }
  | { type: 'GET_PERFORMANCE_CARDS'; projectId: string };

export interface WorkerResponse {
  id: number;
  type: 'RESULT' | 'ERROR';
  data?: unknown;
  error?: string;
}

export interface WorkerMessage {
  id: number;
  request: WorkerRequest;
}
