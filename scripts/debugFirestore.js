// Debug script to check Firestore items in detail
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

async function debugFirestore() {
  console.log('🔍 Detailed Firestore check...\n');

  try {
    // Get current valid item IDs
    const currentItemIds = loadCurrentItems();
    const currentIdsSet = new Set(currentItemIds);
    console.log(`📋 Found ${currentItemIds.length} current valid items`);

    // Get all items currently in Firestore
    const itemsCollection = collection(db, 'items');
    const snapshot = await getDocs(itemsCollection);

    console.log(`📦 Found ${snapshot.size} items in Firestore`);

    // List all items in Firestore
    const firestoreItems = [];
    snapshot.forEach(doc => {
      firestoreItems.push(doc.id);
    });

    console.log('\n📝 Items in Firestore:');
    firestoreItems.forEach(id => console.log(`  - ${id}`));

    // Check for missing items
    const missingItems = currentItemIds.filter(id => !firestoreItems.includes(id));
    if (missingItems.length > 0) {
      console.log('\n❌ Items in JSON but missing from Firestore:');
      missingItems.forEach(id => console.log(`  - ${id}`));
    }

    // Check for extra items
    const extraItems = firestoreItems.filter(id => !currentIdsSet.has(id));
    if (extraItems.length > 0) {
      console.log('\n🗑️  Items in Firestore but not in JSON:');
      extraItems.forEach(id => console.log(`  - ${id}`));
    }

  } catch (error) {
    console.error('❌ Error debugging Firestore:', error);
    process.exit(1);
  }
}

// Check room templates too
async function checkRoomTemplates() {
  console.log('\n🔍 Checking room templates in Firestore...\n');

  try {
    const templatesCollection = collection(db, 'roomTemplates');
    const snapshot = await getDocs(templatesCollection);

    console.log(`📦 Found ${snapshot.size} room templates in Firestore`);

    if (snapshot.size > 0) {
      console.log('\n📝 Room templates:');
      snapshot.forEach(doc => {
        console.log(`  - ${doc.id}`);
      });
    }
  } catch (error) {
    console.error('❌ Error checking room templates:', error);
  }
}

// Run the debug
debugFirestore().then(() => checkRoomTemplates());
