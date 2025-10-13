// Script to rename item document IDs in Firestore
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

async function renameItem(oldId, newId) {
  console.log(`🔄 Renaming item: '${oldId}' → '${newId}'`);

  try {
    // Step 1: Get the old item document
    const oldItemRef = doc(db, 'items', oldId);
    const oldItemSnap = await getDocs(query(collection(db, 'items'), where('__name__', '==', oldId)));

    if (oldItemSnap.empty) {
      console.error(`❌ Item '${oldId}' not found`);
      return false;
    }

    const oldItemData = oldItemSnap.docs[0].data();

    // Step 2: Check if new ID already exists
    const newItemSnap = await getDocs(query(collection(db, 'items'), where('__name__', '==', newId)));
    if (!newItemSnap.empty) {
      console.error(`❌ Item '${newId}' already exists`);
      return false;
    }

    // Step 3: Create new document with new ID
    console.log(`📝 Creating new item document: '${newId}'`);
    const newItemData = {
      ...oldItemData,
      id: newId, // Update the id field in the document data
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'items', newId), newItemData);
    console.log(`✅ Created new item document`);

    // Step 4: Find all room templates that reference this item
    console.log(`🔍 Finding room templates that reference '${oldId}'...`);
    const templatesCollection = collection(db, 'roomTemplates');
    const templatesSnapshot = await getDocs(templatesCollection);

    let templatesUpdated = 0;

    for (const templateDoc of templatesSnapshot.docs) {
      const templateId = templateDoc.id;
      const templateData = templateDoc.data();

      let needsUpdate = false;

      // Check all room sizes for references to the old item ID
      for (const [sizeKey, sizeData] of Object.entries(templateData.sizes || {})) {
        if (sizeData.items && Array.isArray(sizeData.items)) {
          for (let i = 0; i < sizeData.items.length; i++) {
            if (sizeData.items[i].itemId === oldId) {
              sizeData.items[i].itemId = newId;
              needsUpdate = true;
              console.log(`  📝 Template '${templateId}' (${sizeKey}): itemId '${oldId}' → '${newId}'`);
            }
          }
        }
      }

      // Update the template if needed
      if (needsUpdate) {
        await updateDoc(doc(db, 'roomTemplates', templateId), {
          ...templateData,
          updatedAt: new Date(),
        });
        templatesUpdated++;
      }
    }

    console.log(`✅ Updated ${templatesUpdated} room templates`);

    // Step 5: Delete the old document
    console.log(`🗑️  Deleting old item document: '${oldId}'`);
    await deleteDoc(oldItemRef);
    console.log(`✅ Deleted old item document`);

    console.log(`🎉 Successfully renamed item '${oldId}' to '${newId}'`);
    console.log(`📊 Summary:`);
    console.log(`  - Created new item document`);
    console.log(`  - Updated ${templatesUpdated} room templates`);
    console.log(`  - Deleted old item document`);

    return true;

  } catch (error) {
    console.error(`❌ Error renaming item '${oldId}' to '${newId}':`, error);
    return false;
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.log('Usage: node renameItem.js <oldId> <newId>');
    console.log('Example: node renameItem.js king_bed_frame king_size_bed_frame');
    process.exit(1);
  }

  const [oldId, newId] = args;

  const success = await renameItem(oldId, newId);
  process.exit(success ? 0 : 1);
}

// Export for use in other scripts
export { renameItem };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
