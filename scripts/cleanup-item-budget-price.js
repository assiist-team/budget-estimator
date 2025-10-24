#!/usr/bin/env node

/**
 * Cleanup Script: Removes the lingering "budgetPrice" field from the "items" collection.
 *
 * This script connects to Firestore and removes the 'budgetPrice' field from all documents
 * in the 'items' collection. This is a cleanup operation to be run after the main migration.
 *
 * Instructions:
 * 1. Make sure you are authenticated with Google Cloud CLI:
 *    `gcloud auth application-default login`
 * 2. Set your Firebase Project ID in the environment variable:
 *    `export GCLOUD_PROJECT="project-estimator-1584"`
 * 3. Run this script: `node scripts/cleanup-item-budget-price.js`
 */

const admin = require('firebase-admin');

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
 * Removes the 'budgetPrice' field from all documents in the 'items' collection.
 */
async function cleanupItems() {
  console.log('🔄 Starting cleanup of "budgetPrice" field in items collection...');
  const itemsRef = db.collection('items');
  const snapshot = await itemsRef.get();

  if (snapshot.empty) {
    console.log('✅ No items found.');
    return;
  }

  const batch = db.batch();
  let cleanupCount = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.budgetPrice !== undefined) {
      // Use FieldValue.delete() to remove the field from the document
      const { FieldValue } = admin.firestore;
      batch.update(doc.ref, { budgetPrice: FieldValue.delete() });
      cleanupCount++;
    }
  });

  if (cleanupCount > 0) {
    console.log(`✅ Preparing to clean up ${cleanupCount} items...`);
    await batch.commit();
    console.log(`✅ Successfully cleaned up ${cleanupCount} items.`);
  } else {
    console.log('✅ No items required cleanup.');
  }
}

/**
 * Main function to run the cleanup process.
 */
async function runCleanup() {
  try {
    await cleanupItems();
    console.log('\\n🎉 Cleanup completed successfully!');
  } catch (error) {
    console.error('\\n💥 Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run the cleanup script
runCleanup();
