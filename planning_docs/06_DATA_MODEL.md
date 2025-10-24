# Firestore Data Model

## Overview
Complete database schema for the 1584 Project Estimator tool using Firebase Firestore.

**Project ID:** `project-estimator-1584`

---

## Collections Structure

```
/items                          - Master item pricing catalog
/roomTemplates                  - Room configurations with item lists
/estimates                      - Client estimate submissions
/priceHistory                   - Price change audit log (Phase 2)
/adminUsers                     - Admin access control (Phase 2)
```

---

## Collection: `/items`

Master catalog of all items with pricing across quality tiers.

### Document Structure
```javascript
{
  // Document ID: auto-generated or slug (e.g., "king_bed_frame")
  id: "king_bed_frame",
  
  // Basic Info
  name: "King Bed Frame",
  category: "bedroom_furniture",
  subcategory: "beds", // optional
  
  // Pricing (in cents to avoid floating point issues)
  budgetPrice: 50000,        // $500.00
  midPrice: 150000,          // $1,500.00
  midHighPrice: 300000,      // $3,000.00
  highPrice: 800000,         // $8,000.00

  // Metadata
  unit: "each",              // "each", "pair", "set"
  notes: "",                 // Optional internal notes
  
  // Audit
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: "admin@1584design.com",
  lastUpdatedBy: "admin@1584design.com"
}
```

### Example Documents

