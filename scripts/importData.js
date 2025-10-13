// Data import script to convert CSV data to Firestore
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', 'client', '.env') });

// Initialize Firebase Admin
// TODO: Replace with your service account key
const serviceAccount = {
  // You'll need to download your Firebase service account key and place it here
  // or load it from a file
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'project-estimator-1584',
};

let db = null;

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  db = admin.firestore();
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.log('Note: Firebase Admin initialization skipped. Add service account credentials to use.');
  console.log('For now, this script will generate the data structure for manual import.');
  console.log('Error:', error.message);
}

// Helper function to parse currency string to cents
function parseCurrency(value) {
  if (!value || value === '' || value === '-') return 0;
  const cleaned = value.toString().replace(/[$,]/g, '');
  const dollars = parseFloat(cleaned);
  return Math.round(dollars * 100);
}

// Helper function to create slug from name
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Import items from Item Pricing CSV
async function importItems() {
  const items = [];
  const csvPath = path.join(__dirname, '..', 'initial_dataset', '1584 - Standard Room Items_Pricing Ranges - Item Pricing.csv');

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(csvPath)) {
      console.log('CSV file not found:', csvPath);
      reject(new Error('CSV file not found'));
      return;
    }

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        const item = {
          id: slugify(row.Item || row.item),
          name: row.Item || row.item,
          category: inferCategory(row.Item || row.item),
          budgetPrice: parseCurrency(row['Budget Price'] || row['budget']),
          midPrice: parseCurrency(row['Mid Price'] || row['mid']),
          midHighPrice: parseCurrency(row['Mid/High Price'] || row['midhigh']),
          highPrice: parseCurrency(row['High Price'] || row['high']),
          active: true,
          unit: 'each',
          notes: '',
          createdAt: db ? admin.firestore.FieldValue.serverTimestamp() : new Date(),
          updatedAt: db ? admin.firestore.FieldValue.serverTimestamp() : new Date(),
        };

        if (item.name && item.budgetPrice > 0) {
          items.push(item);
        }
      })
      .on('end', () => {
        console.log(`Parsed ${items.length} items from CSV`);
        resolve(items);
      })
      .on('error', reject);
  });
}

// Infer category from item name
function inferCategory(itemName) {
  const name = itemName.toLowerCase();
  
  const categoryMap = {
    'bed': 'bedroom_furniture',
    'mattress': 'bedroom_furniture',
    'nightstand': 'bedroom_furniture',
    'dresser': 'bedroom_furniture',
    'sofa': 'living_room_furniture',
    'sectional': 'living_room_furniture',
    'chair': 'living_room_furniture',
    'coffee table': 'living_room_furniture',
    'side table': 'living_room_furniture',
    'dining table': 'dining_furniture',
    'dining chair': 'dining_furniture',
    'bar stool': 'kitchen_furniture',
    'curtain': 'textiles',
    'rug': 'textiles',
    'pillow': 'textiles',
    'sheet': 'textiles',
    'blanket': 'textiles',
    'bedding': 'textiles',
    'lamp': 'lighting',
    'chandelier': 'lighting',
    'mirror': 'decorative',
    'art': 'decorative',
    'wall art': 'decorative',
    'plant': 'decorative',
    'greenery': 'decorative',
    'tv': 'electronics',
    'television': 'electronics',
  };

  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (name.includes(keyword)) {
      return category;
    }
  }

  return 'accessories';
}

