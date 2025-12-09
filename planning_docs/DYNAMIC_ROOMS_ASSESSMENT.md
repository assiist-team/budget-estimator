# Dynamic Room System Assessment & Implementation Plan

## Executive Summary

### 🎯 Recommended Approach: Canonical + Custom Rooms

**Difficulty Level: LOW** 🟢  
**Time Estimate: 6-10 hours (1-2 days)**  
**Risk Level: LOW**

Instead of making the auto-configuration algorithm fully dynamic (which would be complex), we'll use a **hybrid approach**:

- **Canonical Rooms** (8 system-defined rooms): The auto-config algorithm continues using these hardcoded room types
  - Bedrooms: `single_bedroom`, `double_bedroom`, `bunk_room`
  - Common: `living_room`, `kitchen`, `dining_room`, `rec_room`
  - Special: `outdoor_space`

- **Custom Rooms** (user-created): Admins can create any additional room types
  - Examples: `library`, `office`, `gym`, `mudroom`, `wine_cellar`, `theater`, `pantry`
  - Work exactly like canonical rooms (items, pricing, quantities)
  - Appear in room selection UI
  - NOT auto-suggested (users add manually)

**Why This Works:**
✅ No refactoring of auto-config algorithm needed  
✅ Specialty rooms (libraries, gyms) are property-specific anyway - shouldn't be auto-suggested  
✅ 90% of use cases covered with 15% of the effort  
✅ Can be implemented in 1-2 days instead of a week  
✅ Low risk, no breaking changes  

**Trade-Off:** Custom rooms won't appear in auto-suggestions, but that's actually appropriate for specialty spaces.

---

## Quick Start: What Needs to Change

### Minimal Changes Required ⚡

1. **Add one field to room templates**: `isCanonical: boolean`
   - Mark existing 8 rooms as canonical
   - New rooms default to `false` (custom)

2. **Add "Create Custom Room" UI in Admin**
   - Simple form: Name, Description, Category, Icon
   - Auto-generate room ID from name
   - Create with default empty sizes

3. **Room selection shows all rooms**
   - Already works! UI reads from database dynamically
   - Optional: Add "Custom" badge for visual distinction

**That's it!** No algorithm changes, no refactoring, no risk.

---

## Current State Analysis

### ✅ What's Already Dynamic

1. **Database Schema** (`/roomTemplates` collection)
   - Fully flexible structure
   - Supports arbitrary room types with custom IDs
   - Has `category` field for grouping (common_spaces, sleeping_spaces, other_spaces)
   - Already stores all room metadata (name, displayName, description, sizes, items, etc.)

2. **Room Selection UI** (`RoomConfigurationPage.tsx`)
   - Dynamically renders rooms from database
   - Groups by category automatically
   - No hardcoded room types in the display logic

3. **Admin Interface** (`AdminPage.tsx`)
   - Can edit existing room templates
   - Can manage items within rooms
   - Can update room sizes and pricing

4. **Results/Display Pages**
   - Display rooms dynamically based on selected rooms
   - No hardcoded assumptions about which rooms exist

### ❌ What's Currently Hardcoded

#### 1. **Auto-Configuration System** (HIGH IMPACT)

**Files:**
- `client/src/types/config.ts` (TypeScript interfaces)
- `client/src/utils/autoConfiguration.ts` (algorithm logic)
- `client/src/utils/calculations.ts` (room suggestion mapping)

**Problem Areas:**

**A. Common Areas Interface (lines 43-51 in `config.ts`)**
```typescript
export interface CommonAreaRules {
  kitchen: { presence: SpacePresenceRule; size: SpaceSizeRule };
  dining: { presence: SpacePresenceRule; size: SpaceSizeRule };
  living: { presence: SpacePresenceRule; size: SpaceSizeRule };
  recRoom: { presence: SpacePresenceRule; size: SpaceSizeRule };
}
```
- Fixed set of 4 common areas
- Cannot add new common areas without code changes
- Used in admin config interface

**B. Computed Configuration Interface (lines 73-85 in `config.ts`)**
```typescript
export interface ComputedConfiguration {
  bedrooms: {
    single: number;
    double: number;
    bunk: BunkSize | null;
  };
  commonAreas: {
    kitchen: CommonSize;
    dining: CommonSize;
    living: CommonSize;
    recRoom: CommonSize;
  };
}
```
- Hardcoded bedroom types (single, double, bunk)
- Hardcoded common area types
- This is the output of the auto-config algorithm

