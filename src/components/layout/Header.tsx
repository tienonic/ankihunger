import { For, onMount, onCleanup } from 'solid-js';
import { activeProject, activeTab, setActiveTab, syncActivity, toggleSyncActivity, tipsVisible, setTipsVisible, headerVisible, setHeaderVisible } from '../../store/app.ts';
import { goToLauncher } from '../../store/project.ts';
import { SettingsPanel } from '../settings/SettingsPanel.tsx';
import { KeybindsPanel } from '../settings/KeybindsPanel.tsx';

export function Header() {
  const project = () => activeProject()!;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  function open() {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = undefined; }
    setHeaderVisible(true);
  }

  function scheduleClose() {
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      setHeaderVisible(false);
      closeTimer = undefined;
    }, 800);
  }

  function cancelClose() {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = undefined; }
  }

  onCleanup(() => { if (closeTimer) clearTimeout(closeTimer); });

  // First-time tips: auto-show for 6 seconds
  onMount(() => {
    if (!localStorage.getItem('tips-seen')) {
      setTipsVisible(true);
      setTimeout(() => {
        setTipsVisible(false);
        localStorage.setItem('tips-seen', '1');
      }, 6000);
    }
  });

  function handleTipsClick() {
    const next = !tipsVisible();
    setTipsVisible(next);
    if (next) {
      setTimeout(() => setTipsVisible(false), 6000);
    }
  }

  return (
    <div
      class={`header-wrap ${headerVisible() ? 'header-visible' : ''}`}
      onMouseLeave={scheduleClose}
      onMouseEnter={cancelClose}
    >
      <header>
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
          <button class="tips-btn" title="Show keyboard shortcuts" onClick={handleTipsClick}>Tips</button>
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
      <div class="header-pull" onMouseEnter={open} onClick={() => setHeaderVisible(!headerVisible())}>
        {headerVisible() ? '\u25B2' : '\u25BC'}
      </div>
    </div>
  );
}
