import { Show, onMount } from 'solid-js';
import { appPhase } from './core/store/app.ts';
import { getLastProject, openRegistryProject, getProjectData, openProject } from './features/launcher/store.ts';
import { initWorker } from './core/hooks/useWorker.ts';
import { Launcher } from './features/launcher/Launcher.tsx';
import { StudyApp } from './components/layout/StudyApp.tsx';

export function App() {
  onMount(async () => {
    await initWorker();
    const lastSlug = getLastProject();
    if (lastSlug) {
      const saved = getProjectData(lastSlug);
      if (saved) {
        openProject(saved, false);
      } else {
        openRegistryProject(lastSlug);
      }
    }
  });

  return (
    <>
      <Show when={appPhase() === 'launcher'}>
        <Launcher />
      </Show>
      <Show when={appPhase() === 'study'}>
        <StudyApp />
      </Show>
    </>
  );
}