// Import room data from all CSV files
async function importRoomData() {
  const roomData = {};

  // Map CSV filenames to room IDs
  const roomFiles = {
    '1584 - Standard Room Items_Pricing Ranges - Living Room.csv': 'living_room',
    '1584 - Standard Room Items_Pricing Ranges - Kitchen.csv': 'kitchen',
    '1584 - Standard Room Items_Pricing Ranges - Dining Room.csv': 'dining_room',
    '1584 - Standard Room Items_Pricing Ranges - Single Bedroom.csv': 'single_bedroom',
    '1584 - Standard Room Items_Pricing Ranges - Double Bedroom.csv': 'double_bedroom',
    '1584 - Standard Room Items_Pricing Ranges - Bunk Room.csv': 'bunk_room',
    '1584 - Standard Room Items_Pricing Ranges - Rec Room.csv': 'rec_room'
  };

  // Room configuration
  const roomTypes = [
    { id: 'living_room', name: 'Living Room', category: 'common_spaces', icon: '🛋️' },
    { id: 'kitchen', name: 'Kitchen', category: 'common_spaces', icon: '🍳' },
    { id: 'dining_room', name: 'Dining Room', category: 'common_spaces', icon: '🍽️' },
    { id: 'single_bedroom', name: 'Single Bedroom', category: 'sleeping_spaces', icon: '🛏️' },
    { id: 'double_bedroom', name: 'Double Bedroom', category: 'sleeping_spaces', icon: '🛏️' },
    { id: 'bunk_room', name: 'Bunk Room', category: 'sleeping_spaces', icon: '🛏️' },
    { id: 'rec_room', name: 'Rec Room', category: 'common_spaces', icon: '🎮' }
  ];

  for (const roomType of roomTypes) {
    const csvFileName = Object.keys(roomFiles).find(file => roomFiles[file] === roomType.id);
    if (!csvFileName) continue;

    const csvPath = path.join(__dirname, '..', 'initial_dataset', csvFileName);

    try {
      // Parse the CSV to get actual room items
      const roomItems = await parseRoomCSV(csvPath);

      if (roomItems) {
        roomData[roomType.id] = {
          id: roomType.id,
          name: roomType.name,
          displayName: roomType.name,
          description: `Complete ${roomType.name.toLowerCase()} setup with furnishings`,
          category: roomType.category,
          icon: roomType.icon,
          active: true,
          sortOrder: roomTypes.findIndex(r => r.id === roomType.id) + 1,
          sizes: {
            small: {
              displayName: `Small ${roomType.name}`,
              items: roomItems.small,
              totals: {
                budget: Math.round(roomItems.smallTotals.budget * 100),
                mid: Math.round(roomItems.smallTotals.mid * 100),
                midHigh: Math.round(roomItems.smallTotals.midHigh * 100),
                high: Math.round(roomItems.smallTotals.high * 100)
              }
            },
            medium: {
              displayName: `Medium ${roomType.name}`,
              items: roomItems.medium,
              totals: {
                budget: Math.round(roomItems.mediumTotals.budget * 100),
                mid: Math.round(roomItems.mediumTotals.mid * 100),
                midHigh: Math.round(roomItems.mediumTotals.midHigh * 100),
                high: Math.round(roomItems.mediumTotals.high * 100)
              }
            },
            large: {
              displayName: `Large ${roomType.name}`,
              items: roomItems.large,
              totals: {
                budget: Math.round(roomItems.largeTotals.budget * 100),
                mid: Math.round(roomItems.largeTotals.mid * 100),
                midHigh: Math.round(roomItems.largeTotals.midHigh * 100),
                high: Math.round(roomItems.largeTotals.high * 100)
              }
            }
          },
          createdAt: db ? admin.firestore.FieldValue.serverTimestamp() : new Date(),
          updatedAt: db ? admin.firestore.FieldValue.serverTimestamp() : new Date()
        };
      }
    } catch (error) {
      console.error(`Error parsing ${csvFileName}:`, error.message);
      // Use default values if CSV parsing fails
      createDefaultRoomData(roomData, roomType);
    }
  }

  return roomData;
}

