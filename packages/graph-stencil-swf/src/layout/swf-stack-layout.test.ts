import { describe, it, expect } from 'vitest';
import type { GraphModel, GraphNode, GraphEdge } from '@casehubio/graph-core';
import { computeSwfStackLayout } from './swf-stack-layout.js';

function node(id: string, type: string, parentId?: string): GraphNode {
  return { id, type, properties: { label: id.split('/').pop() ?? id }, ...(parentId ? { parentId } : {}) };
}

function edge(source: string, target: string, type = 'default'): GraphEdge {
  return { id: `${source}-${target}`, source, target, type };
}

function linearPipeline(): GraphModel {
  return {
    nodes: [
      node('root', 'swf-root'),
      node('root-entry-node', 'swf-start', 'root'),
      node('/do/0/fetchData', 'swf-call', 'root'),
      node('/do/1/transform', 'swf-call', 'root'),
      node('/do/2/store', 'swf-call', 'root'),
      node('root-exit-node', 'swf-end', 'root'),
    ],
    edges: [
      edge('root-entry-node', '/do/0/fetchData'),
      edge('/do/0/fetchData', '/do/1/transform'),
      edge('/do/1/transform', '/do/2/store'),
      edge('/do/2/store', 'root-exit-node'),
    ],
  };
}

function switchBranching(): GraphModel {
  return {
    nodes: [
      node('root', 'swf-root'),
      node('root-entry-node', 'swf-start', 'root'),
      node('/do/0/validate', 'swf-call', 'root'),
      node('/do/1/route', 'swf-switch', 'root'),
      node('/do/2/pathA', 'swf-call', 'root'),
      node('/do/3/pathB', 'swf-call', 'root'),
      node('/do/4/pathC', 'swf-call', 'root'),
      node('/do/5/merge', 'swf-call', 'root'),
      node('root-exit-node', 'swf-end', 'root'),
    ],
    edges: [
      edge('root-entry-node', '/do/0/validate'),
      edge('/do/0/validate', '/do/1/route'),
      edge('/do/1/route', '/do/2/pathA'),
      edge('/do/1/route', '/do/3/pathB'),
      edge('/do/1/route', '/do/4/pathC'),
      edge('/do/2/pathA', '/do/5/merge'),
      edge('/do/3/pathB', '/do/5/merge'),
      edge('/do/4/pathC', '/do/5/merge'),
      edge('/do/5/merge', 'root-exit-node'),
    ],
  };
}

function unequalBranches(): GraphModel {
  return {
    nodes: [
      node('root', 'swf-root'),
      node('root-entry-node', 'swf-start', 'root'),
      node('/do/0/route', 'swf-switch', 'root'),
      node('/do/1/a1', 'swf-call', 'root'),
      node('/do/2/a2', 'swf-call', 'root'),
      node('/do/3/a3', 'swf-call', 'root'),
      node('/do/4/b1', 'swf-call', 'root'),
      node('/do/5/b2', 'swf-call', 'root'),
      node('/do/6/merge', 'swf-call', 'root'),
      node('root-exit-node', 'swf-end', 'root'),
    ],
    edges: [
      edge('root-entry-node', '/do/0/route'),
      edge('/do/0/route', '/do/1/a1'),
      edge('/do/0/route', '/do/4/b1'),
      edge('/do/1/a1', '/do/2/a2'),
      edge('/do/2/a2', '/do/3/a3'),
      edge('/do/3/a3', '/do/6/merge'),
      edge('/do/4/b1', '/do/5/b2'),
      edge('/do/5/b2', '/do/6/merge'),
      edge('/do/6/merge', 'root-exit-node'),
    ],
  };
}

function tryCatch(): GraphModel {
  return {
    nodes: [
      node('root', 'swf-root'),
      node('root-entry-node', 'swf-start', 'root'),
      node('/do/0/tryBlock', 'swf-try', 'root'),
      node('/do/0/tryBlock/try', 'swf-try-catch', '/do/0/tryBlock'),
      node('/do/0/tryBlock/try/0/action', 'swf-call', '/do/0/tryBlock/try'),
      node('/do/0/tryBlock/catch/do', 'swf-try-catch', '/do/0/tryBlock'),
      node('/do/0/tryBlock/catch/do/0/fallback', 'swf-call', '/do/0/tryBlock/catch/do'),
      node('/do/1/finish', 'swf-call', 'root'),
      node('root-exit-node', 'swf-end', 'root'),
    ],
    edges: [
      edge('root-entry-node', '/do/0/tryBlock'),
      edge('/do/0/tryBlock', '/do/1/finish'),
      edge('/do/1/finish', 'root-exit-node'),
    ],
  };
}

