import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import {
  keybinds, setKeybind, resetKeybinds, findConflict,
  ACTION_META, DEFAULT_KEYBINDS,
  type KeyAction, type Binding, type KeyContext,
} from './keybinds.ts';
import { activePanel, setActivePanel, setHeaderLocked } from '../../core/store/app.ts';

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
  const [capturing, setCapturing] = createSignal<KeyAction | null>(null);
  const [conflict, setConflict] = createSignal<{ action: KeyAction; existing: KeyAction } | null>(null);
  const [panelTop, setPanelTop] = createSignal(0);
  let btnRef!: HTMLButtonElement;

  function close() {
    setActivePanel(null);
    setHeaderLocked(false);
  }

  function handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape' && activePanel() === 'keybinds' && !capturing()) {
      close();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('settings-backdrop')) {
      if (capturing()) {
        setCapturing(null);
        setConflict(null);
      } else {
        close();
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
        const oldBinding = keybinds()[action];
        setKeybind(existing, oldBinding);
      }

      setKeybind(action, binding);
      setCapturing(null);
    }

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
      <button ref={btnRef} class="tips-btn" title="Keyboard shortcuts" onClick={() => { setPanelTop(btnRef.getBoundingClientRect().top); setActivePanel('keybinds'); setHeaderLocked(true); }}>
        Keys
      </button>
      <Show when={activePanel() === 'keybinds'}>
        <Portal>
          <div class="settings-backdrop" onClick={handleBackdropClick}>
            <div class="keybinds-modal panel-fixed" style={{ top: `${panelTop()}px` }}>
              <div class="keybinds-header">
                <span>Keyboard Shortcuts</span>
                <button class="keybinds-close" onClick={close}>&times;</button>
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
        </Portal>
      </Show>
    </>
  );
}
