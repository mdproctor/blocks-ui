export type ModelTier = 'FLAGSHIP' | 'STANDARD' | 'FAST' | 'EMBEDDING';
export type ModelLocality = 'CLOUD' | 'LOCAL' | 'HYBRID';
export type CostTier = 'FREE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'PREMIUM';

export interface ProviderDeclaration {
  vendor: string;
  credential?: string | Record<string, string>;
  host?: string;
}

export interface ModelDescriptor {
  id: string;
  apiModelId?: string;
  backendKey?: string;
  backendInstanceId?: string;
  vendor?: string;
  family?: string;
  displayName?: string;
  tier?: ModelTier;
  capabilities?: string[];
  contextWindow?: number;
  maxOutput?: number;
  locality?: ModelLocality;
  costTier?: CostTier;
  authMethod?: string;
  properties?: Record<string, string>;
}

export interface AliasDeclaration {
  tier?: ModelTier;
  capabilities?: string[];
  locality?: ModelLocality;
  maxCost?: CostTier;
  minContext?: number;
  minOutput?: number;
  preferVendor?: string;
}

export interface SourceDeclaration {
  uri: string;
  priority?: number;
}

export interface LocalModelDeclaration {
  id: string;
  backendKey?: string;
  host?: string;
}

export interface ManifestDefaults {
  backend?: string;
}

export interface Manifest {
  providers?: ProviderDeclaration[];
  models?: ModelDescriptor[];
  aliases?: Record<string, AliasDeclaration>;
  defaults?: ManifestDefaults;
  sources?: SourceDeclaration[];
  localModels?: LocalModelDeclaration[];
}

export type CredentialRef =
  | { type: 'env'; name: string }
  | { type: 'file'; path: string }
  | { type: 'ref'; name: string };

export function parseCredentialRef(raw: string): CredentialRef {
  if (raw.startsWith('env:')) return { type: 'env', name: raw.slice(4) };
  if (raw.startsWith('file:')) return { type: 'file', path: raw.slice(5) };
  if (raw.startsWith('ref:')) return { type: 'ref', name: raw.slice(4) };
  return { type: 'env', name: raw };
}

export function formatCredentialRef(ref: CredentialRef): string {
  switch (ref.type) {
    case 'env': return `env:${ref.name}`;
    case 'file': return `file:${ref.path}`;
    case 'ref': return `ref:${ref.name}`;
  }
}
