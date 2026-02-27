import { createSignal, Show, createEffect } from 'solid-js';
import { noteBoxVisible, setNoteBoxVisible, activeProject } from '../../store/app.ts';
import { workerApi } from '../../hooks/useWorker.ts';

export function NoteBox() {
  const [placeholder, setPlaceholder] = createSignal('note...');
  let inputRef: HTMLInputElement | undefined;

  // Auto-focus when visible
  createEffect(() => {
    if (noteBoxVisible() && inputRef) {
      inputRef.focus();
    }
  });

  function handleKeyDown(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === 'Enter') {
      const text = inputRef?.value.trim();
      const project = activeProject();
      if (text && project) {
        workerApi.addNote(project.slug, text);
        inputRef!.value = '';
        setPlaceholder('saved');
        setTimeout(() => {
          setNoteBoxVisible(false);
          setPlaceholder('note...');
        }, 400);
      }
    } else if (e.key === 'Escape') {
      if (inputRef) inputRef.value = '';
      setNoteBoxVisible(false);
    }
  }

  function handleBlur() {
    setNoteBoxVisible(false);
  }

  return (
    <Show when={noteBoxVisible()}>
      <div class="note-box">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder()}
          autocomplete="off"
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
      </div>
    </Show>
  );
}
