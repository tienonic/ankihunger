import { Show } from 'solid-js';
import { activeTab, activeProject, easyMode, zenMode, toggleEasyMode, toggleZenMode, headerVisible, termsOpen } from '../../store/app.ts';
import { sectionHandlers } from '../../store/quiz.ts';

export function TopToggles() {
  const isMath = () => {
    const project = activeProject();
    const tab = activeTab();
    if (!project || !tab) return false;
    const section = project.sections.find(s => s.id === tab);
    return section?.type === 'math-gen';
  };

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
      <Show when={!isMath()}>
        <label class="top-toggle easy-toggle" title="Auto-rate by answer speed">
          <input type="checkbox" checked={easyMode()} onChange={toggleEasyMode} />
          <span class="top-toggle-label">simple</span>
        </label>
      </Show>
      <label class="top-toggle zen-toggle" title="Focus mode — hide extra UI">
        <input type="checkbox" checked={zenMode()} onChange={toggleZenMode} />
        <span class="top-toggle-label">zen</span>
      </label>
    </div>
  );
}