**C. Derivation Algorithm (lines 71-110 in `autoConfiguration.ts`)**
```typescript
export function deriveCommonAreas(
  squareFootage: number,
  _guestCount: number,
  rules: AutoConfigRules
): ComputedConfiguration['commonAreas'] {
  const kitchen = computeSpace(rules.commonAreas.kitchen.presence, rules.commonAreas.kitchen.size);
  const dining = computeSpace(rules.commonAreas.dining.presence, rules.commonAreas.dining.size);
  const living = computeSpace(rules.commonAreas.living.presence, rules.commonAreas.living.size);
  const recRoom = computeSpace(rules.commonAreas.recRoom.presence, rules.commonAreas.recRoom.size);

  return { kitchen, dining, living, recRoom };
}
```
- Manually computes each room
- Would need to be dynamic to support new room types

**D. Room Suggestion Mapping (lines 292-452 in `calculations.ts`)**
```typescript
export function suggestRoomConfiguration(
  computedConfig?: ComputedConfiguration,
  fallbackSquareFootage?: number,
  fallbackGuestCapacity?: number
): RoomWithItems[] {
  const suggestions: RoomWithItems[] = [];

  if (computedConfig) {
    // Hardcoded mapping from config to room types
    if (computedConfig.commonAreas.living !== 'none') {
      suggestions.push({
        roomType: 'living_room',  // ← HARDCODED
        roomSize: computedConfig.commonAreas.living,
        quantity: 1,
        displayName: 'Living Room',
        items: []
      });
    }
    // ... more hardcoded mappings for kitchen, dining, rec_room, etc.
  }
}
```
- Manually maps config properties to room type IDs
- Would need a metadata-driven approach

**E. Capacity Calculation (lines 378-411 in `autoConfiguration.ts`)**
```typescript
export function calculateSelectedRoomCapacity(
  selectedRooms: { roomType: string; quantity: number; roomSize?: 'small' | 'medium' | 'large' }[],
  rules: AutoConfigRules
): number {
  let singleBedrooms = 0;
  let doubleBedrooms = 0;
  let maxBunkCapacity = 0;

  selectedRooms.forEach(room => {
    switch (room.roomType) {
      case 'single_bedroom':  // ← HARDCODED
        singleBedrooms += room.quantity;
        break;
      case 'double_bedroom':  // ← HARDCODED
        doubleBedrooms += room.quantity;
        break;
      case 'bunk_room':       // ← HARDCODED
        // ... bunk logic
        break;
    }
  });
}
```
- Assumes specific bedroom types
- Would need metadata about room capacity

#### 2. **Admin Interface - Room Creation** (MEDIUM IMPACT)

**File:** `client/src/pages/AdminPage.tsx`

**Current State:**
- Can edit existing room templates ✅
- Cannot create new room types ❌
- No UI for creating new room templates from scratch

**What's Needed:**
- "Create New Room Type" button
- Form to specify:
  - Room ID (slug)
  - Display name
  - Description
  - Category (common_spaces, sleeping_spaces, or other_spaces)
  - Icon (optional)
  - Room metadata (capacity rules, etc.)

#### 3. **Room Metadata System** (NEW REQUIREMENT)

**What's Missing:**
Currently, there's no way to tell the system:
- "This room type sleeps X guests per instance"
- "This is a common area that should be auto-configured based on square footage"
- "This is a bedroom type that should be used in capacity calculations"

**What's Needed:**
New metadata fields in `roomTemplates` collection:
```typescript
interface RoomTemplateMetadata {
  // For auto-configuration
  isAutoConfigurable: boolean;  // Should this room be part of auto-config?
  autoConfigCategory: 'bedroom' | 'common_area' | 'none';
  
  // For bedroom capacity calculation
  guestCapacity?: {
    type: 'fixed' | 'variable';  // fixed=2/4 guests, variable=based on size
    fixedCapacity?: number;       // e.g., 2 for single, 4 for double
    variableCapacity?: {          // for bunk rooms
      small: number;
      medium: number;
      large: number;
    };
  };
  
  // For auto-config rules (common areas only)
  autoConfigKey?: string;  // e.g., "living", "kitchen", "newRoom"
}
```

---

## RECOMMENDED IMPLEMENTATION: Canonical + Custom Rooms

