export interface AgentCapability {
  name: string;
  description?: string;
}

export interface AgentGoal {
  name: string;
  description?: string;
  priority?: string;
  visibility?: string;
}

export interface AgentConstraint {
  name: string;
  description?: string;
  severity?: string;
  visibility?: string;
}

export interface DispositionValue {
  term: string;
  weight: number;
}

export interface AgentDisposition {
  socialOrient?: DispositionValue[];
  ruleFollowing?: DispositionValue[];
  riskAppetite?: DispositionValue[];
  autonomy?: DispositionValue[];
  conflictMode?: DispositionValue[];
  delegation?: boolean;
  dispositionProfile?: DispositionValue[];
  styleProfile?: DispositionValue[];
}

export type DispositionAxis = keyof Pick<AgentDisposition,
  'socialOrient' | 'ruleFollowing' | 'riskAppetite' | 'autonomy' | 'conflictMode'>;

export const DISPOSITION_AXES: readonly DispositionAxis[] = [
  'socialOrient', 'ruleFollowing', 'riskAppetite', 'autonomy', 'conflictMode',
] as const;

export function primaryTerm(
  disposition: AgentDisposition | undefined,
  axis: DispositionAxis,
): DispositionValue | undefined {
  const values = disposition?.[axis];
  if (!values?.length) return undefined;
  return values.reduce((best, v) => v.weight > best.weight ? v : best, values[0]!);
}

export interface FullAgentDescriptor {
  agentId: string;
  name: string;
  version?: string;
  slot?: string;
  tenancyId: string;
  provider?: string;
  modelFamily?: string;
  modelVersion?: string;
  domainVocabulary?: string;
  slotVocabulary?: string;
  dispositionVocabulary?: string;
  axisVocabularies?: Record<string, string>;
  capabilities?: AgentCapability[];
  disposition?: AgentDisposition;
  goals?: AgentGoal[];
  constraints?: AgentConstraint[];
  briefing?: string;
  templates?: Record<string, string>;
  extensionData?: Record<string, unknown>;
}
