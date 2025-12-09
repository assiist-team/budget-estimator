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

async function addOutdoorSpace() {
  const outdoorSpaceRef = db.collection('roomTemplates').doc('outdoor_space');

  const outdoorSpaceTemplate = {
    id: 'outdoor_space',
    name: 'Outdoor Space',
    displayName: 'Outdoor Space',
    description: 'Complete outdoor space setup with furnishings and accessories',
    category: 'common_spaces',
    icon: '🌳',
    sortOrder: 8, // After rec_room which is 7
    sizes: {
      small: {
        displayName: 'Small Outdoor Space',
        items: [], // Can be populated through admin interface
        totals: {
          low: 0,
          mid: 0,
          midHigh: 0,
          high: 0,
        },
      },
      medium: {
        displayName: 'Medium Outdoor Space',
        items: [], // Can be populated through admin interface
        totals: {
          low: 0,
          mid: 0,
          midHigh: 0,
          high: 0,
        },
      },
      large: {
        displayName: 'Large Outdoor Space',
        items: [], // Can be populated through admin interface
        totals: {
          low: 0,
          mid: 0,
          midHigh: 0,
          high: 0,
        },
      },
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await outdoorSpaceRef.set(outdoorSpaceTemplate);

  console.log('✅ Successfully added outdoor_space room template to Firestore');
  console.log('📝 Note: Items can be added through the admin interface');
}

addOutdoorSpace().catch((error) => {
  console.error('❌ Failed to add outdoor space room template', error);
  process.exit(1);
});