**This section describes the recommended, simplified approach.**

## Effort Estimates by Approach

### Recommended: Option A (Canonical + Custom Rooms)

| Phase | Time Estimate | Risk Level |
|-------|--------------|------------|
| 1. Add `isCanonical` metadata to room templates | 1 hour | LOW |
| 2. Mark existing rooms as canonical | 30 mins | LOW |
| 3. Admin UI: "Create Custom Room" form | 3-4 hours | LOW |
| 4. Validation & room ID generation | 1-2 hours | LOW |
| 5. Room selection UI: Show custom rooms | 1-2 hours | LOW |
| 6. Testing & documentation | 1-2 hours | LOW |
| **TOTAL** | **6-10 hours** | **LOW** ⭐ |

**Estimated Calendar Time:** 1-2 working days

---

### Alternative: Full Dynamic System (If You Really Want It)

| Phase | Time Estimate | Risk Level |
|-------|--------------|------------|
| Phase 1: Data Model & Metadata | 4-6 hours | LOW |
| Phase 2: Refactor Auto-Config | 12-16 hours | MEDIUM-HIGH |
| Phase 3: Admin UI for Room Creation | 8-12 hours | LOW-MEDIUM |
| Phase 4: Auto-Config Rules UI | 6-8 hours | MEDIUM |
| Phase 5: Testing & Documentation | 4-6 hours | LOW |
| **TOTAL** | **34-48 hours** | **MEDIUM-HIGH** |

**Estimated Calendar Time:** 5-7 working days

---

## Risks & Mitigation Strategies

### Risk 1: Type Safety Loss
**Problem:** Moving from static TypeScript interfaces to dynamic Record<string, ...> structures loses compile-time type checking.

**Mitigation:**
- Use runtime validation (Zod or similar) for auto-config rules
- Create helper functions with type guards
- Write comprehensive unit tests for edge cases

### Risk 2: Existing Estimates Break
**Problem:** Changing the ComputedConfiguration structure could break loading of old estimates.

**Mitigation:**
- Keep old estimates structure unchanged in database
- Add migration/adapter layer when loading old estimates
- Test with real backup data before deploying

### Risk 3: Auto-Config Algorithm Complexity
**Problem:** Algorithm becomes harder to reason about with dynamic room types.

**Mitigation:**
- Add extensive comments and documentation
- Create visual diagrams of the algorithm flow
- Write unit tests for each configuration scenario
- Consider adding a "debug mode" that shows why each room was/wasn't suggested

### Risk 4: UI Performance
**Problem:** Loading room metadata on every render could slow down admin UI.

**Mitigation:**
- Use React memoization (useMemo) for room templates
- Consider caching room metadata in localStorage
- Lazy-load room details only when editing

---

## Alternative Approaches

### Option A: Canonical + Custom Rooms (RECOMMENDED ⭐)
**Description:** Maintain a set of "canonical" rooms that the auto-config algorithm knows about, but allow admins to create "custom" rooms that appear in room selection UI but aren't auto-configured.

**How It Works:**
1. **Canonical Rooms** (hardcoded in algorithm):
   - Bedrooms: `single_bedroom`, `double_bedroom`, `bunk_room`
   - Common Areas: `living_room`, `kitchen`, `dining_room`, `rec_room`
   - Auto-configuration uses these types
   - Capacity calculations know about these

2. **Custom Rooms** (user-created):
   - Any room type the admin creates (e.g., `library`, `office`, `mudroom`, `gym`)
   - Appear in room selection UI
   - NOT included in auto-suggestions (user must add manually)
   - No capacity calculations (or optional simple metadata)

**Pros:**
- ✅ **Very simple to implement** (6-10 hours)
- ✅ **No refactoring of auto-config algorithm**
- ✅ **Low risk** - doesn't touch core logic
- ✅ **Solves 90% of use cases** - users can add any room type they want
- ✅ **Clear distinction** between "system rooms" and "custom rooms"
- ✅ **Easy to understand** - no complex metadata

**Cons:**
- ⚠️ Custom rooms don't appear in auto-suggestions (user must manually add)
- ⚠️ Custom rooms don't contribute to capacity calculations
- ⚠️ Still has hardcoded logic for canonical rooms

**Implementation:**
- Add `isCanonical: boolean` field to room template metadata
- Admin UI: "Create Custom Room Type" button
- Room selection UI: Show custom rooms in separate section or mixed in by category
- No changes to auto-configuration algorithm needed!

