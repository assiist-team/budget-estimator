// Verification script to check if active fields were removed
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
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verifyCleanup() {
  console.log('🔍 Verifying cleanup of active fields...');
  
  try {
    // Check items collection
    const itemsCollection = collection(db, 'items');
    const itemsSnapshot = await getDocs(itemsCollection);
    
    let itemsWithActive = 0;
    let totalItems = 0;
    
    itemsSnapshot.forEach(doc => {
      totalItems++;
      if (doc.data().active !== undefined) {
        itemsWithActive++;
      }
    });
    
    // Check room templates collection
    const templatesCollection = collection(db, 'roomTemplates');
    const templatesSnapshot = await getDocs(templatesCollection);
    
    let templatesWithActive = 0;
    let totalTemplates = 0;
    
    templatesSnapshot.forEach(doc => {
      totalTemplates++;
      if (doc.data().active !== undefined) {
        templatesWithActive++;
      }
    });
    
    console.log('\n📊 Verification Results:');
    console.log(`Items: ${totalItems} total, ${itemsWithActive} still have active field`);
    console.log(`Room Templates: ${totalTemplates} total, ${templatesWithActive} still have active field`);
    
    if (itemsWithActive === 0 && templatesWithActive === 0) {
      console.log('\n✅ SUCCESS: All active fields have been removed!');
    } else {
      console.log('\n❌ WARNING: Some active fields still remain!');
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

verifyCleanup().catch(console.error);
