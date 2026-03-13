import { For } from 'solid-js';
import { activeProject, activeTab } from '../../core/store/app.ts';
import { QuizSection } from '../../features/quiz/QuizSection.tsx';
import { MathSection } from '../../features/math/MathSection.tsx';

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
