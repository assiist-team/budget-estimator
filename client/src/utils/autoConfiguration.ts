import type {
  AutoConfigRules,
  BedroomMixRule,
  ComputedConfiguration,
  BunkSize,
  CommonSize
} from '../types/config';

/**
 * Bedroom Selection Algorithm
 * Input: squareFootage, guestCount, rules: AutoConfigRules
 * Returns: BedroomMixRule or null if no match found
 */
export function getBedroomRule(
  squareFootage: number,
  guestCount: number,
  rules: AutoConfigRules
): BedroomMixRule | null {
  // Step 1: Filter rules by sqft match; if none, choose closest by sqft range center
  const sqftMatches = rules.bedroomMixRules.filter(
    r => squareFootage >= r.min_sqft && squareFootage <= r.max_sqft
  );

  if (sqftMatches.length === 0) {
    // Find closest rule by sqft range center
    let closestRule: BedroomMixRule | null = null;
    let minDistance = Infinity;

    for (const rule of rules.bedroomMixRules) {
      const center = (rule.min_sqft + rule.max_sqft) / 2;
      const distance = Math.abs(center - squareFootage);

      if (distance < minDistance) {
        minDistance = distance;
        closestRule = rule;
      }
    }

    // Validate capacity for closest rule
    if (closestRule && !hasSufficientBedroomCapacity(closestRule, rules)) {
      return null; // No valid rule found
    }

    return closestRule;
  }

  // Step 2: Within sqft matches, pick exact guest-range; else the rule with minimal boundary distance
  const exact = sqftMatches.find(
    r => guestCount >= r.min_guests && guestCount <= r.max_guests
  );

  if (exact) {
    // Validate capacity for exact match
    if (!hasSufficientBedroomCapacity(exact, rules)) {
      // Find alternative rule with sufficient capacity
      const validRules = sqftMatches.filter(r => hasSufficientBedroomCapacity(r, rules));
      if (validRules.length === 0) return null;

      return validRules.reduce((prev, curr) => {
        const prevDist = Math.min(
          Math.abs(prev.min_guests - guestCount),
          Math.abs(prev.max_guests - guestCount)
        );
        const currDist = Math.min(
          Math.abs(curr.min_guests - guestCount),
          Math.abs(curr.max_guests - guestCount)
        );
        return currDist < prevDist ? curr : prev;
      });
    }

    return exact;
  }

  // Find rule with minimal boundary distance to guestCount that also has sufficient capacity
  const validRules = sqftMatches.filter(r => hasSufficientBedroomCapacity(r, rules));
  if (validRules.length === 0) return null;

  return validRules.reduce((prev, curr) => {
    const prevDist = Math.min(
      Math.abs(prev.min_guests - guestCount),
      Math.abs(prev.max_guests - guestCount)
    );
    const currDist = Math.min(
      Math.abs(curr.min_guests - guestCount),
      Math.abs(curr.max_guests - guestCount)
    );
    return currDist < prevDist ? curr : prev;
  });
}

/**
 * Common Area Derivation Algorithm
 * Input: squareFootage, guestCount, rules: AutoConfigRules
 * Returns: ComputedConfiguration for common areas
 */
export function deriveCommonAreas(
  squareFootage: number,
  guestCount: number,
  rules: AutoConfigRules
): ComputedConfiguration['commonAreas'] {
  const computeSpace = (
    presence: { present_if_sqft_gte?: number; present_if_guests_gte?: number },
    size: { thresholds: Array<{ min_sqft?: number; max_sqft?: number; min_guests?: number; max_guests?: number; size: CommonSize }>; default: CommonSize }
  ): CommonSize => {
    // Presence: OR semantics — shown if sqft condition OR guest condition is met
    const present =
      (presence.present_if_sqft_gte !== undefined && squareFootage >= presence.present_if_sqft_gte) ||
      (presence.present_if_guests_gte !== undefined && guestCount >= presence.present_if_guests_gte);

    if (!present) return size.default;

    // Size: First matching ordered threshold wins; else default
    for (const threshold of size.thresholds) {
      const sqftOk = (threshold.min_sqft === undefined || squareFootage >= threshold.min_sqft) &&
                     (threshold.max_sqft === undefined || squareFootage <= threshold.max_sqft);

      // Check if threshold has guest conditions - if not, only sqft matters for dining size
      const hasGuestConditions = threshold.min_guests !== undefined || threshold.max_guests !== undefined;
      const guestOk = hasGuestConditions
        ? (threshold.min_guests === undefined || guestCount >= threshold.min_guests) &&
          (threshold.max_guests === undefined || guestCount <= threshold.max_guests)
        : true; // No guest conditions means guest check always passes

      if (sqftOk && guestOk) return threshold.size;
    }

    return size.default;
  };

  const kitchen = computeSpace(rules.commonAreas.kitchen.presence, rules.commonAreas.kitchen.size);
  const dining = computeSpace(rules.commonAreas.dining.presence, rules.commonAreas.dining.size);
  const living = computeSpace(rules.commonAreas.living.presence, rules.commonAreas.living.size);
  const recRoom = computeSpace(rules.commonAreas.recRoom.presence, rules.commonAreas.recRoom.size);

  return {
    kitchen,
    dining,
    living,
    recRoom
  };
}