// Parse CSV file to extract room items and totals
async function parseRoomCSV(csvPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(csvPath)) {
      console.log('CSV file not found:', csvPath);
      reject(new Error('CSV file not found'));
      return;
    }

    const roomData = {
      small: [],
      medium: [],
      large: [],
      smallTotals: { budget: 0, mid: 0, midHigh: 0, high: 0 },
      mediumTotals: { budget: 0, mid: 0, midHigh: 0, high: 0 },
      largeTotals: { budget: 0, mid: 0, midHigh: 0, high: 0 }
    };

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        // Skip header rows and total rows
        if (row.Item && !row.Item.includes('Totals') && !row.Item.includes('Pricing')) {
          const itemName = row.Item.toLowerCase().trim();
          const smallQty = parseInt(row['Small Rm Qnty'] || row['Small Room Quantity'] || '0');
          const mediumQty = parseInt(row['Mid Rm Qnty'] || row['Medium Room Quantity'] || '0');
          const largeQty = parseInt(row['Large Rm Qnty'] || row['Large Room Quantity'] || '0');

          // Skip items with zero quantities
          if (smallQty === 0 && mediumQty === 0 && largeQty === 0) return;

          // Convert item name to item ID
          const itemId = slugify(itemName);

          // Add items for each size if quantity > 0
          if (smallQty > 0) {
            roomData.small.push({ itemId, quantity: smallQty });
          }
          if (mediumQty > 0) {
            roomData.medium.push({ itemId, quantity: mediumQty });
          }
          if (largeQty > 0) {
            roomData.large.push({ itemId, quantity: largeQty });
          }
        }
      })
      .on('end', () => {
        // Calculate totals from the CSV data at the end
        // For now, we'll use placeholder totals until we can properly parse them
        roomData.smallTotals = { budget: 8285, mid: 16890, midHigh: 29640, high: 58840 };
        roomData.mediumTotals = { budget: 11215, mid: 22030, midHigh: 37830, high: 75880 };
        roomData.largeTotals = { budget: 16615, mid: 31670, midHigh: 55420, high: 109220 };

        resolve(roomData);
      })
      .on('error', reject);
  });
}

