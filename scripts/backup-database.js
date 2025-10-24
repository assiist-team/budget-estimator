#!/usr/bin/env node

/**
 * Database Backup Script
 * Creates complete backups of all collections before migration
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

/**
 * Export collection to JSON
 */
async function exportCollection(collectionName) {
  console.log(`📦 Exporting ${collectionName}...`);

  const snapshot = await db.collection(collectionName).get();
  const data = [];

  snapshot.forEach((doc) => {
    data.push({
      id: doc.id,
      ...doc.data()
    });
  });

  console.log(`✅ Exported ${data.length} documents from ${collectionName}`);
  return data;
}

/**
 * Create backup
 */
async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = './backups';

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  try {
    console.log('🚀 Starting database backup...');

    // Export all collections
    const collections = [
      'items',
      'roomTemplates',
      'estimates',
      'priceHistory',
      'adminUsers'
    ];

    const backup = {};

    for (const collectionName of collections) {
      try {
        backup[collectionName] = await exportCollection(collectionName);
      } catch (error) {
        console.warn(`⚠️  Could not export ${collectionName}: ${error.message}`);
        backup[collectionName] = [];
      }
    }

    // Save backup files
    const backupFile = `${backupDir}/full-backup-${timestamp}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

    // Save individual collection files
    Object.entries(backup).forEach(([collectionName, data]) => {
      const collectionFile = `${backupDir}/${collectionName}-backup-${timestamp}.json`;
      fs.writeFileSync(collectionFile, JSON.stringify(data, null, 2));
    });

    console.log(`\n✅ Backup completed successfully!`);
    console.log(`📁 Backup location: ${backupDir}/`);
    console.log(`📄 Files created:`);
    console.log(`   - full-backup-${timestamp}.json`);
    Object.keys(backup).forEach(collectionName => {
      console.log(`   - ${collectionName}-backup-${timestamp}.json`);
    });

    // Summary
    const totalDocuments = Object.values(backup).reduce((sum, data) => sum + data.length, 0);
    console.log(`\n📊 Backup Summary:`);
    Object.entries(backup).forEach(([collectionName, data]) => {
      console.log(`   ${collectionName}: ${data.length} documents`);
    });
    console.log(`   Total: ${totalDocuments} documents`);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

// Run backup if called directly
if (require.main === module) {
  createBackup();
}

module.exports = { createBackup, exportCollection };
