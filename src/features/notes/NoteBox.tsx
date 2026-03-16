import './notes.css';
import { createSignal, Show } from 'solid-js';
import { noteBoxVisible, setNoteBoxVisible, activeProject } from '../../core/store/app.ts';
import { workerApi } from '../../core/hooks/useWorker.ts';

export function NoteBox() {
  const [placeholder, setPlaceholder] = createSignal('');
  let inputRef: HTMLInputElement | undefined;

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
          setPlaceholder('');
        }, 400);
      }
    } else if (e.key === 'Escape') {
      if (inputRef) inputRef.value = '';
      setPlaceholder('');
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
          ref={el => { inputRef = el; el?.focus(); }}
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
