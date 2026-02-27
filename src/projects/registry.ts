import type { RegistryEntry } from './types.ts';

export const projectRegistry: RegistryEntry[] = [
  {
    name: 'Sac County Ag Inspector',
    slug: 'sac-county-ag-inspector',
    folder: 'ag-inspector',
    loader: () => import('./ag-inspector/builder.ts').then(m => m.buildDefaultProject()),
  },
];
