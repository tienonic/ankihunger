import { createSignal, Show, onMount, onCleanup } from 'solid-js';
import { activeProject } from '../../store/app.ts';
import { workerApi } from '../../hooks/useWorker.ts';

export function SettingsPanel() {
  const [open, setOpen] = createSignal(false);
  const [retention, setRetention] = createSignal(0.9);
  const [newPerSession, setNewPerSession] = createSignal(20);
  const [leechThreshold, setLeechThreshold] = createSignal(8);
  const [saved, setSaved] = createSignal(false);
  let panelRef: HTMLDivElement | undefined;

  function load() {
    const project = activeProject();
    if (!project) return;
    setRetention(project.config.desired_retention);
    setNewPerSession(project.config.new_per_session);
    setLeechThreshold(project.config.leech_threshold);
  }

  function handleClickOutside(e: MouseEvent) {
    if (panelRef && !panelRef.contains(e.target as Node)) {
      setOpen(false);
    }
  }

  onMount(() => document.addEventListener('click', handleClickOutside, true));
  onCleanup(() => document.removeEventListener('click', handleClickOutside, true));

  function handleOpen() {
    load();
    setOpen(!open());
    setSaved(false);
  }

  async function handleSave() {
    const project = activeProject();
    if (!project) return;

    // Clamp retention to valid range
    const ret = Math.max(0.7, Math.min(0.99, retention()));
    const nps = Math.max(1, Math.min(100, Math.round(newPerSession())));
    const lt = Math.max(2, Math.min(30, Math.round(leechThreshold())));

    // Update in-memory config
    project.config.desired_retention = ret;
    project.config.new_per_session = nps;
    project.config.leech_threshold = lt;

    // Persist retention to worker (updates FSRS engine)
    await workerApi.setFSRSParams(project.slug, [], ret);

    setRetention(ret);
    setNewPerSession(nps);
    setLeechThreshold(lt);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div class="settings-panel" ref={panelRef}>
      <button class="tips-btn" title="FSRS settings" onClick={handleOpen}>
        Settings
      </button>
      <Show when={open()}>
        <div class="settings-dropdown">
          <label class="settings-field">
            <span>Desired retention</span>
            <input
              type="number"
              min="0.7"
              max="0.99"
              step="0.01"
              value={retention()}
              onInput={e => setRetention(parseFloat(e.currentTarget.value) || 0.9)}
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
              onInput={e => setNewPerSession(parseInt(e.currentTarget.value) || 20)}
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
              onInput={e => setLeechThreshold(parseInt(e.currentTarget.value) || 8)}
            />
          </label>
          <button class="settings-save-btn" onClick={handleSave}>
            {saved() ? 'Saved' : 'Save'}
          </button>
        </div>
      </Show>
    </div>
  );
}
