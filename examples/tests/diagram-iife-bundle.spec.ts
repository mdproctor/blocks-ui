import { test, expect } from '@playwright/test';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { resolve, extname } from 'path';

const DIST_DIR = resolve(import.meta.dirname, '../../packages/lsp-schemas/dist');
const SHELL_SRC = resolve(import.meta.dirname, '../../packages/lsp-schemas/src/diagram-shell.html');

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.map': 'application/json',
};

const SAMPLE_YAML = `dsl: casehub/1.0
namespace: test
name: palette-test
version: "1.0"
spec:
  bindings:
    - name: validate
      capability:
        name: schema-validation
        version: "1.0"
    - name: review
      humanTask:
        form: review-form
        assignmentStrategy: trust-weighted
  workers:
    - name: validator
      capabilities:
        - schema-validation
      agent:
        model: gpt-4o
        instructions: Validate input
  milestones:
    - name: validated
      condition: "validate.complete"
  goals:
    - name: done
      expression:
        all:
          - validated
`;

function startServer(): Promise<{ port: number; close: () => void }> {
  return new Promise((ok) => {
    const server = createServer((req, res) => {
      const url = req.url === '/' ? '/diagram-shell.html' : req.url!;
      const name = url.split('?')[0];

      let filePath: string;
      if (name === '/diagram-shell.html') {
        filePath = SHELL_SRC;
      } else {
        filePath = resolve(DIST_DIR, '.' + name);
      }

      if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const ext = extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(readFileSync(filePath));
    });

    server.listen(0, () => {
      const addr = server.address()!;
      const port = typeof addr === 'string' ? 0 : addr.port;
      ok({ port, close: () => server.close() });
    });
  });
}

