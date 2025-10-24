#!/usr/bin/env node

/**
 * Database Migration: Remove "budget" tier and use "low" tier (LIVE FIREBASE)
 *
 * This script updates Firestore data directly.
 * - Connects to Firebase using Application Default Credentials.
 * - "budget" → "low"
 * - Recalculates all totals from items collection (source of truth)
 * - Validates tier progression
 *
 * Instructions:
 * 1. Make sure you are authenticated with Google Cloud CLI:
 *    `gcloud auth application-default login`
 * 2. Set your Firebase Project ID in the environment variable:
 *    `export GCLOUD_PROJECT="your-project-id"`
 * 3. Run this script: `node scripts/migrate-database-tiers.js`
 * 4. The script will perform the migration directly on your Firestore database.
 * 5. It is highly recommended to run this on a staging/development environment first.
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  console.log('✅ Initialized Firebase Admin SDK');
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed.', error.message);
  console.error('Please ensure you have authenticated via `gcloud auth application-default login` and set the GCLOUD_PROJECT environment variable.');
  process.exit(1);
}

const db = admin.firestore();


/**
 * Backs up all collections to a local JSON file.
 * @returns {Promise<void>}
 */
async function backupDatabase() {
  console.log('🚀 Starting database backup...');
  const collectionsToBackup = ['items', 'roomTemplates', 'estimates', 'priceHistory', 'adminUsers'];
  const backupData = {};
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = './backups';

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  for (const collectionName of collectionsToBackup) {
    try {
      const data = await getCollection(collectionName);
      backupData[collectionName] = data;
      console.log(`✅ Backed up ${data.length} documents from ${collectionName}.`);
    } catch (error) {
      console.warn(`⚠️ Could not back up collection ${collectionName}:`, error.message);
    }
  }

  const backupFile = `${backupDir}/full-backup-${timestamp}.json`;
  try {
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`\n✅ Backup completed successfully!`);
    console.log(`📁 Backup file created at: ${backupFile}`);
  } catch (error) {
    console.error('❌ Failed to write backup file:', error.message);
    throw error;
  }
}


/**
 * Reads a collection from Firestore.
 * @param {string} collectionName The name of the collection to read.
 * @returns {Promise<Array<Object>>} An array of documents.
 */
async function getCollection(collectionName) {
  console.log(`📦 Reading collection from Firestore: ${collectionName}`);
  try {
    const snapshot = await db.collection(collectionName).get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`✅ Read ${data.length} documents from ${collectionName}.`);
    return data;
  } catch (error) {
    console.error(`❌ Failed to read collection ${collectionName}:`, error.message);
    throw error;
  }
}

/**
 * Migrates the items collection, renaming budgetPrice to lowPrice.
 */
