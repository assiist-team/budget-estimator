# Phase 1 Implementation: Data Model Updates

## ✅ Completed Tasks

### Task 1.1: Update RoomTemplate Interface ✅
**Status:** Complete

Updated `client/src/types/index.ts` to add the `isCanonical` field to the RoomTemplate interface:

```typescript
export interface RoomTemplate {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'common_spaces' | 'sleeping_spaces' | 'other_spaces';
  icon?: string;
  isCanonical?: boolean;  // NEW: true for system rooms, false for custom rooms
  sizes: {
    small: RoomSize;
    medium: RoomSize;
    large: RoomSize;
  };
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Task 1.2: Mark Existing Rooms as Canonical ⏳
**Status:** Ready to Execute

Two migration scripts have been created:

#### Option A: Node.js Script (Requires Firebase CLI Authentication)
**File:** `scripts/mark-canonical-rooms.js`

**Prerequisites:**
1. Firebase CLI installed: `npm install -g firebase-tools`
2. Authenticated with Firebase: `firebase login`
3. Project selected: `firebase use project-estimator-1584`

**Run Command:**
```bash
node scripts/mark-canonical-rooms.js
```

#### Option B: Browser Console Script (Recommended - Easier)
**File:** `scripts/mark-canonical-rooms-browser.js`

**Instructions:**
1. Open your Project Estimator app in the browser
2. Navigate to the Admin page (make sure you're logged in as admin)
3. Open browser DevTools:
   - **Mac:** `Cmd + Option + I`
   - **Windows/Linux:** `F12` or `Ctrl + Shift + I`
4. Go to the **Console** tab
5. Copy the entire contents of `scripts/mark-canonical-rooms-browser.js`
6. Paste into the console and press Enter

**What It Does:**
The script will mark these 8 rooms as canonical:
- `living_room` - Living Room
- `kitchen` - Kitchen
- `dining_room` - Dining Room
- `single_bedroom` - Single Bedroom
- `double_bedroom` - Double Bedroom
- `bunk_room` - Bunk Room
- `rec_room` - Rec Room
- `outdoor_space` - Outdoor Space

## 🔍 Verification

After running the migration, you can verify it worked by:

1. **Check the console output** - Should show "✅ Successfully updated: 8 rooms"

2. **Query Firestore directly** in browser console:
```javascript
const { getFirestore, collection, getDocs } = window.firebase;
const db = getFirestore();
const snapshot = await getDocs(collection(db, 'roomTemplates'));
snapshot.docs.forEach(doc => {
  const data = doc.data();
  console.log(`${data.displayName}: isCanonical = ${data.isCanonical}`);
});
```

3. **Expected output:**
```
Living Room: isCanonical = true
Kitchen: isCanonical = true
Dining Room: isCanonical = true
Single Bedroom: isCanonical = true
Double Bedroom: isCanonical = true
Bunk Room: isCanonical = true
Rec Room: isCanonical = true
Outdoor Space: isCanonical = true
```

## 📋 Phase 1 Summary

| Component | Status | Time Spent | Notes |
|-----------|--------|------------|-------|
| TypeScript Interface Update | ✅ Complete | 15 min | Added `isCanonical?` field |
| Migration Script (Node.js) | ✅ Created | 30 min | Requires Firebase auth |
| Migration Script (Browser) | ✅ Created | 30 min | Runs in browser console |
| Execute Migration | ⏳ Pending | 5 min | User needs to run script |
| Testing & Verification | ⏳ Pending | 10 min | After migration runs |

**Total Time:** ~1.5 hours (as estimated)

## 🚀 Next Steps

Once the migration is complete, proceed to:

**Phase 2:** Admin UI - Room Creation (4-5 hours)
- Add "Create Custom Room" button in AdminPage
- Create form for new room types
- Implement room ID generation from display name
- Add validation for duplicate room IDs

**Phase 3:** Room Selection UI Updates (1-2 hours)
- Add optional "Custom" badge for custom rooms
- Ensure custom rooms appear in room selection

**Phase 4:** Testing (1-2 hours)
- Create test custom rooms (Library, Office, Gym, etc.)
- Test full estimator flow with custom rooms
- Verify pricing and calculations work correctly

## ⚠️ Troubleshooting

### Issue: Firebase authentication errors with Node.js script
**Solution:** Use the browser console script instead (Option B)

### Issue: "Firebase not found" in browser console
**Solution:** 
1. Make sure you're on the Project Estimator app page
2. Navigate to the Admin page first
3. Wait for the page to fully load
4. Try running the script again

### Issue: Permission denied errors
**Solution:** Make sure you're logged in as an admin user with proper Firestore permissions

## 📝 Technical Notes

- The `isCanonical` field is optional (`boolean?`) to maintain backward compatibility
- Undefined/null values are treated as `false` (custom rooms)
- The auto-configuration algorithm will continue to work with the 8 canonical rooms
- Custom rooms (where `isCanonical === false` or `undefined`) will NOT appear in auto-suggestions
- All rooms (canonical and custom) will appear in the room selection UI

## 🎯 Success Criteria

Phase 1 is complete when:
- [x] `isCanonical` field added to RoomTemplate interface
- [ ] Migration script successfully executed
- [ ] All 8 canonical rooms have `isCanonical: true` in Firestore
- [ ] Verification query shows correct values
- [ ] No errors or warnings in console
- [ ] Existing app functionality continues to work normally

