// Analyze current item keys in Firestore to see which ones need updating
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

async function analyzeItemKeys() {
  console.log('🔍 Analyzing current item keys in Firestore...\n');

  try {
    // Get all items currently in Firestore
    const itemsCollection = collection(db, 'items');
    const snapshot = await getDocs(itemsCollection);

    if (snapshot.empty) {
      console.log('📭 No items found in Firestore');
      return;
    }

    console.log(`📦 Found ${snapshot.size} items in Firestore`);
    console.log('=====================================\n');

    const items = [];
    const needsUpdate = [];
    const alreadyCorrect = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const currentItem = {
        id: doc.id,
        name: data.name || 'NO_NAME',
        key: data.key || 'NO_KEY',
        category: data.category || 'NO_CATEGORY'
      };
      items.push(currentItem);

      // Check if document ID matches key field (or if key field doesn't exist, which is correct after migration)
      const docId = doc.id;
      const keyField = data.key;

      if (!keyField || docId === keyField) {
        alreadyCorrect.push(currentItem);
      } else {
        needsUpdate.push({
          ...currentItem,
          docId,
          currentKey: keyField,
          mismatch: docId !== keyField
        });
      }
    });

    // Sort items for better readability
    items.sort((a, b) => a.key.localeCompare(b.key));

    console.log('📊 SUMMARY:');
    console.log(`=============`);
    console.log(`Total items: ${items.length}`);
    console.log(`✅ Already correct: ${alreadyCorrect.length}`);
    console.log(`🔄 Need updates: ${needsUpdate.length}`);
    console.log('');

    if (alreadyCorrect.length > 0) {
      console.log('✅ ITEMS WITH CORRECT KEYS:');
      console.log('============================');
      alreadyCorrect.forEach(item => {
        console.log(`  ${item.key} -> "${item.name}" (${item.category})`);
      });
      console.log('');
    }

    if (needsUpdate.length > 0) {
      console.log('🔄 ITEMS NEEDING DOCUMENT ID UPDATES:');
      console.log('=====================================');
      needsUpdate.forEach(item => {
        console.log(`  "${item.name}"`);
        console.log(`    Current document ID: ${item.docId}`);
        console.log(`    Key field value: ${item.currentKey || 'NOT_SET'}`);
        console.log(`    Category: ${item.category}`);
        console.log('');
      });
    }

    // Generate update plan
    if (needsUpdate.length > 0) {
      console.log('📋 UPDATE PLAN:');
      console.log('===============');
      console.log(`To update ${needsUpdate.length} item keys, you would need to:`);
      console.log('');
      console.log('1. OPTION 1 - Individual Updates (Safest):');
      console.log('   For each item that needs updating:');
      console.log('   - Read the current document');
      console.log('   - Update the "key" field');
      console.log('   - Write back to the same document ID');
      console.log('');
      console.log('2. OPTION 2 - Batch Updates (Faster but riskier):');
      console.log('   - Create new documents with the correct keys');
      console.log('   - Update all references to use the new keys');
      console.log('   - Delete old documents');
      console.log('');
      console.log('3. IMPACT ASSESSMENT:');
      console.log(`   - ${needsUpdate.length} documents need key field updates`);
      console.log(`   - No document IDs need to change (only the key field)`);
      console.log(`   - This affects the internal data structure only`);
      console.log('');

      console.log('⚠️  IMPORTANT CONSIDERATIONS:');
      console.log('   - Test this in a development environment first');
      console.log('   - Ensure no code depends on the old key values');
      console.log('   - Consider if any external systems reference these keys');
      console.log('   - Have a backup/rollback plan ready');
    }

  } catch (error) {
    console.error('❌ Error analyzing Firestore:', error);
    if (error.code === 'permission-denied') {
      console.log('\n🔒 Permission denied. Make sure:');
      console.log('   - Firebase project is properly configured');
      console.log('   - Firestore security rules allow read access');
      console.log('   - Environment variables are set correctly');
    }
    process.exit(1);
  }
}

// Run the analysis
analyzeItemKeys();
