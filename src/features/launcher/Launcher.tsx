import './launcher.css';
import { createSignal, For, Show, batch } from 'solid-js';
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

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => { const result = ev.target?.result; if (typeof result === 'string') validateAndOpenFile(result); };
    reader.onerror = () => { setLoadError('Failed to read file'); };
    reader.readAsText(file);
  }

  return (
    <div class="launcher-wrap">
      <div class="launcher-card">
        <h1>Study Tool</h1>
        <p class="launcher-subtitle">FSRS-Powered Spaced Repetition</p>

        <Show when={recentProjects().length > 0}>
          <div class="launcher-list"><For each={recentProjects()}>{(p) => <button type="button" class="launcher-proj-btn" onClick={() => openRecentProject(p.slug)}>{p.name}</button>}</For></div>
          <button type="button" class="launcher-clear-recent" onClick={() => { clearRecentProjects(); setRecentVersion(v => v + 1); }}>clear recent</button>
        </Show>

        <button type="button" class="launcher-browse-btn" onClick={() => setBrowseOpen(true)}>Browse All Projects</button>

        <div class="launcher-file-row"><button type="button" class="launcher-open-btn" onClick={() => fileInput.click()}>Open File (.json)</button><input ref={fileInput} type="file" accept=".json" class="hidden" onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) { readFile(f); e.currentTarget.value = ''; } }} /></div>

        <DropZone onDrop={readFile} onClick={() => fileInput.click()} />

        <Show when={loadError()}><div class="launcher-error">{loadError()}</div></Show>
        <Show when={isLoading()}><div class="launcher-loading">Loading project...</div></Show>
      </div>

      <Show when={browseOpen()}>
        <Portal>
          <div class="settings-backdrop" onClick={(e) => { if (e.target instanceof Element && e.target.classList.contains('settings-backdrop')) { batch(() => { setBrowseOpen(false); setSearchQuery(''); }); } }}>
            <div class="launcher-browse-panel">
              <div class="keybinds-header"><span>All Projects</span><button type="button" class="keybinds-close" onClick={() => batch(() => { setBrowseOpen(false); setSearchQuery(''); })}>&times;</button></div>
              <div class="launcher-browse-search"><input type="text" placeholder="Search projects..." value={searchQuery()} onInput={(e) => setSearchQuery(e.currentTarget.value)} autofocus /></div>
              <div class="launcher-browse-list">
                <For each={filteredRegistry()}>
                  {(proj) => <button type="button" class="launcher-browse-item" onClick={() => { batch(() => { setBrowseOpen(false); setSearchQuery(''); }); openRegistryProject(proj.slug); }}>{proj.name}</button>}
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
