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
    if (closestRule && !hasSufficientBedroomCapacity(closestRule, guestCount, rules)) {
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
    if (!hasSufficientBedroomCapacity(exact, guestCount, rules)) {
      return null; // Use fallback if even the exact match doesn't have sufficient capacity
    }

    return exact;
  }

  // No exact match found - use fallback algorithm instead of trying to find "closest" rules
  // The fallback algorithm is designed to handle cases where no rules match
  return null;
}

/**
 * Common Area Derivation Algorithm
 * Input: squareFootage, guestCount, rules: AutoConfigRules
 * Returns: ComputedConfiguration for common areas
 */
export function deriveCommonAreas(
  squareFootage: number,
  _guestCount: number,
  rules: AutoConfigRules
): ComputedConfiguration['commonAreas'] {
  const computeSpace = (
    presence: { present_if_sqft_gte?: number },
    size: { thresholds: Array<{ min_sqft?: number; max_sqft?: number; size: CommonSize }>; default: CommonSize }
  ): CommonSize => {
    // Presence: only sqft-based checks (guest-based presence removed)
    const present = presence.present_if_sqft_gte !== undefined && squareFootage >= presence.present_if_sqft_gte;

    if (!present) return size.default;

    // Size: Simple first-match logic - iterate through thresholds and return first match
    // Thresholds are matched only by sqft ranges (guest-based thresholds removed)
    for (const threshold of size.thresholds) {
      const minOk = (threshold.min_sqft === undefined || squareFootage >= threshold.min_sqft);
      const maxOk = (threshold.max_sqft === undefined || squareFootage <= threshold.max_sqft);

      if (minOk && maxOk) {
        return threshold.size;
      }
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
  // Try rule-first approach: if a bedroom rule matches, use it and derive common areas
  const bedroomRule = getBedroomRule(squareFootage, guestCount, rules);

  if (bedroomRule) {
    const commonAreas = deriveCommonAreas(squareFootage, guestCount, rules);

    return {
      bedrooms: bedroomRule.bedrooms,
      commonAreas
    };
  }

  // No rule matched: use both bedroom fallback and common-area fallback
  // to produce a combined configuration instead of suppressing common areas entirely
  const fallbackBedrooms = generateBedroomFallback(squareFootage, guestCount, rules);
  const fallbackCommonAreas = generateCommonAreaFallback(squareFootage, guestCount, rules);

  return {
    bedrooms: fallbackBedrooms,
    commonAreas: fallbackCommonAreas
  };
}

/**
 * Generate a common area configuration using fallback logic when bedroom rules fail.
 * Behavior: Use the same heuristics as deriveCommonAreas, but ensure it can return
 * reasonable defaults even when bedroom rules fail.
 * - Determine presence solely from the area's presence settings defined in admin rules
 * - Determine size by matching rules.commonAreas.<area>.size.thresholds against square footage only
 * - Fall back to size.default when no thresholds match
 */
export function generateCommonAreaFallback(
  squareFootage: number,
  _guestCount: number,
  rules: AutoConfigRules
): ComputedConfiguration['commonAreas'] {
  const computeSpace = (
    presence: { present_if_sqft_gte?: number },
    size: { thresholds: Array<{ min_sqft?: number; max_sqft?: number; size: CommonSize }>; default: CommonSize }
  ): CommonSize => {
    // Presence: only sqft-based checks (guest-based presence removed)
    const present = presence.present_if_sqft_gte !== undefined && squareFootage >= presence.present_if_sqft_gte;

    if (!present) return size.default;

    // Size: Simple first-match logic - iterate through thresholds and return first match
    // Thresholds are matched only by sqft ranges (guest-based thresholds removed)
    for (const threshold of size.thresholds) {
      const minOk = (threshold.min_sqft === undefined || squareFootage >= threshold.min_sqft);
      const maxOk = (threshold.max_sqft === undefined || squareFootage <= threshold.max_sqft);

      if (minOk && maxOk) {
        return threshold.size;
      }
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
 * Generate a bedroom configuration when no rule matches.
 * Rules enforced:
 * - Include at least 2 singles when guestCount >= 4 (so two couples can sleep alone)
 * - At most one bunk room (0 or 1)
 * - Doubles are rare: allow doubles only for large homes (heuristic threshold)
 * - Do not generate common areas
 */
export function generateBedroomFallback(
  squareFootage: number,
  guestCount: number,
  rules: AutoConfigRules
): ComputedConfiguration['bedrooms'] {
  // Heuristic threshold for allowing doubles. This is intentionally conservative;
  // doubles will only be used if the home is fairly large or the party is very big.
  const DOUBLES_SQFT_THRESHOLD = 3000;
  const DOUBLES_GUEST_THRESHOLD = 18;

  let singles = 0;
  let doubles = 0;
  let bunk: BunkSize | null = null;

  // Ensure at least two singles when the guest party is large enough
  if (guestCount >= 4) {
    singles = 2; // covers up to 4 guests
  }

  let remaining = Math.max(0, guestCount - singles * 2);

  // Try to allocate a single bunk room (children often sleep in bunks)
  if (remaining > 0) {
    // Pick the smallest bunk size that can accommodate the remaining guests,
    // otherwise pick the largest available bunk.
    const candidate = selectBunkSizeForGuests(remaining, rules);
    if (candidate) {
      bunk = candidate;
      remaining = Math.max(0, remaining - getBunkCapacity(bunk, rules));
    }
  }

  // If still remaining, allocate doubles only if heuristics allow AND remaining is significant
  const doublesAllowed = squareFootage >= DOUBLES_SQFT_THRESHOLD || guestCount >= DOUBLES_GUEST_THRESHOLD;
  const MIN_GUESTS_FOR_DOUBLE = 4; // Don't add a double for just 1-3 remaining guests

  if (remaining >= MIN_GUESTS_FOR_DOUBLE && doublesAllowed) {
    // Use doubles to cover as many guests as possible (4 per double)
    doubles = Math.ceil(remaining / 4);
    remaining = 0;
  }

  // If doubles not allowed or still remaining after doubles, use additional singles
  if (remaining > 0) {
    const moreSingles = Math.ceil(remaining / 2);
    singles += moreSingles;
    remaining = 0;
  }

  // Safety: never produce negative counts and cap bunk to 1
  if (bunk === null) bunk = null;

  return {
    single: singles,
    double: doubles,
    bunk
  };
}

/**
 * Select a bunk size that best fits the required guests. Prefer the smallest size
 * that satisfies the number of guests; if none fits, return the largest available.
 */
function selectBunkSizeForGuests(guests: number, rules: AutoConfigRules): BunkSize | null {
  const sizes: BunkSize[] = ['small', 'medium', 'large'];

  for (const sz of sizes) {
    const cap = rules.bunkCapacities[sz];
    if (cap >= guests && cap > 0) return sz;
  }

  // No single bunk size can fit all guests; pick the largest if it has capacity > 0
  for (let i = sizes.length - 1; i >= 0; i--) {
    const cap = rules.bunkCapacities[sizes[i]];
    if (cap > 0) return sizes[i];
  }

  return null;
}

/**
 * Check if a bedroom rule has sufficient capacity for the given guest count
 * Returns: boolean indicating if the rule can accommodate the required guests
 */
export function hasSufficientBedroomCapacity(
  rule: BedroomMixRule,
  guestCount: number,
  rules: AutoConfigRules
): boolean {
  const capacity = calculateBedroomCapacity(rule.bedrooms, rules);
  // Ensure the selected rule can accommodate the actual requested guests
  return capacity >= guestCount;
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
  bedrooms: { single: number; double: number; bunk: BunkSize | null },
  rules: AutoConfigRules
): number {
  const singleCapacity = bedrooms.single * 2; // Each single bedroom sleeps 2 guests
  const doubleCapacity = bedrooms.double * 4; // Each double bedroom sleeps 4 guests
  const bunkCapacity = getBunkCapacity(bedrooms.bunk, rules);

  return singleCapacity + doubleCapacity + bunkCapacity;
}

/**
 * Calculate total bedroom capacity for selected rooms
 * Returns: maximum number of guests that can be accommodated based on selected rooms
 */
export function calculateSelectedRoomCapacity(
  selectedRooms: { roomType: string; quantity: number; roomSize?: 'small' | 'medium' | 'large' }[],
  rules: AutoConfigRules
): number {
  let singleBedrooms = 0;
  let doubleBedrooms = 0;
  let maxBunkCapacity = 0;

  // Count bedroom types from selected rooms
  selectedRooms.forEach(room => {
    switch (room.roomType) {
      case 'single_bedroom':
        singleBedrooms += room.quantity;
        break;
      case 'double_bedroom':
        doubleBedrooms += room.quantity;
        break;
      case 'bunk_room': {
        // For bunk rooms, calculate capacity based on the selected room size
        // Map room sizes to bunk sizes: small -> small, medium -> medium, large -> large
        const bunkSize: BunkSize = room.roomSize as BunkSize || 'small';
        const bunkRoomCapacity = getBunkCapacity(bunkSize, rules);
        // Since multiple bunk rooms can be selected, we need to account for all of them
        maxBunkCapacity += bunkRoomCapacity * room.quantity;
        break;
      }
    }
  });

  const singleCapacity = singleBedrooms * 2; // Each single bedroom sleeps 2 guests
  const doubleCapacity = doubleBedrooms * 4; // Each double bedroom sleeps 4 guests

  return singleCapacity + doubleCapacity + maxBunkCapacity;
}