test.describe('IIFE diagram bundle', () => {
  let server: { port: number; close: () => void };

  test.beforeAll(async () => {
    server = await startServer();
  });

  async function loadDiagram(page: any, yaml: string) {
    await page.goto(`http://localhost:${server.port}/`);
    await page.waitForTimeout(1000);
    await page.addScriptTag({ content: `
      window._findDiagram = () => {
        const wb = document.querySelector('blocks-diagram-workbench');
        return wb?.shadowRoot?.querySelector('casehub-diagram') ?? document.querySelector('casehub-diagram');
      };
    `});
    await page.evaluate((y: string) => (window as any).updateYaml(y, 'case'), yaml);
    await page.waitForTimeout(5000);
  }

  test.afterAll(() => {
    server?.close();
  });

  test('palette and diagram render in IIFE bundle', async ({ page }) => {
    test.setTimeout(30000);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await loadDiagram(page, SAMPLE_YAML);

    const diagramEl = await page.evaluate(() => {
      const el = (window as any)._findDiagram();
      return {
        exists: !!el,
        constructor: el?.constructor.name ?? null,
      };
    });
    expect(diagramEl.exists, 'casehub-diagram element should exist').toBe(true);
    expect(diagramEl.constructor, 'should be upgraded (not HTMLElement)').not.toBe('HTMLElement');

    const paletteState = await page.evaluate(() => {
      const diagram = (window as any)._findDiagram();
      if (!diagram) return { found: false, registered: false };
      const palette = diagram.querySelector('pages-diagram-palette');
      return {
        found: !!palette,
        registered: !!customElements.get('pages-diagram-palette'),
      };
    });
    expect(paletteState.registered, 'pages-diagram-palette should be registered').toBe(true);
    expect(paletteState.found, 'pages-diagram-palette should be in the DOM').toBe(true);

    expect(await page.evaluate(() => !!customElements.get('pages-property-palette')), 'pages-property-palette should be registered').toBe(true);

    const rfNodeCount = await page.evaluate(() => {
      const diagram = (window as any)._findDiagram();
      const canvas = diagram?.querySelector('pages-graph-canvas');
      const root = canvas?.shadowRoot ?? canvas;
      return root?.querySelectorAll('.react-flow__node').length ?? 0;
    });
    expect(rfNodeCount, 'diagram should render nodes').toBeGreaterThan(0);

    expect(errors, 'no page errors').toEqual([]);
  });

  test('case format uses diagram-workbench for drill-down', async ({ page }) => {
    test.setTimeout(30000);

    const yaml = `dsl: casehub/1.0
namespace: test
name: drilldown-workbench-test
version: "1.0"
spec:
  bindings:
    - name: detect
      capability:
        name: fraud-scoring
        version: "1.0"
  workers:
    - name: fraud-agent
      capabilities:
        - fraud-scoring
      agent:
        model: gpt-4o
        instructions: Run fraud detection
      do:
        - fetchData:
            call: http
            with:
              method: post
              endpoint:
                uri: https://api.internal/enrich
        - checkResult:
            switch:
              - when: \${.score > 0.8}
                then: flag
              - when: \${.score <= 0.8}
                then: pass`;

    await loadDiagram(page, yaml);

    const workbenchState = await page.evaluate(() => ({
      workbenchExists: !!document.querySelector('blocks-diagram-workbench'),
      workbenchRegistered: !!customElements.get('blocks-diagram-workbench'),
    }));
    expect(workbenchState.workbenchRegistered, 'blocks-diagram-workbench should be registered').toBe(true);
    expect(workbenchState.workbenchExists, 'case format should use diagram-workbench').toBe(true);

    const drillButton = page.locator('[data-id*="fraud-agent"] button[title="Drill down"]');
    expect(await drillButton.count(), 'worker should have drill-down button').toBeGreaterThan(0);
    await drillButton.click();
    await page.waitForTimeout(2000);

    const afterDrill = await page.evaluate(() => {
      const wb = document.querySelector('blocks-diagram-workbench') as any;
      return {
        stackDepth: wb?._stack?.length ?? 0,
        hasSwfDiagram: !!document.querySelector('swf-diagram'),
      };
    });
    expect(afterDrill.stackDepth, 'drill-down should push to workbench stack').toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/iife-diagram-workbench-drilldown.png', fullPage: true });
  });

  test('connections enabled and model set on graph canvas', async ({ page }) => {
    test.setTimeout(30000);
    await loadDiagram(page, SAMPLE_YAML);

    const canvasState = await page.evaluate(() => {
      const diagram = (window as any)._findDiagram();
      const coreCanvas = diagram?.querySelector('graph-canvas-core') as any;
      return {
        connectionsEnabled: coreCanvas?.connectionsEnabled,
        hasModel: !!coreCanvas?.model,
        modelNodeCount: coreCanvas?.model?.nodes?.length ?? 0,
      };
    });

    expect(canvasState.connectionsEnabled, 'connectionsEnabled should be true for interactive diagrams').toBe(true);
    expect(canvasState.hasModel, 'model should be set on graph-canvas-core for connection validation').toBe(true);
    expect(canvasState.modelNodeCount, 'model should have nodes').toBeGreaterThan(0);
  });

  test('selection outline covers full rendered content', async ({ page }) => {
    test.setTimeout(30000);
    await loadDiagram(page, SAMPLE_YAML);

    const overflows = await page.evaluate(() => {
      const diagram = (window as any)._findDiagram();
      const nodes = diagram?.querySelectorAll('.react-flow__node') ?? [];
      const results: { id: string; wrapperH: number; contentH: number; overflow: number }[] = [];
      for (const node of nodes) {
        const wrapper = node.querySelector('.stencil-decoration-wrapper') as HTMLElement;
        if (!wrapper) continue;
        const wrapperRect = wrapper.getBoundingClientRect();
        let maxBottom = wrapperRect.bottom;
        for (const child of wrapper.querySelectorAll('*')) {
          const r = child.getBoundingClientRect();
          if (r.bottom > maxBottom) maxBottom = r.bottom;
        }
        const overflow = Math.round(maxBottom - wrapperRect.bottom);
        results.push({
          id: node.getAttribute('data-id') ?? '',
          wrapperH: Math.round(wrapperRect.height),
          contentH: Math.round(maxBottom - wrapperRect.top),
          overflow,
        });
      }
      return results;
    });

    for (const node of overflows) {
      expect(node.overflow, `${node.id}: content overflows wrapper by ${node.overflow}px (wrapper=${node.wrapperH}, content=${node.contentH})`).toBeLessThanOrEqual(2);
    }
  });

  test('external stencil nodes render visible content', async ({ page }) => {
    test.setTimeout(30000);

    const yaml = `dsl: casehub/1.0
namespace: test
name: external-test
version: "1.0"
spec:
  bindings:
    - name: lookup
      capability:
        name: policy-verification
        version: "2.1"
  workers: []`;

    await loadDiagram(page, yaml);

    const externalNode = await page.evaluate(() => {
      const diagram = (window as any)._findDiagram();
      const nodes = diagram?.querySelectorAll('.react-flow__node') ?? [];
      for (const node of nodes) {
        const dataId = node.getAttribute('data-id') ?? '';
        if (dataId.startsWith('external:')) {
          const wrapper = node.querySelector('.stencil-decoration-wrapper');
          const text = wrapper?.textContent?.trim() ?? '';
          return { found: true, dataId, hasText: text.length > 0, text: text.substring(0, 100) };
        }
      }
      return { found: false, dataId: '', hasText: false, text: '' };
    });

    expect(externalNode.found, 'should have an external node for unresolved capability').toBe(true);
    expect(externalNode.hasText, `external node should render visible text, got: "${externalNode.text}"`).toBe(true);
  });

  test('SWF drill-down: swf-diagram registered and worker expand works', async ({ page }) => {
    test.setTimeout(30000);

    const yaml = `dsl: casehub/1.0
namespace: test
name: drilldown-test
version: "1.0"
spec:
  bindings:
    - name: detect
      capability:
        name: fraud-scoring
        version: "1.0"
  workers:
    - name: fraud-agent
      capabilities:
        - fraud-scoring
      agent:
        model: gpt-4o
        instructions: Run fraud detection
      do:
        - fetchData:
            call: http
            with:
              method: post
              endpoint:
                uri: https://api.internal/enrich
        - checkResult:
            switch:
              - when: \${.score > 0.8}
                then: flag
              - when: \${.score <= 0.8}
                then: pass`;

    await loadDiagram(page, yaml);

    expect(await page.evaluate(() => !!customElements.get('swf-diagram')), 'swf-diagram should be registered').toBe(true);

    const expandButton = page.locator('[data-id*="fraud-agent"] button[title="Toggle expand"]');
    expect(await expandButton.count(), 'worker with do tasks should have expand button').toBeGreaterThan(0);
    await expandButton.click();
    await page.waitForTimeout(2000);

    const expanded = await page.evaluate(() => {
      const diagram = (window as any)._findDiagram() as any;
      return {
        expandedWorkers: diagram?._expandedWorkers ? Array.from(diagram._expandedWorkers) : [],
      };
    });
    expect(expanded.expandedWorkers.length, 'worker should be in expanded set after click').toBeGreaterThan(0);
  });

  test('add node from palette via stencil click', async ({ page }) => {
    test.setTimeout(30000);
    await loadDiagram(page, SAMPLE_YAML);

    const beforeCount = await page.evaluate(() => {
      const d = (window as any)._findDiagram() as any;
      return d?._nodes?.length ?? 0;
    });

    const palette = page.locator('pages-diagram-palette');
    await expect(palette).toBeAttached();

    const milestoneItem = palette.locator('div.palette-item[aria-label="Milestone"]');
    await milestoneItem.click();
    await page.waitForTimeout(1000);

    const afterCount = await page.evaluate(() => {
      const d = (window as any)._findDiagram() as any;
      return d?._nodes?.length ?? 0;
    });

    expect(afterCount, 'clicking palette item should add a node').toBeGreaterThan(beforeCount);
  });

  test('pane click shows node picker and adds node on selection', async ({ page }) => {
    test.setTimeout(30000);
    await loadDiagram(page, SAMPLE_YAML);

    const beforeCount = await page.evaluate(() => {
      const d = (window as any)._findDiagram() as any;
      return d?._nodes?.length ?? 0;
    });
    expect(beforeCount, 'diagram should have nodes before picker test').toBeGreaterThan(0);

    await page.evaluate(async () => {
      const diagram = (window as any)._findDiagram() as any;
      diagram._lastPointerX = 300;
      diagram._lastPointerY = 300;
      diagram._showPickerAtPaneClick();
      await diagram.updateComplete;
    });

    const chooserVisible = await page.evaluate(() => {
      const diagram = (window as any)._findDiagram();
      return !!diagram?.querySelector('pages-node-chooser');
    });
    expect(chooserVisible, 'node chooser should appear on pane click').toBe(true);

    await page.locator('role=option[name="Milestone"]').click();
    await page.waitForTimeout(1000);

    const afterCount = await page.evaluate(() => {
      const d = (window as any)._findDiagram() as any;
      return d?._nodes?.length ?? 0;
    });
    expect(afterCount, 'clicking chooser item should add a node').toBeGreaterThan(beforeCount);
  });

  test('connect-end-on-empty picker creates edge from source to new node', async ({ page }) => {
    test.setTimeout(30000);
    await loadDiagram(page, SAMPLE_YAML);

    const result = await page.evaluate(async () => {
      const diagram = (window as any)._findDiagram() as any;
      if (!diagram) return { error: 'no diagram' };

      const beforeNodes = diagram._nodes?.length ?? 0;
      const beforeEdges = diagram._edges?.length ?? 0;
      const bindingNode = diagram._adapterResult?.model?.nodes?.find((n: any) => n.type === 'binding');
      if (!bindingNode) return { error: 'no binding node' };
      const sourceId = bindingNode.id;

      diagram._lastPointerX = 500;
      diagram._lastPointerY = 400;
      diagram._showPickerAtConnectEnd({ sourceNodeId: sourceId });
      await diagram.updateComplete;

      const chooser = diagram.querySelector('pages-node-chooser');
      if (!chooser) return { error: 'no chooser' };

      chooser.dispatchEvent(new CustomEvent('pages-palette-select', {
        bubbles: true, composed: true,
        detail: { item: { type: 'worker', label: 'Worker', icon: 'cpu' } },
      }));

      const waitForRender = () => new Promise<void>(r => {
        const check = () => {
          if (!diagram._renderInProgress) { r(); return; }
          setTimeout(check, 100);
        };
        setTimeout(check, 500);
      });
      await waitForRender();

      const afterNodes = diagram._nodes?.length ?? 0;
      const afterEdges = diagram._edges?.length ?? 0;
      return {
        sourceId,
        nodeAdded: afterNodes > beforeNodes,
        edgeAdded: afterEdges > beforeEdges,
        beforeEdges,
        afterEdges,
      };
    });

    expect(result.nodeAdded, 'should add a new node from connect-end-on-empty').toBe(true);
  });

  test('connect-end from binding adding milestone creates condition edge', async ({ page }) => {
    test.setTimeout(30000);
    await loadDiagram(page, SAMPLE_YAML);

    const result = await page.evaluate(async () => {
      const diagram = (window as any)._findDiagram() as any;
      if (!diagram) return { error: 'no diagram' };

      const binding = diagram._adapterResult?.model?.nodes?.find((n: any) => n.type === 'binding');
      if (!binding) return { error: 'no binding' };

      const beforeEdges = diagram._edges?.length ?? 0;

      diagram._lastPointerX = 500;
      diagram._lastPointerY = 400;
      diagram._showPickerAtConnectEnd({ sourceNodeId: binding.id });
      await diagram.updateComplete;

      const chooser = diagram.querySelector('pages-node-chooser');
      if (!chooser) return { error: 'no chooser' };

      chooser.dispatchEvent(new CustomEvent('pages-palette-select', {
        bubbles: true, composed: true,
        detail: { item: { type: 'milestone', label: 'Milestone', icon: 'flag' } },
      }));

      const waitForRender = () => new Promise<void>(r => {
        const check = () => {
          if (!diagram._renderInProgress) { r(); return; }
          setTimeout(check, 100);
        };
        setTimeout(check, 500);
      });
      await waitForRender();

      const afterEdges = diagram._edges?.length ?? 0;
      const bindingName = binding.properties?.name as string;
      const yaml = diagram._currentYaml as string;
      const hasCondition = yaml.includes(`${bindingName}.complete`);

      return {
        bindingName,
        beforeEdges,
        afterEdges,
        edgeAdded: afterEdges > beforeEdges,
        hasCondition,
      };
    });

    expect(result.hasCondition, `milestone should have condition referencing ${result.bindingName}`).toBe(true);
    expect(result.edgeAdded, `edge should be created (${result.beforeEdges} → ${result.afterEdges})`).toBe(true);
  });

  test('connect-end picker filters items by connectable types from source', async ({ page }) => {
    test.setTimeout(30000);
    await loadDiagram(page, SAMPLE_YAML);

    const result = await page.evaluate(async () => {
      const diagram = (window as any)._findDiagram() as any;
      if (!diagram) return { error: 'no diagram' };

      const binding = diagram._adapterResult?.model?.nodes?.find((n: any) => n.type === 'binding');
      if (!binding) return { error: 'no binding' };

      diagram._lastPointerX = 400;
      diagram._lastPointerY = 400;
      diagram._showPickerAtConnectEnd({ sourceNodeId: binding.id });
      await diagram.updateComplete;

      const chooser = diagram.querySelector('pages-node-chooser');
      if (!chooser) return { error: 'no chooser' };

      const items = chooser.items?.map((i: any) => i.type) ?? [];

      diagram._chooserState = null;
      return { sourceType: binding.type, items };
    });

    expect(result.items, 'picker from binding should show types connectable to/from binding').toEqual(
      expect.arrayContaining(['worker', 'milestone', 'goal']),
    );
    expect(result.items, 'should not include binding itself').not.toContain('binding');
  });
});
