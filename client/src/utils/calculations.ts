// Budget calculation utilities
import type { RoomTemplate, SelectedRoom, Budget, RoomBreakdown, QualityTier } from '../types';

// Re-export QUALITY_TIERS for convenience
export { QUALITY_TIERS } from '../types';

/**
 * Calculate estimate for all quality tiers or budget mode only
 */
export function calculateEstimate(
  selectedRooms: SelectedRoom[],
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
      // Budget mode: only calculate budget tier and create range with 20% markup
      const budgetTotal = roomSize.totals.budget * room.quantity;
      roomData.budgetAmount = budgetTotal;
      budget.budget.subtotal += budgetTotal;

      // Set other tiers to 0 for display purposes
      budget.mid.subtotal += 0;
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
    budget.rangeHigh = Math.round(budget.budget.total * 1.2); // Add 20% for upper range
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
 * Generate suggested room configuration based on property specs
 */
export function suggestRoomConfiguration(
  squareFootage: number,
  guestCapacity: number
): SelectedRoom[] {
  const suggestions: SelectedRoom[] = [];

  // Always include basics
  suggestions.push({
    roomType: 'living_room',
    roomSize: squareFootage > 3500 ? 'large' : squareFootage > 2000 ? 'medium' : 'small',
    quantity: 1,
    displayName: 'Living Room',
  });

  suggestions.push({
    roomType: 'kitchen',
    roomSize: squareFootage > 3500 ? 'large' : squareFootage > 2000 ? 'medium' : 'small',
    quantity: 1,
    displayName: 'Kitchen',
  });

  // Dining based on capacity (now that minimum is 8, always include dining)
  suggestions.push({
    roomType: 'dining_room',
    roomSize: guestCapacity > 14 ? 'large' : guestCapacity > 10 ? 'medium' : 'small',
    quantity: 1,
    displayName: 'Dining Room',
  });

  // Bedrooms based on capacity
  const bedroomCount = Math.ceil(guestCapacity / 2);
  if (bedroomCount > 0) {
    suggestions.push({
      roomType: 'single_bedroom',
      roomSize: 'medium',
      quantity: Math.min(bedroomCount, 4),
      displayName: 'Single Bedroom',
    });
  }

  // Double bedroom for larger properties (now that minimum is 8, always include for larger groups)
  if (guestCapacity >= 10) {
    suggestions.push({
      roomType: 'double_bedroom',
      roomSize: squareFootage > 3000 ? 'large' : 'medium',
      quantity: 1,
      displayName: 'Double Bedroom',
    });
  }

  // Bunk room for larger properties with many guests
  if (guestCapacity > 10) {
    suggestions.push({
      roomType: 'bunk_room',
      roomSize: 'medium',
      quantity: 1,
      displayName: 'Bunk Room',
    });
  }

  // Rec room for larger properties
  if (squareFootage > 3000) {
    suggestions.push({
      roomType: 'rec_room',
      roomSize: 'medium',
      quantity: 1,
      displayName: 'Rec Room',
    });
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

