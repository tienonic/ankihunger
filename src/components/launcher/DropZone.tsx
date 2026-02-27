import { createSignal } from 'solid-js';

interface DropZoneProps {
  onDrop: (file: File) => void;
  onClick: () => void;
}

export function DropZone(props: DropZoneProps) {
  const [isDragOver, setIsDragOver] = createSignal(false);

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files[0];
    if (!file || !file.name.endsWith('.json')) return;
    props.onDrop(file);
  }

  return (
    <div
      class={`border-2 border-dashed rounded-sm py-6 px-4 mb-4 cursor-pointer transition-colors ${
        isDragOver()
          ? 'border-primary bg-primary-light'
          : 'border-border hover:border-primary'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={props.onClick}
    >
      <span class="text-text-light text-sm">
        or drag &amp; drop a .json project file here
      </span>
    </div>
  );
}
