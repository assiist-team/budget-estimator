# Room Template and Item Management - Technical Documentation

## Overview

The Room Template and Item Management system is a comprehensive solution for managing interior design project estimates. It separates **master item pricing** from **room configurations**, allowing flexible customization while maintaining accurate cost calculations.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    1584 Project Estimator                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Items     │  │Room Templates│  │ Estimates   │              │
│  │ Collection  │  │ Collection  │  │ Collection  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│         │                 │                 │                  │
│         ▼                 ▼                 ▼                  │
│  Master catalog    Room configs      Client submissions       │
│  with pricing     with item lists    with calculated budgets  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Models

### Items Collection (`/items`)

Master catalog of all available items with pricing across quality tiers.

**Document Structure:**
```javascript
{
  id: "sofa_sectional",
  name: "Sofa/Sectional",
  category: "living_room_furniture",
  subcategory: "seating", // optional

  // Pricing in cents (to avoid floating point issues)
  budgetPrice: 200000,      // $2,000.00
  midPrice: 400000,         // $4,000.00
  midHighPrice: 800000,     // $8,000.00
  highPrice: 1500000,       // $15,000.00

  active: true,
  unit: "each",
  notes: "",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Categories:**
- `bedroom_furniture`
- `living_room_furniture`
- `kitchen_furniture`
- `dining_furniture`
- `decorative`
- `textiles`
- `lighting`
- `accessories`
- `electronics`

### Room Templates Collection (`/roomTemplates`)

Pre-configured room templates defining which items belong in each room size.

**Document Structure:**
```javascript
{
  id: "living_room",
  name: "Living Room",
  displayName: "Living Room",
  description: "Complete living room setup with furnishings",
  category: "common_spaces",
  icon: "🛋️",

  sizes: {
    small: {
      displayName: "Small Living Room",
      items: [
        { itemId: "sofa_sectional", quantity: 1 },
        { itemId: "chair", quantity: 2 },
        { itemId: "coffee_table", quantity: 1 }
        // ... more items
      ],
      totals: {
        budget: 828500,    // $8,285.00
        mid: 1689000,      // $16,890.00
        midHigh: 2964000,  // $29,640.00
        high: 5884000      // $58,840.00
      }
    },
    medium: { /* ... */ },
    large: { /* ... */ }
  },

  active: true,
  sortOrder: 1,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Estimates Collection (`/estimates`)

Client estimate submissions with calculated budgets.

**Document Structure:**
```javascript
{
  id: "est_20251013_abc123",

  clientInfo: {
    email: "client@example.com",
    firstName: "John",
    lastName: "Smith",
    phone: "(555) 123-4567"
  },

  propertySpecs: {
    squareFootage: 3200,
    guestCapacity: 12,
    notes: "Mountain retreat with lake views"
  },

  rooms: [
    {
      roomType: "living_room",
      roomSize: "large",
      quantity: 1,
      displayName: "Large Living Room"
    }
  ],

  budget: {
    roomBreakdown: [
      {
        roomType: "living_room",
        roomSize: "large",
        quantity: 1,
        budgetAmount: 1661500,
        midAmount: 3167000,
        midHighAmount: 5542000,
        highAmount: 10922000
      }
    ],
    budget: {
      subtotal: 8500000,
      contingency: 850000,
      total: 9350000
    },
    mid: { /* ... */ },
    midHigh: { /* ... */ },
    high: { /* ... */ },
    rangeLow: 9350000,
    rangeHigh: 71500000
  },

  status: "submitted",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Data Flow

### 1. Initial Data Population

```
CSV Files → Import Script → Firestore Collections
     ↓
├── Items Collection (800+ items with pricing)
└── Room Templates Collection (7 rooms × 3 sizes = 21 configurations)
```

**Import Process:**
- `importData.js` reads CSV files from `initial_dataset/`
- Parses item pricing and room configurations
- Calculates totals for each room size
- Stores in Firestore with proper relationships

### 2. Runtime Data Flow

```
Client Estimate Request → Room Templates → Items → Calculations → Response
     ↓                          ↓           ↓            ↓           ↓
1. Select rooms           2. Get configs  3. Get prices  4. Multiply  5. Return totals
   and sizes                 with items     for each tier   qty × price   with contingency
```

### 3. Admin Updates

```
Admin UI → Update Room Template → Firestore → New Estimates Use Updated Configs
     ↓              ↓                    ↓                    ↓
1. Visual editor  2. Modify items/   3. Persist changes   4. Automatic
   for rooms         quantities                           recalculation
```

## CRUD Operations

### Items Management

#### Create Item
```javascript
const newItem = {
  id: "custom_chair",
  name: "Custom Accent Chair",
  category: "living_room_furniture",
  budgetPrice: 30000,    // $300
  midPrice: 75000,       // $750
  midHighPrice: 150000,  // $1,500
  highPrice: 350000,     // $3,500
  active: true,
  unit: "each",
  createdAt: new Date(),
  updatedAt: new Date()
};

await setDoc(doc(db, 'items', 'custom_chair'), newItem);
```

#### Read Items
```javascript
// Get all active items
const itemsQuery = query(
  collection(db, 'items'),
  where('active', '==', true),
  orderBy('name')
);
const snapshot = await getDocs(itemsQuery);

// Get items by category
const bedroomItemsQuery = query(
  collection(db, 'items'),
  where('category', '==', 'bedroom_furniture'),
  where('active', '==', true)
);
```

#### Update Item
```javascript
const itemRef = doc(db, 'items', 'sofa_sectional');
await updateDoc(itemRef, {
  midPrice: 450000,  // $4,500 (increased from $4,000)
  updatedAt: new Date()
});
```

#### Delete/Deactivate Item
```javascript
// Soft delete - mark as inactive
await updateDoc(doc(db, 'items', 'old_item'), {
  active: false,
  updatedAt: new Date()
});

// Note: Hard delete should be avoided as it may break existing estimates
```

### Room Templates Management

#### Create Room Template
```javascript
const newTemplate = {
  id: "custom_room",
  name: "Custom Room",
  displayName: "Custom Room",
  description: "Custom room configuration",
  category: "common_spaces",
  icon: "🏠",

  sizes: {
    small: {
      displayName: "Small Custom Room",
      items: [
        { itemId: "sofa_sectional", quantity: 1 },
        { itemId: "chair", quantity: 2 }
      ],
      totals: calculateTotalsForItems([
        { itemId: "sofa_sectional", quantity: 1 },
        { itemId: "chair", quantity: 2 }
      ])
    },
    medium: { /* ... */ },
    large: { /* ... */ }
  },

  active: true,
  sortOrder: 99,
  createdAt: new Date(),
  updatedAt: new Date()
};
```

#### Update Room Template
```javascript
const templateRef = doc(db, 'roomTemplates', 'living_room');

// Add item to medium living room
const currentTemplate = (await getDoc(templateRef)).data();
const mediumSize = currentTemplate.sizes.medium;

const updatedItems = [
  ...mediumSize.items,
  { itemId: "ottoman", quantity: 1 }
];

const newTotals = calculateTotalsForItems(updatedItems);

await updateDoc(templateRef, {
  sizes: {
    ...currentTemplate.sizes,
    medium: {
      ...mediumSize,
      items: updatedItems,
      totals: newTotals
    }
  },
  updatedAt: new Date()
});
```

## Calculation Logic

### Room Total Calculation

```javascript
function calculateRoomTotals(roomItems, items) {
  const totals = { budget: 0, mid: 0, midHigh: 0, high: 0 };

  roomItems.forEach(roomItem => {
    const item = items.find(i => i.id === roomItem.itemId);
    if (item) {
      totals.budget += item.budgetPrice * roomItem.quantity;
      totals.mid += item.midPrice * roomItem.quantity;
      totals.midHigh += item.midHighPrice * roomItem.quantity;
      totals.high += item.highPrice * roomItem.quantity;
    }
  });

  return totals;
}
```

### Estimate Calculation

```javascript
function calculateEstimate(selectedRooms, roomTemplates, items) {
  const tiers = ['budget', 'mid', 'midHigh', 'high'];
  const estimate = {
    roomBreakdown: [],
    budget: { subtotal: 0, contingency: 0, total: 0 },
    mid: { subtotal: 0, contingency: 0, total: 0 },
    midHigh: { subtotal: 0, contingency: 0, total: 0 },
    high: { subtotal: 0, contingency: 0, total: 0 },
    rangeLow: 0,
    rangeHigh: 0
  };

  selectedRooms.forEach(room => {
    const template = roomTemplates.get(room.roomType);
    const roomSize = template.sizes[room.roomSize];

    const roomData = {
      roomType: room.roomType,
      roomSize: room.roomSize,
      quantity: room.quantity,
      budgetAmount: 0,
      midAmount: 0,
      midHighAmount: 0,
      highAmount: 0
    };

    // Calculate for each tier
    tiers.forEach(tier => {
      const roomTotal = roomSize.totals[tier] * room.quantity;
      roomData[`${tier}Amount`] = roomTotal;
      estimate[tier].subtotal += roomTotal;
    });

    estimate.roomBreakdown.push(roomData);
  });

  // Add contingency (10%)
  tiers.forEach(tier => {
    estimate[tier].contingency = Math.round(estimate[tier].subtotal * 0.1);
    estimate[tier].total = estimate[tier].subtotal + estimate[tier].contingency;
  });

  // Set range
  estimate.rangeLow = estimate.budget.total;
  estimate.rangeHigh = estimate.high.total;

  return estimate;
}
```

## Troubleshooting Guide

### Common Issues

#### 1. Items Not Appearing in Room Editor

**Symptoms:** Items dropdown in admin interface is empty or missing items.

**Causes:**
- Items collection not populated
- Items marked as inactive
- Firebase security rules blocking read access

**Debug Steps:**
```javascript
// Check if items exist
const itemsRef = collection(db, 'items');
const itemsSnapshot = await getDocs(itemsRef);
console.log('Total items:', itemsSnapshot.size);

// Check active items only
const activeItemsQuery = query(
  collection(db, 'items'),
  where('active', '==', true)
);
const activeSnapshot = await getDocs(activeItemsQuery);
console.log('Active items:', activeSnapshot.size);

// Verify security rules
console.log('Current user:', auth.currentUser?.email);
```

**Fixes:**
- Run import script: `node scripts/importData.js`
- Check Firebase security rules allow admin read access
- Verify user authentication

#### 2. Room Template Updates Not Saving

**Symptoms:** Changes in admin interface don't persist to Firestore.

**Causes:**
- Firebase permissions
- Network connectivity
- Invalid data format

**Debug Steps:**
```javascript
// Check Firebase connection
try {
  const testRef = doc(db, 'roomTemplates', 'living_room');
  await getDoc(testRef);
  console.log('Firestore connection: OK');
} catch (error) {
  console.error('Firestore error:', error);
}

// Check current user permissions
console.log('Auth state:', auth.currentUser);
```

**Fixes:**
- Verify user is authenticated and authorized
- Check network connectivity
- Validate data before saving

#### 3. Incorrect Price Calculations

**Symptoms:** Room totals don't match expected values.

**Causes:**
- Stale cached data
- Items collection out of sync with room templates
- Calculation errors

**Debug Steps:**
```javascript
// Verify item prices
const itemRef = doc(db, 'items', 'sofa_sectional');
const itemDoc = await getDoc(itemRef);
console.log('Item prices:', itemDoc.data());

// Verify room template items
const templateRef = doc(db, 'roomTemplates', 'living_room');
const templateDoc = await getDoc(templateRef);
const mediumSize = templateDoc.data().sizes.medium;
console.log('Room items:', mediumSize.items);

// Recalculate manually
const totals = calculateRoomTotals(mediumSize.items, [itemDoc.data()]);
console.log('Recalculated totals:', totals);
console.log('Stored totals:', mediumSize.totals);
```

**Fixes:**
- Update room template totals after item price changes
- Clear browser cache if using local data
- Re-run import script if data is corrupted

#### 4. Estimates Not Reflecting Template Changes

**Symptoms:** New estimates use old room configurations.

**Causes:**
- Browser caching old room templates
- Room templates not updated in local state
- Import script needs to be re-run

**Debug Steps:**
```javascript
// Check if room template was updated
const templateRef = doc(db, 'roomTemplates', 'living_room');
const template = await getDoc(templateRef);
console.log('Last updated:', template.data().updatedAt);

// Force refresh room templates in app
// Clear localStorage if using persistence
localStorage.removeItem('estimator-storage');
```

**Fixes:**
- Hard refresh browser (Ctrl+Shift+R)
- Clear application cache
- Verify room template updates are saved

## Development Guidelines

### Adding New Item Categories

1. **Update TypeScript Types:**
```typescript
// types/index.ts
export type ItemCategory =
  | 'bedroom_furniture'
  | 'living_room_furniture'
  | 'kitchen_furniture'
  | 'dining_furniture'
  | 'decorative'
  | 'textiles'
  | 'lighting'
  | 'accessories'
  | 'electronics'
  | 'outdoor'  // <- Add new category
  | 'custom_category';
```

2. **Update Import Script:**
```javascript
// scripts/importData.js
function inferCategory(itemName) {
  const name = itemName.toLowerCase();

  const categoryMap = {
    // ... existing mappings
    'outdoor': 'outdoor',  // <- Add new mapping
  };

  // ... rest of function
}
```

3. **Update Admin Interface:**
```typescript
// Update category filter in admin interface if needed
const categories = [
  // ... existing categories
  'outdoor'
];
```

### Adding New Room Types

1. **Create CSV File:**
```
initial_dataset/1584 - Standard Room Items_Pricing Ranges - Custom Room.csv
```

2. **Update Import Script:**
```javascript
// scripts/importData.js
const roomFiles = {
  // ... existing files
  '1584 - Standard Room Items_Pricing Ranges - Custom Room.csv': 'custom_room'
};

const roomTypes = [
  // ... existing types
  { id: 'custom_room', name: 'Custom Room', category: 'common_spaces', icon: '🏠' }
];
```

3. **Update TypeScript Types:**
```typescript
// types/index.ts
export interface RoomTemplate {
  id: string; // Add 'custom_room' to union type if using strict typing
  // ... rest of interface
}
```

### Performance Considerations

#### Indexes Needed
```javascript
// Firestore indexes for optimal performance

Collection: items
- Single field: category (Ascending)
- Single field: active (Ascending)
- Composite: category (Ascending), active (Ascending)

Collection: roomTemplates
- Single field: active (Ascending)
- Single field: category (Ascending)
- Single field: sortOrder (Ascending)

Collection: estimates
- Single field: status (Ascending)
- Single field: createdAt (Descending)
- Composite: status (Ascending), createdAt (Descending)
```

#### Caching Strategy
- Room templates are relatively static - cache for session
- Items change more frequently - cache for shorter periods
- Estimates are dynamic - no caching recommended

#### Batch Operations
```javascript
// For bulk updates, use batch writes
const batch = db.batch();

// Update multiple items
items.forEach(item => {
  const itemRef = doc(db, 'items', item.id);
  batch.update(itemRef, { updatedAt: new Date() });
});

await batch.commit();
```

## Testing

### Unit Tests
```javascript
// Test calculation logic
describe('calculateRoomTotals', () => {
  test('calculates correct totals for room items', () => {
    const roomItems = [
      { itemId: 'sofa', quantity: 1 },
      { itemId: 'chair', quantity: 2 }
    ];

    const mockItems = [
      { id: 'sofa', budgetPrice: 200000, midPrice: 400000, midHighPrice: 800000, highPrice: 1500000 },
      { id: 'chair', budgetPrice: 50000, midPrice: 100000, midHighPrice: 200000, highPrice: 400000 }
    ];

    const result = calculateRoomTotals(roomItems, mockItems);

    expect(result.budget).toBe(300000);    // (200k × 1) + (50k × 2)
    expect(result.mid).toBe(600000);       // (400k × 1) + (100k × 2)
    expect(result.midHigh).toBe(1200000);  // (800k × 1) + (200k × 2)
    expect(result.high).toBe(2300000);     // (1.5M × 1) + (400k × 2)
  });
});
```

### Integration Tests
```javascript
// Test full estimate calculation
describe('calculateEstimate', () => {
  test('generates correct estimate from room selections', () => {
    const selectedRooms = [
      { roomType: 'living_room', roomSize: 'medium', quantity: 1 }
    ];

    const roomTemplates = new Map([
      ['living_room', {
        sizes: {
          medium: {
            totals: {
              budget: 1121500,
              mid: 2203000,
              midHigh: 3783000,
              high: 7588000
            }
          }
        }
      }]
    ]);

    const result = calculateEstimate(selectedRooms, roomTemplates, []);

    expect(result.budget.subtotal).toBe(1121500);
    expect(result.budget.contingency).toBe(112150);
    expect(result.budget.total).toBe(1233650);
  });
});
```

## Best Practices

1. **Always store prices in cents** to avoid floating point precision issues
2. **Use soft deletes** (active: false) instead of hard deletes
3. **Calculate totals server-side** to ensure consistency
4. **Validate data** before saving to prevent corruption
5. **Use transactions** for related updates (e.g., item price + room totals)
6. **Cache room templates** but refresh items more frequently
7. **Log all admin changes** for audit trails
8. **Test calculations** after any pricing or configuration changes

## Migration Guide

### Upgrading from Static JSON to Firestore

If migrating from local JSON files to Firestore:

1. **Run import script** to populate Firestore collections
2. **Update frontend** to fetch from Firestore instead of local files
3. **Add authentication** for admin functions
4. **Set up security rules** to protect data
5. **Test thoroughly** before deploying

### Adding New Pricing Tiers

To add a new pricing tier (e.g., "luxury"):

1. **Update Item schema** to include new tier field
2. **Update Room Template schema** to include new tier in totals
3. **Update calculation functions** to handle new tier
4. **Update admin interface** to show new tier
5. **Migrate existing data** using batch update
6. **Update CSV import** to handle new tier

This documentation provides a complete technical reference for developers working with the Room Template and Item Management system.
