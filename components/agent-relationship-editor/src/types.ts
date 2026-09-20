import type { AgentRelationship } from '@casehubio/graph-stencil-org';

export interface RelationshipChangeset {
  additions: AgentRelationship[];
  removals: AgentRelationship[];
}

export interface AgentRosterEntry {
  agentId: string;
  name: string;
  unitId?: string;
}
