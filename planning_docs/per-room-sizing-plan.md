# Per-Room Sizing Enablement Plan

## Context
- `SelectedRoom` / `RoomWithItems` enforce a single `roomSize` plus a bulk `quantity`, implicitly forcing all identical room types to share dimensions.
- Every UX surface (Room Configuration, Estimate Edit, Results, View Estimate, PDF) shows `roomSize × quantity`, so individual instances cannot diverge.
- `calculateEstimate`, export helpers, and PDF serialization multiply line totals by `room.quantity`, so the financial model assumes uniform rooms.

## Objectives
1. Let users size each instance of a room independently.
2. Keep saved reports accurate by migrating stored data.
3. Preserve downstream outputs (results pages, PDFs, budgets) without regression.

## Data Model & API Surface
- ✅ **COMPLETED**: Introduce a `RoomInstance` concept: `{ instanceId, roomType, roomSize, items, displayName, position }`; treat `quantity` as an implicit `1`.
- ✅ **COMPLETED**: Convert `Estimate.rooms` to `RoomInstance[] | RoomWithItems[]`. Retain `quantity` during transition but derive it from grouped instances and mark deprecated.
- ✅ **COMPLETED**: Update `SelectedRoom`, `RoomWithItems`, and `Estimate` types so size belongs to each instance (backward compatible).
- ✅ **COMPLETED**: Add helper utilities:
  - ✅ `expandRoomQuantities(room: RoomWithItems): RoomInstance[]` - Expands rooms with quantity > 1 into multiple instances
  - ✅ `summarizeRoomInstances(instances: RoomInstance[]): RoomWithItems[]` - Groups instances back into legacy format
  - ✅ `normalizeToRoomInstances()` - Converts mixed legacy/instance arrays to instances
  - ✅ `isLegacyRoom()` - Detects legacy room format
  - ✅ `hasLegacyRooms()` - Checks if estimate contains legacy rooms
  - ✅ `convertEstimateRoomsToInstances()` - Converts estimate rooms to instances
- ⏳ **PENDING**: Ensure APIs, hooks (`useEstimateEditing`, `useRoomTemplates`), and contexts accept instances (will be done in Phase 2).

## Persistence & Migration (Saved Reports)
- On load, detect legacy rooms (`quantity > 1` or missing `instanceId`):
  - Expand into `quantity` instances.
  - Generate deterministic IDs and optional labels (“Bedroom 1”, “Bedroom 2”).
  - Store `quantity: 1` per instance.
- When saving, always persist the new shape; legacy input should never be re-saved.
- Create a Supabase migration script (via Supabase MCP tool per user rules):
  - Fetch batched estimates.
  - Convert `rooms` arrays using the expansion helper.
  - Update records atomically.
  - Provide logging/metrics for verification.
- Run migration per environment with feature flag/maintenance window to avoid partial updates.

## Room Creation & Editing UX
- **RoomConfigurationPage**:
  - Replace “quantity” controls with “Add Room” / “Duplicate Room” actions.
  - Auto-configuration (`suggestRoomConfiguration`) should push N separate entries instead of `quantity: N`.
  - Allow immediate size selection on each card.
- **EstimateEditPage**:
  - Render each instance as its own accordion; remove +/- quantity buttons.
  - Add “Duplicate this room” to maintain fast workflows.
  - Size dropdown edits affect only that instance.
  - Optional grouping headers per `roomType` for readability, but editing targets instances.

## Client-Facing Outputs
- **ResultsPage** / **ViewEstimatePage**:
  - Accept flattened instances; regroup by `roomType` just for display.
  - Show per-instance rows/chips (e.g., “Primary Bedroom — Large”, “Primary Bedroom — Medium”).
  - Ensure expansion toggles, budget lines, and totals use the instance list, not aggregated `quantity`.
- **PDF & Emails**:
  - Update `formatEstimateForPDF` to list every instance with its own size.
  - If needed, re-group when rendering tables but keep underlying data per instance to preserve differences.

## Computation & Utilities
- Update `calculateEstimate`, `calculateTotalItems`, `autoConfiguration`, and any helpers so they iterate over instances (treat `quantity` as legacy fallback).
- When aggregating for summaries (`budget.roomBreakdown`), sum over heterogeneous instances and include metadata (`count`, `sizes[]`) so UI can show accurate context.
- Ensure `RoomEditor` math multiplies by the instance count (always 1), keeping size-specific overrides isolated.

## Backward Compatibility & Rollout
- Consider feature flagging UI changes to test with internal users.
- Keep migration helpers pure and covered by unit tests (expand ↔ summarize round-trips should conserve totals for template and custom item combos).
- Maintain ability to render pre-migration estimates by aggregating on-the-fly until all data is converted.

## QA & Validation
- Manual scenarios:
  - Create multi-bedroom estimates, assign different sizes, ensure totals match expectations, save, reload, and verify View mode + PDF mirror UI.
  - Duplicate rooms, edit only one instance, confirm others stay untouched.
- Automated tests:
  - Unit tests for expansion helpers, calculations on instance arrays, PDF formatter.
  - Integration/UI tests (Cypress/RTL) covering editing flows, results display, and legacy estimate loading.
- Data audit post-migration: sample records to confirm `rooms[].quantity === 1`, `instanceId` exists, and historical totals remain unchanged.

## Next Steps
1. ✅ **COMPLETED**: Land type/model changes and helper utilities with exhaustive tests.
   - ✅ Added `RoomInstance` type definition
   - ✅ Updated `SelectedRoom`, `RoomWithItems`, and `Estimate` types for backward compatibility
   - ✅ Created `roomInstances.ts` utility module with:
     - `expandRoomQuantities()` - Expands rooms with quantity > 1 into multiple instances
     - `summarizeRoomInstances()` - Groups instances back into legacy format
     - `normalizeToRoomInstances()` - Converts mixed legacy/instance arrays to instances
     - `isLegacyRoom()` - Detects legacy room format
     - `hasLegacyRooms()` - Checks if estimate contains legacy rooms
     - `convertEstimateRoomsToInstances()` - Converts estimate rooms to instances
   - ✅ Created comprehensive unit tests (19 tests, all passing)
2. Update UI pages (Room Configuration, Estimate Edit, Results, View, PDF).
3. Implement migration script, run against staging via Supabase MCP tool, then production.
4. Perform QA plan and announce feature availability once validated.