// Get hardcoded room totals based on CSV data
function getHardcodedRoomTotals(roomId) {
  const roomTotals = {
    living_room: {
      small: {
        budget: 8285,      // $8.285 -> 828500 cents
        mid: 16890,        // $16.890 -> 1689000 cents
        midHigh: 29640,    // $29.640 -> 2964000 cents
        high: 58840        // $58.840 -> 5884000 cents
      },
      medium: {
        budget: 11215,     // $11.215 -> 1121500 cents
        mid: 22030,        // $22.030 -> 2203000 cents
        midHigh: 37830,    // $37.830 -> 3783000 cents
        high: 75880        // $75.880 -> 7588000 cents
      },
      large: {
        budget: 16615,     // $16.615 -> 1661500 cents
        mid: 31670,        // $31.670 -> 3167000 cents
        midHigh: 55420,    // $55.420 -> 5542000 cents
        high: 109220       // $109.220 -> 10922000 cents
      }
    },
    kitchen: {
      small: {
        budget: 1480,      // $1.480 -> 148000 cents
        mid: 3945,         // $3.945 -> 394500 cents
        midHigh: 7500,     // $7.500 -> 750000 cents
        high: 18460        // $18.460 -> 1846000 cents
      },
      medium: {
        budget: 3700,      // $3.700 -> 370000 cents
        mid: 8990,         // $8.990 -> 899000 cents
        midHigh: 17850,    // $17.850 -> 1785000 cents
        high: 42620        // $42.620 -> 4262000 cents
      },
      large: {
        budget: 5920,      // $5.920 -> 592000 cents
        mid: 14035,        // $14.035 -> 1403500 cents
        midHigh: 28200,    // $28.200 -> 2820000 cents
        high: 66780        // $66.780 -> 6678000 cents
      }
    },
    single_bedroom: {
      small: {
        budget: 5095,      // $5.095 -> 509500 cents
        mid: 11790,        // $11.790 -> 1179000 cents
        midHigh: 14652,    // $14.652 -> 1465200 cents
        high: 34536        // $34.536 -> 3453600 cents
      },
      medium: {
        budget: 6100,      // $6.100 -> 610000 cents
        mid: 14320,        // $14.320 -> 1432000 cents
        midHigh: 20577,    // $20.577 -> 2057700 cents
        high: 47136        // $47.136 -> 4713600 cents
      },
      large: {
        budget: 7875,      // $7.875 -> 787500 cents
        mid: 18100,        // $18.100 -> 1810000 cents
        midHigh: 28202,    // $28.202 -> 2820200 cents
        high: 62936        // $62.936 -> 6293600 cents
      }
    },
    dining_room: {
      small: {
        budget: 4205,      // $4.205 -> 420500 cents
        mid: 8355,         // $8.355 -> 835500 cents
        midHigh: 13705,    // $13.705 -> 1370500 cents
        high: 48105        // $48.105 -> 4810500 cents
      },
      medium: {
        budget: 6680,      // $6.680 -> 668000 cents
        mid: 12780,        // $12.780 -> 1278000 cents
        midHigh: 21130,    // $21.130 -> 2113000 cents
        high: 70830        // $70.830 -> 7083000 cents
      },
      large: {
        budget: 14455,     // $14.455 -> 1445500 cents
        mid: 27955,        // $27.955 -> 2795500 cents
        midHigh: 46155,    // $46.155 -> 4615500 cents
        high: 151555       // $151.555 -> 15155500 cents
      }
    },
    double_bedroom: {
      small: {
        budget: 7245,      // $7.245 -> 724500 cents
        mid: 16320,        // $16.320 -> 1632000 cents
        midHigh: 33260,    // $33.260 -> 3326000 cents
        high: 77800        // $77.800 -> 7780000 cents
      },
      medium: {
        budget: 10355,     // $10.355 -> 1035500 cents
        mid: 21500,        // $21.500 -> 2150000 cents
        midHigh: 43660,    // $43.660 -> 4366000 cents
        high: 101000       // $101.000 -> 10100000 cents
      },
      large: {
        budget: 12790,     // $12.790 -> 1279000 cents
        mid: 25460,        // $25.460 -> 2546000 cents
        midHigh: 51260,    // $51.260 -> 5126000 cents
        high: 117600       // $117.600 -> 11760000 cents
      }
    },
    bunk_room: {
      small: {
        budget: 7335,      // $7.335 -> 733500 cents
        mid: 11935,        // $11.935 -> 1193500 cents
        midHigh: 16700,    // $16.700 -> 1670000 cents
        high: 33000        // $33.000 -> 3300000 cents
      },
      medium: {
        budget: 9595,      // $9.595 -> 959500 cents
        mid: 15850,        // $15.850 -> 1585000 cents
        midHigh: 22850,    // $22.850 -> 2285000 cents
        high: 44900        // $44.900 -> 4490000 cents
      },
      large: {
        budget: 17550,     // $17.550 -> 1755000 cents
        mid: 30295,        // $30.295 -> 3029500 cents
        midHigh: 45600,    // $45.600 -> 4560000 cents
        high: 93000        // $93.000 -> 9300000 cents
      }
    },
    rec_room: {
      small: {
        budget: 9785,      // $9.785 -> 978500 cents
        mid: 4600,         // $4.600 -> 460000 cents
        midHigh: 8000,     // $8.000 -> 800000 cents
        high: 10000        // $10.000 -> 1000000 cents
      },
      medium: {
        budget: 15805,     // $15.805 -> 1580500 cents
        mid: 9200,         // $9.200 -> 920000 cents
        midHigh: 16000,    // $16.000 -> 1600000 cents
        high: 20000        // $20.000 -> 2000000 cents
      },
      large: {
        budget: 23095,     // $23.095 -> 2309500 cents
        mid: 12200,        // $12.200 -> 1220000 cents
        midHigh: 24000,    // $24.000 -> 2400000 cents
        high: 30000        // $30.000 -> 3000000 cents
      }
    }
  };

  return roomTotals[roomId] || {
    small: { budget: 7245, mid: 16320, midHigh: 33260, high: 77800 },
    medium: { budget: 10355, mid: 21500, midHigh: 43660, high: 101000 },
    large: { budget: 12790, mid: 25460, midHigh: 51260, high: 117600 }
  };
}

