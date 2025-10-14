// Debug autoconfig rules differences between local and Firestore
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

// Load autoconfig rules from local JSON file
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

async function debugAutoconfig() {
  console.log('🔍 Debugging autoconfig rules differences...\n');

  try {
    // Load local rules
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

      // Compare each rule
      console.log('\n📊 Comparing bedroom rules:');
      const localRuleIds = localRules.bedroomMixRules.map(r => r.id).sort();
      const firestoreRuleIds = firestoreRules.bedroomMixRules.map(r => r.id).sort();

      console.log(`Local rule IDs: [${localRuleIds.join(', ')}]`);
      console.log(`Firestore rule IDs: [${firestoreRuleIds.join(', ')}]`);

      if (localRuleIds.length !== firestoreRuleIds.length) {
        console.log(`❌ Different number of rules: Local=${localRuleIds.length}, Firestore=${firestoreRuleIds.length}`);
      } else {
        console.log(`✅ Same number of rules (${localRuleIds.length})`);
      }

      // Check if all local IDs exist in Firestore
      const missingInFirestore = localRuleIds.filter(id => !firestoreRuleIds.includes(id));
      const extraInFirestore = firestoreRuleIds.filter(id => !localRuleIds.includes(id));

      if (missingInFirestore.length > 0) {
        console.log(`❌ Missing in Firestore: [${missingInFirestore.join(', ')}]`);
      } else {
        console.log(`✅ All local rule IDs found in Firestore`);
      }

      if (extraInFirestore.length > 0) {
        console.log(`❌ Extra in Firestore: [${extraInFirestore.join(', ')}]`);
      } else {
        console.log(`✅ No extra rule IDs in Firestore`);
      }

      // Compare specific rule details for the first few rules
      console.log('\n🔍 Comparing first few rules in detail:');
      for (let i = 0; i < Math.min(3, localRules.bedroomMixRules.length); i++) {
        const localRule = localRules.bedroomMixRules[i];
        const firestoreRule = firestoreRules.bedroomMixRules.find(r => r.id === localRule.id);

        if (firestoreRule) {
          console.log(`\nRule ${localRule.id}:`);
          console.log(`  Local:    ${localRule.min_sqft}-${localRule.max_sqft} sqft, ${localRule.min_guests}-${localRule.max_guests} guests`);
          console.log(`  Firestore: ${firestoreRule.min_sqft}-${firestoreRule.max_sqft} sqft, ${firestoreRule.min_guests}-${firestoreRule.max_guests} guests`);
          console.log(`  Bedrooms Local:    ${JSON.stringify(localRule.bedrooms)}`);
          console.log(`  Bedrooms Firestore: ${JSON.stringify(firestoreRule.bedrooms)}`);
        }
      }

    } else {
      console.log('❌ No autoconfig rules found in Firestore');
    }

  } catch (error) {
    console.error('❌ Error debugging Firestore:', error);
    process.exit(1);
  }
}

// Run the debug
debugAutoconfig();
