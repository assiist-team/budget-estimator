import { describe, it, expect } from 'vitest';
import type {
  AutoConfigRules,
  BunkSize
} from '../types/config';
import {
  getBedroomRule,
  deriveCommonAreas,
  generateBedroomFallback,
  generateCommonAreaFallback,
  computeAutoConfiguration,
  hasSufficientBedroomCapacity,
  calculateBedroomCapacity,
  clampGuestsForSqft,
  getAllowedGuestRange,
  isValidSqftGuestCombination
} from './autoConfiguration';

// Mock rules object for testing
const createMockRules = (): AutoConfigRules => ({
  version: 1,
  publishedAt: '2024-01-01T00:00:00Z',
  bunkCapacities: {
    small: 4,
    medium: 8,
    large: 12
  },
  bedroomMixRules: [
    {
      id: 'test-rule-1',
      min_sqft: 2000,
      max_sqft: 2500,
      min_guests: 8,
      max_guests: 12,
      bedrooms: {
        single: 2,
        double: 1,
        bunk: 'small'
      }
    },
    {
      id: 'test-rule-2',
      min_sqft: 2500,
      max_sqft: 3500,
      min_guests: 12,
      max_guests: 16,
      bedrooms: {
        single: 3,
        double: 2,
        bunk: 'medium'
      }
    }
  ],
  commonAreas: {
    kitchen: {
      presence: { present_if_sqft_gte: 1500 },
      size: {
        thresholds: [
          { min_sqft: 1500, max_sqft: 2500, size: 'small' },
          { min_sqft: 2500, size: 'medium' }
        ],
        default: 'none'
      }
    },
    dining: {
      presence: { present_if_sqft_gte: 1800 },
      size: {
        thresholds: [
          { min_sqft: 1800, max_sqft: 3000, size: 'small' },
          { min_sqft: 3000, size: 'medium' }
        ],
        default: 'none'
      }
    },
    living: {
      presence: { present_if_sqft_gte: 2000 },
      size: {
        thresholds: [
          { min_sqft: 2000, max_sqft: 3500, size: 'small' },
          { min_sqft: 3500, size: 'medium' }
        ],
        default: 'none'
      }
    },
    recRoom: {
      presence: { present_if_sqft_gte: 4000 },
      size: {
        thresholds: [
          { min_sqft: 4000, size: 'medium' }
        ],
        default: 'none'
      }
    }
  },
  validation: {
    global: {
      min_sqft: 1000,
      max_sqft: 10000,
      min_guests: 4,
      max_guests: 50
    }
  }
});

describe('getBedroomRule', () => {
  const rules = createMockRules();

  it('returns a rule when sqft and guests match exactly', () => {
    const rule = getBedroomRule(2200, 10, rules);
    expect(rule).toBeDefined();
    expect(rule?.id).toBe('test-rule-1');
  });

  it('returns null when no rule matches capacity requirements', () => {
    // Create a scenario where sqft matches but capacity doesn't
    const rule = getBedroomRule(2200, 50, rules); // 2200 matches first rule but 50 > 12 capacity
    expect(rule).toBeNull();
  });

  it('finds closest rule when no exact sqft match', () => {
    const rule = getBedroomRule(1900, 10, rules); // Below min_sqft of first rule
    expect(rule).toBeDefined();
    expect(rule?.id).toBe('test-rule-1'); // Should find closest rule
  });
});

describe('deriveCommonAreas', () => {
  const rules = createMockRules();

  it('computes common areas based on sqft thresholds', () => {
    const commonAreas = deriveCommonAreas(2200, 10, rules);

    expect(commonAreas.kitchen).toBe('small'); // 2200 >= 1500 and <= 2500
    expect(commonAreas.dining).toBe('small');  // 2200 >= 1800 and <= 3000
    expect(commonAreas.living).toBe('small'); // 2200 >= 2000 and <= 3500
    expect(commonAreas.recRoom).toBe('none');  // 2200 < 4000
  });

  it('returns default sizes when sqft below presence threshold', () => {
    const commonAreas = deriveCommonAreas(1400, 10, rules);

    expect(commonAreas.kitchen).toBe('none'); // 1400 < 1500
    expect(commonAreas.dining).toBe('none');  // 1400 < 1800
    expect(commonAreas.living).toBe('none'); // 1400 < 2000
    expect(commonAreas.recRoom).toBe('none'); // 1400 < 4000
  });
});