// Fallback function to create default room data if CSV parsing fails
function createDefaultRoomData(roomData, roomType) {
  const basicItems = [
    { itemId: 'basic_furniture', quantity: 1 },
    { itemId: 'decorative_items', quantity: 2 },
    { itemId: 'lighting', quantity: 1 }
  ];

  roomData[roomType.id] = {
    id: roomType.id,
    name: roomType.name,
    displayName: roomType.name,
    description: `Complete ${roomType.name.toLowerCase()} setup with furnishings`,
    category: roomType.category,
    icon: roomType.icon,
    active: true,
    sortOrder: roomTypes.findIndex(r => r.id === roomType.id) + 1,
    sizes: {
      small: {
        displayName: `Small ${roomType.name}`,
        items: basicItems,
        totals: {
          budget: 800000,    // $8,000 - fallback
          mid: 1500000,      // $15,000
          midHigh: 2500000,  // $25,000
          high: 4000000      // $40,000
        }
      },
      medium: {
        displayName: `Medium ${roomType.name}`,
        items: basicItems.map(item => ({ ...item, quantity: Math.ceil(item.quantity * 1.5) })),
        totals: {
          budget: 1200000,   // $12,000
          mid: 2250000,      // $22,500
          midHigh: 3750000,  // $37,500
          high: 6000000      // $60,000
        }
      },
      large: {
        displayName: `Large ${roomType.name}`,
        items: basicItems.map(item => ({ ...item, quantity: item.quantity * 2 })),
        totals: {
          budget: 1600000,   // $16,000
          mid: 3000000,      // $30,000
          midHigh: 5000000,  // $50,000
          high: 8000000      // $80,000
        }
      }
    },
    createdAt: db ? admin.firestore.FieldValue.serverTimestamp() : new Date(),
    updatedAt: db ? admin.firestore.FieldValue.serverTimestamp() : new Date()
  };
}

// Calculate room totals based on items
function calculateRoomTotal(items, size) {
  let multiplier = 1;
  if (size === 'medium') multiplier = 1.5;
  if (size === 'large') multiplier = 2;

  // For now, use placeholder totals - in a real implementation,
  // you'd look up actual prices from the items collection
  const baseTotal = 1000000; // $10,000 base
  return {
    budget: Math.round(baseTotal * multiplier),
    mid: Math.round(baseTotal * 2 * multiplier),
    midHigh: Math.round(baseTotal * 3.5 * multiplier),
    high: Math.round(baseTotal * 7 * multiplier)
  };
}

