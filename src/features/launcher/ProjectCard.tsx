interface ProjectCardProps {
  name: string;
  onClick: () => void;
}

export function ProjectCard(props: ProjectCardProps) {
  return (
    <button
      class="launcher-proj-btn"
      onClick={props.onClick}
    >
      {props.name}
    </button>
  );
}
