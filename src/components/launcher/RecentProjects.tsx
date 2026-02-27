import { For, Show } from 'solid-js';

interface RecentProject {
  name: string;
  slug: string;
  timestamp: number;
}

interface RecentProjectsProps {
  projects: RecentProject[];
  onSelect: (slug: string) => void;
}

export function RecentProjects(props: RecentProjectsProps) {
  return (
    <Show when={props.projects.length > 0}>
      <div class="mt-6 text-left">
        <h3 class="text-sm font-semibold text-text-light mb-2">Recent Projects</h3>
        <div class="flex flex-col gap-1">
          <For each={props.projects}>
            {(p) => (
              <button
                class="w-full text-left py-2 px-3 rounded-sm text-sm text-primary bg-transparent border-0 cursor-pointer transition-colors hover:bg-primary-light"
                onClick={() => props.onSelect(p.slug)}
              >
                {p.name}
              </button>
            )}
          </For>
        </div>
      </div>
    </Show>
  );
}
