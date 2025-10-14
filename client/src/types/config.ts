// Auto-configuration system types
export type BunkSize = "small" | "medium" | "large";
export type CommonSize = "none" | "small" | "medium" | "large";

export interface BedroomMixRule {
  id: string;
  min_sqft: number;
  max_sqft: number;
  min_guests: number;
  max_guests: number;
  bedrooms: {
    king: number;
    double: number;
    bunk: BunkSize | null;
  };
  // Optional manual override for this range (wins over computed common-areas)
  overrides?: Partial<ComputedConfiguration>;
}

export interface BunkCapacities {
  small: number;   // default 4
  medium: number;  // default 8
  large: number;   // default 12
}

export interface SpacePresenceRule {
  // Present if any provided condition evaluates true
  present_if_sqft_gte?: number;
  present_if_guests_gte?: number;
}

export interface SpaceSizeRule {
  thresholds: Array<{
    min_sqft?: number;
    max_sqft?: number;
    min_guests?: number;
    max_guests?: number;
    size: CommonSize;
  }>;
  default: CommonSize; // typically "none" for optional spaces
}

export interface CommonAreaRules {
  kitchen: { presence: SpacePresenceRule; size: SpaceSizeRule };
  dining: {
    presence: SpacePresenceRule;
    size: SpaceSizeRule;
    seatsPerGuestRatio?: number; // e.g., 1.0 => seat per guest
    minSeats?: number;
    maxSeats?: number | null;
  };
  living: { presence: SpacePresenceRule; size: SpaceSizeRule };
  recRoom: { presence: SpacePresenceRule; size: SpaceSizeRule };
}

export interface ValidationEnvelopes {
  legalPairs: Array<{
    min_sqft: number;
    max_sqft: number;
    min_guests: number;
    max_guests: number;
  }>;
  global: {
    min_sqft: number;
    max_sqft: number;
    min_guests: number;
    max_guests: number;
  };
}

export interface AutoConfigRules {
  version: number;
  publishedAt: string;
  description?: string;

  bunkCapacities: BunkCapacities;
  bedroomMixRules: BedroomMixRule[];
  commonAreas: CommonAreaRules;
  validation: ValidationEnvelopes;
}

export interface ComputedConfiguration {
  bedrooms: {
    king: number;
    double: number;
    bunk: BunkSize | null;
  };
  commonAreas: {
    kitchen: CommonSize;
    dining: { size: CommonSize; seatCount?: number };
    living: CommonSize;
    recRoom: CommonSize;
  };
}
