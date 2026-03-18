import { createSignal } from 'solid-js';
import type { Project } from '../../projects/types.ts';

type AppPhase = 'launcher' | 'study';

function readLocalBool(key: string, defaultVal: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return defaultVal;
    return v !== 'false';
  } catch { return defaultVal; }
}

const [appPhase, setAppPhase] = createSignal<AppPhase>('launcher');
const [activeProject, setActiveProject] = createSignal<Project | null>(null);
const [activeTab, setActiveTab] = createSignal<string | null>(null);
const [easyMode, setEasyMode] = createSignal(readLocalBool('easy-mode', true));
const [zenMode, setZenMode] = createSignal(readLocalBool('zen-mode', false));
const [syncActivity, setSyncActivity] = createSignal(readLocalBool('sync-activity', true));
const [noteBoxVisible, setNoteBoxVisible] = createSignal(false);
const [headerVisible, setHeaderVisible] = createSignal(false);
const [termsOpen, setTermsOpen] = createSignal(false);
const [headerLocked, setHeaderLocked] = createSignal(false);
const [activePanel, setActivePanel] = createSignal<string | null>(null);

export {
  appPhase, setAppPhase,
  activeProject, setActiveProject,
  activeTab, setActiveTab,
  easyMode,
  zenMode,
  syncActivity,
  noteBoxVisible, setNoteBoxVisible,
  headerVisible, setHeaderVisible,
  termsOpen, setTermsOpen,
  headerLocked, setHeaderLocked,
  activePanel, setActivePanel,
};

export function toggleEasyMode() {
  const next = !easyMode();
  setEasyMode(next);
  try { localStorage.setItem('easy-mode', String(next)); } catch { /* */ }
}

export function toggleZenMode() {
  const next = !zenMode();
  setZenMode(next);
  try { localStorage.setItem('zen-mode', String(next)); } catch { /* */ }
}

export function toggleSyncActivity() {
  const next = !syncActivity();
  setSyncActivity(next);
  try { localStorage.setItem('sync-activity', String(next)); } catch { /* */ }
}

