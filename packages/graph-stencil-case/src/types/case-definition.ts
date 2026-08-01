// TODO: Generate from CaseDefinition.yaml JSON Schema (engine#847)
// These are placeholder types until the schema is verified

export interface CaseDefinition {
  dsl: string;
  namespace: string;
  name: string;
  version: string;
  spec: CaseDefinitionSpec;
}

export interface CaseDefinitionSpec {
  workers?: WorkerDefinition[];
  bindings?: BindingDefinition[];
  milestones?: MilestoneDefinition[];
  goals?: GoalDefinition[];
  subCases?: SubCaseDefinition[];
  completion?: CompletionDefinition;
}

export interface WorkerDefinition {
  name: string;
  description?: string;
  capabilities?: string[];
}

export interface BindingDefinition {
  name: string;
  capability?: string;
  when?: string;
  on?: TriggerDefinition;
}

export interface TriggerDefinition {
  contextChange?: { filter: string };
  schedule?: { cron: string };
}

export interface MilestoneDefinition {
  name: string;
  condition: string;
  entryCriteria?: string;
}

export interface GoalDefinition {
  name: string;
  kind: 'success' | 'failure';
  condition: string;
}

export interface SubCaseDefinition {
  namespace: string;
  name: string;
  version?: string;
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
}

export interface CompletionDefinition {
  success?: { allOf?: string[]; anyOf?: string[] };
  failure?: { allOf?: string[]; anyOf?: string[] };
}
