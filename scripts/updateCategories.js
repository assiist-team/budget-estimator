// Script to update item categories in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
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

// Category mapping
const categoryMapping = {
  // Room-specific furniture becomes just Furniture
  'bedroom_furniture': 'Furniture',
  'living_room_furniture': 'Furniture',
  'kitchen_furniture': 'Furniture',
  'dining_furniture': 'Furniture',

  // Already correct categories
  'textiles': 'Textiles',
  'lighting': 'Lighting',
  'accessories': 'Accessories',
  'decorative': 'Accessories', // Decorative items are accessories

  // Electronics become Entertainment
  'electronics': 'Entertainment'
};

// Specific item reassignments based on functionality
const itemSpecificMapping = {
  // Bedding items (currently in textiles or bedroom_furniture)
  'sleeping_pillows': 'Bedding',
  'down_pillows': 'Bedding',
  'pillow_protectors': 'Bedding',
  'sheets': 'Bedding',
  'throw_blanket_on_bed': 'Bedding',
  'chair_throw_blanket': 'Bedding',
  'mattress_protector': 'Bedding',

  // Throw pillows are accessories, not bedding
  'throw_pillows': 'Accessories',
  'chair_throw_pillow': 'Accessories',

  // Kitchen towels are textiles
  'kitchen_towels': 'Textiles',

  // Curtains and rods are textiles (already correct)
  'curtain_set': 'Textiles',
  'curtain_rod': 'Textiles',
  'area_rug': 'Textiles',
  'kitchen_runner_rug': 'Textiles'
};

async function updateCategories() {
  console.log('🔄 Starting category update...\n');

  try {
    // Get all items from Firestore
    const itemsCollection = collection(db, 'items');
    const snapshot = await getDocs(itemsCollection);

    console.log(`📦 Found ${snapshot.size} items to process`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Process each item
    for (const docSnapshot of snapshot.docs) {
      const itemId = docSnapshot.id;
      const itemData = docSnapshot.data();

      const currentCategory = itemData.category;
      let newCategory = null;

      // Check for item-specific mapping first
      if (itemSpecificMapping[itemId]) {
        newCategory = itemSpecificMapping[itemId];
      }
      // Otherwise use category mapping
      else if (categoryMapping[currentCategory]) {
        newCategory = categoryMapping[currentCategory];
      }

      if (newCategory && newCategory !== currentCategory) {
        console.log(`  📝 ${itemId}: '${currentCategory}' → '${newCategory}'`);

        // Update the item in Firestore
        const itemRef = doc(db, 'items', itemId);
        await updateDoc(itemRef, {
          category: newCategory,
          updatedAt: new Date().toISOString()
        });

        updatedCount++;
      } else {
        // console.log(`  ⏭️  ${itemId}: '${currentCategory}' (no change needed)`);
        skippedCount++;
      }
    }

    console.log(`\n✅ Update complete!`);
    console.log(`  📈 Updated: ${updatedCount} items`);
    console.log(`  ⏭️  Skipped: ${skippedCount} items`);
    console.log(`  📊 Total: ${snapshot.size} items`);

  } catch (error) {
    console.error('❌ Error updating categories:', error);
    process.exit(1);
  }
}

// Run the update
updateCategories();
