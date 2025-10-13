// Seed Firestore with room templates using client SDK
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
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

// Load data from generated JSON files
function loadRoomTemplates() {
  try {
    const roomTemplatesPath = path.join(__dirname, 'output', 'roomTemplates.json');
    const data = fs.readFileSync(roomTemplatesPath, 'utf8');
    const templates = JSON.parse(data);

    // Convert date strings back to Date objects since JSON doesn't preserve Date types
    return templates.map(template => ({
      ...template,
      createdAt: new Date(template.createdAt),
      updatedAt: new Date(template.updatedAt),
    }));
  } catch (error) {
    console.error('Error loading room templates:', error.message);
    return [];
  }
}

function loadItems() {
  try {
    const itemsPath = path.join(__dirname, 'output', 'items.json');
    const data = fs.readFileSync(itemsPath, 'utf8');
    const items = JSON.parse(data);

    // Convert date strings back to Date objects
    return items.map(item => ({
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));
  } catch (error) {
    console.error('Error loading items:', error.message);
    return [];
  }
}

function loadRoomData() {
  try {
    const roomDataPath = path.join(__dirname, 'output', 'roomData.json');
    const data = fs.readFileSync(roomDataPath, 'utf8');
    const roomData = JSON.parse(data);

    // Convert date strings back to Date objects
    Object.keys(roomData).forEach(roomId => {
      roomData[roomId].createdAt = new Date(roomData[roomId].createdAt);
      roomData[roomId].updatedAt = new Date(roomData[roomId].updatedAt);
    });

    return roomData;
  } catch (error) {
    console.error('Error loading room data:', error.message);
    return {};
  }
}

const roomTemplates = loadRoomTemplates();
const items = loadItems();
const roomData = loadRoomData();

// Seed function
async function seedFirestore() {
  console.log('🌱 Seeding Firestore with data...\n');

  try {
    // Import items first
    console.log('📦 Importing items...');
    for (const item of items) {
      const docRef = doc(db, 'items', item.id);
      await setDoc(docRef, item);
    }
    console.log(`✅ Imported ${items.length} items`);

    // Import room templates
    console.log('🏠 Importing room templates...');
    for (const template of roomTemplates) {
      const docRef = doc(db, 'roomTemplates', template.id);
      await setDoc(docRef, template);
      console.log(`✓ Added ${template.displayName}`);
    }
    console.log(`✅ Imported ${roomTemplates.length} room templates`);

    // Import room data
    console.log('📋 Importing room data...');
    for (const [roomId, room] of Object.entries(roomData)) {
      const docRef = doc(db, 'roomData', roomId);
      await setDoc(docRef, room);
    }
    console.log(`✅ Imported ${Object.keys(roomData).length} room data entries`);

    console.log('\n🎉 Successfully seeded all data to Firestore!');
    console.log('\nYou can now:');
    console.log('1. Test the app at http://localhost:5174');
    console.log('2. Submit an estimate to see it in Firestore');
    console.log('3. Check the admin dashboard');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Firestore:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure your .env file has correct Firebase config');
    console.log('2. Check that Firestore security rules allow writes');
    console.log('3. Verify the JSON files exist in scripts/output/');
    process.exit(1);
  }
}

// Run the seed
seedFirestore();

