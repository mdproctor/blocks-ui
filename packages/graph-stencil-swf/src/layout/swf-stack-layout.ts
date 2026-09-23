import type { GraphModel } from '@casehubio/graph-core';
import type { ElkLayoutResult, NodeLayout } from '@casehubio/graph-renderer';

const NODE_W = 280;
const NODE_H = 53;
const V_GAP = 40;
const H_GAP = 30;
const CONTAINER_PAD_X = 20;
const CONTAINER_PAD_TOP = 40;
const CONTAINER_PAD_BOTTOM = 20;
const INNER_V_GAP = 10;

const SKIP_TYPES = new Set(['swf-root']);

export function computeSwfStackLayout(model: GraphModel): ElkLayoutResult {
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const e of model.edges) {
    const out = outgoing.get(e.source) ?? [];
    out.push(e.target);
    outgoing.set(e.source, out);
    const inc = incoming.get(e.target) ?? [];
    inc.push(e.source);
    incoming.set(e.target, inc);
  }

  const nodeById = new Map(model.nodes.map(n => [n.id, n]));
  const topLevel = model.nodes.filter(n => {
    if (SKIP_TYPES.has(n.type)) return false;
    return !n.parentId || n.parentId === 'root';
  });

  const layer = new Map<string, number>();
  const visited = new Set<string>();

  function assignLayers(id: string, minLayer: number): void {
    const current = layer.get(id) ?? -1;
    if (minLayer <= current) return;
    layer.set(id, minLayer);
    if (visited.has(id)) return;
    visited.add(id);
    for (const t of outgoing.get(id) ?? []) {
      const tn = nodeById.get(t);
      if (!tn) continue;
      if (SKIP_TYPES.has(tn.type)) continue;
      if (tn.parentId && tn.parentId !== 'root' && tn.parentId !== id) continue;
      assignLayers(t, minLayer + 1);
    }
  }

  const starts = topLevel.filter(n => (incoming.get(n.id) ?? []).length === 0);
  for (const n of starts) assignLayers(n.id, 0);
  for (const n of topLevel) {
    if (!layer.has(n.id)) assignLayers(n.id, 0);
  }

  const byLayer = new Map<number, string[]>();
  for (const n of topLevel) {
    const l = layer.get(n.id) ?? 0;
    const list = byLayer.get(l) ?? [];
    list.push(n.id);
    byLayer.set(l, list);
  }

  function computeContainerSize(parentId: string): { w: number; h: number } {
    const children = model.nodes.filter(n => n.parentId === parentId);
    if (children.length === 0) return { w: NODE_W, h: NODE_H };
    let y = CONTAINER_PAD_TOP;
    let maxChildW = 0;
    for (const c of children) {
      const grandchildren = model.nodes.filter(n => n.parentId === c.id);
      if (grandchildren.length > 0) {
        const sub = computeContainerSize(c.id);
        maxChildW = Math.max(maxChildW, sub.w);
        y += sub.h + INNER_V_GAP;
      } else {
        maxChildW = Math.max(maxChildW, NODE_W);
        y += NODE_H + INNER_V_GAP;
      }
    }
    return { w: maxChildW + 2 * CONTAINER_PAD_X, h: y - INNER_V_GAP + CONTAINER_PAD_BOTTOM };
  }

  function layoutChildren(parentId: string, nodeLayouts: Map<string, NodeLayout>): void {
    const children = model.nodes.filter(n => n.parentId === parentId);
    let y = CONTAINER_PAD_TOP;
    const parentSize = computeContainerSize(parentId);
    const innerW = parentSize.w - 2 * CONTAINER_PAD_X;
    for (const c of children) {
      const grandchildren = model.nodes.filter(n => n.parentId === c.id);
      if (grandchildren.length > 0) {
        const sub = computeContainerSize(c.id);
        nodeLayouts.set(c.id, { x: CONTAINER_PAD_X, y, width: sub.w, height: sub.h });
        layoutChildren(c.id, nodeLayouts);
        y += sub.h + INNER_V_GAP;
      } else {
        nodeLayouts.set(c.id, { x: CONTAINER_PAD_X, y, width: innerW, height: NODE_H });
        y += NODE_H + INNER_V_GAP;
      }
    }
  }

  const maxLayer = Math.max(...[...layer.values()], 0);
  const nodeLayouts = new Map<string, NodeLayout>();
  let y = 0;

  for (let l = 0; l <= maxLayer; l++) {
    const ids = byLayer.get(l) ?? [];
    if (ids.length === 0) continue;
    const sizes: { id: string; w: number; h: number }[] = [];
    for (const id of ids) {
      const children = model.nodes.filter(n => n.parentId === id);
      if (children.length > 0) {
        const s = computeContainerSize(id);
        sizes.push({ id, w: s.w, h: s.h });
      } else {
        sizes.push({ id, w: NODE_W, h: NODE_H });
      }
    }
    const totalW = sizes.reduce((sum, s) => sum + s.w, 0) + (sizes.length - 1) * H_GAP;
    let x = -totalW / 2;
    const maxH = Math.max(...sizes.map(s => s.h));
    for (const s of sizes) {
      nodeLayouts.set(s.id, { x, y, width: s.w, height: s.h });
      if (model.nodes.filter(n => n.parentId === s.id).length > 0) {
        layoutChildren(s.id, nodeLayouts);
      }
      x += s.w + H_GAP;
    }
    y += maxH + V_GAP;
  }

  return { nodeLayouts };
}
