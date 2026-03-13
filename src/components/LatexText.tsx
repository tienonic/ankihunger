import { createEffect } from 'solid-js';
import { renderLatex } from '../core/hooks/useLatex.ts';

/** Renders plain text that may contain $...$ or $$...$$ LaTeX delimiters. */
export function LatexText(props: { text: string | undefined; class?: string }) {
  let el!: HTMLSpanElement;
  createEffect(() => {
    el.textContent = props.text ?? '';
    renderLatex(el);
  });
  return <span ref={el} class={props.class} />;
}

/** Renders an HTML string that may also contain LaTeX delimiters. */
export function LatexHtml(props: { html: string | undefined; class?: string }) {
  let el!: HTMLDivElement;
  createEffect(() => {
    el.innerHTML = props.html ?? '';
    renderLatex(el);
  });
  return <div ref={el} class={props.class} />;
}