async function migrateItems() {
  console.log('\n🔄 Migrating items collection from Firestore...');
  const itemsRef = db.collection('items');
  const snapshot = await itemsRef.get();

  if (snapshot.empty) {
    console.log('✅ No items found to migrate.');
    return;
  }

  const batch = db.batch();
  let migratedCount = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.budgetPrice !== undefined) {
      const updatedData = { ...data };
      updatedData.lowPrice = updatedData.budgetPrice;
      delete updatedData.budgetPrice;
      batch.update(doc.ref, updatedData);
      migratedCount++;
    }
  });

  if (migratedCount > 0) {
    console.log(`✅ Preparing to migrate ${migratedCount} items...`);
    await batch.commit();
    console.log(`✅ Successfully migrated ${migratedCount} items.`);
  } else {
    console.log('✅ No items required migration.');
  }
}


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

    totals.low += ((item.lowPrice || item.budgetPrice) || 0) * roomItem.quantity;
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
async function migrateRoomTemplates(itemsMap) {
  console.log('🔄 Migrating room templates collection from Firestore...');

  try {
    const templates = await getCollection('roomTemplates');
    console.log(`📋 Found ${templates.length} room templates`);

    let migratedCount = 0;
    let errorCount = 0;
    const batch = db.batch();

    for (const data of templates) {
      let needsUpdate = false;
      const docRef = db.collection('roomTemplates').doc(data.id);
      // Check each size
      if (data.sizes) {
        for (const [sizeKey, sizeData] of Object.entries(data.sizes)) {
          if (sizeData.totals) {
            // ALWAYS recalculate totals from items to ensure data is correct
            const calculatedTotals = await calculateTotalsFromItems(itemsMap, sizeData.items || []);

            // Validate tier progression
            if (!validateTierProgression(calculatedTotals)) {
              console.warn(`  ⚠️  ${data.id} - ${sizeKey}: Invalid tier progression detected`);
              errorCount++;
              continue;
            }

            // Replace totals and mark for update
            sizeData.totals = calculatedTotals;
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate) {
        batch.update(docRef, { sizes: data.sizes });
        migratedCount++;
      }
    }

    if (migratedCount > 0) {
      console.log(`\n✅ Preparing to migrate ${migratedCount} room templates...`);
      await batch.commit();
      console.log(`✅ Successfully migrated ${migratedCount} room templates.`);
    } else {
      console.log('✅ No room templates required migration.');
    }

    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} templates had validation errors and were not migrated.`);
    }

  } catch (error) {
    console.error('❌ Room templates migration failed:', error.message);
    throw error;
  }
}

/**
 * Migrate estimates collection
 */
async function migrateEstimates() {
  console.log('\n🔄 Migrating estimates collection from Firestore...');

  try {
    const estimates = await getCollection('estimates');
    console.log(`📋 Found ${estimates.length} estimates`);
    let migratedCount = 0;
    const batch = db.batch();

    for (const data of estimates) {
      let needsUpdate = false;
      if (data.budget && data.budget.roomBreakdown) {
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
        const docRef = db.collection('estimates').doc(data.id);
        batch.update(docRef, { budget: data.budget });
        migratedCount++;
      }
    }

    if (migratedCount > 0) {
      console.log(`✅ Preparing to migrate ${migratedCount} estimates...`);
      await batch.commit();
      console.log(`✅ Successfully migrated ${migratedCount} estimates.`);
    } else {
        console.log('✅ No estimates required migration.');
    }

  } catch (error) {
    console.error('❌ Estimates migration failed:', error.message);
    throw error;
  }
}

/**
 * Verify migration
 */
async function verifyMigration() {
  console.log('\n🔍 Verifying migrated data in Firestore...');

  try {
    let issues = 0;
    
    // Check items from firestore
    console.log('🔍 Verifying items...');
    
    // Retry logic to handle eventual consistency
    let itemsVerified = false;
    for (let i = 0; i < 5; i++) {
      const items = await getCollection('items');
      const itemsWithBudgetPrice = items.filter(doc => doc.budgetPrice !== undefined);
      
      if (itemsWithBudgetPrice.length === 0) {
        itemsVerified = true;
        break;
      }
      
      if (i < 4) {
        console.log(`⚠️ Found ${itemsWithBudgetPrice.length} items still with budgetPrice. Retrying verification in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        itemsWithBudgetPrice.forEach(doc => {
          console.error(`❌ Item ${doc.id}: Still has "budgetPrice"`);
          issues++;
        });
      }
    }

    // Check room templates from firestore
    console.log('🔍 Verifying room templates...');
    const templates = await getCollection('roomTemplates');
    templates.forEach((doc) => {
      if (doc.sizes) {
        Object.entries(doc.sizes).forEach(([sizeKey, sizeData]) => {
          if (sizeData.totals) {
            if (sizeData.totals.budget !== undefined) {
              console.error(`❌ ${doc.id} ${sizeKey}: Still has "budget" tier`);
              issues++;
            }
            if (!validateTierProgression(sizeData.totals)) {
              console.error(`❌ ${doc.id} ${sizeKey}: Invalid tier progression`);
              issues++;
            }
          }
        });
      }
    });

    // Check estimates from firestore
    console.log('🔍 Verifying estimates...');
    const estimates = await getCollection('estimates');
    estimates.forEach((doc) => {
      if (doc.budget) {
        if (doc.budget.budget !== undefined) {
          console.error(`❌ Estimate ${doc.id}: Still has "budget" tier`);
          issues++;
        }
        if (doc.budget.roomBreakdown) {
          doc.budget.roomBreakdown.forEach((room) => {
            if (room.budgetAmount !== undefined) {
              console.error(`❌ Estimate ${doc.id}: Room still has "budgetAmount"`);
              issues++;
            }
          });
        }
      }
    });

    if (issues === 0) {
      console.log('✅ Migration verification passed - no issues found in Firestore.');
    } else {
      console.log(`❌ Found ${issues} issues that need to be fixed.`);
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    console.log('🚀 Starting Firestore database migration...');

    // Phase 0: Backup
    await backupDatabase();

    // Phase 1: Load all items (source of truth)
    console.log('📦 Loading items collection from Firestore...');
    const items = await getCollection('items');
    const itemsMap = new Map();
    items.forEach((item) => {
      itemsMap.set(item.id, item);
    });
    console.log(`✅ Loaded ${itemsMap.size} items`);

    // Phase 2: Migrate room templates
    await migrateRoomTemplates(itemsMap);

    // Phase 3: Migrate estimates
    await migrateEstimates();

    // Phase 4: Migrate Items
    await migrateItems();

    // Phase 5: Verify
    await verifyMigration();

    console.log('\n🎉 Firestore migration completed successfully!');

  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  }
}


// Run migration if called directly
if (require.main === module) {
  console.log('🔄 Database Migration: Budget Tier → Low Tier (Live Firestore Mode)');
  console.log('================================================================');
  runMigration();
}

module.exports = {
  runMigration,
};
