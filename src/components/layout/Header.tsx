import { For, onCleanup } from 'solid-js';
import { activeProject, activeTab, setActiveTab, syncActivity, toggleSyncActivity, headerVisible, setHeaderVisible } from '../../store/app.ts';
import { goToLauncher } from '../../store/project.ts';
import { SettingsPanel } from '../settings/SettingsPanel.tsx';
import { KeybindsPanel } from '../settings/KeybindsPanel.tsx';
import { TipsPanel } from '../settings/TipsPanel.tsx';

export function Header() {
  const project = () => activeProject()!;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  function open() {
    clearClose();
    setHeaderVisible(true);
  }

  function clearClose() {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = undefined; }
  }

  function scheduleClose() {
    clearClose();
    closeTimer = setTimeout(() => {
      setHeaderVisible(false);
      closeTimer = undefined;
    }, 800);
  }

  onCleanup(() => { if (closeTimer) clearTimeout(closeTimer); });

  return (
    <div class={`header-wrap ${headerVisible() ? 'header-visible' : ''}`}>
      <header onMouseEnter={clearClose} onMouseLeave={scheduleClose}>
        <div class="header-top">
          <button class="back-btn" onClick={() => goToLauncher()} title="Back to launcher">
            &larr;
          </button>
          <h1>{project().name}</h1>
          <label class="sync-toggle" title="Sync activity trendline across sections">
            <input
              type="checkbox"
              checked={syncActivity()}
              onChange={toggleSyncActivity}
            />
            <span class="sync-toggle-label">sync graph</span>
          </label>
          <TipsPanel />
          <KeybindsPanel />
          <SettingsPanel />
        </div>
        <div class="tabs">
          <For each={project().sections}>
            {(section) => (
              <button
                class={`tab-btn ${activeTab() === section.id ? 'active' : ''}`}
                onClick={() => setActiveTab(section.id)}
              >
                {section.name}
              </button>
            )}
          </For>
        </div>
      </header>
      <div
        class={`header-pull ${headerVisible() ? 'header-pull-hidden' : ''}`}
        onMouseEnter={open}
        onMouseLeave={scheduleClose}
        onClick={() => setHeaderVisible(!headerVisible())}
      >
        {headerVisible() ? '\u25B2' : '\u25BC'}
      </div>
    </div>
  );
}
