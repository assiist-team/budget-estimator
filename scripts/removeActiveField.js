// Script to remove 'active' field from items in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
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
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function removeActiveFieldFromItems() {
  console.log('🔄 Starting cleanup of active field from items...');
  
  try {
    // Get all items
    const itemsCollection = collection(db, 'items');
    const itemsSnapshot = await getDocs(itemsCollection);
    
    if (itemsSnapshot.empty) {
      console.log('📭 No items found in Firestore');
      return;
    }
    
    console.log(`📋 Found ${itemsSnapshot.size} items`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Process each item
    for (const itemDoc of itemsSnapshot.docs) {
      const itemData = itemDoc.data();
      const itemId = itemDoc.id;
      
      if (itemData.active !== undefined) {
        // Remove the active field
        const { active, ...updateData } = itemData;
        
        await updateDoc(doc(db, 'items', itemId), updateData);
        updatedCount++;
        console.log(`✅ Updated item: ${itemId} (removed active field)`);
      } else {
        skippedCount++;
        console.log(`⏭️  Skipped item: ${itemId} (no active field)`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   • Items updated: ${updatedCount}`);
    console.log(`   • Items skipped: ${skippedCount}`);
    console.log(`   • Total items: ${itemsSnapshot.size}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

async function removeActiveFieldFromRoomTemplates() {
  console.log('🔄 Starting cleanup of active field from room templates...');
  
  try {
    // Get all room templates
    const templatesCollection = collection(db, 'roomTemplates');
    const templatesSnapshot = await getDocs(templatesCollection);
    
    if (templatesSnapshot.empty) {
      console.log('📭 No room templates found in Firestore');
      return;
    }
    
    console.log(`📋 Found ${templatesSnapshot.size} room templates`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Process each template
    for (const templateDoc of templatesSnapshot.docs) {
      const templateData = templateDoc.data();
      const templateId = templateDoc.id;
      
      if (templateData.active !== undefined) {
        // Remove the active field
        const { active, ...updateData } = templateData;
        
        await updateDoc(doc(db, 'roomTemplates', templateId), updateData);
        updatedCount++;
        console.log(`✅ Updated room template: ${templateId} (removed active field)`);
      } else {
        skippedCount++;
        console.log(`⏭️  Skipped room template: ${templateId} (no active field)`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   • Room templates updated: ${updatedCount}`);
    console.log(`   • Room templates skipped: ${skippedCount}`);
    console.log(`   • Total room templates: ${templatesSnapshot.size}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
async function main() {
  console.log('🧹 Firestore Active Field Cleanup');
  console.log('================================\n');
  
  await removeActiveFieldFromItems();
  console.log('\n' + '='.repeat(50) + '\n');
  await removeActiveFieldFromRoomTemplates();
  
  console.log('\n🎉 Cleanup completed!');
}

// Execute the script
main().catch(console.error);
