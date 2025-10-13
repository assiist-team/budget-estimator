// Script to verify updated categories in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import dotenv from 'dotenv';
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

// Expected categories
const expectedCategories = [
  'Furniture',
  'Lighting',
  'Accessories',
  'Bedding',
  'Entertainment',
  'Textiles',
  'Kitchen'
];

async function verifyCategories() {
  console.log('🔍 Verifying updated categories...\n');

  try {
    // Get all items from Firestore
    const itemsCollection = collection(db, 'items');
    const snapshot = await getDocs(itemsCollection);

    console.log(`📦 Found ${snapshot.size} items in Firestore`);

    const categoryCounts = {};
    const itemsByCategory = {};

    // Process each item
    snapshot.forEach(doc => {
      const itemData = doc.data();
      const category = itemData.category;

      // Count categories
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;

      // Group items by category
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = [];
      }
      itemsByCategory[category].push(doc.id);
    });

    console.log('\n📊 Category Summary:');
    Object.keys(categoryCounts)
      .sort()
      .forEach(category => {
        const count = categoryCounts[category];
        const isExpected = expectedCategories.includes(category);
        const status = isExpected ? '✅' : '❌';

        console.log(`  ${status} ${category}: ${count} items`);

        if (isExpected) {
          console.log(`     Items: ${itemsByCategory[category].slice(0, 5).join(', ')}${itemsByCategory[category].length > 5 ? '...' : ''}`);
        }
      });

    // Check for any unexpected categories
    const unexpectedCategories = Object.keys(categoryCounts).filter(cat => !expectedCategories.includes(cat));

    if (unexpectedCategories.length > 0) {
      console.log('\n❌ Unexpected categories found:');
      unexpectedCategories.forEach(cat => {
        console.log(`  - ${cat}: ${categoryCounts[cat]} items`);
      });
    } else {
      console.log('\n✅ All categories are expected!');
    }

    // Verify we have all expected categories
    const missingCategories = expectedCategories.filter(cat => !categoryCounts[cat]);
    if (missingCategories.length > 0) {
      console.log('\n⚠️  Missing expected categories:');
      missingCategories.forEach(cat => {
        console.log(`  - ${cat}`);
      });
    } else {
      console.log('\n✅ All expected categories are present!');
    }

  } catch (error) {
    console.error('❌ Error verifying categories:', error);
    process.exit(1);
  }
}

// Run the verification
verifyCategories();