// Helper functions for room metadata
function formatRoomName(roomName) {
  return roomName.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function formatRoomDisplayName(roomName) {
  return formatRoomName(roomName);
}

function getRoomDescription(roomId) {
  const descriptions = {
    'living_room': 'Common living space with seating',
    'kitchen': 'Kitchen space with appliances and furnishings',
    'dining_room': 'Dining space with table and seating',
    'single_bedroom': 'Guest bedroom with one bed',
    'double_bedroom': 'Bedroom with two beds',
    'bunk_room': 'Room with bunk beds',
    'rec_room': 'Recreation/entertainment room'
  };
  return descriptions[roomId] || 'Room description';
}

function getRoomCategory(roomId) {
  const categories = {
    'living_room': 'common_spaces',
    'kitchen': 'common_spaces',
    'dining_room': 'common_spaces',
    'rec_room': 'common_spaces',
    'single_bedroom': 'sleeping_spaces',
    'double_bedroom': 'sleeping_spaces',
    'bunk_room': 'sleeping_spaces'
  };
  return categories[roomId] || 'common_spaces';
}

function getRoomIcon(roomId) {
  const icons = {
    'living_room': '🛋️',
    'kitchen': '🍳',
    'dining_room': '🍽️',
    'single_bedroom': '🛏️',
    'double_bedroom': '🛏️',
    'bunk_room': '🛏️',
    'rec_room': '🎮'
  };
  return icons[roomId] || '🏠';
}

function getRoomSortOrder(roomId) {
  const orders = {
    'living_room': 1,
    'kitchen': 2,
    'dining_room': 3,
    'single_bedroom': 4,
    'double_bedroom': 5,
    'bunk_room': 6,
    'rec_room': 7
  };
  return orders[roomId] || 99;
}

// Create room templates (legacy function for backward compatibility)
function createRoomTemplates() {
  const templates = [
    {
      id: 'living_room',
      name: 'Living Room',
      displayName: 'Living Room',
      description: 'Common living space with seating',
      category: 'common_spaces',
      icon: '🛋️',
      active: true,
      sortOrder: 1,
    },
    {
      id: 'kitchen',
      name: 'Kitchen',
      displayName: 'Kitchen',
      description: 'Kitchen space with appliances and furnishings',
      category: 'common_spaces',
      icon: '🍳',
      active: true,
      sortOrder: 2,
    },
    {
      id: 'dining_room',
      name: 'Dining Room',
      displayName: 'Dining Room',
      description: 'Dining space with table and seating',
      category: 'common_spaces',
      icon: '🍽️',
      active: true,
      sortOrder: 3,
    },
    {
      id: 'single_bedroom',
      name: 'Single Bedroom',
      displayName: 'Single Bedroom',
      description: 'Guest bedroom with one bed',
      category: 'sleeping_spaces',
      icon: '🛏️',
      active: true,
      sortOrder: 4,
    },
    {
      id: 'double_bedroom',
      name: 'Double Bedroom',
      displayName: 'Double Bedroom',
      description: 'Bedroom with two beds',
      category: 'sleeping_spaces',
      icon: '🛏️',
      active: true,
      sortOrder: 5,
    },
    {
      id: 'bunk_room',
      name: 'Bunk Room',
      displayName: 'Bunk Room',
      description: 'Room with bunk beds',
      category: 'sleeping_spaces',
      icon: '🛏️',
      active: true,
      sortOrder: 6,
    },
    {
      id: 'rec_room',
      name: 'Rec Room',
      displayName: 'Rec Room',
      description: 'Recreation/entertainment room',
      category: 'common_spaces',
      icon: '🎮',
      active: true,
      sortOrder: 7,
    },
  ];

  return templates;
}

// Main import function
async function runImport() {
  console.log('Starting data import...\n');

  try {
    // Import items
    console.log('1. Importing items from CSV...');
    const items = await importItems();
    console.log(`Found ${items.length} items to import\n`);

    // Create room templates with pricing data
    console.log('2. Creating room templates with pricing data...');
    const roomData = await importRoomData();
    const templates = Object.values(roomData);
    console.log(`Created ${templates.length} room templates with pricing data\n`);

    // Export as JSON for manual review/import
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    fs.writeFileSync(
      path.join(outputDir, 'items.json'),
      JSON.stringify(items, null, 2)
    );
    console.log('✓ Items exported to scripts/output/items.json');

    fs.writeFileSync(
      path.join(outputDir, 'roomTemplates.json'),
      JSON.stringify(templates, null, 2)
    );
    console.log('✓ Room templates exported to scripts/output/roomTemplates.json');

    fs.writeFileSync(
      path.join(outputDir, 'roomData.json'),
      JSON.stringify(roomData, null, 2)
    );
    console.log('✓ Room data exported to scripts/output/roomData.json');

    // Import to Firestore if Firebase Admin is available
    if (db) {
      console.log('\n3. Importing data to Firestore...');
      try {
        // Import items
        const batch = db.batch();
        items.forEach(item => {
          const docRef = db.collection('items').doc(item.id);
          batch.set(docRef, item);
        });

        await batch.commit();
        console.log(`✓ Imported ${items.length} items to Firestore`);

        // Import room templates
        const templateBatch = db.batch();
        templates.forEach(template => {
          const docRef = db.collection('roomTemplates').doc(template.id);
          templateBatch.set(docRef, template);
        });

        await templateBatch.commit();
        console.log(`✓ Imported ${templates.length} room templates to Firestore`);

        // Also import as roomData collection for easier lookup
        const roomDataBatch = db.batch();
        Object.entries(roomData).forEach(([roomId, room]) => {
          const docRef = db.collection('roomData').doc(roomId);
          roomDataBatch.set(docRef, room);
        });

        await roomDataBatch.commit();
        console.log(`✓ Imported ${Object.keys(roomData).length} room data entries to Firestore`);

        console.log('\n✅ Data import complete!');
      } catch (error) {
        console.error('Error importing to Firestore:', error);
        console.log('Please import the JSON files manually using Firebase Console');
      }
    } else {
      console.log('\n✅ Data export complete!');
      console.log('\nNext steps:');
      console.log('1. Review the generated JSON files in scripts/output/');
      console.log('2. Set up Firebase project and add service account credentials');
      console.log('3. Import the data to Firestore using Firebase Console or this script');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  }
}

// Run the import
runImport();

