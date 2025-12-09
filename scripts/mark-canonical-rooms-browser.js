/**
 * Browser Console Migration Script
 * 
 * This script marks the 8 canonical rooms in Firestore.
 * Run this in the browser console while logged into the admin page.
 * 
 * Instructions:
 * 1. Open your Project Estimator app in the browser
 * 2. Navigate to the Admin page (make sure you're authenticated)
 * 3. Open browser DevTools (F12 or Cmd+Option+I)
 * 4. Go to the Console tab
 * 5. Copy and paste this entire script
 * 6. Press Enter to run
 */

(async function markCanonicalRooms() {
  console.log('🔄 Starting Phase 1: Marking canonical rooms...\n');
  
  // Check if Firebase is available
  if (typeof firebase === 'undefined' && typeof window.firebase === 'undefined') {
    console.error('❌ Firebase not found. Make sure you are on the Project Estimator app page.');
    console.log('💡 Try navigating to the Admin page first, then run this script.');
    return;
  }
  
  // Import Firestore functions
  const { getFirestore, doc, getDoc, updateDoc, serverTimestamp } = window.firebase || firebase;
  
  try {
    const db = getFirestore();
    
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
    
    const results = {
      updated: [],
      notFound: [],
      errors: []
    };
    
    for (const roomId of CANONICAL_ROOMS) {
      try {
        const roomRef = doc(db, 'roomTemplates', roomId);
        const roomSnap = await getDoc(roomRef);
        
        if (!roomSnap.exists()) {
          console.log(`⚠️  Room "${roomId}" not found in database`);
          results.notFound.push(roomId);
          continue;
        }
        
        // Update the room with isCanonical flag
        await updateDoc(roomRef, {
          isCanonical: true,
          updatedAt: serverTimestamp()
        });
        
        const roomData = roomSnap.data();
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
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure you are logged into the app as an admin');
    console.error('2. Try refreshing the page and running the script again');
    console.error('3. Check the browser console for any Firebase errors');
  }
})();

