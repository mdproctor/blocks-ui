import type { GraphModel } from '@casehubio/graph-core';
import type { ElkLayoutResult, NodeLayout } from '@casehubio/graph-renderer';

const NODE_W = 280;
const NODE_H = 53;
const V_GAP = 40;
const H_GAP = 30;
const CONTAINER_PAD_X = 20;
const CONTAINER_PAD_TOP = 40;
const CONTAINER_PAD_BOTTOM = 20;
const INNER_V_GAP = 30;

const SKIP_TYPES = new Set(['swf-root']);

interface ColumnItem {
  nodeId: string;
  split?: ColumnGroup;
}

interface Column {
  items: ColumnItem[];
}

interface ColumnGroup {
  columns: Column[];
}

interface SizedItem {
  nodeId: string;
  nodeWidth: number;
  nodeHeight: number;
  split?: SizedGroup;
}

interface SizedColumn {
  items: SizedItem[];
  width: number;
  height: number;
}

interface SizedGroup {
  columns: SizedColumn[];
  width: number;
  height: number;
}

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

  const topLevelIds = new Set<string>();
  for (const n of model.nodes) {
    if (SKIP_TYPES.has(n.type)) continue;
    if (!n.parentId || n.parentId === 'root') topLevelIds.add(n.id);
  }

  const placed = new Set<string>();

  // Phase 1: build column tree from graph topology

  function buildColumn(startId: string): Column {
    const items: ColumnItem[] = [];
    let id: string | undefined = startId;

    while (id && topLevelIds.has(id) && !placed.has(id)) {
      const targets: string[] = (outgoing.get(id) ?? []).filter((t: string) => topLevelIds.has(t));

      if (targets.length <= 1) {
        items.push({ nodeId: id });
        placed.add(id);
        if (targets.length === 0) break;
        const nextIncoming = (incoming.get(targets[0]!) ?? []).filter((t: string) => topLevelIds.has(t));
        if (nextIncoming.length > 1) break;
        id = targets[0]!;
      } else {
        placed.add(id);
        const columns = targets.map(t => buildColumn(t));
        items.push({ nodeId: id, split: { columns } });
        const convergence = findConvergence(targets);
        if (convergence) {
          id = convergence;
        } else {
          break;
        }
      }
    }

    return { items };
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

  // Phase 2: compute node sizes (containers grow to fit children)

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

  function getNodeSize(nodeId: string): { w: number; h: number } {
    const children = model.nodes.filter(n => n.parentId === nodeId);
    if (children.length > 0) return computeContainerSize(nodeId);
    return { w: NODE_W, h: NODE_H };
  }

  // Phase 3: size columns bottom-up

  function sizeColumn(col: Column): SizedColumn {
    const items: SizedItem[] = [];
    let width = 0;
    let height = 0;

    for (let i = 0; i < col.items.length; i++) {
      const item = col.items[i]!;
      const ns = getNodeSize(item.nodeId);
      let sizedSplit: SizedGroup | undefined;

      if (item.split) {
        sizedSplit = sizeGroup(item.split);
        width = Math.max(width, ns.w, sizedSplit.width);
        height += ns.h + V_GAP + sizedSplit.height;
      } else {
        width = Math.max(width, ns.w);
        height += ns.h;
      }

      if (i < col.items.length - 1) height += V_GAP;

      items.push({ nodeId: item.nodeId, nodeWidth: ns.w, nodeHeight: ns.h, ...(sizedSplit ? { split: sizedSplit } : {}) });
    }

    return { items, width, height };
  }

  function sizeGroup(group: ColumnGroup): SizedGroup {
    const columns = group.columns.map(sizeColumn);
    const width = columns.reduce((sum, c) => sum + c.width, 0) + (columns.length - 1) * H_GAP;
    const height = Math.max(...columns.map(c => c.height));
    return { columns, width, height };
  }

  // Phase 4: position top-down with bottom-alignment in split groups

  const nodeLayouts = new Map<string, NodeLayout>();

  function positionColumn(col: SizedColumn, x: number, y: number): void {
    let currentY = y;
    for (const item of col.items) {
      const nodeX = x + (col.width - item.nodeWidth) / 2;
      nodeLayouts.set(item.nodeId, { x: nodeX, y: currentY, width: item.nodeWidth, height: item.nodeHeight });

      if (model.nodes.some(n => n.parentId === item.nodeId)) {
        layoutChildren(item.nodeId);
      }

      currentY += item.nodeHeight + V_GAP;

      if (item.split) {
        positionGroup(item.split, x, currentY, col.width);
        currentY += item.split.height + V_GAP;
      }
    }
  }

  function positionGroup(group: SizedGroup, x: number, y: number, parentWidth: number): void {
    const groupWidth = group.columns.reduce((sum, c) => sum + c.width, 0) + (group.columns.length - 1) * H_GAP;
    let startX = x + (parentWidth - groupWidth) / 2;

    for (const col of group.columns) {
      const shift = group.height - col.height;
      positionColumn(col, startX, y + shift);
      startX += col.width + H_GAP;
    }
  }

  function layoutChildren(parentId: string): void {
    const children = model.nodes.filter(n => n.parentId === parentId);
    let y = CONTAINER_PAD_TOP;
    const parentSize = computeContainerSize(parentId);
    const innerW = parentSize.w - 2 * CONTAINER_PAD_X;
    for (const c of children) {
      const gc = model.nodes.filter(n => n.parentId === c.id);
      if (gc.length > 0) {
        const sub = computeContainerSize(c.id);
        nodeLayouts.set(c.id, { x: CONTAINER_PAD_X, y, width: sub.w, height: sub.h });
        layoutChildren(c.id);
        y += sub.h + INNER_V_GAP;
      } else {
        nodeLayouts.set(c.id, { x: CONTAINER_PAD_X, y, width: innerW, height: NODE_H });
        y += NODE_H + INNER_V_GAP;
      }
    }
  }

  // --- main ---

  const startNodes = [...topLevelIds].filter(id => (incoming.get(id) ?? []).length === 0);
  const rootColumn: Column = { items: [] };

  for (const s of startNodes) {
    if (!placed.has(s)) {
      const col = buildColumn(s);
      rootColumn.items.push(...col.items);
    }
  }

  for (const id of topLevelIds) {
    if (!placed.has(id)) {
      rootColumn.items.push({ nodeId: id });
      placed.add(id);
    }
  }

  if (rootColumn.items.length > 0) {
    const sized = sizeColumn(rootColumn);
    positionColumn(sized, 0, 0);
  }

  return { nodeLayouts };
}
