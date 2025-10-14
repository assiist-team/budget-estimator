// Upload autoconfig rules to Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
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

// Load autoconfig rules from JSON file
function loadAutoconfigRules() {
  try {
    const autoconfigPath = path.join(__dirname, '..', 'client', 'public', 'autoconfig.json');
    const data = fs.readFileSync(autoconfigPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading autoconfig rules:', error.message);
    return null;
  }
}

async function uploadAutoconfig() {
  console.log('🚀 Uploading autoconfig rules to Firestore...\n');

  try {
    // Load the autoconfig rules
    const autoconfigRules = loadAutoconfigRules();

    if (!autoconfigRules) {
      console.error('❌ Could not load autoconfig rules from JSON file');
      process.exit(1);
    }

    console.log(`📋 Loaded autoconfig rules with ${autoconfigRules.bedroomMixRules.length} bedroom rules`);

    // Upload to Firestore
    const configRef = doc(db, 'config', 'roomMappingRules');
    await setDoc(configRef, autoconfigRules);

    console.log('✅ Successfully uploaded autoconfig rules to Firestore!');
    console.log('📍 Document path: config/roomMappingRules');

    console.log('\n✨ The updated bedroom configuration rules are now live in Firestore!');
    console.log('   Your app will use these rules for auto-configuration.');

  } catch (error) {
    console.error('❌ Error uploading to Firestore:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure your .env file has correct Firebase config');
    console.log('2. Check that Firestore security rules allow writes');
    console.log('3. Verify the autoconfig.json file exists and is valid');
    process.exit(1);
  }
}

// Run the upload
uploadAutoconfig();
