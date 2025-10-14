// Fix bedroom configuration issues in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
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

/**
 * Calculate bedroom capacity for a configuration
 */
function calculateBedroomCapacity(bedrooms, bunkCapacities) {
  const singleCapacity = bedrooms.single * 2; // Each single bed sleeps 2
  const doubleCapacity = bedrooms.double * 2; // Each double bed sleeps 2
  const bunkCapacity = bedrooms.bunk && bunkCapacities[bedrooms.bunk] ? bunkCapacities[bedrooms.bunk] : 0;

  return singleCapacity + doubleCapacity + bunkCapacity;
}

/**
 * Fix bedroom configuration issues
 */
async function fixBedroomConfig() {
  console.log('🔧 Fixing bedroom configuration issues in Firestore...\n');

  try {
    const configDoc = await getDoc(doc(db, 'config', 'roomMappingRules'));

    if (!configDoc.exists()) {
      console.log('❌ No configuration document found in Firestore');
      return;
    }

    const data = configDoc.data();
    console.log('✅ Found configuration document');

    // Fix bedroom mix rules
    const fixedRules = data.bedroomMixRules.map(rule => {
      // Rename 'king' field to 'single' and ensure bedroom counts make sense
      const bedrooms = {
        single: rule.bedrooms.king || 0,
        double: rule.bedrooms.double || 0,
        bunk: rule.bedrooms.bunk || null
      };

      // Calculate actual capacity
      const calculatedCapacity = calculateBedroomCapacity(bedrooms, data.bunkCapacities);

      console.log(`Rule ${rule.id}:`);
      console.log(`  Intended max guests: ${rule.max_guests}`);
      console.log(`  Calculated capacity: ${calculatedCapacity}`);
      console.log(`  Bedrooms: ${JSON.stringify(bedrooms)}`);

      // If calculated capacity doesn't match intended capacity, we need to fix the bedroom counts
      if (calculatedCapacity !== rule.max_guests) {
        console.log(`  ⚠️  Capacity mismatch! Fixing bedroom configuration...`);

        // Start with the original bedroom configuration and adjust as needed
        let newBedrooms = { ...bedrooms };

        // If we need more capacity, add bedrooms
        if (calculatedCapacity < rule.max_guests) {
          const neededCapacity = rule.max_guests - calculatedCapacity;

          // Add single bedrooms first (most flexible)
          if (neededCapacity >= 2) {
            const canAdd = Math.min(Math.floor(neededCapacity / 2), 3); // Add up to 3 more
            newBedrooms.single += canAdd;
          }

          // If we still need more capacity, add double bedrooms
          if (newBedrooms.single === bedrooms.single && neededCapacity >= 2) {
            newBedrooms.double += 1;
          }

          // If we still need more, add a bunk
          if (calculatedCapacity + (newBedrooms.single - bedrooms.single) * 2 + (newBedrooms.double - bedrooms.double) * 2 < rule.max_guests) {
            if (!newBedrooms.bunk) {
              const remainingNeed = rule.max_guests - (calculatedCapacity + (newBedrooms.single - bedrooms.single) * 2 + (newBedrooms.double - bedrooms.double) * 2);
              if (remainingNeed <= 4) {
                newBedrooms.bunk = 'small';
              } else if (remainingNeed <= 8) {
                newBedrooms.bunk = 'medium';
              } else {
                newBedrooms.bunk = 'large';
              }
            }
          }
        }

        const newCapacity = calculateBedroomCapacity(newBedrooms, data.bunkCapacities);
        console.log(`  ✅ Fixed to: ${JSON.stringify(newBedrooms)} (capacity: ${newCapacity})`);

        return {
          ...rule,
          bedrooms: newBedrooms
        };
      }

      return {
        ...rule,
        bedrooms
      };
    });

    // Update the document
    const updatedData = {
      ...data,
      bedroomMixRules: fixedRules,
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'config', 'roomMappingRules'), updatedData);

    console.log('\n✅ Successfully updated bedroom configuration rules!');
    console.log(`📊 Updated ${fixedRules.length} rules`);

    // Summary of changes
    console.log('\n📋 Summary of changes:');
    fixedRules.forEach(rule => {
      const oldCapacity = data.bedroomMixRules.find(r => r.id === rule.id)?.max_guests;
      if (oldCapacity !== rule.max_guests) {
        console.log(`  Rule ${rule.id}: capacity ${oldCapacity} → ${rule.max_guests}`);
      }
    });

  } catch (error) {
    console.error('❌ Error fixing bedroom configuration:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixBedroomConfig();
