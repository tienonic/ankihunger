import { createSignal, Show, onMount, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { activeProject, setHeaderLocked } from '../../store/app.ts';
import { workerApi } from '../../hooks/useWorker.ts';

export function SettingsPanel() {
  const [open, setOpen] = createSignal(false);
  const [retention, setRetention] = createSignal(0.9);
  const [newPerSession, setNewPerSession] = createSignal(20);
  const [leechThreshold, setLeechThreshold] = createSignal(8);
  const [saved, setSaved] = createSignal(false);

  function load() {
    const project = activeProject();
    if (!project) return;
    setRetention(project.config.desired_retention);
    setNewPerSession(project.config.new_per_session);
    setLeechThreshold(project.config.leech_threshold);
  }

  function handleOpen() {
    load();
    const next = !open();
    setOpen(next);
    setHeaderLocked(next);
    setSaved(false);
  }

  function close() {
    setOpen(false);
    setHeaderLocked(false);
  }

  function handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape' && open()) {
      close();
    }
  }

  onMount(() => document.addEventListener('keydown', handleEscape));
  onCleanup(() => document.removeEventListener('keydown', handleEscape));

  function handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('settings-backdrop')) {
      close();
    }
  }

  async function handleSave() {
    const project = activeProject();
    if (!project) return;

    const ret = Math.max(0.7, Math.min(0.99, retention()));
    const nps = Math.max(1, Math.min(100, Math.round(newPerSession())));
    const lt = Math.max(2, Math.min(30, Math.round(leechThreshold())));

    project.config.desired_retention = ret;
    project.config.new_per_session = nps;
    project.config.leech_threshold = lt;

    await workerApi.setFSRSParams(project.slug, [], ret);

    setRetention(ret);
    setNewPerSession(nps);
    setLeechThreshold(lt);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <>
      <button class="tips-btn" title="FSRS settings" onClick={handleOpen}>
        Settings
      </button>
      <Show when={open()}>
        <Portal>
          <div class="settings-backdrop" onClick={handleBackdropClick}>
            <div class="settings-dropdown">
              <label class="settings-field">
                <span>Desired retention</span>
                <input
                  type="number"
                  min="0.7"
                  max="0.99"
                  step="0.01"
                  value={retention()}
                  onInput={e => { const v = parseFloat(e.currentTarget.value); setRetention(isNaN(v) ? 0.9 : v); }}
                />
              </label>
              <label class="settings-field">
                <span>New cards / session</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={newPerSession()}
                  onInput={e => { const v = parseInt(e.currentTarget.value, 10); setNewPerSession(isNaN(v) ? 20 : v); }}
                />
              </label>
              <label class="settings-field">
                <span>Leech threshold</span>
                <input
                  type="number"
                  min="2"
                  max="30"
                  step="1"
                  value={leechThreshold()}
                  onInput={e => { const v = parseInt(e.currentTarget.value, 10); setLeechThreshold(isNaN(v) ? 8 : v); }}
                />
              </label>
              <button class="settings-save-btn" onClick={handleSave}>
                {saved() ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
}
