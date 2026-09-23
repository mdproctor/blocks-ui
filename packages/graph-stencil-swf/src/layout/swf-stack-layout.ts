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

interface Cell { row: number; col: number; colSpan: number }

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
  const topLevelIds = new Set<string>();
  for (const n of model.nodes) {
    if (SKIP_TYPES.has(n.type)) continue;
    if (!n.parentId || n.parentId === 'root') topLevelIds.add(n.id);
  }

  const grid = new Map<string, Cell>();
  const placed = new Set<string>();

  function walkSequence(startId: string, row: number, col: number, colSpan: number): number {
    let id = startId;
    let r = row;
    while (id) {
      if (placed.has(id) || !topLevelIds.has(id)) break;
      const targets = (outgoing.get(id) ?? []).filter(t => topLevelIds.has(t));

      if (targets.length <= 1) {
        grid.set(id, { row: r, col, colSpan });
        placed.add(id);
        r++;
        if (targets.length === 0) break;
        const nextIncoming = (incoming.get(targets[0]!) ?? []).filter(t => topLevelIds.has(t));
        if (nextIncoming.length > 1) break;
        id = targets[0]!;
      } else {
        grid.set(id, { row: r, col, colSpan });
        placed.add(id);
        r++;

        const branchEnds: number[] = [];
        const colWidth = colSpan / targets.length;
        for (let i = 0; i < targets.length; i++) {
          const branchCol = col + i * colWidth;
          const endRow = walkSequence(targets[i]!, r, branchCol, colWidth);
          branchEnds.push(endRow);
        }

        const maxEnd = Math.max(...branchEnds);
        for (let i = 0; i < targets.length; i++) {
          const branchDepth = branchEnds[i]! - r;
          const shift = maxEnd - branchEnds[i]!;
          if (shift > 0) shiftBranch(targets[i]!, shift);
        }

        r = maxEnd;
        const convergence = findConvergence(targets);
        if (convergence) {
          id = convergence;
        } else {
          break;
        }
      }
    }
    return r;
  }

  function shiftBranch(startId: string, shift: number): void {
    let id: string | undefined = startId;
    while (id && placed.has(id)) {
      const cell = grid.get(id);
      if (cell) grid.set(id, { ...cell, row: cell.row + shift });
      const targets = (outgoing.get(id) ?? []).filter(t => topLevelIds.has(t) && placed.has(t));
      const incs = targets.length === 1 ? (incoming.get(targets[0]!) ?? []).filter(t => topLevelIds.has(t)) : [];
      if (targets.length === 1 && incs.length === 1) {
        id = targets[0];
      } else {
        break;
      }
    }
  }

  function findConvergence(branchStarts: string[]): string | undefined {
    const reachable = branchStarts.map(s => {
      const set = new Set<string>();
      const queue = [s];
      while (queue.length) {
        const id = queue.shift()!;
        if (set.has(id)) continue;
        set.add(id);
        for (const t of (outgoing.get(id) ?? []).filter(x => topLevelIds.has(x))) queue.push(t);
      }
      return set;
    });
    if (reachable.length === 0) return undefined;
    let common = reachable[0]!;
    for (let i = 1; i < reachable.length; i++) {
      common = new Set([...common].filter(x => reachable[i]!.has(x)));
    }
    for (const id of common) {
      if (!branchStarts.includes(id) && !placed.has(id)) return id;
    }
    return undefined;
  }

  const startNodes = [...topLevelIds].filter(id => (incoming.get(id) ?? []).length === 0);
  const totalCols = 1;
  for (const s of startNodes) {
    if (!placed.has(s)) walkSequence(s, placed.size > 0 ? Math.max(...[...grid.values()].map(c => c.row)) + 1 : 0, 0, totalCols);
  }
  for (const id of topLevelIds) {
    if (!placed.has(id)) {
      grid.set(id, { row: grid.size, col: 0, colSpan: totalCols });
      placed.add(id);
    }
  }

  const maxRow = Math.max(...[...grid.values()].map(c => c.row), 0);
  const rowNodes = new Map<number, string[]>();
  for (const [id, cell] of grid) {
    const list = rowNodes.get(cell.row) ?? [];
    list.push(id);
    rowNodes.set(cell.row, list);
  }

  let maxColsInAnyRow = 1;
  for (const ids of rowNodes.values()) maxColsInAnyRow = Math.max(maxColsInAnyRow, ids.length);

  function computeContainerSize(parentId: string): { w: number; h: number } {
    const children = model.nodes.filter(n => n.parentId === parentId);
    if (children.length === 0) return { w: NODE_W, h: NODE_H };
    let y = CONTAINER_PAD_TOP;
    let maxChildW = 0;
    for (const c of children) {
      const gc = model.nodes.filter(n => n.parentId === c.id);
      if (gc.length > 0) {
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
      const gc = model.nodes.filter(n => n.parentId === c.id);
      if (gc.length > 0) {
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

  const nodeLayouts = new Map<string, NodeLayout>();
  const totalW = maxColsInAnyRow * NODE_W + (maxColsInAnyRow - 1) * H_GAP;

  for (let r = 0; r <= maxRow; r++) {
    const ids = rowNodes.get(r) ?? [];
    if (ids.length === 0) continue;
    const count = ids.length;
    const y = r * (NODE_H + V_GAP);

    const sorted = ids.sort((a, b) => (grid.get(a)?.col ?? 0) - (grid.get(b)?.col ?? 0));
    if (count === 1) {
      const id = sorted[0]!;
      const children = model.nodes.filter(n => n.parentId === id);
      if (children.length > 0) {
        const s = computeContainerSize(id);
        const x = (totalW - s.w) / 2;
        nodeLayouts.set(id, { x, y, width: s.w, height: s.h });
        layoutChildren(id, nodeLayouts);
      } else {
        const x = (totalW - NODE_W) / 2;
        nodeLayouts.set(id, { x, y, width: NODE_W, height: NODE_H });
      }
    } else {
      const rowW = count * NODE_W + (count - 1) * H_GAP;
      const startX = (totalW - rowW) / 2;
      for (let i = 0; i < sorted.length; i++) {
        const id = sorted[i]!;
        const children = model.nodes.filter(n => n.parentId === id);
        if (children.length > 0) {
          const s = computeContainerSize(id);
          nodeLayouts.set(id, { x: startX + i * (NODE_W + H_GAP), y, width: s.w, height: s.h });
          layoutChildren(id, nodeLayouts);
        } else {
          nodeLayouts.set(id, { x: startX + i * (NODE_W + H_GAP), y, width: NODE_W, height: NODE_H });
        }
      }
    }
  }

  return { nodeLayouts };
}
