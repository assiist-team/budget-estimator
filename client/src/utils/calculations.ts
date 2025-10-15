// Budget calculation utilities
import type { RoomTemplate, RoomWithItems, Budget, RoomBreakdown, QualityTier } from '../types';
import type { ComputedConfiguration } from '../types/config';

// Re-export QUALITY_TIERS for convenience
export { QUALITY_TIERS } from '../types';

/**
 * Calculate estimate for all quality tiers or budget mode only
 */
export function calculateEstimate(
  selectedRooms: RoomWithItems[],
  roomTemplates: Map<string, RoomTemplate>,
  budgetMode: boolean = false
): Budget {
  const tiers: QualityTier[] = ['budget', 'mid', 'midHigh', 'high'];
  
  const budget: Budget = {
    roomBreakdown: [],
    budget: { subtotal: 0, contingency: 0, total: 0 },
    mid: { subtotal: 0, contingency: 0, total: 0 },
    midHigh: { subtotal: 0, contingency: 0, total: 0 },
    high: { subtotal: 0, contingency: 0, total: 0 },
    rangeLow: 0,
    rangeHigh: 0,
  };

  selectedRooms.forEach((room) => {
    const template = roomTemplates.get(room.roomType);
    if (!template) return;

    const roomSize = template.sizes[room.roomSize];
    if (!roomSize) return;

    const roomData: RoomBreakdown = {
      roomType: room.roomType,
      roomSize: room.roomSize,
      quantity: room.quantity,
      budgetAmount: 0,
      midAmount: 0,
      midHighAmount: 0,
      highAmount: 0,
    };

    if (budgetMode) {
      // Budget mode: calculate budget tier for lower range and mid tier for upper range
      const budgetTotal = roomSize.totals.budget * room.quantity;
      roomData.budgetAmount = budgetTotal;
      budget.budget.subtotal += budgetTotal;

      const midTotal = roomSize.totals.mid * room.quantity;
      roomData.midAmount = midTotal;
      budget.mid.subtotal += midTotal;

      // Set other tiers to 0 for display purposes
      budget.midHigh.subtotal += 0;
      budget.high.subtotal += 0;
    } else {
      // Calculate for each tier
      tiers.forEach((tier) => {
        const roomTotal = roomSize.totals[tier] * room.quantity;
        roomData[`${tier}Amount` as keyof RoomBreakdown] = roomTotal as never;
        budget[tier].subtotal += roomTotal;
      });
    }

    budget.roomBreakdown.push(roomData);
  });

  // Calculate contingency and totals for each tier
  tiers.forEach((tier) => {
    budget[tier].contingency = Math.round(budget[tier].subtotal * 0.1);
    budget[tier].total = budget[tier].subtotal + budget[tier].contingency;
  });

  // Set overall range
  if (budgetMode) {
    budget.rangeLow = budget.budget.total;
    budget.rangeHigh = budget.mid.total; // Use mid tier for upper range instead of 20% markup
  } else {
    budget.rangeLow = budget.budget.total;
    budget.rangeHigh = budget.high.total;
  }

  return { ...budget, budgetMode };
}

/**
 * Format currency from cents to dollars
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * Format currency in abbreviated form (e.g., $85k)
 */
