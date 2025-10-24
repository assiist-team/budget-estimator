#!/usr/bin/env node

/**
 * Database Migration: Remove "budget" tier and use "low" tier
 *
 * This script updates Firestore data to use proper tier names:
 * - "budget" → "low"
 * - Recalculates all totals from items collection (source of truth)
 * - Validates tier progression
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin SDK
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'project-estimator-1584'
});

const db = admin.firestore();
const MAX_BATCH_WRITES = 450;

/**
 * Calculate room totals from items collection
 */
async function calculateTotalsFromItems(itemsMap, roomItems) {
  const totals = { low: 0, mid: 0, midHigh: 0, high: 0 };

  for (const roomItem of roomItems) {
    const item = itemsMap.get(roomItem.itemId);
    if (!item) {
      console.warn(`❌ Item ${roomItem.itemId} not found in items collection`);
      continue;
    }

    totals.low += (item.lowPrice || 0) * roomItem.quantity;
    totals.mid += (item.midPrice || 0) * roomItem.quantity;
    totals.midHigh += (item.midHighPrice || 0) * roomItem.quantity;
    totals.high += (item.highPrice || 0) * roomItem.quantity;
  }

  return totals;
}

/**
 * Validate tier progression
 */
function validateTierProgression(totals) {
  const tiers = ['low', 'mid', 'midHigh', 'high'];
  for (let i = 1; i < tiers.length; i++) {
    if (totals[tiers[i]] < totals[tiers[i - 1]]) {
      return false;
    }
  }
  return true;
}

/**
 * Migrate room templates collection
 */