**Estimated Time:** 6-10 hours

**Future Evolution:**
- Can later add ability to "promote" custom rooms to canonical status
- Can add simple capacity metadata for custom rooms if needed
- Algorithm remains stable and predictable

---

### Option B: Partial Dynamic System
**Description:** Make common areas fully dynamic, but keep bedroom types semi-hardcoded.

**Pros:**
- Easier to implement than full dynamic
- Bedrooms have special capacity logic that's complex to generalize
- Most use cases want to add common areas (libraries, offices, etc.), not bedroom variants

**Cons:**
- More complex than Option A
- Still has some hardcoded logic
- Requires refactoring auto-config

**Estimated Time:** 20-30 hours (vs 6-10 for Option A)

---

### Option C: Full Dynamic System
**Description:** Move all room behavior into metadata, making the algorithm a generic "interpreter."

**Pros:**
- Ultimate flexibility
- Clean separation of data and logic
- Easy to extend in future

**Cons:**
- High complexity
- Harder to debug
- Risk of over-engineering
- Significant refactoring required

**Estimated Time:** 50-70 hours

---

### Option D: Keep Status Quo
**Description:** Don't allow any custom rooms. Keep everything as-is.

**Pros:**
- Zero effort
- No risk

**Cons:**
- Doesn't solve the problem
- No flexibility for users

**Estimated Time:** 0 hours

---

## Recommendation

### Go with **Option A: Canonical + Custom Rooms** 🎯

**Why This is the Best Approach:**

1. **Simplicity** ✅
   - No refactoring of auto-configuration algorithm
   - No changes to TypeScript interfaces
   - No risk of breaking existing functionality
   - Clear mental model: "system rooms" vs "custom rooms"

2. **Fast Time to Value** ⚡
   - Can implement in 1-2 days (6-10 hours)
   - vs 5-7 days for full dynamic approach
   - Low risk means faster deployment

3. **Solves Real Use Cases** 🎯
   - Users can add: Library, Office, Mudroom, Gym, Pantry, Wine Cellar, etc.
   - These rooms work perfectly for manual selection
   - Auto-config still works reliably for core rooms (bedrooms, living, kitchen, etc.)

4. **Future-Proof** 🔮
   - Can evolve to full dynamic later if needed
   - Foundation is in place (metadata system)
   - Incremental enhancement path

5. **Predictable Behavior** 🎲
   - Auto-configuration remains deterministic and testable
   - No surprises from dynamic room types in suggestions
   - Easier to debug and reason about

**The Trade-Off:**
- Custom rooms won't appear in auto-suggestions
- Users must manually add them in room selection step
- **This is actually fine!** Specialty rooms like libraries, wine cellars, gyms are property-specific anyway

**User Flow:**
1. User enters property specs (sqft, guests)
2. Auto-config suggests canonical rooms (bedrooms, living, kitchen, dining, rec room)
3. User proceeds to room selection page
4. **Room selection shows ALL rooms** (canonical + custom)
5. User can toggle custom rooms on/off as needed
6. Custom rooms work exactly like canonical rooms (items, pricing, quantities, etc.)

**What Changes:**
- Add `isCanonical: boolean` to room template metadata
- Mark existing rooms as canonical
- Admin UI: "Create Custom Room Type" form
- Room selection UI: Show custom rooms (maybe with a badge/indicator)
- Done! ✨

---

## Implementation Plan: Canonical + Custom Rooms

### Phase 1: Data Model (1.5 hours)

**Task 1.1: Update RoomTemplate Interface**
```typescript
// client/src/types/index.ts
export interface RoomTemplate {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'common_spaces' | 'sleeping_spaces' | 'other_spaces';
  icon?: string;
  isCanonical?: boolean;  // NEW: true for system rooms, false for custom
  sizes: {
    small: RoomSize;
    medium: RoomSize;
    large: RoomSize;
  };
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Task 1.2: Mark Existing Rooms as Canonical**
```typescript
// One-time migration script or manual Firestore update
const canonicalRooms = [
  'living_room',
  'kitchen', 
  'dining_room',
  'single_bedroom',
  'double_bedroom',
  'bunk_room',
  'rec_room',
  'outdoor_space'
];

