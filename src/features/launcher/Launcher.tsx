import './launcher.css';
import { createSignal, For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { projectRegistry } from '../../projects/registry.ts';
import {
  openRegistryProject,
  openRecentProject,
  validateAndOpenFile,
  loadError,
  setLoadError,
  isLoading,
  getRecentProjects,
  clearRecentProjects,
} from './store.ts';
import { DropZone } from './DropZone.tsx';

export function Launcher() {
  let fileInput!: HTMLInputElement;
  const [recentVersion, setRecentVersion] = createSignal(0);
  const recentProjects = () => { recentVersion(); return getRecentProjects(); };
  const [browseOpen, setBrowseOpen] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal('');

  const filteredRegistry = () => {
    const q = searchQuery().toLowerCase().trim();
    if (!q) return projectRegistry;
    return projectRegistry.filter(p => p.name.toLowerCase().includes(q));
  };

  function handleClearRecent() {
    clearRecentProjects();
    setRecentVersion(v => v + 1);
  }

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      validateAndOpenFile(ev.target?.result as string);
    };
    reader.onerror = () => {
      setLoadError('Failed to read file');
    };
    reader.readAsText(file);
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    readFile(file);
    input.value = '';
  }

  function handleDrop(file: File) {
    readFile(file);
  }

  function handleBrowseSelect(slug: string) {
    setBrowseOpen(false);
    setSearchQuery('');
    openRegistryProject(slug);
  }

  return (
    <div class="launcher-wrap">
      <div class="launcher-card">
        <h1>Study Tool</h1>
        <p class="launcher-subtitle">
          FSRS-Powered Spaced Repetition
        </p>

        {/* Recent projects as primary buttons */}
        <Show when={recentProjects().length > 0}>
          <div class="launcher-list">
            <For each={recentProjects()}>
              {(p) => (
                <button
                  class="launcher-proj-btn"
                  onClick={() => openRecentProject(p.slug)}
                >
                  {p.name}
                </button>
              )}
            </For>
          </div>
          <button class="launcher-clear-recent" onClick={handleClearRecent}>
            clear recent
          </button>
        </Show>

        {/* Browse all projects button */}
        <button class="launcher-browse-btn" onClick={() => setBrowseOpen(true)}>
          Browse All Projects
        </button>

        {/* File open + drop */}
        <div class="launcher-file-row">
          <button
            class="launcher-open-btn"
            onClick={() => fileInput.click()}
          >
            Open File (.json)
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json"
            class="hidden"
            onChange={handleFileSelect}
          />
        </div>

        <DropZone onDrop={handleDrop} onClick={() => fileInput.click()} />

        <Show when={loadError()}>
          <div class="launcher-error">
            {loadError()}
          </div>
        </Show>

        <Show when={isLoading()}>
          <div class="launcher-loading">Loading project...</div>
        </Show>
      </div>

      {/* Browse panel */}
      <Show when={browseOpen()}>
        <Portal>
          <div class="settings-backdrop" onClick={(e) => {
            if ((e.target as HTMLElement).classList.contains('settings-backdrop')) {
              setBrowseOpen(false);
              setSearchQuery('');
            }
          }}>
            <div class="launcher-browse-panel">
              <div class="keybinds-header">
                <span>All Projects</span>
                <button class="keybinds-close" onClick={() => { setBrowseOpen(false); setSearchQuery(''); }}>&times;</button>
              </div>
              <div class="launcher-browse-search">
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery()}
                  onInput={(e) => setSearchQuery(e.currentTarget.value)}
                  autofocus
                />
              </div>
              <div class="launcher-browse-list">
                <For each={filteredRegistry()}>
                  {(proj) => (
                    <button
                      class="launcher-browse-item"
                      onClick={() => handleBrowseSelect(proj.slug)}
                    >
                      {proj.name}
                    </button>
                  )}
                </For>
                <Show when={filteredRegistry().length === 0}>
                  <div class="launcher-browse-empty">No projects found</div>
                </Show>
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  );
}