```javascript
// items/king_bed_frame
{
  id: "king_bed_frame",
  name: "King Bed Frame",
  category: "bedroom_furniture",
  budgetPrice: 50000,
  midPrice: 150000,
  midHighPrice: 300000,
  highPrice: 800000,
  unit: "each",
  createdAt: Timestamp,
  updatedAt: Timestamp
}

// items/throw_pillows
{
  id: "throw_pillows",
  name: "Throw Pillows",
  category: "decorative",
  budgetPrice: 3500,
  midPrice: 8000,
  midHighPrice: 12500,
  highPrice: 30000,
  unit: "each",
  createdAt: Timestamp,
  updatedAt: Timestamp
}

// items/sofa_sectional
{
  id: "sofa_sectional",
  name: "Sofa/Sectional",
  category: "living_room_furniture",
  budgetPrice: 200000,
  midPrice: 400000,
  midHighPrice: 800000,
  highPrice: 1500000,
  unit: "each",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Categories List
```javascript
const CATEGORIES = [
  "bedroom_furniture",
  "living_room_furniture",
  "kitchen_furniture",
  "dining_furniture",
  "decorative",
  "textiles",
  "lighting",
  "accessories",
  "electronics",
  "outdoor"
];
```

### Indexes Needed
```
Collection: items
- Single field: category (Ascending)
```

---

## Collection: `/roomTemplates`

Pre-configured room templates with item lists and quantities by room size.

### Document Structure
```javascript
{
  // Document ID: room_type (e.g., "living_room")
  id: "living_room",
  
  // Basic Info
  name: "Living Room",
  displayName: "Living Room",
  description: "Common living space with seating and entertainment",
  category: "common_spaces", // or "sleeping_spaces"
  icon: "🛋️", // optional emoji
  
  // Available sizes
  sizes: {
    small: {
      displayName: "Small Living Room",
      items: [
        {
          itemId: "sofa_sectional",
          quantity: 1
        },
        {
          itemId: "chair",
          quantity: 2
        },
        {
          itemId: "coffee_table",
          quantity: 1
        },
        {
          itemId: "side_table",
          quantity: 2
        },
        // ... more items
      ],
      
      // Pre-calculated totals (for quick display)
      totals: {
        low: 828500,         // $8,285.00
        mid: 1689000,        // $16,890.00
        midHigh: 2964000,    // $29,640.00
        high: 5884000        // $58,840.00
      }
    },
    
    medium: {
      displayName: "Medium Living Room",
      items: [ /* ... */ ],
      totals: { /* ... */ }
    },
    
    large: {
      displayName: "Large Living Room",
      items: [ /* ... */ ],
      totals: { /* ... */ }
    }
  },
  
  // Metadata
  sortOrder: 1, // For display ordering
  
  // Audit
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Example Document

```javascript
// roomTemplates/single_bedroom
{
  id: "single_bedroom",
  name: "Single Bedroom",
  displayName: "Single Bedroom",
  description: "Guest bedroom with one bed",
  category: "sleeping_spaces",
  icon: "🛏️",
  
  sizes: {
    small: {
      displayName: "Small Single Bedroom",
      items: [
        { itemId: "bed_frame", quantity: 1 },
        { itemId: "mattress", quantity: 1 },
        { itemId: "mattress_protector", quantity: 1 },
        { itemId: "sleeping_pillows", quantity: 2 },
        { itemId: "down_pillows", quantity: 2 },
        { itemId: "pillow_protectors", quantity: 2 },
        { itemId: "sheets", quantity: 1 },
        { itemId: "decorative_bedding", quantity: 1 },
        { itemId: "throw_pillows", quantity: 3 },
        { itemId: "throw_blanket_on_bed", quantity: 1 },
        { itemId: "bench_or_stools", quantity: 1 },
        { itemId: "area_rug", quantity: 1 },
        { itemId: "nightstands", quantity: 2 },
        { itemId: "lamps", quantity: 2 },
        { itemId: "nightstand_accessories", quantity: 8 },
        { itemId: "curtain_set", quantity: 1 },
        { itemId: "curtain_rod", quantity: 1 },
        { itemId: "wall_art", quantity: 3 },
        { itemId: "mirror", quantity: 1 },
        { itemId: "tv", quantity: 1 },
        { itemId: "tv_mount", quantity: 1 }
      ],
      totals: {
        low: 509500,
        mid: 1179000,
        midHigh: 1465200,
        high: 3453600
      }
    },
    
    medium: {
      displayName: "Medium Single Bedroom",
      items: [ /* includes chair, side table, greenery, floor lamp */ ],
      totals: {
        low: 610000,
        mid: 1432000,
        midHigh: 2057700,
        high: 4713600
      }
    },
    
    large: {
      displayName: "Large Single Bedroom",
      items: [ /* includes dresser, more furniture */ ],
      totals: {
        low: 787500,
        mid: 1810000,
        midHigh: 2820200,
        high: 6293600
      }
    }
  },

  sortOrder: 4,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Room Template IDs
```javascript
const ROOM_TYPES = [
  "living_room",
  "kitchen",
  "dining_area",
  "single_bedroom",
  "double_bedroom",
  "bunk_room",
  "rec_room"
  // Add more as needed
];

const ROOM_SIZES = ["small", "medium", "large"];
```

### Indexes Needed
```
Collection: roomTemplates
- Single field: category (Ascending)
- Single field: sortOrder (Ascending)
```

---

## Collection: `/estimates`

Client estimate submissions and saved configurations.

### Document Structure
```javascript
{
  // Document ID: auto-generated (e.g., "est_abc123xyz")
  id: "est_abc123xyz",
  
  // Client Contact Info
  clientInfo: {
    email: "client@example.com",
    firstName: "John",
    lastName: "Smith",
    phone: "(555) 123-4567", // optional
    company: "", // optional
  },
  
  // Property Specifications
  propertySpecs: {
    squareFootage: 3200,
    guestCapacity: 12,
    notes: "" // optional client notes
  },
  
  // Selected Rooms
  rooms: [
    {
      roomType: "living_room",
      roomSize: "large",
      quantity: 1,
      displayName: "Large Living Room"
    },
    {
      roomType: "kitchen",
      roomSize: "large",
      quantity: 1,
      displayName: "Large Kitchen"
    },
    {
      roomType: "single_bedroom",
      roomSize: "medium",
      quantity: 3,
      displayName: "Medium Single Bedroom"
    },
    {
      roomType: "bunk_room",
      roomSize: "small",
      quantity: 1,
      displayName: "Small Bunk Room"
    }
  ],
  
  // Calculated Budget (All Tiers)
  budget: {
    // Per room breakdown (all tiers)
    roomBreakdown: [
      {
        roomType: "living_room",
        roomSize: "large",
        quantity: 1,
        lowAmount: 1661500,         // $16,615
        midAmount: 3167000,         // $31,670
        midHighAmount: 5542000,     // $55,420
        highAmount: 10922000        // $109,220
      },
      // ... more rooms
    ],

    // Totals by tier
    low: {
      subtotal: 8500000,          // $85,000.00
      contingency: 850000,        // 10% = $8,500.00
      total: 9350000              // $93,500.00
    },
    mid: {
      subtotal: 18000000,      // $180,000.00
      contingency: 1800000,    // $18,000.00
      total: 19800000          // $198,000.00
    },
    midHigh: {
      subtotal: 35000000,      // $350,000.00
      contingency: 3500000,    // $35,000.00
      total: 38500000          // $385,000.00
    },
    high: {
      subtotal: 65000000,      // $650,000.00
      contingency: 6500000,    // $65,000.00
      total: 71500000          // $715,000.00
    },
    
    // Overall range (for quick display)
    rangeLow: 9350000,         // Low total
    rangeHigh: 19800000        // Mid total
  },
  
  // Status & Tracking
  status: "submitted",        // "draft", "submitted", "viewed", "contacted", "closed"
  source: "direct",           // "direct", "referral", "social", etc.
  
  // Engagement Tracking
  viewCount: 0,
  lastViewedAt: null,
  sentAt: timestamp,
  
  // CRM Integration (Phase 3)
  highlevelContactId: null,
  syncedToHighLevel: false,
  syncedAt: null,
  
  // PDF
  pdfUrl: "", // Firebase Storage URL if generated
  pdfGeneratedAt: null,
  
  // Audit
  createdAt: timestamp,
  updatedAt: timestamp,
  submittedAt: timestamp,
  ipAddress: "192.168.1.1", // optional, for tracking
  userAgent: "Mozilla/5.0...", // optional
  
  // Admin Notes (Phase 2)
  adminNotes: "",
  assignedTo: "", // admin email
  followUpDate: null
}
```

### Example Document

```javascript
// estimates/est_20251013_abc123
{
  id: "est_20251013_abc123",
  
  clientInfo: {
    email: "john.smith@email.com",
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
    },
    {
      roomType: "kitchen",
      roomSize: "large",
      quantity: 1,
      displayName: "Large Kitchen"
    },
    {
      roomType: "dining_area",
      roomSize: "medium",
      quantity: 1,
      displayName: "Medium Dining Area"
    },
    {
      roomType: "single_bedroom",
      roomSize: "medium",
      quantity: 3,
      displayName: "Medium Single Bedroom"
    },
    {
      roomType: "double_bedroom",
      roomSize: "large",
      quantity: 1,
      displayName: "Large Double Bedroom"
    },
    {
      roomType: "bunk_room",
      roomSize: "small",
      quantity: 1,
      displayName: "Small Bunk Room"
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
      },
      // ... more
    ],
    budget: {
      subtotal: 8500000,
      contingency: 850000,
      total: 9350000
    },
    mid: {
      subtotal: 18000000,
      contingency: 1800000,
      total: 19800000
    },
    midHigh: {
      subtotal: 35000000,
      contingency: 3500000,
      total: 38500000
    },
    high: {
      subtotal: 65000000,
      contingency: 6500000,
      total: 71500000
    },
    rangeLow: 9350000,
    rangeHigh: 71500000
  },
  
  status: "submitted",
  source: "direct",
  viewCount: 0,
  lastViewedAt: null,
  
  highlevelContactId: null,
  syncedToHighLevel: false,
  
  createdAt: Timestamp(2025-10-13 14:30:00),
  updatedAt: Timestamp(2025-10-13 14:30:00),
  submittedAt: Timestamp(2025-10-13 14:30:00)
}
```

### Status Flow
```
draft → submitted → viewed → contacted → closed
                 ↓
              expired (if not viewed within 30 days)
