import { createSignal, onCleanup } from 'solid-js';
import type { WorkerRequest, WorkerResponse, WorkerMessage } from '../workers/protocol.ts';

let worker: Worker | null = null;
let msgId = 0;
const pending = new Map<number, { resolve: (data: unknown) => void; reject: (err: Error) => void }>();
let initPromise: Promise<void> | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/db.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { id, type, data, error } = e.data;
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);
      if (type === 'ERROR') {
        entry.reject(new Error(error ?? 'Worker error'));
      } else {
        entry.resolve(data);
      }
    };
    worker.onerror = (e) => {
      console.error('Worker error:', e);
      for (const [id, entry] of pending) {
        entry.reject(new Error('Worker crashed'));
      }
      pending.clear();
    };
  }
  return worker;
}

export async function sendWorkerMessage<T = unknown>(request: WorkerRequest): Promise<T> {
  const w = getWorker();
  const id = ++msgId;
  const msg: WorkerMessage = { id, request };
  return new Promise<T>((resolve, reject) => {
    pending.set(id, {
      resolve: resolve as (data: unknown) => void,
      reject,
    });
    w.postMessage(msg);
  });
}

export async function initWorker(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = sendWorkerMessage({ type: 'INIT' }).then(() => {});
  return initPromise;
}

// Typed shortcuts
export const workerApi = {
  init: () => sendWorkerMessage({ type: 'INIT' }),

  loadProject: (projectId: string, sectionIds: string[], cardIds: { sectionId: string; cardId: string; cardType: 'mcq' | 'passage' | 'flashcard' }[]) =>
    sendWorkerMessage({ type: 'LOAD_PROJECT', projectId, sectionIds, cardIds }),

  pickNext: (projectId: string, sectionIds: string[], newPerSession: number, cardType?: 'mcq' | 'passage' | 'flashcard') =>
    sendWorkerMessage<{ cardId: string | null }>({ type: 'PICK_NEXT', projectId, sectionIds, newPerSession, cardType }),

  previewRatings: (cardId: string) =>
    sendWorkerMessage<{ labels: Record<number, string> }>({ type: 'PREVIEW_RATINGS', cardId }),

  reviewCard: (cardId: string, projectId: string, sectionId: string, rating: number, elapsedMs: number) =>
    sendWorkerMessage<{ card: { state: number; due: string; stability: number; difficulty: number }; isLeech: boolean; lapses: number }>({
      type: 'REVIEW_CARD', cardId, projectId, sectionId, rating, elapsedMs,
    }),

  undoReview: (cardId: string) =>
    sendWorkerMessage<{ undone: boolean; cardId?: string }>({ type: 'UNDO_REVIEW', cardId }),

  suspendCard: (cardId: string) =>
    sendWorkerMessage({ type: 'SUSPEND_CARD', cardId }),

  buryCard: (cardId: string) =>
    sendWorkerMessage({ type: 'BURY_CARD', cardId }),

  countDue: (projectId: string, sectionIds: string[]) =>
    sendWorkerMessage<{ due: number; newCount: number; total: number }>({ type: 'COUNT_DUE', projectId, sectionIds }),

  updateScore: (projectId: string, sectionId: string, correct: boolean) =>
    sendWorkerMessage<{ correct: number; attempted: number }>({ type: 'UPDATE_SCORE', projectId, sectionId, correct }),

  getScores: (projectId: string) =>
    sendWorkerMessage<{ project_id: string; section_id: string; correct: number; attempted: number }[]>({ type: 'GET_SCORES', projectId }),

  resetSection: (projectId: string, sectionId: string) =>
    sendWorkerMessage({ type: 'RESET_SECTION', projectId, sectionId }),

  addActivity: (projectId: string, sectionId: string, rating: number, correct: boolean) =>
    sendWorkerMessage({ type: 'ADD_ACTIVITY', projectId, sectionId, rating, correct }),

  getActivity: (projectId: string, limit?: number) =>
    sendWorkerMessage<{ id: string; section_id: string; rating: number; correct: number; timestamp: string }[]>({ type: 'GET_ACTIVITY', projectId, limit }),

  clearActivity: (projectId: string) =>
    sendWorkerMessage({ type: 'CLEAR_ACTIVITY', projectId }),

  addNote: (projectId: string, text: string) =>
    sendWorkerMessage({ type: 'ADD_NOTE', projectId, text }),

  getNotes: (projectId: string) =>
    sendWorkerMessage<{ id: string; text: string; created_at: string }[]>({ type: 'GET_NOTES', projectId }),

  addUserTerm: (projectId: string, term: string, definition: string) =>
    sendWorkerMessage({ type: 'ADD_USER_TERM', projectId, term, definition }),

  getUserTerms: (projectId: string) =>
    sendWorkerMessage<{ id: string; term: string; definition: string }[]>({ type: 'GET_USER_TERMS', projectId }),

  deleteUserTerm: (id: string) =>
    sendWorkerMessage({ type: 'DELETE_USER_TERM', id }),

  getCardState: (cardId: string) =>
    sendWorkerMessage({ type: 'GET_CARD_STATE', cardId }),

  getReviewLog: (projectId: string, limit?: number) =>
    sendWorkerMessage({ type: 'GET_REVIEW_LOG', projectId, limit }),

  getFSRSParams: (projectId: string) =>
    sendWorkerMessage({ type: 'GET_FSRS_PARAMS', projectId }),

  setFSRSParams: (projectId: string, weights: number[], retention: number) =>
    sendWorkerMessage({ type: 'SET_FSRS_PARAMS', projectId, weights, retention }),

  getHotkeys: () =>
    sendWorkerMessage<{ action: string; binding: string; context: string }[]>({ type: 'GET_HOTKEYS' }),

  setHotkey: (action: string, binding: string, context: string) =>
    sendWorkerMessage({ type: 'SET_HOTKEY', action, binding, context }),
};
