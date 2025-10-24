// Budget calculation utilities
import type { RoomTemplate, RoomWithItems, RoomItem, Budget, RoomBreakdown, QualityTier, Item, PropertySpecs, BudgetDefaults, ProjectBudget } from '../types';
import type { ComputedConfiguration } from '../types/config';

// Re-export QUALITY_TIERS for convenience
export { QUALITY_TIERS } from '../types';

/**
 * Calculate estimate for all quality tiers (low to mid range)
 */
export function calculateEstimate(
  selectedRooms: RoomWithItems[],
  roomTemplates: Map<string, RoomTemplate>,
  items?: Map<string, Item>,
  options?: {
    propertySpecs?: PropertySpecs;
    budgetDefaults?: BudgetDefaults;
  }
): Budget | ProjectBudget {
  const tiers: QualityTier[] = ['low', 'mid', 'midHigh', 'high'];

  const budget: Budget = {
    roomBreakdown: [],
    low: { subtotal: 0, contingency: 0, total: 0 },
    mid: { subtotal: 0, contingency: 0, total: 0 },
    midHigh: { subtotal: 0, contingency: 0, total: 0 },
    high: { subtotal: 0, contingency: 0, total: 0 },
    rangeLow: 0,
    rangeHigh: 0,
  };

  selectedRooms.forEach((room) => {
    const template = roomTemplates.get(room.roomType);
    if (!template) return;

    const roomSize = template.sizes[room.roomSize as keyof typeof template.sizes];
    if (!roomSize) return;

    const roomData: RoomBreakdown = {
      roomType: room.roomType,
      roomSize: room.roomSize,
      quantity: room.quantity,
      lowAmount: 0,
      midAmount: 0,
      midHighAmount: 0,
      highAmount: 0,
    };

    // Ensure items is a non-empty array before using dynamic item-based calculations
    const hasItems = room.items.length > 0;

    // Calculate all tiers for room breakdown
    if (hasItems && items) {
        // Calculate dynamically from current room items for all tiers
        tiers.forEach((tier) => {
          const tierKey = `${tier}Price` as keyof Item;
          const roomTotal = room.items.reduce((total: number, roomItem: RoomItem) => {
            const item = items.get(roomItem.itemId);
            if (!item) return total;
            const candidate = item[tierKey];
            const tierPrice = typeof candidate === 'number' ? candidate : 0;
            return total + tierPrice * roomItem.quantity;
          }, 0) * room.quantity;
          roomData[`${tier}Amount` as keyof RoomBreakdown] = roomTotal as never;
          budget[tier].subtotal += roomTotal;
        });
    } else if (template) {
        // Use pre-calculated room totals for rooms without items
        tiers.forEach((tier) => {
          const templateTotals = template.sizes[room.roomSize as keyof typeof template.sizes]?.totals as Record<string, number> | undefined;
          if (!templateTotals) return;

          // Use proper tier names: low, mid, midHigh, high
          const tierKey = tier;
          const candidate = templateTotals[tierKey];
          const roomTotals = typeof candidate === 'number' ? candidate : 0;
          const roomTotal = roomTotals * room.quantity;
          roomData[`${tier}Amount` as keyof RoomBreakdown] = roomTotal as never;
          budget[tier].subtotal += roomTotal;
        });
    }

    budget.roomBreakdown.push(roomData);
  });

  // Zero out contingency for each tier (totals equal subtotals)
  tiers.forEach((tier) => {
    budget[tier].contingency = 0;
    budget[tier].total = budget[tier].subtotal;
  });

  // Set overall range (low tier for lower range, mid tier for upper range)
  budget.rangeLow = budget.low.total;
  budget.rangeHigh = budget.mid.total;

  // If property specs are provided, calculate project budget with add-ons
  if (options?.propertySpecs) {
    const { propertySpecs, budgetDefaults } = options;

    // Use budget defaults if available, otherwise use minimal defaults
    const projectAddOns = {
      installation: budgetDefaults?.installationCents || 0,
      fuel: budgetDefaults?.fuelCents || 0,
      storageAndReceiving: budgetDefaults?.storageAndReceivingCents || 0,
      kitchen: budgetDefaults?.kitchenCents || 0,
      propertyManagement: budgetDefaults?.propertyManagementCents || 0,
      designFee: Math.round(propertySpecs.squareFootage * (budgetDefaults?.designFeeRatePerSqftCents || 1000)) // Default $10/sqft design fee
    } as const;

    const addOnTotal = Object.values(projectAddOns).reduce((sum, cents) => sum + cents, 0);

    const projectRange = {
      low: budget.low.total + addOnTotal,
      mid: budget.mid.total + addOnTotal,
      midHigh: budget.midHigh.total + addOnTotal,
      high: budget.high.total + addOnTotal
    } as const;

    const projectBudget: ProjectBudget = {
      ...budget,
      contingencyDisabled: true,
      projectAddOns,
      projectRange,
      // Keep original furnishings ranges intact - don't overwrite them!
      // The base Budget.rangeLow/rangeHigh should always be furnishings-only
    };

    return projectBudget;
  }

  return budget;
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


