#!/usr/bin/env node

/**
 * Migration script to update room template data from "budget" tier to "low" tier
 * This removes all references to "budget" tier and uses "low" instead
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

async function migrateRoomTemplates() {
  console.log('Starting room template migration...');

  try {
    // Get all room templates
    const snapshot = await db.collection('roomTemplates').get();

    if (snapshot.empty) {
      console.log('No room templates found');
      return;
    }

    console.log(`Found ${snapshot.size} room templates to migrate`);

    const batch = db.batch();
    let migratedCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      let needsUpdate = false;

      // Update each size in the room template
      if (data.sizes) {
        Object.keys(data.sizes).forEach((sizeKey) => {
          const sizeData = data.sizes[sizeKey];

          if (sizeData.totals) {
            // Rename "budget" tier to "low"
            if (sizeData.totals.budget !== undefined) {
              sizeData.totals.low = sizeData.totals.budget;
              delete sizeData.totals.budget;
              needsUpdate = true;
              console.log(`  Migrating ${doc.id} ${sizeKey}: budget -> low (${sizeData.totals.low})`);
            }
          }
        });
      }

      if (needsUpdate) {
        batch.update(doc.ref, data);
        migratedCount++;
      }
    });

    if (migratedCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully migrated ${migratedCount} room templates`);
      console.log('✅ Removed all "budget" tier references');
    } else {
      console.log('No migration needed - all templates already use "low" tier');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  console.log('Migration complete!');
  process.exit(0);
}

// Run the migration
migrateRoomTemplates();
