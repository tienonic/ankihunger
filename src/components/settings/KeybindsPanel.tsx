import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import {
  keybinds, setKeybind, resetKeybinds, findConflict,
  ACTION_META, DEFAULT_KEYBINDS,
  type KeyAction, type Binding, type KeyContext,
} from '../../store/keybinds.ts';

const CONTEXT_ORDER: KeyContext[] = ['global', 'mcq', 'flashcard', 'math'];
const CONTEXT_LABELS: Record<KeyContext, string> = {
  global: 'Global',
  mcq: 'MCQ / Quiz',
  flashcard: 'Flashcard',
  math: 'Math',
};

function keyToLabel(key: string, code?: string): string {
  if (code === 'Space' || key === ' ') return 'Space';
  if (key === 'ArrowRight') return '\u2192';
  if (key === 'ArrowLeft') return '\u2190';
  if (key === 'ArrowUp') return '\u2191';
  if (key === 'ArrowDown') return '\u2193';
  if (key === 'Enter') return 'Enter';
  if (key === 'Escape') return 'Esc';
  if (key === 'Backspace') return 'Bksp';
  if (key === 'Tab') return 'Tab';
  if (key.length === 1) return key.toUpperCase();
  return key;
}

export function KeybindsPanel() {
  const [open, setOpen] = createSignal(false);
  const [capturing, setCapturing] = createSignal<KeyAction | null>(null);
  const [conflict, setConflict] = createSignal<{ action: KeyAction; existing: KeyAction } | null>(null);

  function handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape' && open() && !capturing()) {
      setOpen(false);
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('keybinds-overlay')) {
      if (capturing()) {
        setCapturing(null);
        setConflict(null);
      } else {
        setOpen(false);
      }
    }
  }

  onMount(() => document.addEventListener('keydown', handleEscape));
  onCleanup(() => document.removeEventListener('keydown', handleEscape));

  function startCapture(action: KeyAction) {
    setConflict(null);
    setCapturing(action);

    function captureHandler(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      document.removeEventListener('keydown', captureHandler, true);

      if (e.key === 'Escape') {
        setCapturing(null);
        return;
      }

      const binding: Binding = {
        key: e.key,
        label: keyToLabel(e.key, e.code),
      };
      if (e.code === 'Space') binding.code = 'Space';

      const existing = findConflict(action, binding);
      if (existing) {
        setConflict({ action, existing });
        // Swap: clear the conflicting binding by assigning it the old key
        const oldBinding = keybinds()[action];
        setKeybind(existing, oldBinding);
      }

      setKeybind(action, binding);
      setCapturing(null);
    }

    // Use next tick so the current keypress (if any) doesn't get captured
    setTimeout(() => document.addEventListener('keydown', captureHandler, true), 0);
  }

  function handleReset() {
    resetKeybinds();
    setConflict(null);
  }

  const groupedActions = () => {
    const groups: Record<KeyContext, KeyAction[]> = { global: [], mcq: [], flashcard: [], math: [] };
    for (const action of Object.keys(ACTION_META) as KeyAction[]) {
      groups[ACTION_META[action].context].push(action);
    }
    return groups;
  };

  return (
    <>
      <button class="tips-btn" title="Keyboard shortcuts" onClick={() => setOpen(true)}>
        Keys
      </button>
      <Show when={open()}>
        <div class="keybinds-overlay" onClick={handleBackdropClick}>
          <div class="keybinds-modal">
            <div class="keybinds-header">
              <span>Keyboard Shortcuts</span>
              <button class="keybinds-close" onClick={() => setOpen(false)}>&times;</button>
            </div>
            <div class="keybinds-body">
              <For each={CONTEXT_ORDER}>
                {(ctx) => {
                  const actions = () => groupedActions()[ctx];
                  return (
                    <Show when={actions().length > 0}>
                      <div class="keybinds-group">
                        <div class="keybinds-group-label">{CONTEXT_LABELS[ctx]}</div>
                        <For each={actions()}>
                          {(action) => {
                            const b = () => keybinds()[action];
                            const isDefault = () => {
                              const d = DEFAULT_KEYBINDS[action];
                              const c = b();
                              return c.key === d.key && c.code === d.code;
                            };
                            const isCapturing = () => capturing() === action;
                            const isConflictSource = () => conflict()?.existing === action;

                            return (
                              <div class={`keybinds-row ${isConflictSource() ? 'keybinds-conflict' : ''}`}>
                                <span class="keybinds-action">{ACTION_META[action].name}</span>
                                <kbd class={isCapturing() ? 'keybinds-capture' : ''}>
                                  {isCapturing() ? '...' : b().label}
                                </kbd>
                                <button
                                  class="keybinds-rebind"
                                  onClick={() => startCapture(action)}
                                  disabled={!!capturing()}
                                >
                                  {isCapturing() ? 'press key' : 'rebind'}
                                </button>
                                <Show when={!isDefault()}>
                                  <span class="keybinds-custom">&bull;</span>
                                </Show>
                              </div>
                            );
                          }}
                        </For>
                      </div>
                    </Show>
                  );
                }}
              </For>
              <Show when={conflict()}>
                <div class="keybinds-conflict-msg">
                  Swapped with "{ACTION_META[conflict()!.existing].name}"
                </div>
              </Show>
            </div>
            <div class="keybinds-footer">
              <button class="settings-save-btn" onClick={handleReset}>Reset All to Defaults</button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}
