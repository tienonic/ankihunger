import { createSignal } from 'solid-js';
import { projectRegistry } from '../projects/registry.ts';
import { loadProject, validateProject } from '../projects/loader.ts';
import { initWorker, workerApi } from '../hooks/useWorker.ts';
import { setAppPhase, setActiveProject, setActiveTab, activeProject } from './app.ts';
import { buildGlossary } from './glossary.ts';
import type { Project, ProjectData } from '../projects/types.ts';

interface RecentProject {
  name: string;
  slug: string;
  timestamp: number;
}

const [isLoading, setIsLoading] = createSignal(false);
const [loadError, setLoadError] = createSignal<string | null>(null);

export { isLoading, loadError };

export function getRecentProjects(): RecentProject[] {
  try {
    const raw = localStorage.getItem('recent-projects');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function addRecentProject(name: string, slug: string) {
  try {
    let list: RecentProject[] = getRecentProjects();
    list = list.filter(p => p.slug !== slug);
    list.unshift({ name, slug, timestamp: Date.now() });
    if (list.length > 10) list = list.slice(0, 10);
    localStorage.setItem('recent-projects', JSON.stringify(list));
  } catch { /* */ }
}

function setLastProject(slug: string) {
  try { localStorage.setItem('last-project', slug); } catch { /* */ }
}

export function getLastProject(): string | null {
  try { return localStorage.getItem('last-project'); } catch { return null; }
}

function clearLastProject() {
  try { localStorage.removeItem('last-project'); } catch { /* */ }
}

function saveProjectData(slug: string, data: ProjectData) {
  try { localStorage.setItem(`proj-data-${slug}`, JSON.stringify(data)); } catch { /* */ }
}

export function getProjectData(slug: string): ProjectData | null {
  try {
    const raw = localStorage.getItem(`proj-data-${slug}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function openProject(data: ProjectData, isDefault: boolean) {
  setIsLoading(true);
  setLoadError(null);

  try {
    const project = loadProject(data);

    if (!isDefault) saveProjectData(project.slug, data);
    setLastProject(project.slug);
    addRecentProject(project.name, project.slug);

    // Ensure worker is initialized before registering cards
    await initWorker();

    // Register cards with SQLite worker
    const cardRegs: { sectionId: string; cardId: string; cardType: 'mcq' | 'passage' | 'flashcard' }[] = [];
    const sectionIds: string[] = [];
    for (const s of project.sections) {
      sectionIds.push(s.id);
      const mcqType = s.type === 'passage-quiz' ? 'passage' : 'mcq';
      for (const id of s.cardIds) {
        cardRegs.push({ sectionId: s.id, cardId: id, cardType: mcqType as 'mcq' | 'passage' });
      }
      for (const id of s.flashCardIds) {
        cardRegs.push({ sectionId: s.id, cardId: id, cardType: 'flashcard' });
      }
    }
    await workerApi.loadProject(project.slug, sectionIds, cardRegs);

    setActiveProject(project);
    buildGlossary(project);
    setActiveTab(project.sections[0]?.id ?? null);
    setAppPhase('study');
  } catch (err) {
    setLoadError(err instanceof Error ? err.message : 'Failed to load project');
  } finally {
    setIsLoading(false);
  }
}

export async function openRegistryProject(slug: string) {
  const entry = projectRegistry.find(p => p.slug === slug);
  if (!entry) {
    setLoadError('Project not found in registry');
    return;
  }
  const data = await entry.loader();
  await openProject(data, true);
}

export function openRecentProject(slug: string) {
  const entry = projectRegistry.find(p => p.slug === slug);
  if (entry) {
    entry.loader().then(data => openProject(data, true));
  } else {
    const saved = getProjectData(slug);
    if (saved) openProject(saved, false);
    else setLoadError('Project data not found. Please re-import the file.');
  }
}

export function goToLauncher() {
  setAppPhase('launcher');
  setActiveProject(null);
  setActiveTab(null);
}

export function validateAndOpenFile(jsonStr: string) {
  try {
    const data = JSON.parse(jsonStr);
    const errors = validateProject(data);
    if (errors.length > 0) {
      setLoadError('Invalid project: ' + errors.join(', '));
      return;
    }
    openProject(data as ProjectData, false);
  } catch (err) {
    setLoadError('Failed to parse JSON: ' + (err instanceof Error ? err.message : String(err)));
  }
}
