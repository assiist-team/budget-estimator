// Check autoconfig rules in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
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

// Load autoconfig rules from local JSON file for comparison
function loadLocalAutoconfigRules() {
  try {
    const autoconfigPath = path.join(__dirname, '..', 'client', 'public', 'autoconfig.json');
    const data = fs.readFileSync(autoconfigPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading local autoconfig rules:', error.message);
    return null;
  }
}

async function checkAutoconfig() {
  console.log('🔍 Checking autoconfig rules in Firestore...\n');

  try {
    // Load local rules for comparison
    const localRules = loadLocalAutoconfigRules();

    if (!localRules) {
      console.error('❌ Could not load local autoconfig rules');
      process.exit(1);
    }

    console.log(`📋 Local autoconfig has ${localRules.bedroomMixRules.length} bedroom rules`);

    // Check Firestore
    const configRef = doc(db, 'config', 'roomMappingRules');
    const configDoc = await getDoc(configRef);

    if (configDoc.exists()) {
      const firestoreRules = configDoc.data();
      console.log(`✅ Found autoconfig rules in Firestore with ${firestoreRules.bedroomMixRules.length} bedroom rules`);

      // Compare versions
      if (firestoreRules.version === localRules.version) {
        console.log('✅ Version match between local and Firestore');
      } else {
        console.log(`⚠️  Version mismatch: Local=${localRules.version}, Firestore=${firestoreRules.version}`);
      }

      // Compare bedroom rule counts
      if (firestoreRules.bedroomMixRules.length === localRules.bedroomMixRules.length) {
        console.log('✅ Bedroom rule count matches');
      } else {
        console.log(`⚠️  Bedroom rule count mismatch: Local=${localRules.bedroomMixRules.length}, Firestore=${firestoreRules.bedroomMixRules.length}`);
      }

      // Check if rules are identical
      const rulesMatch = JSON.stringify(firestoreRules.bedroomMixRules) === JSON.stringify(localRules.bedroomMixRules);
      if (rulesMatch) {
        console.log('✅ Bedroom rules are identical between local and Firestore');
      } else {
        console.log('⚠️  Bedroom rules differ between local and Firestore');
      }

    } else {
      console.log('❌ No autoconfig rules found in Firestore');
    }

  } catch (error) {
    console.error('❌ Error checking Firestore:', error);
    process.exit(1);
  }
}

// Run the check
checkAutoconfig();
