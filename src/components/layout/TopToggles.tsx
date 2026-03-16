import { Show } from 'solid-js';
import { activeTab, activeProject, zenMode, toggleZenMode, headerVisible, termsOpen } from '../../core/store/app.ts';
import { sectionHandlers } from '../../core/store/sections.ts';

export function TopToggles() {
  const activeSession = () => {
    const tab = activeTab();
    return tab ? sectionHandlers.get(tab) : undefined;
  };

  const isFlashMode = () => activeSession()?.flashMode?.() ?? false;

  return (
    <div class={`top-toggles${headerVisible() || termsOpen() ? ' hidden' : ''}`}>
      <Show when={isFlashMode()}>
        <label class="top-toggle def-first-toggle" title="Show definition side first">
          <input
            type="checkbox"
            checked={activeSession()?.flashDefFirst?.() ?? false}
            onChange={(e) => activeSession()?.setFlashDefFirst?.(e.currentTarget.checked)}
          />
          <span class="top-toggle-label">def first</span>
        </label>
      </Show>
      <label class="top-toggle zen-toggle" title="Focus mode — hide extra UI">
        <span class="top-toggle-label">zen</span>
        <input type="checkbox" checked={zenMode()} onChange={toggleZenMode} />
      </label>
    </div>
  );
}
