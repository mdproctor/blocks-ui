import type { Manifest } from '@casehubio/blocks-ui-core';

export interface ProviderDetection {
  vendor: string;
  detected: boolean;
  partial: boolean;
  envVarsFound?: string[];
  reachable?: boolean;
}

export interface ManifestPreset {
  id: string;
  name: string;
  description: string;
  manifest: Manifest;
}

export interface ManifestEditorProps {
  data?: Manifest;
  endpoint?: string;
  detectionEndpoint?: string;
  presets?: ManifestPreset[];
}
