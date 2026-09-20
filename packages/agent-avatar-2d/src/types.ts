export interface AvatarFeatures {
  mouth?: string;
  eyes?: string;
  eyebrows?: string;
  clothing?: string;
  clothingGraphic?: string;
  accessories?: string;
  facialHair?: string;
  hairColor?: string;
  top?: string;
  skinColor?: string;
}

export interface AvatarConfig {
  features: AvatarFeatures;
  overrides?: Partial<AvatarFeatures>;
}
