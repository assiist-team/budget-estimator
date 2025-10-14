// Update all item keys in Firestore to follow lowercase_with_underscores convention
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
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

// Helper function to generate key from name
function generateKey(name) {
  return name.toLowerCase().replace(/\s+/g, '_');
}

async function updateItemKeys() {
  console.log('🔄 Updating item keys in Firestore...\n');

  try {
    // Get all items currently in Firestore
    const itemsCollection = collection(db, 'items');
    const snapshot = await getDocs(itemsCollection);

    if (snapshot.empty) {
      console.log('📭 No items found in Firestore');
      return;
    }

    console.log(`📦 Found ${snapshot.size} items to update`);

    const updatePromises = [];
    const results = {
      updated: 0,
      skipped: 0,
      errors: []
    };

    snapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      const itemId = docSnapshot.id;
      const itemName = data.name || 'NO_NAME';

      // Generate the correct key format
      const correctKey = generateKey(itemName);

      // Check if key is already correct or missing
      if (!data.key || data.key !== correctKey) {
        console.log(`  Updating "${itemName}": ${data.key || 'NO_KEY'} -> ${correctKey}`);

        const updatePromise = updateDoc(doc(db, 'items', itemId), {
          key: correctKey,
          updatedAt: new Date()
        }).then(() => {
          results.updated++;
        }).catch(error => {
          console.error(`    ❌ Failed to update ${itemId}:`, error.message);
          results.errors.push({ itemId, itemName, error: error.message });
        });

        updatePromises.push(updatePromise);
      } else {
        console.log(`  Skipping "${itemName}": already has correct key "${data.key}"`);
        results.skipped++;
      }
    });

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    console.log('\n✅ UPDATE COMPLETE!');
    console.log('===================');
    console.log(`📊 Results:`);
    console.log(`  ✅ Updated: ${results.updated}`);
    console.log(`  ⏭️  Skipped: ${results.skipped}`);
    console.log(`  ❌ Errors: ${results.errors.length}`);

    if (results.errors.length > 0) {
      console.log('\n❌ ERRORS ENCOUNTERED:');
      console.log('======================');
      results.errors.forEach(error => {
        console.log(`  ${error.itemId} (${error.itemName}): ${error.error}`);
      });
    }

    console.log('\n🎉 All item keys have been updated to follow the lowercase_with_underscores convention!');

  } catch (error) {
    console.error('❌ Error updating Firestore:', error);
    if (error.code === 'permission-denied') {
      console.log('\n🔒 Permission denied. Make sure:');
      console.log('   - Firebase project is properly configured');
      console.log('   - Firestore security rules allow write access');
      console.log('   - Environment variables are set correctly');
    }
    process.exit(1);
  }
}

// Run the update
updateItemKeys();
