# Database Migration: Remove "Budget" Tier and Use "Low" Tier

## Overview
The current database contains room template data with incorrect tier naming. The system uses "budget" as a tier name instead of "low". This migration will update all Firestore data to use proper tier names: `low`, `mid`, `midHigh`, `high`.

## Current State Analysis
**Source of Truth: Firestore Database**

Current database structure in `/roomTemplates` collection:
```javascript
{
  // Document ID: room_type (e.g., "living_room")
  sizes: {
    small: {
      totals: {
        budget: 828500,  // ❌ WRONG - should be "low"
        mid: 1689000,
        midHigh: 2964000,
        high: 5884000
      }
    }
  }
}
```

**Items collection is already correct:**
```javascript
{
  lowPrice: 50000,
  midPrice: 150000,
  midHighPrice: 300000,
  highPrice: 800000
}
```

## Migration Strategy

### Phase 1: Backup Current Data
**Script:** `scripts/backup-room-templates.js`

1. Export all room templates to JSON backup
2. Export all items to JSON backup
3. Create timestamped backup in `/backups/` directory
4. Verify backup integrity

### Phase 2: Update Room Templates
**Script:** `scripts/migrate-room-templates.js`

For each document in `/roomTemplates` collection:

1. **Update totals structure:**
   ```javascript
   // BEFORE
   totals: {
     budget: 828500,
     mid: 1689000,
     midHigh: 2964000,
     high: 5884000
   }

   // AFTER
   totals: {
     low: 828500,
     mid: 1689000,
     midHigh: 2964000,
     high: 5884000
   }
   ```

2. **Validate tier progression:**
   - `low < mid < midHigh < high` for all room sizes
   - If any tier is missing, calculate from items collection

3. **Update calculation method:**
   - Use items collection as source of truth for pricing
   - Recalculate all totals from `lowPrice`, `midPrice`, etc.
   - Remove any pre-calculated totals that don't match

### Phase 3: Update Estimates Collection
**Script:** `scripts/migrate-estimates.js`

For each document in `/estimates` collection:

1. **Update room breakdown:**
   ```javascript
   // BEFORE
   roomBreakdown: [{
     budgetAmount: 1661500,
     midAmount: 3167000,
     // ...
   }]

   // AFTER
   roomBreakdown: [{
     lowAmount: 1661500,
     midAmount: 3167000,
     // ...
   }]
   ```

2. **Update tier totals:**
   ```javascript
   // BEFORE
   budget: {
     subtotal: 8500000,
     total: 9350000
   }

   // AFTER
   low: {
     subtotal: 8500000,
     total: 9350000
   }
   ```

3. **Recalculate ranges:**
   ```javascript
   // BEFORE
   rangeLow: 9350000,  // budget total
   rangeHigh: 71500000 // high total

   // AFTER
   rangeLow: 9350000,  // low total
   rangeHigh: 19800000 // mid total
   ```

### Phase 4: Code Updates
**Files to update:**

1. **Remove all mappings:**
   - Delete tier mapping logic from `useRoomTemplates.ts`
   - Delete tier mapping logic from `calculations.ts`
   - Update all type definitions to use "low" consistently

2. **Update validation:**
   - Remove "budget" references from validation functions
   - Update error messages and comments

3. **Update UI text:**
   - Change any remaining "budget" references to "low"
   - Update help text and tooltips

## Migration Scripts

**✅ All scripts are complete and ready to execute. They use Firestore as the source of truth, not local files.**

## Prerequisites

### Firebase CLI Authentication
**Required:** Firebase CLI authentication for your account

**Setup:**
```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase (this will open a browser)
firebase login

# Set the project (if not already set)
firebase use project-estimator-1584
```

**Note:** Make sure you're logged in with an account that has Firestore admin permissions for the project.

### 1. Backup Current Data
```bash
node scripts/backup-database.js
```
**Creates:** `./backups/full-backup-[timestamp].json` and individual collection backups

### 2. Run Migration
```bash
node scripts/migrate-database-tiers.js
```
**Updates:**
- Room templates: `budget` → `low` tier
- Estimates: `budgetAmount` → `lowAmount`, recalculates from items
- Validates tier progression: `low < mid < midHigh < high`

### 3. Verify Migration
```bash
node scripts/verify-migration.js
```
**Checks:**
- No remaining "budget" tier references
- Valid tier progression in all data
- Data integrity and consistency

## Execution Steps

### Pre-Migration
1. **Test on development database first:**
   ```bash
   # Login to Firebase CLI (if not already logged in)
   firebase login

   # Set the project
   firebase use project-estimator-1584

   # Run the scripts
   node scripts/backup-database.js
   node scripts/migrate-database-tiers.js
   node scripts/verify-migration.js
   ```

2. **Verify no critical issues:**
   - Check migration verification passes
   - Test application functionality
   - Validate calculations work correctly

### Production Migration
1. **Schedule during low-traffic period**
2. **Login to Firebase CLI and set project:**
   ```bash
   firebase login
   firebase use project-estimator-1584
   ```

