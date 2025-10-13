// Script to bulk rename item document IDs in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', 'client', '.env') });

// Firebase configuration from .env
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Rename mapping - add your renames here
const renameMapping = {
  // Example mappings - replace with your actual renames
  // 'old_bad_id': 'new_good_id',
  // 'king_bed_frame': 'king_size_bed_frame',
  // 'sofa_sectional': 'sectional_sofa',
};

// Or load from a JSON file if you prefer
function loadRenameMappingFromFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading rename mapping file:', error.message);
  }
  return {};
}

// Validate item ID format (should match Firestore document ID requirements)
function validateItemId(id) {
  // Firestore document IDs must be valid UTF-8 strings, 1-1500 bytes
  // Should not contain: /, [, ], *, ?, space, tab, newline, etc.
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(id) && id.length > 0 && id.length <= 1500;
}

async function renameSingleItem(oldId, newId) {
  console.log(`🔄 Renaming: '${oldId}' → '${newId}'`);

  try {
    // Step 1: Get the old item document
    const oldItemQuery = query(collection(db, 'items'), where('__name__', '==', oldId));
    const oldItemSnap = await getDocs(oldItemQuery);

    if (oldItemSnap.empty) {
      console.error(`❌ Item '${oldId}' not found`);
      return false;
    }

    const oldItemData = oldItemSnap.docs[0].data();

    // Step 2: Check if new ID already exists
    const newItemQuery = query(collection(db, 'items'), where('__name__', '==', newId));
    const newItemSnap = await getDocs(newItemQuery);

    if (!newItemSnap.empty) {
      console.error(`❌ Item '${newId}' already exists`);
      return false;
    }

    // Step 3: Create new document with new ID
    const newItemData = {
      ...oldItemData,
      id: newId,
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'items', newId), newItemData);
    console.log(`✅ Created: '${newId}'`);

    // Step 4: Find and update all room templates that reference this item
    const templatesCollection = collection(db, 'roomTemplates');
    const templatesSnapshot = await getDocs(templatesCollection);

    let templatesUpdated = 0;

    for (const templateDoc of templatesSnapshot.docs) {
      const templateId = templateDoc.id;
      const templateData = templateDoc.data();

      let needsUpdate = false;

      for (const [sizeKey, sizeData] of Object.entries(templateData.sizes || {})) {
        if (sizeData.items && Array.isArray(sizeData.items)) {
          for (let i = 0; i < sizeData.items.length; i++) {
            if (sizeData.items[i].itemId === oldId) {
              sizeData.items[i].itemId = newId;
              needsUpdate = true;
            }
          }
        }
      }

      if (needsUpdate) {
        await updateDoc(doc(db, 'roomTemplates', templateId), {
          ...templateData,
          updatedAt: new Date(),
        });
        templatesUpdated++;
      }
    }

    console.log(`📝 Updated ${templatesUpdated} room templates`);

    // Step 5: Delete the old document
    await deleteDoc(doc(db, 'items', oldId));
    console.log(`🗑️  Deleted: '${oldId}'`);

    return true;

  } catch (error) {
    console.error(`❌ Error renaming '${oldId}' to '${newId}':`, error);
    return false;
  }
}

async function bulkRenameItems(mapping) {
  console.log('🚀 Starting bulk rename operation...\n');

  if (Object.keys(mapping).length === 0) {
    console.log('❌ No items to rename. Please provide a rename mapping.');
    return;
  }

  // Validate all IDs first
  const invalidIds = [];
  for (const [oldId, newId] of Object.entries(mapping)) {
    if (!validateItemId(oldId)) {
      invalidIds.push(`Invalid old ID: '${oldId}'`);
    }
    if (!validateItemId(newId)) {
      invalidIds.push(`Invalid new ID: '${newId}' (for '${oldId}')`);
    }
  }

  if (invalidIds.length > 0) {
    console.error('❌ Invalid item IDs found:');
    invalidIds.forEach(error => console.error(`  - ${error}`));
    console.error('❌ Please fix invalid IDs before proceeding.');
    return;
  }

  // Check for conflicts (new IDs that conflict with existing items or other renames)
  const allNewIds = Object.values(mapping);
  const uniqueNewIds = new Set(allNewIds);

  if (uniqueNewIds.size !== allNewIds.length) {
    console.error('❌ Duplicate new IDs found in mapping');
    return;
  }

  console.log(`📋 Rename plan (${Object.keys(mapping).length} items):`);
  for (const [oldId, newId] of Object.entries(mapping)) {
    console.log(`  '${oldId}' → '${newId}'`);
  }

  // Confirm before proceeding
  console.log('\n⚠️  This operation will:');
  console.log('  - Create new item documents with new IDs');
  console.log('  - Update all room template references');
  console.log('  - Delete old item documents');
  console.log('\nThis cannot be undone! Continue? (y/N)');

  // In a real script, you'd want to prompt for user input here
  // For now, we'll proceed automatically (you can change this)
  const shouldProceed = process.argv.includes('--yes') || process.argv.includes('-y');

  if (!shouldProceed) {
    console.log('❌ Operation cancelled. Use --yes flag to proceed.');
    return;
  }

  console.log('\n🔄 Starting rename operations...\n');

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const [oldId, newId] of Object.entries(mapping)) {
    const success = await renameSingleItem(oldId, newId);
    if (success) {
      successCount++;
    } else {
      errorCount++;
      errors.push({ oldId, newId });
    }

    // Small delay to avoid overwhelming Firestore
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n🎉 Bulk rename operation complete!');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);

  if (errorCount > 0) {
    console.log('\n❌ Items that failed to rename:');
    errors.forEach(({ oldId, newId }) => {
      console.log(`  '${oldId}' → '${newId}'`);
    });
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);

  // Load rename mapping from command line argument (JSON file)
  let renameMapping = {};

  if (args.length > 0) {
    const filePath = args[0];
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
    renameMapping = loadRenameMappingFromFile(fullPath);
  }

  // Override with hardcoded mapping if provided
  Object.assign(renameMapping, renameMapping);

  await bulkRenameItems(renameMapping);
}

// Export for use in other scripts
export { bulkRenameItems, renameSingleItem };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
