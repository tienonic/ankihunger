import type { ProjectData, Project, ProjectConfig, Section } from './types.ts';

const DEFAULT_CONFIG: ProjectConfig = {
  desired_retention: 0.9,
  learn_steps: [1, 10],
  new_per_session: 20,
  leech_threshold: 8,
  imageSearchSuffix: '',
};

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildCardIds(section: Section): void {
  section.cardIds = [];
  section.flashCardIds = [];

  if (section.type === 'mc-quiz' && section.questions) {
    section.questions.forEach((_, i) => {
      section.cardIds.push(`${section.id}-${i}`);
    });
  } else if (section.type === 'passage-quiz' && section.scenarios) {
    section.scenarios.forEach((s, si) => {
      s.questions.forEach((_, qi) => {
        section.cardIds.push(`${section.id}-${si}-${qi}`);
      });
    });
  }

  if (section.flashcards) {
    section.flashcards.forEach((_, i) => {
      section.flashCardIds.push(`${section.id}-flash-${i}`);
    });
  }
}

export function loadProject(data: ProjectData): Project {
  const config: ProjectConfig = { ...DEFAULT_CONFIG, ...data.config };
  const sections: Section[] = (data.sections as Section[]).map(s => {
    const section = { ...s, cardIds: [] as string[], flashCardIds: [] as string[] };
    buildCardIds(section);
    return section;
  });

  return {
    name: data.name,
    slug: slugify(data.name),
    version: data.version ?? 1,
    config,
    sections,
    glossary: data.glossary ?? [],
  };
}

export function validateProject(data: unknown): string[] {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    errors.push('Invalid project data');
    return errors;
  }

  const d = data as Record<string, unknown>;
  if (!d.name) errors.push('Missing project name');
  if (!Array.isArray(d.sections) || d.sections.length === 0) {
    errors.push('No sections defined');
  } else {
    const VALID_TYPES: Section['type'][] = ['mc-quiz', 'passage-quiz', 'math-gen'];
    const seenIds = new Set<string>();
    for (const s of d.sections as Record<string, unknown>[]) {
      if (!s.id) errors.push('Section missing id');
      else if (seenIds.has(s.id as string)) errors.push(`Duplicate section id: "${s.id}"`);
      else seenIds.add(s.id as string);
      if (!s.name) errors.push('Section missing name');
      if (!s.type) {
        errors.push(`Section "${s.name || s.id}" missing type`);
      } else if (!VALID_TYPES.includes(s.type as Section['type'])) {
        errors.push(`Section "${s.name || s.id}" has invalid type: "${s.type}"`);
      }
      if (s.type === 'mc-quiz' && (!Array.isArray(s.questions) || (s.questions as unknown[]).length === 0)) {
        errors.push(`Section "${s.name}" has no questions`);
      }
      if (s.type === 'passage-quiz' && (!Array.isArray(s.scenarios) || (s.scenarios as unknown[]).length === 0)) {
        errors.push(`Section "${s.name}" has no scenarios`);
      }
      if (s.type === 'math-gen' && (!Array.isArray(s.generators) || (s.generators as unknown[]).length === 0)) {
        errors.push(`Section "${s.name}" has no generators`);
      }
    }
  }

  return errors;
}