```

### Indexes Needed
```
Collection: estimates
- Single field: status (Ascending)
- Single field: createdAt (Descending)
- Single field: clientInfo.email (Ascending)
- Composite: status (Ascending), createdAt (Descending)
- Composite: syncedToHighLevel (Ascending), createdAt (Descending)
```

---

## Collection: `/priceHistory` (Phase 2)

Audit log of all price changes for transparency and tracking.

### Document Structure
```javascript
{
  // Document ID: auto-generated
  id: "hist_abc123",
  
  // What Changed
  itemId: "king_bed_frame",
  itemName: "King Bed Frame",
  field: "highPrice", // "budgetPrice", "midPrice", etc.
  
  // Values
  oldValue: 750000,        // $7,500.00
  newValue: 800000,        // $8,000.00
  changeAmount: 50000,     // $500.00 increase
  changePercent: 6.67,     // 6.67% increase
  
  // Why & Who
  reason: "Supplier price increase",
  changedBy: "benjamin@1584design.com",
  
  // When
  changedAt: timestamp,
  
  // Context
  batchId: null // If part of bulk update, share same batchId
}
```

### Example Document
```javascript
// priceHistory/hist_20251013_001
{
  id: "hist_20251013_001",
  itemId: "king_bed_frame",
  itemName: "King Bed Frame",
  field: "highPrice",
  oldValue: 750000,
  newValue: 800000,
  changeAmount: 50000,
  changePercent: 6.67,
  reason: "Supplier price increase - Q4 2025",
  changedBy: "benjamin@1584design.com",
  changedAt: Timestamp(2025-10-13 10:00:00),
  batchId: null
}
```

### Indexes Needed
```
Collection: priceHistory
- Single field: itemId (Ascending)
- Single field: changedAt (Descending)
- Single field: changedBy (Ascending)
- Composite: itemId (Ascending), changedAt (Descending)
```

---

## Collection: `/adminUsers` (Phase 2)

Track admin access and permissions.

### Document Structure
```javascript
{
  // Document ID: user email
  id: "benjamin@1584design.com",
  
  // User Info
  email: "benjamin@1584design.com",
  displayName: "Benjamin Mackenzie",
  role: "owner", // "owner", "admin", "viewer"
  
  // Permissions
  permissions: {
    viewEstimates: true,
    editPricing: true,
    managePricingData: true,
    viewPriceHistory: true,
    exportData: true,
    manageAdmins: true
  },
  
  // Activity
  lastLogin: timestamp,
  loginCount: 47,
  
  // Audit
  createdAt: timestamp,
  createdBy: "system",
  updatedAt: timestamp
}
```

### Roles & Permissions
```javascript
const ROLES = {
  owner: {
    viewEstimates: true,
    editPricing: true,
    managePricingData: true,
    viewPriceHistory: true,
    exportData: true,
    manageAdmins: true
  },
  admin: {
    viewEstimates: true,
    editPricing: true,
    managePricingData: true,
    viewPriceHistory: true,
    exportData: true,
    manageAdmins: false
  },
  viewer: {
    viewEstimates: true,
    editPricing: false,
    managePricingData: false,
    viewPriceHistory: false,
    exportData: true,
    manageAdmins: false
  }
};
```

---

## Helper Functions

### Price Formatting
```javascript
// Store prices in cents (integers)
function dollarsToCents(dollars) {
  return Math.round(dollars * 100);
}

