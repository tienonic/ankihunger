import { createSignal } from 'solid-js';
import { workerApi } from '../hooks/useWorker.ts';

export type KeyAction =
  | 'answer1' | 'answer2' | 'answer3' | 'answer4'
  | 'skip' | 'undo' | 'suspend' | 'bury'
  | 'viewImage' | 'goBack' | 'forward'
  | 'flipCard' | 'flipAlt' | 'note' | 'mathSubmit';

export interface Binding {
  key: string;
  code?: string;
  label: string;
}

export type KeybindMap = Record<KeyAction, Binding>;

export type KeyContext = 'global' | 'mcq' | 'flashcard' | 'math';

export const ACTION_META: Record<KeyAction, { name: string; context: KeyContext }> = {
  answer1:   { name: 'Answer/Rate 1', context: 'mcq' },
  answer2:   { name: 'Answer/Rate 2', context: 'mcq' },
  answer3:   { name: 'Answer/Rate 3', context: 'mcq' },
  answer4:   { name: 'Answer/Rate 4', context: 'mcq' },
  skip:      { name: 'Skip / Next',   context: 'mcq' },
  undo:      { name: 'Undo',          context: 'mcq' },
  suspend:   { name: 'Suspend',       context: 'mcq' },
  bury:      { name: 'Bury',          context: 'mcq' },
  viewImage: { name: 'View Image',    context: 'mcq' },
  goBack:    { name: 'Go Back',       context: 'mcq' },
  forward:   { name: 'Forward',       context: 'mcq' },
  flipCard:  { name: 'Flip Card',     context: 'flashcard' },
  flipAlt:   { name: 'Flip (alt)',    context: 'flashcard' },
  note:      { name: 'Open Note',     context: 'global' },
  mathSubmit:{ name: 'Skip / Next',   context: 'math' },
};

export const DEFAULT_KEYBINDS: KeybindMap = {
  answer1:    { key: '1', label: '1' },
  answer2:    { key: '2', label: '2' },
  answer3:    { key: '3', label: '3' },
  answer4:    { key: '4', label: '4' },
  skip:       { key: 'd', label: 'D' },
  undo:       { key: 'z', label: 'Z' },
  suspend:    { key: 's', label: 'S' },
  bury:       { key: 'b', label: 'B' },
  viewImage:  { key: 'r', label: 'R' },
  goBack:     { key: 'a', label: 'A' },
  forward:    { key: 'ArrowRight', label: '\u2192' },
  flipCard:   { key: 'Space', code: 'Space', label: 'Space' },
  flipAlt:    { key: 'f', label: 'F' },
  note:       { key: '/', label: '/' },
  mathSubmit: { key: 'd', label: 'D' },
};

function cloneDefaults(): KeybindMap {
  const out = {} as KeybindMap;
  for (const k of Object.keys(DEFAULT_KEYBINDS) as KeyAction[]) {
    out[k] = { ...DEFAULT_KEYBINDS[k] };
  }
  return out;
}

const [keybinds, setKeybinds] = createSignal<KeybindMap>(cloneDefaults());

export { keybinds };

export function getLabel(action: KeyAction): string {
  return keybinds()[action].label;
}

export function matchesKey(e: KeyboardEvent, action: KeyAction): boolean {
  const b = keybinds()[action];
  if (b.code && e.code === b.code) return true;
  return e.key.toLowerCase() === b.key.toLowerCase();
}

export async function loadKeybinds(): Promise<void> {
  try {
    const rows = await workerApi.getHotkeys() as { action: string; binding: string }[];
    if (!rows || rows.length === 0) return;
    const map = cloneDefaults();
    for (const row of rows) {
      const action = row.action as KeyAction;
      if (!(action in DEFAULT_KEYBINDS)) continue;
      const parsed = JSON.parse(row.binding) as Binding;
      map[action] = parsed;
    }
    setKeybinds(map);
  } catch {
    // Use defaults on error
  }
}

export async function setKeybind(action: KeyAction, binding: Binding): Promise<void> {
  const map = { ...keybinds() };
  map[action] = binding;
  setKeybinds(map);
  const context = ACTION_META[action].context;
  await workerApi.setHotkey(action, JSON.stringify(binding), context);
}

export async function resetKeybinds(): Promise<void> {
  setKeybinds(cloneDefaults());
  // Clear all custom bindings from DB by re-setting to defaults
  const actions = Object.keys(DEFAULT_KEYBINDS) as KeyAction[];
  for (const action of actions) {
    const context = ACTION_META[action].context;
    await workerApi.setHotkey(action, JSON.stringify(DEFAULT_KEYBINDS[action]), context);
  }
}

/** Find action that uses the same key in the same or overlapping context */
export function findConflict(action: KeyAction, binding: Binding): KeyAction | null {
  const map = keybinds();
  const ctx = ACTION_META[action].context;
  for (const k of Object.keys(map) as KeyAction[]) {
    if (k === action) continue;
    const otherCtx = ACTION_META[k].context;
    // Only conflict if same context or either is global
    if (ctx !== otherCtx && ctx !== 'global' && otherCtx !== 'global') continue;
    const b = map[k];
    if (binding.code && b.code && binding.code === b.code) return k;
    if (binding.key.toLowerCase() === b.key.toLowerCase()) return k;
  }
  return null;
}
