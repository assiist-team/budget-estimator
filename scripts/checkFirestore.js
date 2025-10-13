// Check what's in Firestore vs our JSON files
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

// Load current items from JSON
function loadCurrentItems() {
  try {
    const itemsPath = path.join(__dirname, 'output', 'items.json');
    const data = fs.readFileSync(itemsPath, 'utf8');
    const items = JSON.parse(data);
    return items.map(item => item.id);
  } catch (error) {
    console.error('Error loading current items:', error.message);
    return [];
  }
}

async function checkFirestore() {
  console.log('🔍 Checking Firestore vs JSON files...\n');

  try {
    // Get current valid item IDs
    const currentItemIds = loadCurrentItems();
    const currentIdsSet = new Set(currentItemIds);
    console.log(`📋 Found ${currentItemIds.length} current valid items`);

    // Get all items currently in Firestore
    const itemsCollection = collection(db, 'items');
    const snapshot = await getDocs(itemsCollection);

    if (snapshot.empty) {
      console.log('📭 No items found in Firestore');
      return;
    }

    console.log(`📦 Found ${snapshot.size} items in Firestore`);

    // Find items in Firestore but not in current JSON (should be deleted)
    const extraInFirestore = [];
    // Find items in JSON but not in Firestore (need to be added)
    const missingInFirestore = [];

    snapshot.forEach(doc => {
      const itemId = doc.id;
      if (currentIdsSet.has(itemId)) {
        currentIdsSet.delete(itemId); // Remove from set as we find it
      } else {
        extraInFirestore.push(itemId);
      }
    });

    // Any remaining in currentIdsSet are missing from Firestore
    missingInFirestore.push(...currentIdsSet);

    // Report results
    if (extraInFirestore.length > 0) {
      console.log(`\n🗑️  Items in Firestore but not in current JSON (${extraInFirestore.length}):`);
      extraInFirestore.forEach(id => console.log(`  - ${id}`));
    } else {
      console.log('\n✅ No extra items found in Firestore');
    }

    if (missingInFirestore.length > 0) {
      console.log(`\n❌ Items in JSON but not in Firestore (${missingInFirestore.length}):`);
      missingInFirestore.forEach(id => console.log(`  - ${id}`));
    } else {
      console.log('\n✅ All current items are in Firestore');
    }

    console.log(`\n📊 Summary:`);
    console.log(`  - Current JSON items: ${currentItemIds.length}`);
    console.log(`  - Firestore items: ${snapshot.size}`);
    console.log(`  - Extra in Firestore: ${extraInFirestore.length}`);
    console.log(`  - Missing in Firestore: ${missingInFirestore.length}`);

  } catch (error) {
    console.error('❌ Error checking Firestore:', error);
    process.exit(1);
  }
}

// Run the check
checkFirestore();
