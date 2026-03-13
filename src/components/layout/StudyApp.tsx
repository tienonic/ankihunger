import './layout.css';
import { Show } from 'solid-js';
import { activeProject, activeTab, zenMode } from '../../core/store/app.ts';
import { useKeyboard } from '../../core/hooks/useKeyboard.ts';
import { entries as glossaryEntries } from '../../features/glossary/store.ts';
import { sectionHandlers, handlerVersion } from '../../core/store/sections.ts';
import { Header } from './Header.tsx';
import { TopToggles } from './TopToggles.tsx';
import { SectionsContainer } from './SectionsContainer.tsx';
import { TermsDropdown } from '../../features/glossary/TermsDropdown.tsx';
import { NoteBox } from '../../features/notes/NoteBox.tsx';
import { ActivityWidget } from '../../features/activity/ActivityWidget.tsx';

export function StudyApp() {
  useKeyboard();

  const isMathTab = () => {
    const project = activeProject();
    const tab = activeTab();
    if (!project || !tab) return false;
    return project.sections.find(s => s.id === tab)?.type === 'math-gen';
  };

  const activeSession = () => {
    handlerVersion();
    const tab = activeTab();
    return tab ? sectionHandlers.get(tab) : null;
  };

  const isFlashMode = () => activeSession()?.flashMode?.() ?? false;

  return (
    <div class={zenMode() ? 'zen' : ''} id="study-app">
      <Header />
      <TopToggles />
      <NoteBox />

      <Show when={!isMathTab()}>
        <div class="sidebar-right">
          <Show when={glossaryEntries().length > 0}>
            <TermsDropdown />
          </Show>
          <ActivityWidget isFlashMode={isFlashMode} activeSession={activeSession} />
        </div>
      </Show>

      <main>
        <SectionsContainer />
      </main>
    </div>
  );
}
