import { Show, onMount, onCleanup, Switch, Match } from 'solid-js';
import { Portal } from 'solid-js/web';
import { setHeaderLocked } from '../../core/store/app.ts';
import { aiOpen, setAiOpen, aiTab, setAiTab, abortStream } from './store.ts';
import { InsightsTab } from './InsightsTab.tsx';
import { GenerateTab } from './GenerateTab.tsx';
import { TargetedTab } from './TargetedTab.tsx';
import type { AITab } from './types.ts';

const TABS: { id: AITab; label: string }[] = [
  { id: 'insights', label: 'Insights' },
  { id: 'generate', label: 'Generate' },
  { id: 'targeted', label: 'Targeted' },
];

export function AIPanel() {
  function close() {
    abortStream();
    setAiOpen(false);
    setHeaderLocked(false);
  }

  function handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape' && aiOpen()) {
      close();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('keybinds-overlay')) {
      close();
    }
  }

  onMount(() => document.addEventListener('keydown', handleEscape));
  onCleanup(() => document.removeEventListener('keydown', handleEscape));

  return (
    <>
      <button
        class="tips-btn"
        title="AI Assistant"
        onClick={() => { setAiOpen(true); setHeaderLocked(true); }}
      >
        AI
      </button>
      <Show when={aiOpen()}>
        <Portal>
          <div class="keybinds-overlay" onClick={handleBackdropClick}>
            <div class="keybinds-modal ai-modal">
              <div class="keybinds-header">
                <span>AI Assistant</span>
                <button class="keybinds-close" onClick={close}>&times;</button>
              </div>

              <div class="ai-tabs">
                {TABS.map(tab => (
                  <button
                    class={`ai-tab-btn ${aiTab() === tab.id ? 'active' : ''}`}
                    onClick={() => setAiTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div class="ai-body">
                <Switch>
                  <Match when={aiTab() === 'insights'}>
                    <InsightsTab />
                  </Match>
                  <Match when={aiTab() === 'generate'}>
                    <GenerateTab />
                  </Match>
                  <Match when={aiTab() === 'targeted'}>
                    <TargetedTab />
                  </Match>
                </Switch>
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
}
