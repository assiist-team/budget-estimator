// Cleanup script to remove old items from Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
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

// Items that were renamed/removed and should be deleted
const ITEMS_TO_DELETE = [
  'dining_chairs',      // → dining_chair
  'bean_bags',          // → bean_bag
  'tv_mount_install',   // → tv_mount
  'curtain_rod_install', // → curtain_rod
  'bar_stools',         // → bar_stool
  'island_center_piece', // → island_centerpiece
  'ottoman_or_pouf_s',  // → ottoman_or_pouf
  'side_tables',        // → side_table
  'table_centerpeice'   // → table_centerpiece
];

async function cleanupFirestore() {
  console.log('🧹 Starting Firestore cleanup...\n');

  try {
    // Get current valid item IDs
    const currentItemIds = loadCurrentItems();
    console.log(`📋 Found ${currentItemIds.length} current valid items`);

    // Get all items currently in Firestore
    const itemsCollection = collection(db, 'items');
    const snapshot = await getDocs(itemsCollection);

    if (snapshot.empty) {
      console.log('📭 No items found in Firestore');
      return;
    }

    console.log(`📦 Found ${snapshot.size} items in Firestore`);

    // Find items to delete
    const itemsToDelete = [];
    snapshot.forEach(doc => {
      const itemId = doc.id;
      if (ITEMS_TO_DELETE.includes(itemId)) {
        itemsToDelete.push({ id: itemId, ref: doc.ref });
      }
    });

    if (itemsToDelete.length === 0) {
      console.log('✅ No old items found to delete');
      return;
    }

    console.log(`\n🗑️  Items to delete (${itemsToDelete.length}):`);
    itemsToDelete.forEach(item => {
      console.log(`  - ${item.id}`);
    });

    // Delete the items
    console.log('\n🗑️  Deleting old items...');
    for (const item of itemsToDelete) {
      await deleteDoc(item.ref);
      console.log(`  ✓ Deleted: ${item.id}`);
    }

    console.log(`\n✅ Successfully deleted ${itemsToDelete.length} old items from Firestore!`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupFirestore();