function centsToDollars(cents) {
  return cents / 100;
}

function formatCurrency(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(centsToDollars(cents));
}

// Usage
const price = dollarsToCents(1500.00); // Store as 150000
const display = formatCurrency(price);  // Display as "$1,500.00"
```

### Budget Calculation (All Tiers)
```javascript
function calculateEstimate(rooms) {
  const tiers = ['low', 'mid', 'midHigh', 'high'];
  const estimate = {
    roomBreakdown: [],
    low: { subtotal: 0, contingency: 0, total: 0 },
    mid: { subtotal: 0, contingency: 0, total: 0 },
    midHigh: { subtotal: 0, contingency: 0, total: 0 },
    high: { subtotal: 0, contingency: 0, total: 0 },
    rangeLow: 0,
    rangeHigh: 0
  };
  
  rooms.forEach(room => {
    const template = getRoomTemplate(room.roomType, room.roomSize);
    const roomData = {
      roomType: room.roomType,
      roomSize: room.roomSize,
      quantity: room.quantity,
      lowAmount: 0,
      midAmount: 0,
      midHighAmount: 0,
      highAmount: 0
    };

    // Calculate for each tier
    tiers.forEach(tier => {
      const roomTotal = template.totals[tier] * room.quantity;
      roomData[`${tier}Amount`] = roomTotal;
      estimate[tier].subtotal += roomTotal;
    });
    
    estimate.roomBreakdown.push(roomData);
  });
  
  // Calculate contingency and totals for each tier
  tiers.forEach(tier => {
    estimate[tier].contingency = Math.round(estimate[tier].subtotal * 0.10);
    estimate[tier].total = estimate[tier].subtotal + estimate[tier].contingency;
  });
  
  // Set overall range
  estimate.rangeLow = estimate.low.total;
  estimate.rangeHigh = estimate.mid.total;
  
  return estimate;
}
```

### Display Strategy:
- Show overall range: **$93,500 - $198,000** (Low to Mid-End)
- Display all four quality tiers with individual totals
- Allow expansion to see room-by-room breakdown for each tier
- PDF includes all tiers and complete breakdowns

### Estimate ID Generation
```javascript
function generateEstimateId() {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8);
  return `est_${date}_${random}`;
}

// Example: "est_20251013_a8k3m9"
```

---

## Data Import Script

### CSV to Firestore (items collection)
```javascript
// scripts/importItems.js
const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');

admin.initializeApp({
  projectId: 'project-estimator-1584'
});

const db = admin.firestore();