export function formatCurrencyAbbreviated(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000000) {
    return `$${(dollars / 1000000).toFixed(2)}M`;
  }
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(2)}k`;
  }
  return formatCurrency(cents);
}

/**
 * Convert dollars to cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Generate suggested room configuration based on property specs and computed configuration
 */
export function suggestRoomConfiguration(
  computedConfig?: ComputedConfiguration,
  fallbackSquareFootage?: number,
  fallbackGuestCapacity?: number
): RoomWithItems[] {
  const suggestions: RoomWithItems[] = [];

  // Use computed configuration if available, otherwise fall back to basic logic
  if (computedConfig) {
    // Add living room based on computed configuration
    if (computedConfig.commonAreas.living !== 'none') {
      suggestions.push({
        roomType: 'living_room',
        roomSize: computedConfig.commonAreas.living,
        quantity: 1,
        displayName: 'Living Room',
        items: []
      });
    }

    // Add kitchen based on computed configuration
    if (computedConfig.commonAreas.kitchen !== 'none') {
      suggestions.push({
        roomType: 'kitchen',
        roomSize: computedConfig.commonAreas.kitchen,
        quantity: 1,
        displayName: 'Kitchen',
        items: []
      });
    }

    // Add dining room based on computed configuration
    if (computedConfig.commonAreas.dining !== 'none') {
      suggestions.push({
        roomType: 'dining_room',
        roomSize: computedConfig.commonAreas.dining,
        quantity: 1,
        displayName: 'Dining Room',
        items: []
      });
    }

    // Add bedrooms based on computed configuration
    if (computedConfig.bedrooms.single > 0) {
      suggestions.push({
        roomType: 'single_bedroom',
        roomSize: 'medium', // Default size, could be made configurable
        quantity: computedConfig.bedrooms.single,
        displayName: 'Single Bedroom',
        items: []
      });
    }

    if (computedConfig.bedrooms.double > 0) {
      suggestions.push({
        roomType: 'double_bedroom',
        roomSize: 'medium', // Default size, could be made configurable
        quantity: computedConfig.bedrooms.double,
        displayName: 'Double Bedroom',
        items: []
      });
    }

    if (computedConfig.bedrooms.bunk) {
      suggestions.push({
        roomType: 'bunk_room',
        roomSize: computedConfig.bedrooms.bunk === 'small' ? 'small' :
                 computedConfig.bedrooms.bunk === 'medium' ? 'medium' : 'large',
        quantity: 1,
        displayName: 'Bunk Room',
        items: []
      });
    }

    // Add rec room based on computed configuration
    if (computedConfig.commonAreas.recRoom !== 'none') {
      suggestions.push({
        roomType: 'rec_room',
        roomSize: computedConfig.commonAreas.recRoom,
        quantity: 1,
        displayName: 'Rec Room',
        items: []
      });
    }
  } else if (fallbackSquareFootage && fallbackGuestCapacity) {
    // Fallback logic when computed configuration is not available
    suggestions.push({
      roomType: 'living_room',
      roomSize: fallbackSquareFootage > 3500 ? 'large' : fallbackSquareFootage > 2000 ? 'medium' : 'small',
      quantity: 1,
      displayName: 'Living Room',
      items: []
    });

    suggestions.push({
      roomType: 'kitchen',
      roomSize: fallbackSquareFootage > 3500 ? 'large' : fallbackSquareFootage > 2000 ? 'medium' : 'small',
      quantity: 1,
      displayName: 'Kitchen',
      items: []
    });

    suggestions.push({
      roomType: 'dining_room',
      roomSize: fallbackGuestCapacity > 14 ? 'large' : fallbackGuestCapacity > 10 ? 'medium' : 'small',
      quantity: 1,
      displayName: 'Dining Room',
      items: []
    });

    // Bedrooms based on capacity
    const bedroomCount = Math.ceil(fallbackGuestCapacity / 2);
    if (bedroomCount > 0) {
      suggestions.push({
        roomType: 'single_bedroom',
        roomSize: 'medium',
        quantity: Math.min(bedroomCount, 4),
        displayName: 'Single Bedroom',
        items: []
      });
    }

    if (fallbackGuestCapacity >= 10) {
      suggestions.push({
        roomType: 'double_bedroom',
        roomSize: fallbackSquareFootage > 3000 ? 'large' : 'medium',
        quantity: 1,
        displayName: 'Double Bedroom',
        items: []
      });
    }

    if (fallbackGuestCapacity > 10) {
      suggestions.push({
        roomType: 'bunk_room',
        roomSize: 'medium',
        quantity: 1,
        displayName: 'Bunk Room',
        items: []
      });
    }

    if (fallbackSquareFootage > 3000) {
      suggestions.push({
        roomType: 'rec_room',
        roomSize: 'medium',
        quantity: 1,
        displayName: 'Rec Room',
        items: []
      });
    }
  }

  return suggestions;
}

/**
 * Generate a unique estimate ID
 */
export function generateEstimateId(): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8);
  return `est_${date}_${random}`;
}

