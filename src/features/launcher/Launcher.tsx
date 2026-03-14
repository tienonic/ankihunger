import './launcher.css';
import { For, Show } from 'solid-js';
import { projectRegistry } from '../../projects/registry.ts';
import {
  openRegistryProject,
  openRecentProject,
  validateAndOpenFile,
  loadError,
  setLoadError,
  isLoading,
  getRecentProjects,
} from './store.ts';
import { ProjectCard } from './ProjectCard.tsx';
import { DropZone } from './DropZone.tsx';
import { RecentProjects } from './RecentProjects.tsx';

export function Launcher() {
  let fileInput!: HTMLInputElement;

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

  return (
    <div class="launcher-wrap">
      <div class="launcher-card">
        <h1>Study Tool</h1>
        <p class="launcher-subtitle">
          FSRS-Powered Spaced Repetition
        </p>

        <div class="launcher-list">
          <For each={projectRegistry}>
            {(proj) => (
              <ProjectCard
                name={proj.name}
                onClick={() => openRegistryProject(proj.slug)}
              />
            )}
          </For>

          <button
            class="launcher-open-btn"
            onClick={() => fileInput.click()}
          >
            Open Project File (.json)
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

        <RecentProjects
          projects={getRecentProjects()}
          onSelect={openRecentProject}
        />

        <Show when={loadError()}>
          <div class="launcher-error">
            {loadError()}
          </div>
        </Show>

        <Show when={isLoading()}>
          <div class="launcher-loading">Loading project...</div>
        </Show>
      </div>
    </div>
  );
}
