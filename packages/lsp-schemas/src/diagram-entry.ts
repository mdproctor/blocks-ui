import '@casehubio/blocks-ui-casehub-diagram';
import '@casehubio/graph-renderer';
import { DIAGRAM_TAGS } from '@casehubio/blocks-ui-core';

function dbg(msg: string) {
  console.log(`[casehub-diag] ${msg}`);
  const d = document.getElementById('debug');
  if (d) d.innerHTML += `${msg}<br>`;
}

dbg(`bundle executing, DIAGRAM_TAGS=${JSON.stringify(DIAGRAM_TAGS)}`);

let activeElement: HTMLElement | null = null;

function createDiagramElement(tag: string): HTMLElement {
  dbg(`creating element: <${tag}>`);
  const el = document.createElement(tag);
  dbg(`element created, tagName=${el.tagName}, constructor=${el.constructor.name}`);
  el.setAttribute('mode', 'readonly');
  const root = document.getElementById('diagram-root')!;
  root.innerHTML = '';
  root.appendChild(el);
  dbg(`element appended to DOM, isConnected=${el.isConnected}`);

  el.addEventListener('yaml-changed', (e: any) => {
    dbg(`yaml-changed event: ${e.detail?.yaml?.substring(0, 50)}...`);
  });

  const origUpdated = (el as any).updated;
  if (origUpdated) {
    (el as any).updated = function(changed: Map<string, unknown>) {
      dbg(`updated() called, changedKeys=[${[...changed.keys()]}]`);
      return origUpdated.call(this, changed);
    };
  }

  return el;
}

(window as any).updateYaml = (yaml: string, format: string) => {
  dbg(`updateYaml called: format=${format}, yamlLen=${yaml?.length}`);
  const tag = DIAGRAM_TAGS[format];
  if (!tag) {
    dbg(`ERROR: no tag for format '${format}'`);
    return;
  }

  if (!activeElement || activeElement.tagName.toLowerCase() !== tag) {
    activeElement = createDiagramElement(tag);
  }

  dbg(`setting yaml property (${yaml?.length} chars)`);
  try {
    (activeElement as any).yaml = yaml;
    dbg(`yaml property set OK`);
    setTimeout(() => {
      const el = activeElement as any;
      dbg(`post-set check: _currentYaml=${el?._currentYaml?.length ?? 'null'}, _error=${el?._error ?? 'none'}, _nodes=${el?._nodes?.length ?? 'null'}, _edges=${el?._edges?.length ?? 'null'}, _renderInProgress=${el?._renderInProgress}`);
      const canvas = el?.shadowRoot?.querySelector('pages-graph-canvas') ?? el?.querySelector('pages-graph-canvas');
      if (canvas && !canvas.props && canvas.nodes?.length > 0) {
        dbg(`pages-graph-canvas stuck on Loading — replacing with graph-canvas-core`);
        const core = document.createElement('graph-canvas-core') as any;
        core.nodes = canvas.nodes;
        core.edges = canvas.edges;
        core.model = canvas.model ?? el?._adapterResult?.model;
        core.editPolicy = canvas.editPolicy;
        core.miniMapNodeColor = canvas.miniMapNodeColor;
        core.style.cssText = canvas.style.cssText;
        core.setAttribute('role', 'img');
        core.setAttribute('aria-label', 'Case definition diagram');
        canvas.replaceWith(core);
        dbg(`graph-canvas-core injected: nodes=${core.nodes?.length}, edges=${core.edges?.length}, model=${!!core.model}`);
      }
    }, 2000);
  } catch (e) {
    dbg(`ERROR setting yaml: ${e}`);
  }
};

(window as any).updateTheme = (css: string) => {
  dbg(`updateTheme called: ${css.substring(0, 60)}...`);
  let style = document.getElementById('theme-vars');
  if (!style) {
    style = document.createElement('style');
    style.id = 'theme-vars';
    document.head.appendChild(style);
  }
  style.textContent = css;
};

(window as any).getDiagramTags = () => DIAGRAM_TAGS;

dbg('bundle init complete, waiting for updateYaml calls');
