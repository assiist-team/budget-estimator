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
    customRangeEnabled?: boolean;
    customRangeLowPercent?: number;
    customRangeHighPercent?: number;
    customProjectAddOns?: Partial<{
      installation: number;
      fuel: number;
      storageAndReceiving: number;
      kitchen: number;
      propertyManagement: number;
      designPlanning: number;
      procurement: number;
      designImplementation: number;
    }>;
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
    // Handle rooms with items (including custom rooms without templates)
    if (hasItems && items) {
        // Calculate dynamically from current room items for all tiers
        tiers.forEach((tier) => {
          const roomTotal = room.items.reduce((total: number, roomItem: RoomItem) => {
            // Use RoomItem price override if available, otherwise fall back to item library
            let tierPrice = 0;
            
            // Get base low price (from override or library)
            const baseLowPrice = roomItem.lowPrice !== undefined 
              ? roomItem.lowPrice 
              : (items.get(roomItem.itemId)?.lowPrice || 0);
            
            // If custom range is enabled, calculate prices from low price using percentages
            if (options?.customRangeEnabled && 
                options.customRangeLowPercent !== undefined && 
                options.customRangeHighPercent !== undefined &&
                baseLowPrice > 0) {
              
              if (tier === 'low') {
                // Low end: baseLowPrice * (1 - customRangeLowPercent / 100)
                tierPrice = Math.round(baseLowPrice * (1 - options.customRangeLowPercent / 100));
              } else if (tier === 'mid') {
                // High end: baseLowPrice * (1 + customRangeHighPercent / 100)
                tierPrice = Math.round(baseLowPrice * (1 + options.customRangeHighPercent / 100));
              } else {
                // For midHigh and high tiers, use proportional scaling
                // midHigh: between mid and high
                // high: further above
                const lowEnd = Math.round(baseLowPrice * (1 - options.customRangeLowPercent / 100));
                const highEnd = Math.round(baseLowPrice * (1 + options.customRangeHighPercent / 100));
                const range = highEnd - lowEnd;
                
                if (tier === 'midHigh') {
                  tierPrice = Math.round(lowEnd + range * 0.75);
                } else if (tier === 'high') {
                  tierPrice = Math.round(lowEnd + range * 1.5);
                }
              }
            } else {
              // Default behavior: use overrides or library prices
              if (tier === 'low' && roomItem.lowPrice !== undefined) {
                tierPrice = roomItem.lowPrice;
              } else if (tier === 'mid' && roomItem.midPrice !== undefined) {
                tierPrice = roomItem.midPrice;
              } else {
                // Fall back to item library prices
                const item = items.get(roomItem.itemId);
                if (item) {
                  const tierKey = `${tier}Price` as keyof Item;
                  const candidate = item[tierKey];
                  tierPrice = typeof candidate === 'number' ? candidate : 0;
                }
              }
            }
            
            return total + tierPrice * roomItem.quantity;
          }, 0) * room.quantity;
          roomData[`${tier}Amount` as keyof RoomBreakdown] = roomTotal as never;
          budget[tier].subtotal += roomTotal;
        });
    } else if (template) {
        // Use pre-calculated room totals for rooms without items
        const roomSize = template.sizes[room.roomSize as keyof typeof template.sizes];
        if (!roomSize) return;
        
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
    } else {
      // Room has no template and no items - skip it
      return;
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
    const { propertySpecs, budgetDefaults, customProjectAddOns } = options;

    // Calculate base design fee from rate
    const baseDesignFee = Math.round(propertySpecs.squareFootage * (budgetDefaults?.designFeeRatePerSqftCents || 1000)); // Default $10/sqft design fee
    
    // Split design fee into three categories: 40% design planning, 30% procurement, 30% design implementation
    // Calculate designImplementation as remainder to ensure total equals baseDesignFee exactly
    const designPlanning = Math.round(baseDesignFee * 0.4);
    const procurement = Math.round(baseDesignFee * 0.3);
    const designImplementation = baseDesignFee - designPlanning - procurement;

    // Use budget defaults if available, otherwise use minimal defaults
    // Apply custom overrides if provided
    const projectAddOns = {
      installation: customProjectAddOns?.installation !== undefined ? customProjectAddOns.installation : (budgetDefaults?.installationCents || 0),
      fuel: customProjectAddOns?.fuel !== undefined ? customProjectAddOns.fuel : (budgetDefaults?.fuelCents || 0),
      storageAndReceiving: customProjectAddOns?.storageAndReceiving !== undefined ? customProjectAddOns.storageAndReceiving : (budgetDefaults?.storageAndReceivingCents || 0),
      kitchen: customProjectAddOns?.kitchen !== undefined ? customProjectAddOns.kitchen : (budgetDefaults?.kitchenCents || 0),
      propertyManagement: customProjectAddOns?.propertyManagement !== undefined ? customProjectAddOns.propertyManagement : (budgetDefaults?.propertyManagementCents || 0),
      designPlanning: customProjectAddOns?.designPlanning !== undefined ? customProjectAddOns.designPlanning : designPlanning,
      procurement: customProjectAddOns?.procurement !== undefined ? customProjectAddOns.procurement : procurement,
      designImplementation: customProjectAddOns?.designImplementation !== undefined ? customProjectAddOns.designImplementation : designImplementation,
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
 * Calculate total number of rooms from selected rooms
 */
export function calculateTotalRooms(selectedRooms: RoomWithItems[]): number {
  return selectedRooms.reduce((total, room) => total + room.quantity, 0);
}

/**
 * Calculate total number of items across all rooms
 */
export function calculateTotalItems(
  selectedRooms: RoomWithItems[],
  roomTemplates: Map<string, RoomTemplate>,
  items?: Map<string, Item>
): number {
  return selectedRooms.reduce((total, room) => {
    const template = roomTemplates.get(room.roomType);
    if (!template) return total;

    const roomSizeData = template.sizes[room.roomSize as keyof typeof template.sizes];
    if (!roomSizeData) return total;

    // If we have items in the room data, use those (from edit page)
    if (room.items.length > 0) {
      const roomItems = room.items.reduce((roomItemTotal, item) => roomItemTotal + item.quantity, 0);
      return total + (roomItems * room.quantity);
    }

    // Otherwise, use template items (from results page)
    if (roomSizeData.items.length > 0 && items) {
      const roomItems = roomSizeData.items.reduce((roomItemTotal, templateItem) => {
        const item = items.get(templateItem.itemId);
        return roomItemTotal + (item ? templateItem.quantity : 0);
      }, 0);
      return total + (roomItems * room.quantity);
    }

    return total;
  }, 0);
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

    // Add Outdoor Space room (always included for project budgets)
    suggestions.push(createOutdoorSpaceRoom());
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

    // Add Outdoor Space room (always included for project budgets)
    suggestions.push(createOutdoorSpaceRoom());
  }

  return suggestions;
}

/**
 * Create the Outdoor Space room with fixed $1,250 price
 */
export function createOutdoorSpaceRoom(): RoomWithItems {
  return {
    roomType: 'outdoor_space',
    roomSize: 'medium',
    quantity: 1,
    displayName: 'Outdoor Space',
    items: [{
      itemId: 'outdoor_space_item',
      quantity: 1,
      name: 'Outdoor Furnishings',
      lowPrice: 125000, // $1,250 in cents
      midPrice: 125000, // $1,250 in cents
    }]
  };
}


