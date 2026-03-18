import './settings.css';
import { Show, onMount, onCleanup, createSignal, batch } from 'solid-js';
import { Portal } from 'solid-js/web';
import { activeProject, activePanel, setActivePanel, setHeaderLocked } from '../../core/store/app.ts';
import { workerApi } from '../../core/hooks/useWorker.ts';

export function SettingsPanel() {
  const [retention, setRetention] = createSignal(0.9);
  const [newPerSession, setNewPerSession] = createSignal(20);
  const [leechThreshold, setLeechThreshold] = createSignal(8);
  const [saved, setSaved] = createSignal(false);
  const [panelTop, setPanelTop] = createSignal(0);
  let btnRef!: HTMLButtonElement;

  function load() {
    const project = activeProject();
    if (!project) return;
    batch(() => {
      setRetention(project.config.desired_retention);
      setNewPerSession(project.config.new_per_session);
      setLeechThreshold(project.config.leech_threshold);
    });
  }

  function handleOpen() {
    if (activePanel() === 'settings') {
      batch(() => { setActivePanel(null); setHeaderLocked(false); });
    } else {
      load();
      batch(() => { setPanelTop(btnRef.getBoundingClientRect().top); setActivePanel('settings'); setHeaderLocked(true); setSaved(false); });
    }
  }

  function close() { batch(() => { setActivePanel(null); setHeaderLocked(false); }); }

  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape' && activePanel() === 'settings') close(); };
  onMount(() => document.addEventListener('keydown', escHandler));
  onCleanup(() => { document.removeEventListener('keydown', escHandler); if (saveTimer) clearTimeout(saveTimer); });

  async function handleSave() {
    const project = activeProject();
    if (!project) return;

    const ret = Math.max(0.7, Math.min(0.99, retention()));
    const nps = Math.max(1, Math.min(100, Math.round(newPerSession())));
    const lt = Math.max(2, Math.min(30, Math.round(leechThreshold())));

    project.config.desired_retention = ret;
    project.config.new_per_session = nps;
    project.config.leech_threshold = lt;

    try {
      await workerApi.setFSRSParams(ret, lt);
      batch(() => { setRetention(ret); setNewPerSession(nps); setLeechThreshold(lt); setSaved(true); });
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { setSaved(false); saveTimer = undefined; }, 1500);
    } catch {
      // Keep local state changes; DB persistence failure is non-critical
    }
  }

  return (
    <>
      <button type="button" ref={btnRef} class="tips-btn" title="FSRS settings" onClick={handleOpen}>Settings</button>
      <Show when={activePanel() === 'settings'}>
        <Portal>
          <div class="settings-backdrop" onClick={(e) => { if (e.target instanceof Element && e.target.classList.contains('settings-backdrop')) close(); }}>
            <div class="settings-dropdown" style={{ top: `${panelTop()}px` }}>
              <label class="settings-field"><span>Desired retention</span><input type="number" min="0.7" max="0.99" step="0.01" value={retention()} onInput={e => { const v = parseFloat(e.currentTarget.value); setRetention(isNaN(v) ? 0.9 : v); }} /></label>
              <label class="settings-field"><span>New cards / session</span><input type="number" min="1" max="100" step="1" value={newPerSession()} onInput={e => { const v = parseInt(e.currentTarget.value, 10); setNewPerSession(isNaN(v) ? 20 : v); }} /></label>
              <label class="settings-field"><span>Leech threshold</span><input type="number" min="2" max="30" step="1" value={leechThreshold()} onInput={e => { const v = parseInt(e.currentTarget.value, 10); setLeechThreshold(isNaN(v) ? 8 : v); }} /></label>
              <button type="button" class="settings-save-btn" onClick={handleSave}>{saved() ? 'Saved' : 'Save'}</button>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
}
