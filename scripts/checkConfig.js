// Check auto-configuration rules in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
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

async function checkConfig() {
  console.log('🔍 Checking auto-configuration rules in Firestore...\n');

  try {
    const configDoc = await getDoc(doc(db, 'config', 'roomMappingRules'));
    if (configDoc.exists()) {
      const data = configDoc.data();
      console.log('✅ Auto-configuration rules found in Firestore!');
      console.log('\n📊 Current validation settings:');
      console.log('  Min sqft:', data.validation.global.min_sqft);
      console.log('  Max sqft:', data.validation.global.max_sqft);
      console.log('  Min guests:', data.validation.global.min_guests);
      console.log('  Max guests:', data.validation.global.max_guests);

      console.log('\n📋 Full config data:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ No auto-configuration rules found in Firestore');
      console.log('📁 Will fall back to local autoconfig.json file');
    }
  } catch (error) {
    console.error('❌ Error checking Firestore:', error.message);
    process.exit(1);
  }
}

checkConfig();

