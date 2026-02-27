import { createSignal } from 'solid-js';
import type { Project } from '../projects/types.ts';

export type AppPhase = 'launcher' | 'study';

const [appPhase, setAppPhase] = createSignal<AppPhase>('launcher');
const [activeProject, setActiveProject] = createSignal<Project | null>(null);
const [activeTab, setActiveTab] = createSignal<string | null>(null);
const [easyMode, setEasyMode] = createSignal(localStorage.getItem('easy-mode') !== 'false');
const [zenMode, setZenMode] = createSignal(localStorage.getItem('zen-mode') === 'true');
const [syncActivity, setSyncActivity] = createSignal(localStorage.getItem('sync-activity') !== 'false');
const [noteBoxVisible, setNoteBoxVisible] = createSignal(false);
const [tipsVisible, setTipsVisible] = createSignal(false);
const [headerVisible, setHeaderVisible] = createSignal(false);
const [termsOpen, setTermsOpen] = createSignal(false);

export {
  appPhase, setAppPhase,
  activeProject, setActiveProject,
  activeTab, setActiveTab,
  easyMode, setEasyMode,
  zenMode, setZenMode,
  syncActivity, setSyncActivity,
  noteBoxVisible, setNoteBoxVisible,
  tipsVisible, setTipsVisible,
  headerVisible, setHeaderVisible,
  termsOpen, setTermsOpen,
};

export function toggleEasyMode() {
  const next = !easyMode();
  setEasyMode(next);
  localStorage.setItem('easy-mode', String(next));
}

export function toggleZenMode() {
  const next = !zenMode();
  setZenMode(next);
  localStorage.setItem('zen-mode', String(next));
}

export function toggleSyncActivity() {
  const next = !syncActivity();
  setSyncActivity(next);
  localStorage.setItem('sync-activity', String(next));
}

export function toggleTipsVisible() {
  setTipsVisible(!tipsVisible());
}
