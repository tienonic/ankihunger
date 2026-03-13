import type { RegistryEntry, ProjectData } from './types.ts';

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Auto-discover JSON project files from /projects/ at repo root
const jsonModules = import.meta.glob('/projects/*.json', { eager: true }) as Record<
  string,
  { default: ProjectData }
>;

const autoEntries: RegistryEntry[] = Object.entries(jsonModules).map(([, mod]) => {
  const data = mod.default;
  return {
    name: data.name,
    slug: slugify(data.name),
    folder: '',
    loader: () => Promise.resolve(data),
  };
});

export const projectRegistry: RegistryEntry[] = [
  {
    name: 'Sac County Ag Inspector',
    slug: 'sac-county-ag-inspector',
    folder: 'ag-inspector',
    loader: () => import('./ag-inspector/builder.ts').then(m => m.buildDefaultProject()),
  },
  ...autoEntries,
];
