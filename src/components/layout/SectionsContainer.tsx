import { For } from 'solid-js';
import { activeProject, activeTab } from '../../store/app.ts';
import { QuizSection } from '../quiz/QuizSection.tsx';
import { MathSection } from '../math/MathSection.tsx';

export function SectionsContainer() {
  const project = () => activeProject()!;

  return (
    <div>
      <For each={project().sections}>
        {(section) => (
          <div class={activeTab() === section.id ? 'block' : 'hidden'}>
            {section.type === 'math-gen'
              ? <MathSection section={section} />
              : <QuizSection section={section} />}
          </div>
        )}
      </For>
    </div>
  );
}
