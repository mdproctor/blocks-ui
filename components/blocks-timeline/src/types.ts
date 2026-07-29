import type { TemplateResult } from 'lit';

export type NodeStatus = 'completed' | 'active' | 'pending' | 'failed' | 'skipped';

export interface TimelineNode {
  key: string;
  label: string;
  status: NodeStatus;
  timestamp?: string | undefined;
  actor?: string | undefined;
  detail?: unknown | undefined;
  category?: string | undefined;
}

export type Layout = 'vertical' | 'horizontal' | 'compact';

export interface TimelineStrategy<T = unknown> {
  toNodes(data: T): TimelineNode[];
  transformData?: ((raw: unknown) => T) | undefined;
  defaultLayout: Layout;
  renderNode?: ((node: TimelineNode) => TemplateResult) | undefined;
  renderDetail?: ((node: TimelineNode) => TemplateResult) | undefined;
  filterCategories?: string[] | undefined;
  supportsPagination?: boolean | undefined;
  extractPaginationMeta?: ((raw: unknown) => PaginationMeta | undefined) | undefined;
}

export interface PaginationMeta {
  page: number;
  totalPages: number;
  totalElements: number;
}

export interface StageConfig {
  key: string;
  label: string;
  icon?: string;
  terminal?: 'success' | 'failure' | 'transfer';
}
