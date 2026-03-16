import { For, Show, onMount, onCleanup } from 'solid-js';
import { activeProject, activeTab, setActiveTab, syncActivity, toggleSyncActivity, easyMode, toggleEasyMode, headerVisible, setHeaderVisible, headerLocked } from '../../core/store/app.ts';
import { goToLauncher } from '../../features/launcher/store.ts';
import { sectionHandlers, handlerVersion } from '../../core/store/sections.ts';
import { SettingsPanel } from '../../features/settings/SettingsPanel.tsx';
import { KeybindsPanel } from '../../features/settings/KeybindsPanel.tsx';
import { TipsPanel } from '../../features/settings/TipsPanel.tsx';
import { AIPanel } from '../../features/ai/AIPanel.tsx';

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
    if (headerLocked()) return;
    clearClose();
    closeTimer = setTimeout(() => {
      if (headerLocked()) return;
      setHeaderVisible(false);
      closeTimer = undefined;
    }, 800);
  }

  const currentHandler = () => { handlerVersion(); return sectionHandlers.get(activeTab()!); };
  const canFlash = () => {
    const h = currentHandler();
    return h && typeof h.flashMode === 'function' && typeof h.toggleFlashMode === 'function';
  };

  function handleClickOutside(e: MouseEvent) {
    if (!headerVisible()) return;
    const target = e.target as HTMLElement;
    if (target.closest('.header-menu') || target.closest('.header-pull')) return;
    // Don't close if a panel backdrop was clicked (panel handles its own close)
    if (target.closest('.settings-backdrop') || target.closest('.keybinds-overlay')) return;
    setHeaderVisible(false);
  }

  onMount(() => document.addEventListener('mousedown', handleClickOutside));
  onCleanup(() => {
    document.removeEventListener('mousedown', handleClickOutside);
    if (closeTimer) clearTimeout(closeTimer);
  });

  return (
    <div class="header-wrap">
      <div
        class={`header-pull ${headerVisible() ? 'header-pull-open' : ''}`}
        onMouseEnter={open}
        onMouseLeave={scheduleClose}
        onClick={() => setHeaderVisible(!headerVisible())}
      >
        {headerVisible() ? '\u25B2' : '\u25BC'}
      </div>
      <Show when={headerVisible()}>
        <div class="header-menu" onMouseEnter={clearClose} onMouseLeave={scheduleClose}>
          <div class="header-menu-label">{project().name}</div>
          <button class="header-menu-item" onClick={() => goToLauncher()}>
            &larr; Home
          </button>
          <label class="header-menu-item header-menu-check">
            <input
              type="checkbox"
              checked={syncActivity()}
              onChange={toggleSyncActivity}
            />
            Sync Graph
          </label>
          <label class="header-menu-item header-menu-check">
            <input
              type="checkbox"
              checked={easyMode()}
              onChange={toggleEasyMode}
            />
            Simple
          </label>
          <SettingsPanel />
          <AIPanel />
          <KeybindsPanel />
          <TipsPanel />
          <div class="header-menu-divider" />
          <For each={project().sections}>
            {(section) => (
              <button
                class={`header-menu-item header-menu-tab ${activeTab() === section.id ? 'active' : ''}`}
                onClick={() => setActiveTab(section.id)}
              >
                {section.name}
              </button>
            )}
          </For>
          <Show when={canFlash()}>
            <div class="header-menu-divider" />
            <button
              class={`header-menu-item header-menu-tab ${!(currentHandler() as any).flashMode() ? 'active' : ''}`}
              onClick={() => { if ((currentHandler() as any).flashMode()) (currentHandler() as any).toggleFlashMode(); }}
            >
              Quiz
            </button>
            <button
              class={`header-menu-item header-menu-tab ${(currentHandler() as any).flashMode() ? 'active' : ''}`}
              onClick={() => { if (!(currentHandler() as any).flashMode()) (currentHandler() as any).toggleFlashMode(); }}
            >
              Flashcards
            </button>
          </Show>
        </div>
      </Show>
    </div>
  );
}
