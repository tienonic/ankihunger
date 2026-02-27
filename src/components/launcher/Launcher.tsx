import { For, Show, createSignal, onMount } from 'solid-js';
import { projectRegistry } from '../../projects/registry.ts';
import {
  openRegistryProject,
  openRecentProject,
  validateAndOpenFile,
  loadError,
  isLoading,
  getRecentProjects,
} from '../../store/project.ts';
import { ProjectCard } from './ProjectCard.tsx';
import { DropZone } from './DropZone.tsx';
import { RecentProjects } from './RecentProjects.tsx';

export function Launcher() {
  let fileInput!: HTMLInputElement;

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      validateAndOpenFile(ev.target?.result as string);
    };
    reader.readAsText(file);
    input.value = '';
  }

  function handleDrop(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      validateAndOpenFile(ev.target?.result as string);
    };
    reader.readAsText(file);
  }

  return (
    <div class="flex items-center justify-center min-h-screen p-5">
      <div class="bg-card rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.12)] py-12 px-10 max-w-[460px] w-full text-center">
        <h1 class="text-3xl font-bold text-text mb-1">Study Tool</h1>
        <p class="text-text-light text-sm tracking-widest uppercase mb-8">
          FSRS-Powered Spaced Repetition
        </p>

        <div class="flex flex-col gap-3 mb-4">
          <For each={projectRegistry}>
            {(proj) => (
              <ProjectCard
                name={proj.name}
                onClick={() => openRegistryProject(proj.slug)}
              />
            )}
          </For>

          <button
            class="w-full py-3 px-4 rounded-sm border-2 border-border bg-card text-text font-semibold cursor-pointer transition-colors hover:border-primary hover:text-primary"
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
          <div class="mt-4 p-3 bg-danger-light text-danger-dark rounded-sm text-sm font-medium">
            {loadError()}
          </div>
        </Show>

        <Show when={isLoading()}>
          <div class="mt-4 text-text-light text-sm">Loading project...</div>
        </Show>
      </div>
    </div>
  );
}