describe('computeSwfStackLayout', () => {
  describe('linear pipeline', () => {
    it('assigns sequential rows with consistent gaps', () => {
      const layout = computeSwfStackLayout(linearPipeline());
      const start = layout.nodeLayouts.get('root-entry-node')!;
      const fetch = layout.nodeLayouts.get('/do/0/fetchData')!;
      const transform = layout.nodeLayouts.get('/do/1/transform')!;
      const store = layout.nodeLayouts.get('/do/2/store')!;
      const end = layout.nodeLayouts.get('root-exit-node')!;

      expect(start).toBeDefined();
      expect(fetch).toBeDefined();
      expect(transform).toBeDefined();
      expect(store).toBeDefined();
      expect(end).toBeDefined();

      expect(start.y).toBeLessThan(fetch.y);
      expect(fetch.y).toBeLessThan(transform.y);
      expect(transform.y).toBeLessThan(store.y);
      expect(store.y).toBeLessThan(end.y);

      const gap1 = fetch.y - (start.y + start.height);
      const gap2 = transform.y - (fetch.y + fetch.height);
      const gap3 = store.y - (transform.y + transform.height);
      expect(gap1).toBeGreaterThanOrEqual(30);
      expect(gap2).toBeGreaterThanOrEqual(30);
      expect(gap3).toBeGreaterThanOrEqual(30);
    });

    it('aligns all nodes at the same x (centered — no fork)', () => {
      const layout = computeSwfStackLayout(linearPipeline());
      const xs = ['root-entry-node', '/do/0/fetchData', '/do/1/transform', '/do/2/store', 'root-exit-node']
        .map(id => layout.nodeLayouts.get(id)!.x);
      expect(new Set(xs).size).toBe(1);
    });

    it('excludes swf-root from layout', () => {
      const layout = computeSwfStackLayout(linearPipeline());
      expect(layout.nodeLayouts.has('root')).toBe(false);
    });
  });

  describe('switch branching', () => {
    it('places branch targets in the same row', () => {
      const layout = computeSwfStackLayout(switchBranching());
      const pathA = layout.nodeLayouts.get('/do/2/pathA')!;
      const pathB = layout.nodeLayouts.get('/do/3/pathB')!;
      const pathC = layout.nodeLayouts.get('/do/4/pathC')!;

      expect(pathA.y).toBe(pathB.y);
      expect(pathB.y).toBe(pathC.y);
    });

    it('places branches side by side with gaps', () => {
      const layout = computeSwfStackLayout(switchBranching());
      const pathA = layout.nodeLayouts.get('/do/2/pathA')!;
      const pathB = layout.nodeLayouts.get('/do/3/pathB')!;
      const pathC = layout.nodeLayouts.get('/do/4/pathC')!;

      const sorted = [pathA, pathB, pathC].sort((a, b) => a.x - b.x);
      const gap1 = sorted[1]!.x - (sorted[0]!.x + sorted[0]!.width);
      const gap2 = sorted[2]!.x - (sorted[1]!.x + sorted[1]!.width);
      expect(gap1).toBeGreaterThanOrEqual(20);
      expect(gap2).toBeGreaterThanOrEqual(20);
    });

    it('places convergence node below all branches', () => {
      const layout = computeSwfStackLayout(switchBranching());
      const pathA = layout.nodeLayouts.get('/do/2/pathA')!;
      const merge = layout.nodeLayouts.get('/do/5/merge')!;

      expect(merge.y).toBeGreaterThan(pathA.y + pathA.height);
    });

    it('places switch node above branches', () => {
      const layout = computeSwfStackLayout(switchBranching());
      const route = layout.nodeLayouts.get('/do/1/route')!;
      const pathA = layout.nodeLayouts.get('/do/2/pathA')!;

      expect(route.y + route.height).toBeLessThanOrEqual(pathA.y);
    });
  });

  describe('unequal branches — bottom alignment', () => {
    it('aligns branch endpoints to the same row before convergence', () => {
      const layout = computeSwfStackLayout(unequalBranches());
      const a3 = layout.nodeLayouts.get('/do/3/a3')!;
      const b2 = layout.nodeLayouts.get('/do/5/b2')!;

      expect(a3.y).toBe(b2.y);
    });

    it('shorter branch starts lower (bottom-aligned)', () => {
      const layout = computeSwfStackLayout(unequalBranches());
      const a1 = layout.nodeLayouts.get('/do/1/a1')!;
      const b1 = layout.nodeLayouts.get('/do/4/b1')!;

      expect(b1.y).toBeGreaterThan(a1.y);
    });

    it('longer branch starts immediately after switch', () => {
      const layout = computeSwfStackLayout(unequalBranches());
      const route = layout.nodeLayouts.get('/do/0/route')!;
      const a1 = layout.nodeLayouts.get('/do/1/a1')!;

      const gap = a1.y - (route.y + route.height);
      expect(gap).toBeGreaterThanOrEqual(30);
      expect(gap).toBeLessThan(200);
    });
  });

  describe('nested split', () => {
    function nestedSplit(): GraphModel {
      return {
        nodes: [
          node('root', 'swf-root'),
          node('root-entry-node', 'swf-start', 'root'),
          node('/do/0/switch1', 'swf-switch', 'root'),
          node('/do/1/A', 'swf-call', 'root'),
          node('/do/2/switch2', 'swf-switch', 'root'),
          node('/do/3/C', 'swf-call', 'root'),
          node('/do/4/D', 'swf-call', 'root'),
          node('/do/5/mergeInner', 'swf-call', 'root'),
          node('/do/6/B', 'swf-call', 'root'),
          node('/do/7/mergeOuter', 'swf-call', 'root'),
          node('root-exit-node', 'swf-end', 'root'),
        ],
        edges: [
          edge('root-entry-node', '/do/0/switch1'),
          edge('/do/0/switch1', '/do/1/A'),
          edge('/do/0/switch1', '/do/6/B'),
          edge('/do/1/A', '/do/2/switch2'),
          edge('/do/2/switch2', '/do/3/C'),
          edge('/do/2/switch2', '/do/4/D'),
          edge('/do/3/C', '/do/5/mergeInner'),
          edge('/do/4/D', '/do/5/mergeInner'),
          edge('/do/5/mergeInner', '/do/7/mergeOuter'),
          edge('/do/6/B', '/do/7/mergeOuter'),
          edge('/do/7/mergeOuter', 'root-exit-node'),
        ],
      };
    }

    it('places inner split branches C and D side by side', () => {
      const layout = computeSwfStackLayout(nestedSplit());
      const C = layout.nodeLayouts.get('/do/3/C')!;
      const D = layout.nodeLayouts.get('/do/4/D')!;

      expect(C.x).not.toBe(D.x);
      expect(C.y).toBe(D.y);
    });

    it('gives branch A a wider column than branch B (nested split widens it)', () => {
      const layout = computeSwfStackLayout(nestedSplit());
      const A = layout.nodeLayouts.get('/do/1/A')!;
      const B = layout.nodeLayouts.get('/do/6/B')!;
      const C = layout.nodeLayouts.get('/do/3/C')!;
      const D = layout.nodeLayouts.get('/do/4/D')!;

      const leftExtent = Math.min(A.x, C.x, D.x);
      const rightExtent = Math.max(A.x + A.width, C.x + C.width, D.x + D.width);
      const branchAWidth = rightExtent - leftExtent;

      expect(branchAWidth).toBeGreaterThan(B.width);
    });

    it('bottom-aligns shorter branch B with the last node of branch A', () => {
      const layout = computeSwfStackLayout(nestedSplit());
      const mergeInner = layout.nodeLayouts.get('/do/5/mergeInner')!;
      const B = layout.nodeLayouts.get('/do/6/B')!;

      expect(B.y).toBe(mergeInner.y);
    });

    it('centers switch1 above both branch columns', () => {
      const layout = computeSwfStackLayout(nestedSplit());
      const switch1 = layout.nodeLayouts.get('/do/0/switch1')!;
      const A = layout.nodeLayouts.get('/do/1/A')!;
      const B = layout.nodeLayouts.get('/do/6/B')!;

      expect(switch1.y + switch1.height).toBeLessThanOrEqual(Math.min(A.y, B.y));
    });
  });

  describe('three-way unequal branches (3/2/1 fill from bottom)', () => {
    function threeWayUnequal(): GraphModel {
      return {
        nodes: [
          node('root', 'swf-root'),
          node('root-entry-node', 'swf-start', 'root'),
          node('/do/0/split', 'swf-switch', 'root'),
          node('/do/1/a1', 'swf-call', 'root'),
          node('/do/2/a2', 'swf-call', 'root'),
          node('/do/3/a3', 'swf-call', 'root'),
          node('/do/4/b1', 'swf-call', 'root'),
          node('/do/5/b2', 'swf-call', 'root'),
          node('/do/6/c1', 'swf-call', 'root'),
          node('/do/7/merge', 'swf-call', 'root'),
          node('root-exit-node', 'swf-end', 'root'),
        ],
        edges: [
          edge('root-entry-node', '/do/0/split'),
          edge('/do/0/split', '/do/1/a1'),
          edge('/do/0/split', '/do/4/b1'),
          edge('/do/0/split', '/do/6/c1'),
          edge('/do/1/a1', '/do/2/a2'),
          edge('/do/2/a2', '/do/3/a3'),
          edge('/do/3/a3', '/do/7/merge'),
          edge('/do/4/b1', '/do/5/b2'),
          edge('/do/5/b2', '/do/7/merge'),
          edge('/do/6/c1', '/do/7/merge'),
          edge('/do/7/merge', 'root-exit-node'),
        ],
      };
    }

    it('bottom-aligns all branch endpoints to the same row', () => {
      const layout = computeSwfStackLayout(threeWayUnequal());
      const a3 = layout.nodeLayouts.get('/do/3/a3')!;
      const b2 = layout.nodeLayouts.get('/do/5/b2')!;
      const c1 = layout.nodeLayouts.get('/do/6/c1')!;

      expect(a3.y).toBe(b2.y);
      expect(b2.y).toBe(c1.y);
    });

    it('shorter branches start lower (filled from bottom)', () => {
      const layout = computeSwfStackLayout(threeWayUnequal());
      const a1 = layout.nodeLayouts.get('/do/1/a1')!;
      const b1 = layout.nodeLayouts.get('/do/4/b1')!;
      const c1 = layout.nodeLayouts.get('/do/6/c1')!;

      expect(a1.y).toBeLessThan(b1.y);
      expect(b1.y).toBeLessThan(c1.y);
    });
  });

  describe('try/catch container', () => {
    it('sizes container to fit children with padding', () => {
      const layout = computeSwfStackLayout(tryCatch());
      const tryBlock = layout.nodeLayouts.get('/do/0/tryBlock')!;
      const trySection = layout.nodeLayouts.get('/do/0/tryBlock/try')!;
      const catchSection = layout.nodeLayouts.get('/do/0/tryBlock/catch/do')!;

      expect(tryBlock).toBeDefined();
      expect(trySection).toBeDefined();
      expect(catchSection).toBeDefined();

      expect(tryBlock.height).toBeGreaterThan(trySection.height + catchSection.height);
      expect(tryBlock.width).toBeGreaterThan(trySection.width);
    });

    it('positions children within container bounds', () => {
      const layout = computeSwfStackLayout(tryCatch());
      const tryBlock = layout.nodeLayouts.get('/do/0/tryBlock')!;
      const trySection = layout.nodeLayouts.get('/do/0/tryBlock/try')!;
      const action = layout.nodeLayouts.get('/do/0/tryBlock/try/0/action')!;

      expect(trySection.x).toBeGreaterThanOrEqual(0);
      expect(trySection.y).toBeGreaterThanOrEqual(0);
      expect(trySection.x + trySection.width).toBeLessThanOrEqual(tryBlock.width);
      expect(trySection.y + trySection.height).toBeLessThanOrEqual(tryBlock.height);
    });
  });
});
