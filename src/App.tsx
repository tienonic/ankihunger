import { Show, onMount, onCleanup } from 'solid-js';
import { appPhase } from './core/store/app.ts';
import { getLastProject, openRegistryProject, getProjectData, openProject } from './features/launcher/store.ts';
import { initWorker, terminateWorker } from './core/hooks/useWorker.ts';
import { Launcher } from './features/launcher/Launcher.tsx';
import { StudyApp } from './components/layout/StudyApp.tsx';

export function App() {
  onMount(async () => {
    try {
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
    } catch {
      // Worker init failed — stay on launcher so user can retry
    }
  });
  onCleanup(() => terminateWorker());

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
