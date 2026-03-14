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
      <div class="launcher-recent">
        <h3>Recent Projects</h3>
        <div class="launcher-recent-list">
          <For each={props.projects}>
            {(p) => (
              <button
                class="launcher-recent-btn"
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