/**
 * Slider Validation Algorithm
 * Input: squareFootage, desired guests, rules: AutoConfigRules
 * Returns: clamped guest count within global bounds (no restrictions based on legal pairs)
 */
export function clampGuestsForSqft(
  _squareFootage: number,
  desired: number,
  rules: AutoConfigRules
): number {
  // Use global bounds for all combinations - no legal pairs restrictions
  // Add fallbacks to ensure validation works even if global limits are set to 0
  const minGuests = Math.max(rules.validation.global.min_guests || 1, 1);
  const maxGuests = Math.max(rules.validation.global.max_guests || 50, minGuests);

  return Math.min(Math.max(desired, minGuests), maxGuests);
}

/**
 * Get allowed guest range for a given square footage
 * Returns: { min: number, max: number } - uses global bounds for all combinations
 */
export function getAllowedGuestRange(
  _squareFootage: number,
  rules: AutoConfigRules
): { min: number; max: number } {
  // Return global bounds for all combinations - no legal pairs restrictions
  // Add fallbacks to ensure validation works even if global limits are set to 0
  const minGuests = Math.max(rules.validation.global.min_guests || 1, 1);
  const maxGuests = Math.max(rules.validation.global.max_guests || 50, minGuests);

  return {
    min: minGuests,
    max: maxGuests
  };
}

/**
 * Validate if a given sqft/guest combination is legal
 * Returns: boolean indicating if the combination is allowed (always uses global bounds)
 */
export function isValidSqftGuestCombination(
  _squareFootage: number,
  guestCount: number,
  rules: AutoConfigRules
): boolean {
  // All combinations are valid within global bounds - no legal pairs restrictions
  // Add fallbacks to ensure validation works even if global limits are set to 0
  const minGuests = Math.max(rules.validation.global.min_guests || 1, 1);
  const maxGuests = Math.max(rules.validation.global.max_guests || 50, minGuests);

  return guestCount >= minGuests && guestCount <= maxGuests;
}

/**
 * Complete auto-configuration computation
 * Input: squareFootage, guestCount, rules: AutoConfigRules
 * Returns: ComputedConfiguration with both bedrooms and common areas
 */
export function computeAutoConfiguration(
  squareFootage: number,
  guestCount: number,
  rules: AutoConfigRules
): ComputedConfiguration {
  const bedroomRule = getBedroomRule(squareFootage, guestCount, rules);

  if (!bedroomRule) {
    throw new Error('No bedroom configuration rule found for the given parameters');
  }

  const commonAreas = deriveCommonAreas(squareFootage, guestCount, rules);

  return {
    bedrooms: bedroomRule.bedrooms,
    commonAreas
  };
}

/**
 * Check if a bedroom rule has sufficient capacity for the given guest count
 * Returns: boolean indicating if the rule can accommodate the required guests
 */
export function hasSufficientBedroomCapacity(rule: BedroomMixRule, rules: AutoConfigRules): boolean {
  const capacity = calculateBedroomCapacity(rule.bedrooms, rules);
  return capacity >= rule.max_guests;
}

/**
 * Get bedroom capacity for a given bunk size
 * Returns: number of guests that can be accommodated
 */
export function getBunkCapacity(bunkSize: BunkSize | null, rules: AutoConfigRules): number {
  if (!bunkSize) return 0;
  return rules.bunkCapacities[bunkSize];
}

/**
 * Calculate total bedroom capacity for a configuration
 * Returns: maximum number of guests that can be accommodated
 */
export function calculateBedroomCapacity(
  bedrooms: { king: number; double: number; bunk: BunkSize | null },
  rules: AutoConfigRules
): number {
  const kingCapacity = bedrooms.king * 2; // Each king bed sleeps 2
  const doubleCapacity = bedrooms.double * 2; // Each double bed sleeps 2
  const bunkCapacity = getBunkCapacity(bedrooms.bunk, rules);

  return kingCapacity + doubleCapacity + bunkCapacity;
}