// Update each room doc: { isCanonical: true }
```

---

### Phase 2: Admin UI - Room Creation (4-5 hours)

**Task 2.1: Add "Create Custom Room" UI**

Location: `AdminPage.tsx`, Templates tab

```tsx
// Add state
const [showCreateCustomRoom, setShowCreateCustomRoom] = useState(false);
const [newCustomRoom, setNewCustomRoom] = useState({
  displayName: '',
  description: '',
  category: 'common_spaces' as 'common_spaces' | 'sleeping_spaces' | 'other_spaces',
  icon: ''
});

// Add button
<button 
  onClick={() => setShowCreateCustomRoom(true)}
  className="btn-primary"
>
  + Create Custom Room Type
</button>

// Add modal/form
{showCreateCustomRoom && (
  <div className="modal">
    <h2>Create Custom Room Type</h2>
    <form onSubmit={handleCreateCustomRoom}>
      <input 
        type="text"
        placeholder="Display Name (e.g., Library)"
        value={newCustomRoom.displayName}
        onChange={(e) => setNewCustomRoom({...newCustomRoom, displayName: e.target.value})}
        required
      />
      <input 
        type="text"
        placeholder="Description"
        value={newCustomRoom.description}
        onChange={(e) => setNewCustomRoom({...newCustomRoom, description: e.target.value})}
      />
      <select 
        value={newCustomRoom.category}
        onChange={(e) => setNewCustomRoom({...newCustomRoom, category: e.target.value as 'common_spaces' | 'sleeping_spaces' | 'other_spaces'})}
      >
        <option value="common_spaces">Common Space</option>
        <option value="sleeping_spaces">Sleeping Space</option>
        <option value="other_spaces">Other Spaces</option>
      </select>
      <input 
        type="text"
        placeholder="Icon (emoji, optional)"
        value={newCustomRoom.icon}
        onChange={(e) => setNewCustomRoom({...newCustomRoom, icon: e.target.value})}
        maxLength={2}
      />
      <button type="submit">Create Room Type</button>
      <button type="button" onClick={() => setShowCreateCustomRoom(false)}>Cancel</button>
    </form>
  </div>
)}
```

**Task 2.2: Room ID Generation**
```typescript
async function handleCreateCustomRoom(e: FormEvent) {
  e.preventDefault();
  
  // Generate room ID from display name
  const roomId = createSlug(newCustomRoom.displayName);
  
  // Check if room ID already exists
  const existingRoom = roomTemplates.find(r => r.id === roomId);
  if (existingRoom) {
    alert(`A room with ID "${roomId}" already exists. Please choose a different name.`);
    return;
  }
  
  // Create room template with default sizes
  const newRoom: RoomTemplate = {
    id: roomId,
    name: newCustomRoom.displayName,
    displayName: newCustomRoom.displayName,
    description: newCustomRoom.description,
    category: newCustomRoom.category,
    icon: newCustomRoom.icon || undefined,
    isCanonical: false,  // Custom rooms are not canonical
    sizes: {
      small: {
        displayName: `Small ${newCustomRoom.displayName}`,
        items: [],
        totals: { low: 0, mid: 0, midHigh: 0, high: 0 }
      },
      medium: {
        displayName: `Medium ${newCustomRoom.displayName}`,
        items: [],
        totals: { low: 0, mid: 0, midHigh: 0, high: 0 }
      },
      large: {
        displayName: `Large ${newCustomRoom.displayName}`,
        items: [],
        totals: { low: 0, mid: 0, midHigh: 0, high: 0 }
      }
    },
    sortOrder: roomTemplates.length + 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Save to Firestore
  await setDoc(doc(db, 'roomTemplates', roomId), {
    ...newRoom,
    createdAt: Timestamp.fromDate(newRoom.createdAt),
    updatedAt: Timestamp.fromDate(newRoom.updatedAt)
  });
  
  // Refresh room templates
  await loadRoomTemplates();
  
  // Close modal and reset form
  setShowCreateCustomRoom(false);
  setNewCustomRoom({ displayName: '', description: '', category: 'common_spaces', icon: '' });
  
  alert(`Custom room "${newCustomRoom.displayName}" created! You can now add items to it.`);
}
```

---

### Phase 3: Room Selection UI Updates (1-2 hours)

**Task 3.1: Visual Indicator for Custom Rooms (Optional)**

```tsx
// RoomConfigurationPage.tsx
{commonSpaces.map((template) => {
  const roomIndex = localRooms.findIndex(r => r.roomType === template.id);
  const room = roomIndex >= 0 ? localRooms[roomIndex] : null;
  const isSelected = room !== null;
  const isCustom = template.isCanonical === false;
  
  return (
    <RoomCard
      key={template.id}
      room={room || { /* ... */ }}
      isSelected={isSelected}
      isCustom={isCustom}  // Pass to RoomCard for badge
      // ... other props
    />
  );
})}

// RoomCard.tsx - add optional badge
{isCustom && (
  <span className="badge bg-purple-100 text-purple-800 text-xs">
    Custom
  </span>
)}
```

---

### Phase 4: Testing (1-2 hours)

**Test Scenarios:**
1. ✅ Create custom room "Library" via admin UI
2. ✅ Add items to library (small, medium, large sizes)
3. ✅ Set prices for library items
4. ✅ Go through estimator flow
5. ✅ Verify library appears in room selection (not in auto-suggestions)
6. ✅ Select library, set quantity, continue to results
7. ✅ Verify library appears in budget breakdown with correct pricing
8. ✅ Save estimate with library
9. ✅ Load estimate, verify library still there
10. ✅ Create another custom room "Wine Cellar"
11. ✅ Verify both custom rooms appear
12. ✅ Test with existing estimates (should still work)

---

## Next Steps

**Ready to implement?** I can start immediately. The work is:
- ✅ Low risk (no refactoring of core logic)
- ✅ Fast (6-10 hours total)
- ✅ High value (users can add any room type)

**Questions:**
1. Should custom rooms have a visual indicator in the UI? (e.g., "Custom" badge)
2. Should we limit who can create custom rooms? (admin only, or all users?)
3. Any specific custom rooms you want to create for testing? (Library, Office, Gym, etc.)

**Want me to start?** I can:
1. Implement the data model changes
2. Build the admin UI for room creation
3. Test with a few custom room types
4. Update documentation

Just say the word! 🚀

---

## Appendix: Example Room Metadata

### Example 1: Library (New Common Area)
```javascript
{
  id: "library",
  name: "Library",
  displayName: "Library",
  description: "Reading room with seating and bookshelves",
  category: "common_spaces",
  icon: "📚",
  
  metadata: {
    isAutoConfigurable: true,
    autoConfigCategory: "common_area",
    autoConfigKey: "library"  // Used in AutoConfigRules
  },
  
  sizes: {
    small: { /* ... items ... */ },
    medium: { /* ... items ... */ },
    large: { /* ... items ... */ }
  },
  
  sortOrder: 8
}
```

**Auto-Config Rule:**
```javascript
{
  autoConfigRules: {
    commonAreas: {
      // ... existing rules ...
      library: {
        roomTypeId: "library",
        presence: {
          present_if_sqft_gte: 4000  // Only suggest for large homes
        },
        size: {
          thresholds: [
            { min_sqft: 4000, max_sqft: 5500, size: "small" },
            { min_sqft: 5500, size: "medium" }
          ],
          default: "none"
        }
      }
    }
  }
}
```

### Example 2: Triple Bedroom (New Bedroom Type)
```javascript
{
  id: "triple_bedroom",
  name: "Triple Bedroom",
  displayName: "Triple Bedroom",
  description: "Bedroom with three single beds",
  category: "sleeping_spaces",
  icon: "🛏️",
  
  metadata: {
    isAutoConfigurable: true,
    autoConfigCategory: "bedroom",
    guestCapacity: {
      type: "fixed",
      fixedCapacity: 3  // Sleeps 3 guests
    }
  },
  
  sizes: {
    small: { /* ... items ... */ },
    medium: { /* ... items ... */ },
    large: { /* ... items ... */ }
  },
  
  sortOrder: 7
}
```

**Note:** Would need to extend BedroomMixRule to include triple_bedroom counts, OR use a more flexible array-based structure.

---

## Summary

**Recommended:** Canonical + Custom Rooms approach  
**Time:** 6-10 hours (1-2 days)  
**Risk:** LOW  
**Value:** Users can create any room type (library, office, gym, etc.)  

The full dynamic system documentation remains in this document for reference, but is **not recommended** due to complexity and limited benefit.

---

*Document Version: 2.0*  
*Updated: December 9, 2025*  
*Status: Ready for Implementation*

