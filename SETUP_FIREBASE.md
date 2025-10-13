# Firebase Setup Guide

This guide will walk you through setting up Firebase for the 1584 Project Estimator.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `project-estimator-1584`
4. Disable Google Analytics (optional for now)
5. Click "Create project"

## Step 2: Set up Firestore Database

1. In the Firebase Console, go to "Build" → "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll add security rules later)
4. Select a Cloud Firestore location (choose closest to your users)
5. Click "Enable"

## Step 3: Create Collections

### Method 1: Using Firebase Console (Recommended for Phase 1)

#### Create `roomTemplates` Collection

1. In Firestore, click "Start collection"
2. Collection ID: `roomTemplates`
3. Add the following documents:

**Document ID: `living_room`**
```json
{
  "id": "living_room",
  "name": "Living Room",
  "displayName": "Living Room",
  "description": "Common living space with seating",
  "category": "common_spaces",
  "icon": "🛋️",
  "sortOrder": 1,
  "sizes": {
    "small": {
      "displayName": "Small Living Room",
      "items": [],
      "totals": {
        "budget": 828500,
        "mid": 1689000,
        "midHigh": 2964000,
        "high": 5884000
      }
    },
    "medium": {
      "displayName": "Medium Living Room",
      "items": [],
      "totals": {
        "budget": 1245000,
        "mid": 2533500,
        "midHigh": 4446000,
        "high": 8826000
      }
    },
    "large": {
      "displayName": "Large Living Room",
      "items": [],
      "totals": {
        "budget": 1661500,
        "mid": 3167000,
        "midHigh": 5542000,
        "high": 10922000
      }
    }
  },
  "createdAt": [Current Timestamp],
  "updatedAt": [Current Timestamp]
}
```

Repeat this process for other room types:
- `kitchen`
- `dining_area`
- `single_bedroom`
- `double_bedroom`
- `bunk_room`
- `rec_room`

See `scripts/output/roomTemplates.json` for complete data after running the import script.

#### Create `estimates` Collection

This collection will be populated automatically when users submit estimates. No need to create it manually.

#### Create `items` Collection (Phase 2)

This collection is for Phase 2 when we add detailed item-level management. For now, room templates have pre-calculated totals.

### Method 2: Using Import Script

1. Navigate to scripts directory:
   ```bash
   cd scripts
   npm install
   ```

2. Run the import script:
   ```bash
   npm run import
   ```

3. This generates JSON files in `scripts/output/`

4. Import to Firestore using Firebase CLI or Console

## Step 4: Get Firebase Configuration

1. In Firebase Console, click the gear icon → "Project settings"
2. Scroll down to "Your apps" section
3. Click the web icon (</>) to add a web app
4. Register app name: "Project Estimator Client"
5. Copy the configuration object

## Step 5: Configure Client App

1. Create `.env` file in `client/` directory:
   ```bash
   cd client
   cp .env.example .env
   ```

2. Add your Firebase configuration to `.env`:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
   VITE_FIREBASE_PROJECT_ID=project-estimator-1584
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
   VITE_FIREBASE_APP_ID=your_app_id_here
   ```

## Step 6: Set up Firestore Security Rules

For Phase 1 (development/testing), use these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Room templates - read only
    match /roomTemplates/{document=**} {
      allow read: if true;
      allow write: if false; // Only admins can write (via console)
    }
    
    // Estimates - allow anyone to create
    match /estimates/{document=**} {
      allow create: if true;
      allow read: if true; // For admin dashboard
      allow update, delete: if false;
    }
    
    // Items - read only (for future use)
    match /items/{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

**Note:** These are permissive rules for development. For production, implement proper authentication and authorization.

## Step 7: Create Firestore Indexes

Some queries require composite indexes. Create these in Firestore → Indexes:

### Collection: `estimates`
- Fields: `status` (Ascending), `createdAt` (Descending)
- Fields: `createdAt` (Descending)

### Collection: `roomTemplates`
- Fields: `sortOrder` (Ascending)

**Note:** Firebase will automatically prompt you to create indexes when needed.

## Step 8: Test the Connection

1. Start the development server:
   ```bash
   cd client
   npm run dev
   ```

2. Open `http://localhost:5173`

3. Complete an estimate and submit

4. Check Firebase Console → Firestore to see the new estimate document

## Troubleshooting

### Error: "Missing or insufficient permissions"
- Check Firestore Security Rules
- Ensure rules allow read/write for the collections you're accessing

### Error: "Firebase: No Firebase App '[DEFAULT]' has been created"
- Verify `.env` file exists and has correct values
- Ensure environment variables start with `VITE_`
- Restart dev server after changing `.env`

### Error: "Index required"
- Click the link in the error message to auto-create the index
- Or create manually in Firebase Console → Firestore → Indexes

### Data not appearing
- Check browser console for errors
- Verify collection names match exactly (case-sensitive)
- Check Firestore Rules allow read access

## Next Steps

Once Firebase is set up:

1. ✅ Test creating an estimate
2. ✅ Verify data appears in Firestore
3. ✅ Check admin dashboard shows estimates
4. 📧 Set up email delivery (Phase 1)
5. 📄 Add PDF generation (Phase 1)
6. 🎨 Polish UI and mobile responsive (Phase 2)
7. 🔐 Add authentication for admin (Phase 2)
8. 🔗 HighLevel CRM integration (Phase 3)

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Console](https://console.firebase.google.com/)

