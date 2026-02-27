interface ProjectCardProps {
  name: string;
  onClick: () => void;
}

export function ProjectCard(props: ProjectCardProps) {
  return (
    <button
      class="w-full py-3 px-4 rounded-sm border-2 border-primary bg-primary text-white font-semibold cursor-pointer transition-colors hover:bg-primary-dark hover:border-primary-dark"
      onClick={props.onClick}
    >
      {props.name}
    </button>
  );
}
