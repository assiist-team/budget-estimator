const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Initialize Firebase Admin with project ID
const projectId = 'project-estimator-1584';

let app;
try {
  app = initializeApp({ 
    credential: applicationDefault(),
    projectId: projectId
  });
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin');
  console.error('Please ensure you have:');
  console.error('1. Run: firebase login');
  console.error('2. Run: firebase use project-estimator-1584');
  console.error('3. Set GOOGLE_APPLICATION_CREDENTIALS or use Application Default Credentials');
  process.exit(1);
}

const db = getFirestore(app);

// The 8 canonical rooms that the auto-configuration algorithm uses
const CANONICAL_ROOMS = [
  'living_room',
  'kitchen',
  'dining_room',
  'single_bedroom',
  'double_bedroom',
  'bunk_room',
  'rec_room',
  'outdoor_space'
];

async function markCanonicalRooms() {
  console.log('🔄 Starting Phase 1: Marking canonical rooms...\n');
  
  const roomTemplatesRef = db.collection('roomTemplates');
  const results = {
    updated: [],
    notFound: [],
    errors: []
  };

  for (const roomId of CANONICAL_ROOMS) {
    try {
      const roomDoc = roomTemplatesRef.doc(roomId);
      const snapshot = await roomDoc.get();
      
      if (!snapshot.exists) {
        console.log(`⚠️  Room "${roomId}" not found in database`);
        results.notFound.push(roomId);
        continue;
      }

      // Update the room with isCanonical flag
      await roomDoc.update({
        isCanonical: true,
        updatedAt: Timestamp.now()
      });

      const roomData = snapshot.data();
      console.log(`✅ Marked "${roomData.displayName}" (${roomId}) as canonical`);
      results.updated.push({
        id: roomId,
        displayName: roomData.displayName,
        category: roomData.category
      });
    } catch (error) {
      console.error(`❌ Error updating ${roomId}:`, error.message);
      results.errors.push({ roomId, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successfully updated: ${results.updated.length} rooms`);
  console.log(`⚠️  Not found: ${results.notFound.length} rooms`);
  console.log(`❌ Errors: ${results.errors.length} rooms`);
  
  if (results.updated.length > 0) {
    console.log('\n📋 Updated Rooms:');
    results.updated.forEach(room => {
      console.log(`   - ${room.displayName} (${room.id}) [${room.category}]`);
    });
  }
  
  if (results.notFound.length > 0) {
    console.log('\n⚠️  Rooms Not Found:');
    results.notFound.forEach(roomId => {
      console.log(`   - ${roomId}`);
    });
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(err => {
      console.log(`   - ${err.roomId}: ${err.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Phase 1 Complete!');
  console.log('='.repeat(60));
  console.log('\nNext Steps:');
  console.log('  - Phase 2: Add "Create Custom Room" UI in Admin');
  console.log('  - Phase 3: Update Room selection to show custom rooms');
  console.log('  - Phase 4: Testing\n');

  return results;
}

// Run the migration
markCanonicalRooms()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

