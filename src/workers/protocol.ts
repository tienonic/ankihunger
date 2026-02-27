// Worker message types

export type WorkerRequest =
  | { type: 'INIT' }
  | { type: 'LOAD_PROJECT'; projectId: string; sectionIds: string[]; cardIds: { sectionId: string; cardId: string; cardType: 'mcq' | 'passage' | 'flashcard' }[] }
  | { type: 'PICK_NEXT'; projectId: string; sectionIds: string[]; newPerSession: number }
  | { type: 'PREVIEW_RATINGS'; cardId: string; retention?: number }
  | { type: 'REVIEW_CARD'; cardId: string; projectId: string; sectionId: string; rating: number; elapsedMs: number; retention?: number }
  | { type: 'UNDO_REVIEW'; cardId: string }
  | { type: 'SUSPEND_CARD'; cardId: string }
  | { type: 'BURY_CARD'; cardId: string }
  | { type: 'UNBURY_ALL'; projectId: string }
  | { type: 'COUNT_DUE'; projectId: string; sectionIds: string[] }
  | { type: 'UPDATE_SCORE'; projectId: string; sectionId: string; correct: boolean }
  | { type: 'GET_SCORES'; projectId: string }
  | { type: 'RESET_SECTION'; projectId: string; sectionId: string }
  | { type: 'ADD_ACTIVITY'; projectId: string; sectionId: string; rating: number; correct: boolean }
  | { type: 'GET_ACTIVITY'; projectId: string; limit?: number }
  | { type: 'CLEAR_ACTIVITY'; projectId: string }
  | { type: 'ADD_NOTE'; projectId: string; text: string }
  | { type: 'GET_NOTES'; projectId: string }
  | { type: 'ADD_USER_TERM'; projectId: string; term: string; definition: string }
  | { type: 'GET_USER_TERMS'; projectId: string }
  | { type: 'DELETE_USER_TERM'; id: string }
  | { type: 'GET_CARD_STATE'; cardId: string }
  | { type: 'GET_HOTKEYS' }
  | { type: 'SET_HOTKEY'; action: string; binding: string; context: string }
  | { type: 'IMPORT_LEGACY'; projectId: string; data: unknown }
  | { type: 'GET_REVIEW_LOG'; projectId: string; limit?: number }
  | { type: 'GET_FSRS_PARAMS'; projectId: string }
  | { type: 'SET_FSRS_PARAMS'; projectId: string; weights: number[]; retention: number };

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