3. **Backup production data:**
   ```bash
   node scripts/backup-database.js
   ```

4. **Run migration:**
   ```bash
   node scripts/migrate-database-tiers.js
   ```

5. **Verify migration:**
   ```bash
   node scripts/verify-migration.js
   ```

6. **Deploy code changes** (remove mappings)
7. **Monitor application** for 24 hours

### Rollback (if needed)
```bash
# Make sure you're logged in and using the correct project
firebase login
firebase use project-estimator-1584

# Restore from backup
firebase firestore:import ./backups/room-templates-backup-[timestamp].json --collection-ids=roomTemplates
firebase firestore:import ./backups/estimates-backup-[timestamp].json --collection-ids=estimates
```

## Rollback Plan

If migration fails:

1. **Stop all user traffic**
2. **Restore from backup:**
   ```bash
   firebase firestore:import gs://backups/room-templates-backup.json
   ```
3. **Verify restoration**
4. **Resume traffic**

## Testing Strategy

### Pre-Migration Testing
1. Test current calculations with existing data
2. Document current behavior
3. Verify backup scripts work

### Post-Migration Testing
1. Test room configuration page calculations
2. Test estimate generation
3. Test admin interface
4. Verify all tier calculations are correct

### Edge Cases to Test
- Rooms with missing tier data
- Rooms with inconsistent tier progression
- Estimates with partial data
- Admin tools and reporting

## Timeline

**Estimated Migration Time:** 2-4 hours

1. **Development:** 1 hour (create scripts)
2. **Testing:** 1 hour (verify scripts work)
3. **Production Migration:** 30 minutes
4. **Verification:** 30 minutes

## Risk Assessment

**Low Risk:** Data transformation is straightforward field renaming
**Medium Risk:** Tier calculation validation
**High Risk:** None identified

## Success Criteria

✅ All room templates use "low" instead of "budget"
✅ All estimates use "low" instead of "budget"
✅ Tier progression is correct: low < mid < midHigh < high
✅ All calculations work correctly
✅ No data loss or corruption

## Monitoring

Post-migration monitoring for:
- Application errors
- Calculation discrepancies
- User reports of incorrect pricing
- Performance issues

## Implementation Status

**✅ Migration scripts and code changes are complete and ready for execution.**

### Files Modified (Current Session)

#### Database Migration Scripts
- **`scripts/backup-database.js`** - **CREATED** - Complete backup of all collections
- **`scripts/migrate-database-tiers.js`** - **CREATED** - Migrates room templates and estimates
- **`scripts/verify-migration.js`** - **CREATED** - Validates migration success
- **`scripts/README.md`** - **CREATED** - Documentation for migration scripts

#### Code Changes (Removed Mappings)
- **`client/src/utils/calculations.ts`** - **MODIFIED** - Removed tier mapping logic, now expects proper "low" tier names
- **`client/src/hooks/useRoomTemplates.ts`** - **MODIFIED** - Removed tier mapping logic, now expects proper "low" tier names

#### Data Files Updated
- **`scripts/output/roomTemplates.json`** - **MODIFIED** - Updated local room template data to use "low" instead of "budget"
- **`planning_docs/06_DATA_MODEL.md`** - **MODIFIED** - Updated documentation to reflect "low" tier naming

#### Documentation
- **`planning_docs/11_DATABASE_MIGRATION.md`** - **CREATED** - Complete migration plan and execution guide

### Changes Made to Each File

#### `client/src/utils/calculations.ts`
- **Removed:** Tier mapping logic that converted "budget" → "low"
- **Changed:** Now expects database to have proper "low", "mid", "midHigh", "high" tier names
- **Added:** Proper imports for `SelectedRoom` and `RoomItem` types

#### `client/src/hooks/useRoomTemplates.ts`
- **Removed:** Tier mapping logic in `calculateRoomTotals` function
- **Changed:** Now expects database to have proper "low", "mid", "midHigh", "high" tier names
- **Fixed:** Type annotation for `sizes` object

#### `scripts/output/roomTemplates.json`
- **Replaced:** All instances of `"budget":` with `"low":`
- **Fixed:** Inconsistent tier progression in rec_room data where mid was lower than budget
- **Updated:** All room sizes to have proper tier progression: low < mid < midHigh < high

#### `planning_docs/06_DATA_MODEL.md`
- **Updated:** All documentation examples to use "low" instead of "budget"
- **Fixed:** Validation functions to reference "lowPrice" instead of "budgetPrice"
- **Updated:** Helper function examples and calculation logic
- **Changed:** Display strategy to show proper low-mid range instead of budget-high

### Current State
- **Code:** Ready to work with proper tier names (no mappings needed)
- **Scripts:** Complete migration toolkit ready for execution
- **Documentation:** Updated to reflect correct tier naming
- **Database:** Still needs migration (scripts ready to execute)

## Next Steps

1. **Execute migration scripts on development database**
2. **Test application functionality**
3. **Schedule production migration during low-traffic period**
4. **Execute migration**
5. **Verify and monitor**