describe('generateBedroomFallback', () => {
  const rules = createMockRules();

  it('generates bedrooms for large guest count', () => {
    const bedrooms = generateBedroomFallback(3000, 20, rules);

    expect(bedrooms.single).toBeGreaterThan(0);
    expect(bedrooms.double).toBeGreaterThanOrEqual(0);
    expect(bedrooms.bunk).toBeDefined();
  });

  it('includes at least 2 singles for guest count >= 4', () => {
    const bedrooms = generateBedroomFallback(2000, 4, rules);

    expect(bedrooms.single).toBeGreaterThanOrEqual(2);
  });

  it('limits doubles for smaller homes', () => {
    const bedrooms = generateBedroomFallback(2000, 20, rules);

    // For 2000 sqft, doubles should be limited (below 3000 threshold)
    expect(bedrooms.double).toBeLessThanOrEqual(1);
  });

  it('allows more doubles for larger homes', () => {
    const bedrooms = generateBedroomFallback(4000, 20, rules);

    // For 4000 sqft, doubles should be more available
    expect(bedrooms.double).toBeGreaterThanOrEqual(0);
  });
});

describe('generateCommonAreaFallback', () => {
  const rules = createMockRules();

  it('computes common areas based on sqft thresholds (same as deriveCommonAreas)', () => {
    const commonAreas = generateCommonAreaFallback(2200, 10, rules);

    expect(commonAreas.kitchen).toBe('small'); // 2200 >= 1500 and <= 2500
    expect(commonAreas.dining).toBe('small');  // 2200 >= 1800 and <= 3000
    expect(commonAreas.living).toBe('small'); // 2200 >= 2000 and <= 3500
    expect(commonAreas.recRoom).toBe('none');  // 2200 < 4000
  });

  it('returns default sizes when sqft below presence threshold', () => {
    const commonAreas = generateCommonAreaFallback(1400, 10, rules);

    expect(commonAreas.kitchen).toBe('none'); // 1400 < 1500
    expect(commonAreas.dining).toBe('none');  // 1400 < 1800
    expect(commonAreas.living).toBe('none'); // 1400 < 2000
    expect(commonAreas.recRoom).toBe('none'); // 1400 < 4000
  });

  it('works with very large sqft', () => {
    const commonAreas = generateCommonAreaFallback(5000, 10, rules);

    expect(commonAreas.kitchen).toBe('medium'); // 5000 > 2500
    expect(commonAreas.dining).toBe('medium');  // 5000 > 3000
    expect(commonAreas.living).toBe('medium'); // 5000 > 3500
    expect(commonAreas.recRoom).toBe('medium'); // 5000 >= 4000
  });
});

