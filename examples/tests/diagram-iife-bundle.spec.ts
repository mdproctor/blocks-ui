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

  test.afterAll(() => {
    server?.close();
  });

  test('palette and diagram render in IIFE bundle', async ({ page }) => {
    test.setTimeout(30000);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(`http://localhost:${server.port}/`);
    await page.waitForTimeout(1000);

    const bundleReady = await page.evaluate(() => typeof (window as any).updateYaml === 'function');
    expect(bundleReady, 'updateYaml should be defined after bundle loads').toBe(true);

    await page.evaluate((yaml) => (window as any).updateYaml(yaml, 'case'), SAMPLE_YAML);
    await page.waitForTimeout(5000);

    const diagramEl = await page.evaluate(() => {
      const root = document.getElementById('diagram-root');
      const el = root?.querySelector('casehub-diagram');
      return {
        exists: !!el,
        tagName: el?.tagName ?? null,
        constructor: el?.constructor.name ?? null,
      };
    });
    expect(diagramEl.exists, 'casehub-diagram element should exist').toBe(true);
    expect(diagramEl.constructor, 'should be upgraded (not HTMLElement)').not.toBe('HTMLElement');

    const paletteState = await page.evaluate(() => {
      const diagram = document.querySelector('casehub-diagram');
      if (!diagram) return { found: false, registered: false, itemCount: 0 };
      const palette = diagram.querySelector('pages-diagram-palette');
      return {
        found: !!palette,
        registered: !!customElements.get('pages-diagram-palette'),
        itemCount: palette?.shadowRoot?.querySelectorAll('[data-type],.palette-item,.stencil-item').length ?? 0,
      };
    });
    expect(paletteState.registered, 'pages-diagram-palette should be a registered custom element').toBe(true);
    expect(paletteState.found, 'pages-diagram-palette should be in the DOM').toBe(true);

    const propPaletteState = await page.evaluate(() => ({
      registered: !!customElements.get('pages-property-palette'),
    }));
    expect(propPaletteState.registered, 'pages-property-palette should be registered').toBe(true);

    const uiComponents = await page.evaluate(() => {
      const tags = ['pages-input', 'pages-select', 'pages-checkbox', 'pages-textarea'];
      return tags.map(t => ({ tag: t, registered: !!customElements.get(t) }));
    });
    for (const comp of uiComponents) {
      expect(comp.registered, `${comp.tag} should be registered`).toBe(true);
    }

    const diagramState = await page.evaluate(() => {
      const diagram = document.querySelector('casehub-diagram');
      if (!diagram) return { diagramFound: false } as any;
      const d = diagram as any;
      const canvas = diagram.querySelector('pages-graph-canvas');
      const canvasShadow = canvas?.shadowRoot;
      const searchRoot = canvasShadow ?? canvas;
      const rfNodes = searchRoot?.querySelectorAll('.react-flow__node');
      const rfContainer = searchRoot?.querySelector('.react-flow');
      return {
        diagramFound: true,
        hasCanvas: !!canvas,
        canvasRegistered: !!customElements.get('pages-graph-canvas'),
        canvasHasShadow: !!canvasShadow,
        canvasChildCount: canvas?.children.length ?? 0,
        hasReactFlow: !!rfContainer,
        rfNodeCount: rfNodes?.length ?? 0,
        _error: d._error ?? null,
        _adapterResult: d._adapterResult ? 'set' : 'null',
        _nodesLength: d._nodes?.length ?? 0,
        _edgesLength: d._edges?.length ?? 0,
        _renderInProgress: d._renderInProgress ?? null,
        childCount: diagram.children.length,
        childTags: Array.from(diagram.children).slice(0, 10).map((c: Element) => c.tagName.toLowerCase()),
      };
    });

    if (diagramState.rfNodeCount === 0) {
      await page.screenshot({ path: 'test-results/iife-diagram-debug.png', fullPage: true });
      console.log('Diagram debug state:', JSON.stringify(diagramState, null, 2));
    }

    expect(diagramState.rfNodeCount, 'diagram should render nodes').toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/iife-diagram-rendered.png', fullPage: true });

    const selectionRectHidden = await page.evaluate(() => {
      const rect = document.querySelector('.react-flow__nodesselection-rect');
      if (!rect) return true;
      const style = getComputedStyle(rect);
      return style.display === 'none';
    });
    expect(selectionRectHidden, 'nodesselection-rect should be hidden').toBe(true);

    const firstNode = page.locator('.react-flow__node').first();
    if (await firstNode.count() > 0) {
      await firstNode.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/iife-diagram-selected.png', fullPage: true });
    }

    expect(errors, 'no page errors').toEqual([]);
  });

  test('external stencil nodes render visible content', async ({ page }) => {
    test.setTimeout(30000);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(`http://localhost:${server.port}/`);
    await page.waitForTimeout(1000);

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

    await page.evaluate((y) => (window as any).updateYaml(y, 'case'), yaml);
    await page.waitForTimeout(5000);

    const externalNode = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.react-flow__node');
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
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(`http://localhost:${server.port}/`);
    await page.waitForTimeout(1000);

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

    await page.evaluate((y) => (window as any).updateYaml(y, 'case'), yaml);
    await page.waitForTimeout(5000);

    const swfRegistered = await page.evaluate(() => !!customElements.get('swf-diagram'));
    expect(swfRegistered, 'swf-diagram should be registered for worker drill-down').toBe(true);

    const expandButton = page.locator('[data-id*="fraud-agent"] button[title="Toggle expand"]');
    expect(await expandButton.count(), 'worker with do tasks should have expand button').toBeGreaterThan(0);

    await expandButton.click();
    await page.waitForTimeout(2000);

    const expanded = await page.evaluate(() => {
      const diagram = document.querySelector('casehub-diagram') as any;
      return {
        expandedWorkers: diagram?._expandedWorkers ? Array.from(diagram._expandedWorkers) : [],
      };
    });
    expect(expanded.expandedWorkers.length, 'worker should be in expanded set after click').toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/iife-diagram-drilldown.png', fullPage: true });
  });

  test('add node from palette via stencil click', async ({ page }) => {
    test.setTimeout(30000);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(`http://localhost:${server.port}/`);
    await page.waitForTimeout(1000);

    await page.evaluate((y) => (window as any).updateYaml(y, 'case'), SAMPLE_YAML);
    await page.waitForTimeout(5000);

    const beforeCount = await page.evaluate(() => {
      const d = document.querySelector('casehub-diagram') as any;
      return d?._nodes?.length ?? 0;
    });

    const palette = page.locator('pages-diagram-palette');
    await expect(palette).toBeAttached();

    const milestoneItem = palette.locator('div.palette-item[aria-label="Milestone"]');
    await milestoneItem.click();
    await page.waitForTimeout(1000);

    const afterCount = await page.evaluate(() => {
      const d = document.querySelector('casehub-diagram') as any;
      return d?._nodes?.length ?? 0;
    });

    expect(afterCount, 'clicking palette item should add a node').toBeGreaterThan(beforeCount);

    await page.screenshot({ path: 'test-results/iife-diagram-added-node.png', fullPage: true });
  });
});
