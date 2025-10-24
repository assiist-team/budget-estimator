# Database Migration Scripts

This directory contains scripts to migrate the database from using "budget" tier to "low" tier.

## Scripts

### 1. `backup-database.js`
Creates complete backups of all collections before migration.

**Usage:**
```bash
node scripts/backup-database.js
```

**Output:**
- `./backups/full-backup-[timestamp].json` (all collections)
- `./backups/[collection]-backup-[timestamp].json` (individual collections)

### 2. `migrate-database-tiers.js`
Migrates database data to use proper tier names:
- Room templates: `budget` → `low`
- Estimates: `budgetAmount` → `lowAmount`
- Recalculates all totals from items collection (source of truth)

**Usage:**
```bash
node scripts/migrate-database-tiers.js
```

**Authentication:**
- Requires Firebase CLI authentication
- Must run: `firebase login` and `firebase use project-estimator-1584`
- Uses Firebase Admin SDK with Application Default Credentials
- Script fails with clear error messages if authentication fails

### 3. `verify-migration.js`
Verifies that migration completed successfully:
- No remaining "budget" tier references
- Valid tier progression (low < mid < midHigh < high)
- Data integrity checks

**Usage:**
```bash
node scripts/verify-migration.js
```

## Prerequisites

1. **Firebase CLI Authentication:** `firebase login`
2. **Project Setup:** `firebase use project-estimator-1584`
3. **Node.js** with Firebase Admin SDK
4. **Firestore write permissions** for your Firebase account

## Execution Order

```bash
# Setup Firebase CLI authentication
firebase login
firebase use project-estimator-1584

# 1. Backup (always run first)
node scripts/backup-database.js

# 2. Migrate
node scripts/migrate-database-tiers.js

# 3. Verify
node scripts/verify-migration.js
```

## Safety

- All scripts create backups before making changes
- Migration uses Firestore as source of truth
- Verification ensures data integrity
- Rollback possible via Firebase import tools

## Files Modified

- `/roomTemplates` collection: tier field names
- `/estimates` collection: room breakdown and totals
- All calculations use `low`, `mid`, `midHigh`, `high` tiers
