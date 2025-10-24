#!/usr/bin/env node

/**
 * Migration Verification Script
 * Verifies that all "budget" tier references have been removed
 * and validates data integrity
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK - try multiple authentication methods
function initializeFirebase() {
  try {
    // Method 1: Standard initialization (should work with CLI auth)
    admin.initializeApp({
      projectId: 'project-estimator-1584'
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
    return admin.firestore();
  } catch (error) {
    console.error('❌ Standard initialization failed:', error.message);

    try {
      // Method 2: Try with application default credentials explicitly
      process.env.GOOGLE_APPLICATION_CREDENTIALS = '';
      admin.initializeApp({
        projectId: 'project-estimator-1584'
      });
      console.log('✅ Firebase Admin SDK initialized with explicit credentials');
      return admin.firestore();
    } catch (error2) {
      console.error('❌ All initialization methods failed:', error2.message);
      throw error2;
    }
  }
}

const db = initializeFirebase();

/**
 * Verify room templates
 */
async function verifyRoomTemplates() {
  console.log('🔍 Verifying room templates...');

  const snapshot = await db.collection('roomTemplates').get();
  let issues = 0;
  let valid = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (data.sizes) {
      for (const [sizeKey, sizeData] of Object.entries(data.sizes)) {
        if (sizeData.totals) {
          // Check for remaining "budget" references
          if (sizeData.totals.budget !== undefined) {
            console.error(`❌ ${doc.id} ${sizeKey}: Still has "budget" tier`);
            issues++;
          } else {
            // Check tier progression
            const totals = sizeData.totals;
            if (totals.low < totals.mid && totals.mid < totals.midHigh && totals.midHigh < totals.high) {
              valid++;
            } else {
              console.error(`❌ ${doc.id} ${sizeKey}: Invalid tier progression`);
              console.error(`   Low: ${totals.low}, Mid: ${totals.mid}, MidHigh: ${totals.midHigh}, High: ${totals.high}`);
              issues++;
            }
          }
        } else {
          console.error(`❌ ${doc.id} ${sizeKey}: Missing totals`);
          issues++;
        }
      }
    }
  }

  console.log(`📊 Room Templates: ${valid} valid, ${issues} issues`);
  return { valid, issues };
}

/**
 * Verify estimates
 */
async function verifyEstimates() {
  console.log('🔍 Verifying estimates...');

  const snapshot = await db.collection('estimates').get();
  let issues = 0;
  let valid = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (data.budget) {
      // Check for remaining "budget" references
      if (data.budget.budget !== undefined) {
        console.error(`❌ Estimate ${doc.id}: Still has "budget" tier`);
        issues++;
      } else if (data.budget.roomBreakdown) {
        // Check room breakdown
        for (const room of data.budget.roomBreakdown) {
          if (room.budgetAmount !== undefined) {
            console.error(`❌ Estimate ${doc.id}: Room still has "budgetAmount"`);
            issues++;
          } else if (room.lowAmount === undefined) {
            console.error(`❌ Estimate ${doc.id}: Room missing "lowAmount"`);
            issues++;
          }
        }

        // Check tier progression in totals
        if (data.budget.low && data.budget.mid) {
          if (data.budget.low.total > data.budget.mid.total) {
            console.error(`❌ Estimate ${doc.id}: Invalid tier progression in totals`);
            issues++;
          } else {
            valid++;
          }
        }
      }
    } else {
      console.error(`❌ Estimate ${doc.id}: Missing budget data`);
      issues++;
    }
  }

  console.log(`📊 Estimates: ${valid} valid, ${issues} issues`);
  return { valid, issues };
}

/**
 * Verify items collection
 */
async function verifyItems() {
  console.log('🔍 Verifying items...');

  const snapshot = await db.collection('items').get();
  let documentsWithIssues = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    let hasIssues = false;

    // Check for required price fields
    const requiredFields = ['lowPrice', 'midPrice', 'midHighPrice', 'highPrice'];
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] < 0) {
        console.error(`❌ Item ${doc.id}: Invalid ${field}`);
        documentsWithIssues++;
        hasIssues = true;
        break;
      }
    }

    if (hasIssues) {
      continue;
    }

    // Check tier progression
    if (data.lowPrice >= data.midPrice || data.midPrice >= data.midHighPrice || data.midHighPrice >= data.highPrice) {
      console.error(`❌ Item ${doc.id}: Invalid tier progression`);
      console.error(`   Low: ${data.lowPrice}, Mid: ${data.midPrice}, MidHigh: ${data.midHighPrice}, High: ${data.highPrice}`);
      documentsWithIssues++;
    }
  }

  const validDocs = snapshot.size - documentsWithIssues;
  console.log(`📊 Items: ${validDocs} valid, ${documentsWithIssues} issues`);
  return { valid: validDocs, issues: documentsWithIssues };
}

/**
 * Generate migration report
 */
async function generateReport() {
  console.log('\n📋 Migration Verification Report');
  console.log('=====================================');

  const results = {
    roomTemplates: await verifyRoomTemplates(),
    estimates: await verifyEstimates(),
    items: await verifyItems()
  };

  const totalValid = results.roomTemplates.valid + results.estimates.valid + results.items.valid;
  const totalIssues = results.roomTemplates.issues + results.estimates.issues + results.items.issues;

  console.log('\n📊 Summary:');
  console.log(`   ✅ Total Valid: ${totalValid}`);
  console.log(`   ❌ Total Issues: ${totalIssues}`);

  if (totalIssues === 0) {
    console.log('\n🎉 Migration verification PASSED!');
    console.log('   All data has been successfully migrated.');
  } else {
    console.log('\n⚠️  Migration verification found issues.');
    console.log('   Please review and fix the issues above.');
  }

  return totalIssues === 0;
}

/**
 * Main verification function
 */
async function runVerification() {
  try {
    console.log('🚀 Starting migration verification...\n');

    const success = await generateReport();

    if (success) {
      console.log('\n✅ Migration verification completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Migration verification found issues.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Verification failed:', error);
    process.exit(1);
  }
}

// Run verification if called directly
if (require.main === module) {
  runVerification();
}

module.exports = { runVerification, verifyRoomTemplates, verifyEstimates, verifyItems };