async function migrateRoomTemplates() {
  console.log('🔄 Migrating room templates collection...');

  try {
    // Load all items first (source of truth)
    console.log('📦 Loading items collection...');
    const itemsSnapshot = await db.collection('items').get();
    const itemsMap = new Map();

    itemsSnapshot.forEach((doc) => {
      itemsMap.set(doc.id, doc.data());
    });

    console.log(`✅ Loaded ${itemsMap.size} items`);

    // Get all room templates
    const templatesSnapshot = await db.collection('roomTemplates').get();
    console.log(`📋 Found ${templatesSnapshot.size} room templates`);

    let batch = db.batch();
    let writesInBatch = 0;
    let migratedCount = 0;
    let errorCount = 0;

    for (const doc of templatesSnapshot.docs) {
      const data = doc.data();
      let needsUpdate = false;

      console.log(`\n🔄 Processing ${doc.id}...`);

      // Check each size
      if (data.sizes) {
        for (const [sizeKey, sizeData] of Object.entries(data.sizes)) {
          if (sizeData.totals) {
            // Check if "budget" tier exists
            if (sizeData.totals.budget !== undefined) {
              console.log(`  📏 ${sizeKey}: migrating budget → low`);

              // Calculate new totals from items (source of truth)
              const calculatedTotals = await calculateTotalsFromItems(itemsMap, sizeData.items || []);

              // Validate tier progression
              if (!validateTierProgression(calculatedTotals)) {
                console.warn(`  ⚠️  ${sizeKey}: Invalid tier progression detected`);
                console.warn(`     Low: ${calculatedTotals.low}, Mid: ${calculatedTotals.mid}`);
                errorCount++;
                continue;
              }

              // Replace totals
              sizeData.totals = calculatedTotals;
              needsUpdate = true;

              console.log(`  ✅ ${sizeKey}: ${calculatedTotals.low} → ${calculatedTotals.mid} → ${calculatedTotals.midHigh} → ${calculatedTotals.high}`);
            }
          }
        }
      }

      if (needsUpdate) {
        batch.update(doc.ref, data);
        migratedCount++;
        writesInBatch++;

        if (writesInBatch >= MAX_BATCH_WRITES) {
          await batch.commit();
          batch = db.batch();
          writesInBatch = 0;
        }
      }
    }

    // Commit changes
    if (writesInBatch > 0) {
      await batch.commit();
    }

    if (migratedCount > 0) {
      console.log(`\n✅ Successfully migrated ${migratedCount} room templates`);
    }

    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} templates had validation errors`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Migrate estimates collection
 */
async function migrateEstimates() {
  console.log('\n🔄 Migrating estimates collection...');

  try {
    const estimatesSnapshot = await db.collection('estimates').get();
    console.log(`📋 Found ${estimatesSnapshot.size} estimates`);

    let batch = db.batch();
    let writesInBatch = 0;
    let migratedCount = 0;

    for (const doc of estimatesSnapshot.docs) {
      const data = doc.data();
      let needsUpdate = false;

      if (data.budget && data.budget.roomBreakdown) {
        console.log(`🔄 Processing estimate ${doc.id}...`);

        // Update room breakdown
        data.budget.roomBreakdown.forEach((room) => {
          if (room.budgetAmount !== undefined) {
            room.lowAmount = room.budgetAmount;
            delete room.budgetAmount;
            needsUpdate = true;
          }
        });

        // Update tier totals
        if (data.budget.budget) {
          data.budget.low = data.budget.budget;
          delete data.budget.budget;
          needsUpdate = true;
        }

        // Update range calculation
        const lowTotal = data.budget.low?.total;
        if (typeof lowTotal === 'number') {
          data.budget.rangeLow = lowTotal;

          const midTotal = data.budget.mid?.total;
          if (typeof midTotal === 'number') {
            data.budget.rangeHigh = midTotal;
          }

          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        batch.update(doc.ref, data);
        migratedCount++;
        writesInBatch++;

        if (writesInBatch >= MAX_BATCH_WRITES) {
          await batch.commit();
          batch = db.batch();
          writesInBatch = 0;
        }
      }
    }

    if (writesInBatch > 0) {
      await batch.commit();
    }

    if (migratedCount > 0) {
      console.log(`✅ Successfully migrated ${migratedCount} estimates`);
    }

  } catch (error) {
    console.error('❌ Estimates migration failed:', error);
    throw error;
  }
}

/**
 * Backup current data
 */
async function backupData() {
  console.log('💾 Creating backup...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  try {
    // Backup room templates
    const templatesSnapshot = await db.collection('roomTemplates').get();
    const templatesData = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Backup estimates
    const estimatesSnapshot = await db.collection('estimates').get();
    const estimatesData = estimatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Backup items
    const itemsSnapshot = await db.collection('items').get();
    const itemsData = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Save backups
    const backupDir = './backups';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    fs.writeFileSync(
      `${backupDir}/room-templates-backup-${timestamp}.json`,
      JSON.stringify(templatesData, null, 2)
    );

    fs.writeFileSync(
      `${backupDir}/estimates-backup-${timestamp}.json`,
      JSON.stringify(estimatesData, null, 2)
    );

    fs.writeFileSync(
      `${backupDir}/items-backup-${timestamp}.json`,
      JSON.stringify(itemsData, null, 2)
    );

    console.log(`✅ Backup created: ${backupDir}/`);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

/**
 * Verify migration
 */
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');

  try {
    let issues = 0;

    // Check room templates
    const templatesSnapshot = await db.collection('roomTemplates').get();
    templatesSnapshot.forEach((doc) => {
      const data = doc.data();

      if (data.sizes) {
        Object.entries(data.sizes).forEach(([sizeKey, sizeData]) => {
          if (sizeData.totals) {
            // Check for remaining "budget" references
            if (sizeData.totals.budget !== undefined) {
              console.error(`❌ ${doc.id} ${sizeKey}: Still has "budget" tier`);
              issues++;
            }

            // Check tier progression
            const totals = sizeData.totals;
            if (totals.low >= totals.mid || totals.mid >= totals.midHigh || totals.midHigh >= totals.high) {
              console.error(`❌ ${doc.id} ${sizeKey}: Invalid tier progression`);
              issues++;
            }
          }
        });
      }
    });

    // Check estimates
    const estimatesSnapshot = await db.collection('estimates').get();
    estimatesSnapshot.forEach((doc) => {
      const data = doc.data();

      if (data.budget) {
        // Check for remaining "budget" references
        if (data.budget.budget !== undefined) {
          console.error(`❌ Estimate ${doc.id}: Still has "budget" tier`);
          issues++;
        }

        // Check room breakdown
        if (data.budget.roomBreakdown) {
          data.budget.roomBreakdown.forEach((room) => {
            if (room.budgetAmount !== undefined) {
              console.error(`❌ Estimate ${doc.id}: Room still has "budgetAmount"`);
              issues++;
            }
          });
        }
      }
    });

    if (issues === 0) {
      console.log('✅ Migration verification passed - no issues found');
    } else {
      console.log(`❌ Found ${issues} issues that need to be fixed`);
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    console.log('🚀 Starting database migration...');

    // Phase 1: Backup
    await backupData();

    // Phase 2: Migrate room templates
    await migrateRoomTemplates();

    // Phase 3: Migrate estimates
    await migrateEstimates();

    // Phase 4: Verify
    await verifyMigration();

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    console.log('\n🔄 To rollback, restore from backup files in ./backups/');
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration, backupData, migrateRoomTemplates, migrateEstimates, verifyMigration };
