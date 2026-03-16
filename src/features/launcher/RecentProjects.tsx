import { createSignal, For, Show } from 'solid-js';

interface RecentProject {
  name: string;
  slug: string;
  timestamp: number;
}

interface RecentProjectsProps {
  projects: RecentProject[];
  onSelect: (slug: string) => void;
  onClear: () => void;
}

const MAX_VISIBLE = 4;

export function RecentProjects(props: RecentProjectsProps) {
  const [expanded, setExpanded] = createSignal(false);

  const visible = () => {
    if (expanded()) return props.projects;
    return props.projects.slice(0, MAX_VISIBLE);
  };

  const hasMore = () => props.projects.length > MAX_VISIBLE;

  return (
    <Show when={props.projects.length > 0}>
      <div class="launcher-recent">
        <div class="launcher-recent-header">
          <h3>Recent Projects</h3>
          <button class="launcher-recent-clear" onClick={props.onClear}>
            Clear
          </button>
        </div>
        <div class="launcher-recent-list">
          <For each={visible()}>
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
        <Show when={hasMore()}>
          <button
            class="launcher-recent-toggle"
            onClick={() => setExpanded(prev => !prev)}
          >
            {expanded()
              ? 'Show less'
              : `Show ${props.projects.length - MAX_VISIBLE} more`}
          </button>
        </Show>
      </div>
    </Show>
  );
}