async function importItems() {
  const items = [];
  
  fs.createReadStream('./initial_dataset/Item Pricing.csv')
    .pipe(csv())
    .on('data', (row) => {
      // Parse CSV row
      const item = {
        id: slugify(row.Item),
        name: row.Item,
        category: inferCategory(row.Item),
        lowPrice: parseCurrency(row['Budget Price']),
        midPrice: parseCurrency(row['Mid Price']),
        midHighPrice: parseCurrency(row['Mid/High Price']),
        highPrice: parseCurrency(row['High Price']),
        unit: 'each',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      items.push(item);
    })
    .on('end', async () => {
      console.log(`Importing ${items.length} items...`);
      
      // Batch write to Firestore
      const batch = db.batch();
      items.forEach(item => {
        const docRef = db.collection('items').doc(item.id);
        batch.set(docRef, item);
      });
      
      await batch.commit();
      console.log('Import complete!');
    });
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCurrency(value) {
  // "$1,500.00" -> 150000 (cents)
  return Math.round(parseFloat(value.replace(/[$,]/g, '')) * 100);
}

function inferCategory(itemName) {
  const categories = {
    'bed': 'bedroom_furniture',
    'mattress': 'bedroom_furniture',
    'sofa': 'living_room_furniture',
    'table': 'dining_furniture',
    'pillow': 'textiles',
    'lamp': 'lighting',
    // ... more mappings
  };
  
  for (const [keyword, category] of Object.entries(categories)) {
    if (itemName.toLowerCase().includes(keyword)) {
      return category;
    }
  }
  
  return 'accessories'; // default
}

importItems();
```

---

## Query Examples

### Get All Items
```javascript
const items = await db.collection('items')
  .orderBy('name')
  .get();
```

### Get Items by Category
```javascript
const bedroomItems = await db.collection('items')
  .where('category', '==', 'bedroom_furniture')
  .get();
```

### Get Room Template
```javascript
const template = await db.collection('roomTemplates')
  .doc('living_room')
  .get();

const smallLivingRoom = template.data().sizes.small;
```

### Get Recent Estimates
```javascript
const recentEstimates = await db.collection('estimates')
  .orderBy('createdAt', 'desc')
  .limit(20)
  .get();
```

### Get Estimates by Status
```javascript
const newLeads = await db.collection('estimates')
  .where('status', '==', 'submitted')
  .orderBy('createdAt', 'desc')
  .get();
```

### Get Price History for Item
```javascript
const history = await db.collection('priceHistory')
  .where('itemId', '==', 'king_bed_frame')
  .orderBy('changedAt', 'desc')
  .limit(10)
  .get();
```

---

## Data Validation Rules

### Item Validation
```javascript
function validateItem(item) {
  const errors = [];
  
  if (!item.name || item.name.trim() === '') {
    errors.push('Item name is required');
  }
  
  if (item.lowPrice <= 0) {
    errors.push('Low price must be greater than 0');
  }

  if (item.midPrice < item.lowPrice) {
    errors.push('Mid price must be >= low price');
  }
  
  if (item.midHighPrice < item.midPrice) {
    errors.push('Mid/High price must be >= mid price');
  }
  
  if (item.highPrice < item.midHighPrice) {
    errors.push('High price must be >= mid/high price');
  }
  
  return errors;
}
```

### Estimate Validation
```javascript
function validateEstimate(estimate) {
  const errors = [];
  
  if (!estimate.clientInfo.email || !isValidEmail(estimate.clientInfo.email)) {
    errors.push('Valid email is required');
  }
  
  if (!estimate.clientInfo.firstName || estimate.clientInfo.firstName.trim() === '') {
    errors.push('First name is required');
  }
  
  if (!estimate.clientInfo.lastName || estimate.clientInfo.lastName.trim() === '') {
    errors.push('Last name is required');
  }
  
  if (!estimate.rooms || estimate.rooms.length === 0) {
    errors.push('At least one room must be selected');
  }
  
  if (!estimate.budget || !estimate.budget.rangeLow || !estimate.budget.rangeHigh) {
    errors.push('Budget calculation failed');
  }
  
  return errors;
}
```

---

## Backup & Migration

### Export All Data
```bash
# Export entire database
firebase firestore:export gs://project-estimator-1584-backup

# Export specific collections
gcloud firestore export \
  gs://project-estimator-1584-backup \
  --collection-ids=items,roomTemplates,estimates
```

### Import Data
```bash
firebase firestore:import gs://project-estimator-1584-backup
```

---

## Summary

**Total Collections:** 5 (3 in Phase 1, 2 in Phase 2)

**Phase 1 Collections:**
- `items` - Master pricing catalog
- `roomTemplates` - Room configurations
- `estimates` - Client submissions

**Phase 2 Collections:**
- `priceHistory` - Audit log
- `adminUsers` - Access control

**Storage Strategy:**
- Prices in cents (integers) for precision
- Timestamps for all audit fields
- Denormalized totals for performance
- Indexed fields for common queries

**Next Steps:**
1. Create Firebase project: `project-estimator-1584`
2. Run data import scripts
3. Set up security rules
4. Create indexes
5. Test with sample data

