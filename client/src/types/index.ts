// Core data types for the estimator

export interface Item {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  lowPrice: number; // in cents
  midPrice: number;
  midHighPrice: number;
  highPrice: number;
  unit: string;
  reimbursementType?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomItem {
  itemId: string;
  quantity: number;
  name?: string; // Optional for backwards compatibility
  lowPrice?: number; // Optional per-item price override (in cents)
  midPrice?: number; // Optional per-item price override (in cents)
}

export interface RoomSize {
  displayName: string;
  items: RoomItem[];
  totals: {
    low: number;
    mid: number;
    midHigh: number;
    high: number;
  };
}

export interface RoomTemplate {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'common_spaces' | 'sleeping_spaces';
  icon?: string;
  sizes: {
    small: RoomSize;
    medium: RoomSize;
    large: RoomSize;
  };
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SelectedRoom {
  roomType: string;
  roomSize: 'small' | 'medium' | 'large';
  quantity: number;
  displayName: string;
}

export interface RoomWithItems extends SelectedRoom {
  items: RoomItem[];
}

export interface PropertySpecs {
  squareFootage: number;
  guestCapacity: number;
  notes?: string;
}

export interface RoomBreakdown {
  roomType: string;
  roomSize: string;
  quantity: number;
  lowAmount: number;
  midAmount: number;
  midHighAmount: number;
  highAmount: number;
}

export interface TierTotal {
  subtotal: number;
  contingency: number;
  total: number;
}

export interface Budget {
  roomBreakdown: RoomBreakdown[];
  low: TierTotal;
  mid: TierTotal;
  midHigh: TierTotal;
  high: TierTotal;
  rangeLow: number;
  rangeHigh: number;
}

export interface ClientInfo {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
}

export interface Estimate {
  id: string;
  clientInfo: ClientInfo;
  propertySpecs: PropertySpecs;
  rooms: RoomWithItems[];
  status: 'draft' | 'submitted' | 'viewed' | 'contacted' | 'closed';
  source: string;
  viewCount: number;
  lastViewedAt?: Date;
  sentAt?: Date;
  highlevelContactId?: string;
  syncedToHighLevel: boolean;
  syncedAt?: Date;
  pdfUrl?: string;
  pdfGeneratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  adminNotes?: string;
  assignedTo?: string;
  followUpDate?: Date;
  // New fields for editing support
  lastEditedAt?: Date;
  lastEditedBy?: string;
  editHistory?: EditHistoryEntry[];
  // Ownership and tool identification
  ownerUid?: string;
  toolId?: string;
  // Custom range settings for project budget estimates
  customRangeEnabled?: boolean;
  customRangeLowPercent?: number; // Percentage below low price point (e.g., 5 for 5%)
  customRangeHighPercent?: number; // Percentage above low price point (e.g., 5 for 5%)
  // Custom project add-ons overrides (in cents). If a key exists, it overrides the calculated/default value
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

export interface EditHistoryEntry {
  timestamp: Date;
  action: 'room_items_modified' | 'room_added' | 'room_removed' | 'room_quantity_changed' | 'room_size_changed';
  details: Record<string, any>;
}

export type QualityTier = 'low' | 'mid' | 'midHigh' | 'high';

export const QUALITY_TIERS: { [key in QualityTier]: { name: string; description: string } } = {
  low: {
    name: 'Low Quality',
    description: 'Good value materials and furnishings',
  },
  mid: {
    name: 'Mid-Range Quality',
    description: 'Balanced quality and investment',
  },
  midHigh: {
    name: 'Mid/High Quality',
    description: 'Premium materials and designer pieces',
  },
  high: {
    name: 'High-End Quality',
    description: 'Luxury, high-end designer furnishings',
  },
};

// Budget defaults
export interface BudgetDefaults {
  installationCents: number;
  fuelCents: number;
  storageAndReceivingCents: number;
  kitchenCents: number;
  propertyManagementCents: number;
  designFeeRatePerSqftCents: number;
}

// Extended budget with project add-ons
export interface ProjectBudget extends Budget {
  contingencyDisabled: boolean;
  projectAddOns: {
    installation: number;
    fuel: number;
    storageAndReceiving: number;
    kitchen: number;
    propertyManagement: number;
    designPlanning: number;
    procurement: number;
    designImplementation: number;
  };
  projectRange: {
    low: number;
    mid: number;
    midHigh: number;
    high: number;
  };
}

