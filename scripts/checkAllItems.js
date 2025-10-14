// Check all items in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', 'client', '.env') });

// Firebase configuration
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

async function checkAllItems() {
  console.log('📦 Checking all items in Firestore...\n');

  const itemsCollection = collection(db, 'items');
  const snapshot = await getDocs(itemsCollection);

  console.log('📊 Total items:', snapshot.size);
  console.log('========================');

  if (snapshot.empty) {
    console.log('❌ No items found');
    return;
  }

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`  ${doc.id} -> "${data.name}" (${data.category})`);
  });
}

checkAllItems().catch(console.error);
