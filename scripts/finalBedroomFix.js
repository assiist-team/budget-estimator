// Fix bedroom configuration to align with standard home size guidelines
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

// Standard bedroom counts by square footage (based on common home guidelines)
const STANDARD_BEDROOM_GUIDELINES = {
  1600: 4,   // 1,600–2,200 sqft: 4 bedrooms
  2200: 5,   // 2,200–2,800 sqft: 5 bedrooms
  2800: 6,   // 2,800–3,600 sqft: 6 bedrooms
  3600: 7    // 3,600+ sqft: 7 bedrooms
};

/**
 * Get standard bedroom count for a square footage range
 */
function getStandardBedroomCount(minSqft, maxSqft) {
  console.log(`  Determining bedroom count for ${minSqft}-${maxSqft} sqft range`);

  // Check if the range falls within each category
  if (minSqft >= 3600) {
    console.log(`    → 3600+ sqft range: ${STANDARD_BEDROOM_GUIDELINES[3600]} bedrooms`);
    return STANDARD_BEDROOM_GUIDELINES[3600];
  }

  if (minSqft >= 2800 && maxSqft <= 3600) {
    console.log(`    → 2800-3600 sqft range: ${STANDARD_BEDROOM_GUIDELINES[2800]} bedrooms`);
    return STANDARD_BEDROOM_GUIDELINES[2800];
  }

  if (minSqft >= 2200 && maxSqft <= 2800) {
    console.log(`    → 2200-2800 sqft range: ${STANDARD_BEDROOM_GUIDELINES[2200]} bedrooms`);
    return STANDARD_BEDROOM_GUIDELINES[2200];
  }

  if (minSqft >= 1600 && maxSqft <= 2200) {
    console.log(`    → 1600-2200 sqft range: ${STANDARD_BEDROOM_GUIDELINES[1600]} bedrooms`);
    return STANDARD_BEDROOM_GUIDELINES[1600];
  }

  // Handle ranges that span multiple categories - use the category of the midpoint
  const midpoint = (minSqft + maxSqft) / 2;
  if (midpoint >= 3600) {
    console.log(`    → Midpoint ${midpoint} falls in 3600+ range: ${STANDARD_BEDROOM_GUIDELINES[3600]} bedrooms`);
    return STANDARD_BEDROOM_GUIDELINES[3600];
  }

  if (midpoint >= 2800) {
    console.log(`    → Midpoint ${midpoint} falls in 2800-3600 range: ${STANDARD_BEDROOM_GUIDELINES[2800]} bedrooms`);
    return STANDARD_BEDROOM_GUIDELINES[2800];
  }

  if (midpoint >= 2200) {
    console.log(`    → Midpoint ${midpoint} falls in 2200-2800 range: ${STANDARD_BEDROOM_GUIDELINES[2200]} bedrooms`);
    return STANDARD_BEDROOM_GUIDELINES[2200];
  }

  if (midpoint >= 1600) {
    console.log(`    → Midpoint ${midpoint} falls in 1600-2200 range: ${STANDARD_BEDROOM_GUIDELINES[1600]} bedrooms`);
    return STANDARD_BEDROOM_GUIDELINES[1600];
  }

  // Fallback for very small homes
  console.log(`    → Fallback bedroom count: 3 bedrooms`);
  return 3;
}

/**
 * Create realistic bedroom distribution for a given bedroom count
 */
function createBedroomDistribution(bedroomCount, bunkCapacities) {
  let bedrooms = { single: 0, double: 0, bunk: null };

  // Prioritize double bedrooms for families, then singles for flexibility, then bunks for extra capacity
  if (bedroomCount >= 2) {
    bedrooms.double = Math.min(2, bedroomCount - 1); // Start with 1-2 doubles
    bedrooms.single = bedroomCount - bedrooms.double;
  } else {
    bedrooms.single = bedroomCount;
  }

  // If we need more capacity, add a bunk
  const capacity = calculateBedroomCapacity(bedrooms, bunkCapacities);
  if (capacity < bedroomCount * 2 && bedroomCount >= 3) {
    bedrooms.bunk = 'small'; // Add small bunk for 4 extra guests
  }

  return bedrooms;
}

/**
 * Fix bedroom configuration to align with standard guidelines
 */
async function fixBedroomGuidelines() {
  console.log('🏠 Fixing bedroom configuration to align with standard home size guidelines...\n');

  console.log('📏 Standard Guidelines:');
  console.log('  < 1,600 sqft: 3 bedrooms');
  console.log('  1,600–2,200 sqft: 4 bedrooms');
  console.log('  2,200–2,800 sqft: 5 bedrooms');
  console.log('  2,800–3,600 sqft: 6 bedrooms');
  console.log('  3,600+ sqft: 7 bedrooms\n');

  try {
    const configDoc = await getDoc(doc(db, 'config', 'roomMappingRules'));

    if (!configDoc.exists()) {
      console.log('❌ No configuration document found in Firestore');
      return;
    }

    const data = configDoc.data();
    console.log('✅ Found configuration document');

    // Fix bedroom mix rules to align with guidelines
    const fixedRules = data.bedroomMixRules.map(rule => {
      const standardBedroomCount = getStandardBedroomCount(rule.min_sqft, rule.max_sqft);
      const currentBedroomCount = rule.bedrooms.single + rule.bedrooms.double + (rule.bedrooms.bunk ? 1 : 0);

      console.log(`Rule ${rule.id} (${rule.min_sqft}-${rule.max_sqft} sqft):`);
      console.log(`  Current bedrooms: ${currentBedroomCount} (${JSON.stringify(rule.bedrooms)})`);
      console.log(`  Standard bedrooms: ${standardBedroomCount}`);
      console.log(`  Current guest range: ${rule.min_guests}-${rule.max_guests}`);

      let bedrooms;
      if (currentBedroomCount !== standardBedroomCount) {
        bedrooms = createBedroomDistribution(standardBedroomCount, data.bunkCapacities);
        console.log(`  🔄 Adjusted to: ${JSON.stringify(bedrooms)}`);
      } else {
        bedrooms = rule.bedrooms;
        console.log(`  ✅ Already matches standard`);
      }

      const calculatedCapacity = calculateBedroomCapacity(bedrooms, data.bunkCapacities);
      console.log(`  Calculated capacity: ${calculatedCapacity} guests`);

      // Adjust guest range to be realistic based on bedroom capacity
      const minGuests = Math.max(6, calculatedCapacity - 2); // Minimum 6 guests, allow some flexibility below capacity
      const maxGuests = calculatedCapacity;

      return {
        ...rule,
        bedrooms,
        min_guests: minGuests,
        max_guests: maxGuests
      };
    });

    // Update the document
    const updatedData = {
      ...data,
      bedroomMixRules: fixedRules,
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'config', 'roomMappingRules'), updatedData);

    console.log('\n✅ Successfully aligned bedroom configurations with standard guidelines!');
    console.log(`📊 Updated ${fixedRules.length} rules`);

    // Summary of changes
    console.log('\n📋 Final bedroom configurations:');
    fixedRules.forEach(rule => {
      const bedroomCount = rule.bedrooms.single + rule.bedrooms.double + (rule.bedrooms.bunk ? 1 : 0);
      console.log(`  Rule ${rule.id} (${rule.min_sqft}-${rule.max_sqft} sqft): ${bedroomCount} bedrooms, ${rule.min_guests}-${rule.max_guests} guests`);
      console.log(`    ${JSON.stringify(rule.bedrooms)}`);
    });

  } catch (error) {
    console.error('❌ Error fixing bedroom guidelines:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixBedroomGuidelines();