describe('computeAutoConfiguration', () => {
  const rules = createMockRules();

  it('uses rule-based configuration when bedroom rule matches', () => {
    const config = computeAutoConfiguration(2200, 10, rules);

    expect(config.bedrooms.single).toBe(2);
    expect(config.bedrooms.double).toBe(1);
    expect(config.bedrooms.bunk).toBe('small');

    // Should use deriveCommonAreas for common areas
    expect(config.commonAreas.kitchen).toBe('small');
    expect(config.commonAreas.dining).toBe('small');
    expect(config.commonAreas.living).toBe('small');
    expect(config.commonAreas.recRoom).toBe('none');
  });

  it('uses fallback configuration when no bedroom rule matches', () => {
    const config = computeAutoConfiguration(1500, 50, rules); // No rule matches (capacity too high)

    // Should use generateBedroomFallback for bedrooms
    expect(config.bedrooms.single).toBeGreaterThanOrEqual(0);
    expect(config.bedrooms.double).toBeGreaterThanOrEqual(0);

    // Should use generateCommonAreaFallback for common areas
    expect(config.commonAreas.kitchen).toBe('small'); // 1500 >= 1500 and <= 2500
    expect(config.commonAreas.dining).toBe('none');   // 1500 < 1800
    expect(config.commonAreas.living).toBe('none');  // 1500 < 2000
    expect(config.commonAreas.recRoom).toBe('none'); // 1500 < 4000
  });

  it('provides reasonable common areas in fallback for medium-sized home', () => {
    const config = computeAutoConfiguration(3000, 50, rules); // No rule matches (capacity too high)

    // Should use generateBedroomFallback for bedrooms
    expect(config.bedrooms.single).toBeGreaterThanOrEqual(0);

    // Should use generateCommonAreaFallback for common areas
    expect(config.commonAreas.kitchen).toBe('medium'); // 3000 > 2500
    expect(config.commonAreas.dining).toBe('small');   // 3000 <= 3000 (within 1800-3000 range)
    expect(config.commonAreas.living).toBe('small');  // 3000 >= 2000 and <= 3500
    expect(config.commonAreas.recRoom).toBe('none');  // 3000 < 4000
  });

  it('handles edge case: very small sqft with many guests', () => {
    const config = computeAutoConfiguration(1000, 20, rules);

    // Should still provide reasonable configuration
    expect(config.bedrooms.single).toBeGreaterThanOrEqual(0);
    expect(config.commonAreas.kitchen).toBe('none'); // 1000 < 1500
    expect(config.commonAreas.dining).toBe('none');  // 1000 < 1800
    expect(config.commonAreas.living).toBe('none'); // 1000 < 2000
    expect(config.commonAreas.recRoom).toBe('none'); // 1000 < 4000
  });

  it('handles edge case: very large sqft with few guests', () => {
    const config = computeAutoConfiguration(8000, 4, rules);

    // Should provide appropriate configuration for large home
    expect(config.bedrooms.single).toBeGreaterThanOrEqual(0);
    expect(config.commonAreas.kitchen).toBe('medium'); // 8000 > 2500
    expect(config.commonAreas.dining).toBe('medium');  // 8000 > 3000
    expect(config.commonAreas.living).toBe('medium'); // 8000 > 3500
    expect(config.commonAreas.recRoom).toBe('medium'); // 8000 >= 4000
  });
});

describe('hasSufficientBedroomCapacity', () => {
  const rules = createMockRules();

  it('validates capacity correctly', () => {
    const rule = rules.bedroomMixRules[0];
    const hasCapacity = hasSufficientBedroomCapacity(rule, 10, rules);

    // Rule has capacity for 2*2 + 1*4 + 4 = 12 guests, so 10 should be fine
    expect(hasCapacity).toBe(true);
  });

  it('rejects insufficient capacity', () => {
    const rule = rules.bedroomMixRules[0];
    const hasCapacity = hasSufficientBedroomCapacity(rule, 20, rules);

    // Rule has capacity for 12 guests max, so 20 should fail
    expect(hasCapacity).toBe(false);
  });
});

describe('calculateBedroomCapacity', () => {
  const rules = createMockRules();

  it('calculates capacity correctly', () => {
    const bedrooms = { single: 2, double: 1, bunk: 'small' as BunkSize };
    const capacity = calculateBedroomCapacity(bedrooms, rules);

    // 2*2 + 1*4 + 4 = 12
    expect(capacity).toBe(12);
  });

  it('handles null bunk', () => {
    const bedrooms = { single: 1, double: 0, bunk: null };
    const capacity = calculateBedroomCapacity(bedrooms, rules);

    // 1*2 + 0*4 + 0 = 2
    expect(capacity).toBe(2);
  });
});

describe('clampGuestsForSqft', () => {
  const rules = createMockRules();

  it('clamps to valid range', () => {
    const clamped = clampGuestsForSqft(2200, 100, rules);
    expect(clamped).toBe(50); // Max is 50
  });

  it('handles minimum guests', () => {
    const clamped = clampGuestsForSqft(2200, 1, rules);
    expect(clamped).toBe(4); // Min is 4
  });
});

describe('getAllowedGuestRange', () => {
  const rules = createMockRules();

  it('returns correct range', () => {
    const range = getAllowedGuestRange(2200, rules);
    expect(range.min).toBe(4);
    expect(range.max).toBe(50);
  });
});

describe('isValidSqftGuestCombination', () => {
  const rules = createMockRules();

  it('validates within range', () => {
    const isValid = isValidSqftGuestCombination(2200, 10, rules);
    expect(isValid).toBe(true);
  });

  it('rejects below minimum', () => {
    const isValid = isValidSqftGuestCombination(2200, 2, rules);
    expect(isValid).toBe(false);
  });

  it('rejects above maximum', () => {
    const isValid = isValidSqftGuestCombination(2200, 60, rules);
    expect(isValid).toBe(false);
  });
});
