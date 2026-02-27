import { For, createSignal, onMount } from 'solid-js';
import { activeProject, activeTab, setActiveTab, syncActivity, toggleSyncActivity, tipsVisible, setTipsVisible } from '../../store/app.ts';
import { goToLauncher } from '../../store/project.ts';
import { SettingsPanel } from '../settings/SettingsPanel.tsx';

export function Header() {
  const [visible, setVisible] = createSignal(false);
  const project = () => activeProject()!;

  function toggle() {
    setVisible(!visible());
  }

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
    <div class={`header-wrap ${visible() ? 'header-visible' : ''}`}>
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
      <div class="header-pull" onClick={toggle}>
        {visible() ? '\u25B2' : '\u25BC'}
      </div>
    </div>
  );
}
