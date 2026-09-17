import '@casehubio/blocks-ui-casehub-diagram';
import { DIAGRAM_TAGS } from '@casehubio/blocks-ui-core';

let activeElement: HTMLElement | null = null;

function createDiagramElement(tag: string): HTMLElement {
  const el = document.createElement(tag);
  el.setAttribute('mode', 'readonly');
  document.getElementById('diagram-root')!.innerHTML = '';
  document.getElementById('diagram-root')!.appendChild(el);
  return el;
}

(window as any).updateYaml = (yaml: string, format: string) => {
  const tag = DIAGRAM_TAGS[format];
  if (!tag) return;

  if (!activeElement || activeElement.tagName.toLowerCase() !== tag) {
    activeElement = createDiagramElement(tag);
  }

  (activeElement as any).yaml = yaml;
};

(window as any).updateTheme = (css: string) => {
  let style = document.getElementById('theme-vars');
  if (!style) {
    style = document.createElement('style');
    style.id = 'theme-vars';
    document.head.appendChild(style);
  }
  style.textContent = css;
};

(window as any).getDiagramTags = () => DIAGRAM_TAGS;
