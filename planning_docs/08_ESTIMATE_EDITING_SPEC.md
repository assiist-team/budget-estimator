# Estimate Editing System Specification

## Overview
Currently, estimates are saved in Firestore but only include basic room selections (type, size, quantity) without the detailed item mappings. This prevents proper editing functionality. This specification outlines the requirements for implementing complete estimate persistence and editing capabilities.

## Current State Analysis

### What's Currently Saved
- `clientInfo` (contact details)
- `propertySpecs` (square footage, guest capacity)
- `rooms` (SelectedRoom[] - room type, size, quantity, display name only)
- `budget` (calculated totals)

### What's Missing
- **Item Mappings**: The actual `RoomItem[]` data that shows which items are included in each room size
- **Edit Capabilities**: No way to modify existing estimates

## Requirements

### 1. Complete Data Persistence
**Objective**: Save all item mappings per room so estimates can be fully reconstructed and edited.

#### New Data Structure
```typescript
interface RoomItem {
  itemId: string;              // Item identifier (matches items collection)
  quantity: number;            // Quantity of this item
}

interface RoomWithItems extends SelectedRoom {
  items: RoomItem[];           // Items included in this room
}

interface Estimate {
  // ... existing fields ...
  rooms: RoomWithItems[];      // Rooms with their complete item mappings
}
```

#### Implementation Details
- **Save Complete Mappings**: When saving an estimate, capture all `RoomItem[]` data from each room's calculated items
- **Reconstruct on Load**: When loading an estimate, rebuild the complete item structure from saved data
- **Version Compatibility**: Maintain backwards compatibility with existing estimates that lack item data

### 2. Estimate Editing Interface
**Objective**: Provide a comprehensive editing interface for saved estimates.

#### Core Editing Features

##### Room Management
- **Include/Exclude Rooms**: Toggle entire rooms on/off in the estimate
- **Modify Room Quantities**: Change how many of each room type are included
- **Change Room Sizes**: Switch between small/medium/large sizes

##### Item Management
- **Add Items**: Add new items to any room from the available item catalog
- **Remove Items**: Remove specific items from rooms
- **Modify Quantities**: Adjust quantities of existing items


### 3. Data Management
**Objective**: Ensure data integrity and provide proper validation during editing.

#### State Management
- **Draft vs. Saved States**: Track whether estimate is in draft or saved state
- **Change Tracking**: Monitor which fields have been modified
- **Undo/Redo**: Provide ability to undo changes (at least last 5 actions)

### 4. User Interface Requirements

#### Estimate Cards
**Card layout matching existing admin patterns:**

```sql
┌─────────────────────────────────────────────────┐
│ EST_20250115_ABC123                             │
│ Client: John Smith                              │
│ 2,500 sqft • 8 guests                           │
│ $15,000 - $18,000                               │
│ Jan 15, 2025 • Submitted • 2 days ago           │
│ Living Room, Master Bedroom, Kitchen            │
│                                                 │
│ [Edit] [Delete]                                 │
└─────────────────────────────────────────────────┘
```

- **Design**: Matches item cards and room template cards in admin section
- **No emojis**: Uses flat text/icons only
- **Actions**: Edit and Delete buttons in top-right corner
- **Click**: Clicking card opens estimate for editing

#### Editing Mode Layout
```
┌─────────────────────────────────────────────────┐
│ ← Back to Dashboard    Edit Estimate: EST_123  │
├─────────────────────────────────────────────────┤
│ 📋 Client Info    📐 Property Specs    💰 Budget │
├─────────────────────────────────────────────────┤
│ 📝 Rooms & Items (Main Editing Area)           │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🛏️ Master Bedroom (2x)    [Edit] [Remove]   │ │
│ │ └─ 🛏️ King Bed (1)        [Qty: 1] [✏️]    │ │
│ │ └─ 🛏️ Nightstand (2)     [Qty: 2] [✏️]    │ │
│ │ └─ 💡 Table Lamp (2)      [Qty: 2] [✏️]    │ │
│ │ └─ ➕ Add Item                              │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🛋️ Living Room (1x)      [Edit] [Remove]   │ │
│ │ └─ 🛋️ Sofa (1)           [Qty: 1] [✏️]    │ │
│ │ └─ ☕ Coffee Table (1)    [Qty: 1] [✏️]    │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ 💾 Save Draft    🔄 Recalculate    📤 Save & Send │
└─────────────────────────────────────────────────┘
```

#### Key UI Components
- **Room Cards**: Collapsible cards showing room details and items
- **Item Rows**: Individual item entries with quantity controls and edit buttons
- **Add Item Modal**: Searchable item catalog with filtering by category/room type
- **Edit Item Modal**: Detailed editing interface for individual items
- **Bulk Edit Panel**: For applying changes across multiple items

### 5. Calculation Engine Updates
**Objective**: Ensure all calculations work correctly with edited estimates.

#### Recalculation Triggers
- **Real-time Updates**: Recalculate totals as user makes changes
- **Manual Recalculation**: Provide manual recalculation button
- **Validation Feedback**: Show calculation errors/warnings immediately

#### Calculation Logic
- **Room Totals**: Sum all included items in each room
- **Estimate Totals**: Sum all room totals plus contingency
- **Budget Ranges**: Maintain proper budget/mid/high ranges

### 6. Admin Interface Integration
**Objective**: Allow administrators to edit estimates through the admin panel.

#### Admin Features
- **Full Edit Access**: Same editing capabilities as main interface
- **Batch Operations**: Edit multiple estimates simultaneously
- **Approval Workflow**: Track and approve estimate changes
- **Audit Trail**: Log all changes made to estimates

### 7. Technical Implementation

#### Database Schema Updates
```sql
-- Update to estimates collection
{
  // ... existing fields ...
  rooms: [
    {
      roomType: "master_bedroom",
      roomSize: "large",
      quantity: 1,
      displayName: "Master Bedroom",
      items: [
        {
          itemId: "king_bed",
          quantity: 1
        },
        {
          itemId: "nightstand",
          quantity: 2
        }
      ]
    }
  ],
  lastEditedAt: timestamp,
  lastEditedBy: "user_id_or_system",
  editHistory: [
    {
      timestamp: timestamp,
      action: "room_items_modified",
      details: { roomIndex: 0, itemId: "nightstand", change: "added", quantity: 2 }
    }
  ]
}
```

#### Implementation Approach
Since estimates are already saved directly to Firestore from the client, we'll implement editing functionality the same way - directly updating Firestore from the client-side editing interface. This keeps the architecture simple and consistent.

#### Client-Side Implementation
- **Direct Firestore Updates**: Edit operations will update Firestore documents directly from the client
- **Firestore Security Rules**: Ensure proper access control through Firestore security rules
- **Optimistic Updates**: Update UI immediately, sync in background
- **Change Detection**: Only save when actual changes are made

### 8. Security & Permissions
**Objective**: Ensure proper access control for estimate editing.

#### Access Control
- **Owner Access**: Original estimate creator can edit
- **Admin Access**: Administrators can edit any estimate

