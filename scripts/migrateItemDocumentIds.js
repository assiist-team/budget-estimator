// Migration script to change item document IDs to match key field values
// This script will:
// 1. Identify items where document ID != key field value
// 2. Create new item documents with key field value as document ID
// 3. Update all room template references to use new item document IDs
// 4. Remove key and id fields from item documents
// 5. Delete old item documents

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', 'client', '.env') });

// Firebase configuration from .env (or use defaults if not available)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'project-estimator-1584',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef123456'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Track migration statistics
const migrationStats = {
  itemsToMigrate: 0,
  itemsMigrated: 0,
  roomTemplatesUpdated: 0,
  oldDocumentsDeleted: 0,
  errors: []
};

async function migrateItemDocumentIds() {
  console.log('🚀 Starting item document ID migration...\n');

  try {
    // Step 1: Get all items and identify which need migration
    console.log('📦 Step 1: Analyzing items collection...');
    const itemsCollection = collection(db, 'items');
    const itemsSnapshot = await getDocs(itemsCollection);

    if (itemsSnapshot.empty) {
      console.log('📭 No items found in Firestore');
      return;
    }

    console.log(`📋 Found ${itemsSnapshot.size} items in Firestore`);

    const itemsToMigrate = [];
    const itemsAlreadyCorrect = [];

    itemsSnapshot.forEach(doc => {
      const data = doc.data();
      const currentDocId = doc.id;
      const keyFieldValue = data.key;

      // Sanitize key field value for use as document ID (remove/replace invalid characters)
      // If key field doesn't exist, use the document ID (already correct)
      const sanitizedKey = keyFieldValue ? keyFieldValue.replace(/[\/\\:*?"<>|]/g, '_') : currentDocId;

      if (!keyFieldValue || currentDocId === keyFieldValue) {
        // No key field (correct) OR document ID matches key field (also correct)
        itemsAlreadyCorrect.push({ docId: currentDocId, name: data.name });
      } else {
        // Document ID doesn't match key field - needs migration
        itemsToMigrate.push({
          oldDocId: currentDocId,
          newDocId: sanitizedKey,
          originalKey: keyFieldValue,
          data: data,
          name: data.name
        });
      }
    });

    console.log(`✅ Already correct: ${itemsAlreadyCorrect.length}`);
    console.log(`🔄 Need migration: ${itemsToMigrate.length}`);

    if (itemsToMigrate.length === 0) {
      console.log('✨ All items already have correct document IDs!');
      return;
    }

    // Show items that need migration
    console.log('\n📝 Items to migrate:');
    itemsToMigrate.forEach(item => {
      console.log(`  "${item.name}"`);
      console.log(`    Old document ID: ${item.oldDocId}`);
      console.log(`    Original key field: ${item.originalKey}`);
      console.log(`    New document ID: ${item.newDocId}`);
      console.log('');
    });

    // Step 2: Get all room templates to identify references that need updating
    console.log('🏠 Step 2: Analyzing room templates...');
    const templatesCollection = collection(db, 'roomTemplates');
    const templatesSnapshot = await getDocs(templatesCollection);

    const templateUpdates = [];

    templatesSnapshot.forEach(templateDoc => {
      const templateData = templateDoc.data();
      const templateId = templateDoc.id;
      let needsUpdate = false;

      // Check each room size for item references
      const updatedSizes = {};

      Object.keys(templateData.sizes).forEach(sizeKey => {
        const roomSize = templateData.sizes[sizeKey];
        const updatedItems = [];

        roomSize.items.forEach(roomItem => {
          const oldItemId = roomItem.itemId;
          const itemToMigrate = itemsToMigrate.find(item => item.oldDocId === oldItemId);

          if (itemToMigrate) {
            // This room template references an item that needs migration
            needsUpdate = true;
            updatedItems.push({
              ...roomItem,
              itemId: itemToMigrate.newDocId // Update to new document ID
            });
            console.log(`  Template "${templateData.name}" (${sizeKey}): "${oldItemId}" -> "${itemToMigrate.newDocId}"`);
          } else {
            // Keep the original reference
            updatedItems.push(roomItem);
          }
        });

        updatedSizes[sizeKey] = {
          ...roomSize,
          items: updatedItems
        };
      });

      if (needsUpdate) {
        templateUpdates.push({
          templateId,
          oldData: templateData,
          newData: {
            ...templateData,
            sizes: updatedSizes
          }
        });
      }
    });

    console.log(`🏠 Found ${templatesSnapshot.size} room templates`);
    console.log(`🔄 Need updates: ${templateUpdates.length}`);

    // Step 3: Perform the migration
    console.log('\n🔄 Step 3: Performing migration...');

    // Use a batch write for better performance and atomicity
    const batch = writeBatch(db);

    // 3a: Create new item documents with correct document IDs
    console.log('📦 Creating new item documents...');
    itemsToMigrate.forEach(({ oldDocId, newDocId, originalKey, data, name }) => {
      // Create new document data without key and id fields, filtering out undefined values
      const newItemData = {};

      if (data.name !== undefined) newItemData.name = data.name;
      if (data.category !== undefined) newItemData.category = data.category;
      if (data.subcategory !== undefined) newItemData.subcategory = data.subcategory;
      if (data.budgetPrice !== undefined) newItemData.budgetPrice = data.budgetPrice;
      if (data.midPrice !== undefined) newItemData.midPrice = data.midPrice;
      if (data.midHighPrice !== undefined) newItemData.midHighPrice = data.midHighPrice;
      if (data.highPrice !== undefined) newItemData.highPrice = data.highPrice;
      if (data.unit !== undefined) newItemData.unit = data.unit;
      if (data.notes !== undefined) newItemData.notes = data.notes;
      if (data.createdAt !== undefined) newItemData.createdAt = data.createdAt;
      if (data.updatedAt !== undefined) newItemData.updatedAt = data.updatedAt;

      if (oldDocId === newDocId) {
        // Same document ID - just update in place
        const docRef = doc(db, 'items', newDocId);
        batch.update(docRef, newItemData);
        console.log(`  ✓ Updated: ${newDocId} (in place, removed key/id fields)`);
      } else {
        // Different document ID - create new and will delete old
        const newDocRef = doc(db, 'items', newDocId);
        batch.set(newDocRef, newItemData);
        console.log(`  ✓ Created: ${newDocId} (from ${oldDocId}, original key: ${originalKey})`);
      }
    });

    // 3b: Update room templates
    console.log('🏠 Updating room templates...');
    templateUpdates.forEach(({ templateId, newData }) => {
      const templateRef = doc(db, 'roomTemplates', templateId);
      batch.update(templateRef, newData);
      console.log(`  ✓ Updated template: ${templateId}`);
    });

    // 3c: Delete old item documents (only if document ID changed)
    console.log('🗑️  Deleting old item documents...');
    itemsToMigrate.forEach(({ oldDocId, newDocId }) => {
      if (oldDocId !== newDocId) {
        const oldDocRef = doc(db, 'items', oldDocId);
        batch.delete(oldDocRef);
        console.log(`  ✓ Deleted: ${oldDocId}`);
      } else {
        console.log(`  ✓ No deletion needed: ${oldDocId} (updated in place)`);
      }
    });

    // Execute the batch
    await batch.commit();

    // Update statistics
    migrationStats.itemsToMigrate = itemsToMigrate.length;
    migrationStats.itemsMigrated = itemsToMigrate.length;
    migrationStats.roomTemplatesUpdated = templateUpdates.length;
    migrationStats.oldDocumentsDeleted = itemsToMigrate.length;

    // Step 4: Verify the migration
    console.log('\n✅ Step 4: Verifying migration...');

    // Check that new documents exist
    const verificationPromises = itemsToMigrate.map(async ({ newDocId, name }) => {
      try {
        const newDocRef = doc(db, 'items', newDocId);
        const newDocSnap = await getDocs(collection(db, 'items')).then(snapshot =>
          snapshot.docs.find(doc => doc.id === newDocId)
        );

        if (newDocSnap) {
          const newData = newDocSnap.data();
          // Verify key and id fields are removed
          if (newData.key || newData.id) {
            throw new Error(`Document ${newDocId} still has key or id fields`);
          }
          console.log(`  ✓ Verified: ${newDocId} ("${name}")`);
          return true;
        } else {
          throw new Error(`Document ${newDocId} not found after migration`);
        }
      } catch (error) {
        console.error(`  ❌ Verification failed for ${newDocId}: ${error.message}`);
        migrationStats.errors.push({ item: newDocId, error: error.message });
        return false;
      }
    });

    const verificationResults = await Promise.all(verificationPromises);
    const successfulVerifications = verificationResults.filter(Boolean).length;

    // Final report
    console.log('\n📊 MIGRATION COMPLETE');
    console.log('=====================');
    console.log(`✅ Items migrated: ${migrationStats.itemsMigrated}`);
    console.log(`🏠 Room templates updated: ${migrationStats.roomTemplatesUpdated}`);
    console.log(`🗑️  Old documents deleted: ${migrationStats.oldDocumentsDeleted}`);
    console.log(`✅ Verifications passed: ${successfulVerifications}/${itemsToMigrate.length}`);

    if (migrationStats.errors.length > 0) {
      console.log(`❌ Errors encountered: ${migrationStats.errors.length}`);
      migrationStats.errors.forEach(({ item, error }) => {
        console.log(`   - ${item}: ${error}`);
      });
    } else {
      console.log('✨ Migration completed successfully with no errors!');
    }

    console.log('\n⚠️  IMPORTANT:');
    console.log('   - This migration changed document IDs that may be referenced elsewhere');
    console.log('   - Review your application code to ensure it works with the new document IDs');
    console.log('   - Consider updating any external systems or cached data');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (error.code === 'permission-denied') {
      console.log('\n🔒 Permission denied. Make sure:');
      console.log('   - Firestore security rules allow read/write access');
      console.log('   - You have admin privileges for this operation');
    }
    process.exit(1);
  }
}

// Run the migration
migrateItemDocumentIds();
