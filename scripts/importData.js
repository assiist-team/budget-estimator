// Data import script to convert CSV data to Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', 'client', '.env') });

// Initialize Firebase Client SDK with logged-in credentials
// Use the same configuration as the client application
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'project-estimator-1584',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('✓ Firebase Client SDK initialized with logged-in credentials');
console.log('✓ Ready to update Firestore room templates');

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

// Track CSV item names that don't have an explicit mapping (for manual review)
const unmappedCsvItemNames = new Set();

// Helper function to normalize item names from CSV to system item IDs
function normalizeItemName(itemName) {
  const name = itemName.toLowerCase().trim();

  // Define mapping for items that have different names in CSV vs system
  // Only include mappings that are exact matches or explicitly confirmed
  const nameMappings = {
  // Specific mappings based on user feedback
  'chair throw pillow': 'chair_throw_pillow',
  'chair throw blanket': 'throw_blanket_on_bed',
  'throw blanket on bed': 'throw_blanket_on_bed',
  'tv mount + install': 'tv_mount',

    // Exact matches from existing system
    'sofa/sectional': 'sofa_sectional',
    'coffee table': 'coffee_table',
    'side table': 'side_table',
    'tv console': 'tv_console',
    'tv mount': 'tv_mount',
    'area rug': 'area_rug',
    'lamps': 'lamps',
    'throw pillows': 'throw_pillows',
    'throw blanket': 'throw_blanket',
    'curtains': 'curtains',
    'curtain rod': 'curtain_rod',
    'wall art': 'wall_art',
    'greenery': 'greenery',
    'mirror': 'mirror',
    'chair': 'chair',
    'tv': 'tv',
    'dining table': 'dining_table',
    'dining chair': 'dining_chair',
    'bar stool': 'bar_stool',
    'nightstands': 'nightstands',
    'dresser': 'dresser',
    'mattress': 'mattress',
    'sheets': 'sheets',
    'sleeping pillows': 'sleeping_pillows',
    'bunk bed': 'bunk_bed',
    'bunk bed mattress': 'bunk_bed_mattress',
    'bench or stools': 'bench_or_stools',
    'ottoman or pouf': 'ottoman_or_pouf',
    'buffet or sideboard': 'buffet_or_sideboard',
    'display cabinet': 'display_cabinet',
    'bookshelf': 'bookshelf',
    'large game table': 'large_game_table',
    'game table': 'game_table',
    'games': 'games',
    'bean bag': 'bean_bag',
    'desk': 'desk',
    'island centerpiece': 'island_centerpiece',
    'counter accessories': 'counter_accessories',
    'kitchen towels': 'kitchen_towels',
    'kitchen runner rug': 'kitchen_runner_rug',
    'open shelving decor': 'open_shelving_decor',
    'top of cabinetry decor': 'top_of_cabinetry_decor',
    'table centerpiece': 'table_centerpiece',
    'nightstand accessories': 'nightstand_accessories',
    'dresser accessories': 'dresser_accessories',

  // Mappings for previously unmapped items
  'bed frame': 'king_bed_frame',
  'king bed frame': 'king_bed_frame',
    'curtain set': 'curtain_set',
    'decorative bedding': 'decorative_bedding',
    'desk accessories': 'desk_accessories',
    'desk chair': 'desk_chair',
    'down pillows': 'down_pillows',
    'floor lamp': 'floor_lamp',
    'lamps (table/floor)': 'lamps',
    'mattress protector': 'mattress_protector',
    'pillow protectors': 'pillow_protectors',
    'shelving accessories': 'open_shelving_decor'
  };

  // Check for exact matches first
  if (nameMappings[name]) {
    return nameMappings[name];
  }

  // Record unmapped CSV name for manual mapping review
  unmappedCsvItemNames.add(itemName.trim());

  // For items not in the mapping, use slugified version as a fallback
  // Maintains backward compatibility while highlighting unmapped names
  return slugify(name);
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
          unit: 'each',
          notes: '',
          createdAt: db ? new Date() : new Date(),
          updatedAt: db ? new Date() : new Date(),
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
          createdAt: db ? new Date() : new Date(),
          updatedAt: db ? new Date() : new Date()
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

    // Read file line by line and parse manually
    try {
      const content = fs.readFileSync(csvPath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        console.log(`CSV file ${csvPath} has insufficient data`);
        resolve(roomData);
        return;
      }

      // Skip the first line (title) and use the second line as headers
      const headerLine = lines[1];
      const headers = headerLine.split(',').map(h => h.trim());

      console.log(`Headers found: [${headers.join(', ')}]`);

      // Find quantity column indices
      const headersLower = headers.map(h => h.toLowerCase());
      const quantityColumnIndices = {
        small: headersLower.findIndex(h => /small/.test(h) && (/qty|qnty|quantity|rm|room/.test(h))),
        medium: headersLower.findIndex(h => (/mid|medium/.test(h) && (/qty|qnty|quantity|rm|room/.test(h)))),
        large: headersLower.findIndex(h => /large/.test(h) && (/qty|qnty|quantity|rm|room/.test(h)))
      };

      console.log(`Detected quantity columns for ${path.basename(csvPath)}:`, {
        small: headers[quantityColumnIndices.small] || 'not found',
        medium: headers[quantityColumnIndices.medium] || 'not found',
        large: headers[quantityColumnIndices.large] || 'not found'
      });

      // Process data rows (starting from line 2, index 2)
      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.includes('Totals') || line.includes('Pricing')) continue;

        const columns = line.split(',').map(col => col.trim());

        // Skip empty rows or total rows
        if (columns.length < 2 || columns[0].includes(' Totals') || columns[0].includes('Pricing')) continue;

        const itemName = columns[0];
        const itemNameClean = itemName.toLowerCase().trim();

        // Get quantities
        const smallQty = quantityColumnIndices.small >= 0 ? parseInt(columns[quantityColumnIndices.small] || '0') : 0;
        const mediumQty = quantityColumnIndices.medium >= 0 ? parseInt(columns[quantityColumnIndices.medium] || '0') : 0;
        const largeQty = quantityColumnIndices.large >= 0 ? parseInt(columns[quantityColumnIndices.large] || '0') : 0;

        // Skip items with zero quantities across all sizes
        if (smallQty === 0 && mediumQty === 0 && largeQty === 0) continue;

        // Convert item name to item ID
        const itemId = normalizeItemName(itemNameClean);

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

      console.log(`Parsed ${roomData.small.length + roomData.medium.length + roomData.large.length} items for ${csvPath}`);

      // Use hardcoded totals for now (these should match the CSV totals)
      const roomId = csvPath.split('/').pop().replace('1584 - Standard Room Items_Pricing Ranges - ', '').replace('.csv', '').toLowerCase().replace(' ', '_');

      const totals = getHardcodedRoomTotals(roomId);
      roomData.smallTotals = totals.small;
      roomData.mediumTotals = totals.medium;
      roomData.largeTotals = totals.large;

      resolve(roomData);
    } catch (error) {
      console.error('Error parsing CSV file:', error);
      reject(error);
    }
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

// Main import function
async function runImport() {
  console.log('Starting data import...\n');

  try {
    // Import items (for reference only - won't be imported to Firestore)
    console.log('1. Importing items from CSV...');
    const items = await importItems();
    console.log(`Found ${items.length} items (for reference only)\n`);

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

    // Export unmapped CSV item names for manual review and mapping
    const unmappedArray = Array.from(unmappedCsvItemNames).sort();
    fs.writeFileSync(
      path.join(outputDir, 'unmapped_items.json'),
      JSON.stringify(unmappedArray, null, 2)
    );
    console.log(`✓ Unmapped CSV item names exported to scripts/output/unmapped_items.json (${unmappedArray.length})`);

    // Import to Firestore if Firebase Admin is available
    if (db) {
      console.log('\n3. Importing room templates to Firestore...');
      try {
        // Skip creating new templates - only update existing ones
        console.log('✓ Skipping template creation (documents already exist in Firestore)');

        // Update ONLY the items arrays in existing room templates
        console.log('\n4. Updating items arrays in existing room templates...');
        await updateExistingRoomTemplates(templates);

        console.log('\n✅ Items arrays update complete!');
      } catch (error) {
        console.error('Error importing to Firestore:', error);
        console.log('Please import the JSON files manually using Firebase Console');
      }
    } else {
      console.log('\n✅ Data export complete!');
      console.log('\nNext steps:');
      console.log('1. Review the generated JSON files in scripts/output/');
      console.log('2. Import room templates from scripts/output/roomTemplates.json to Firestore');
      console.log('3. To enable automatic Firestore import, add service account credentials');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  }
}

// Update ONLY the items arrays in existing room templates
async function updateExistingRoomTemplates(templates) {
  try {
    const existingTemplates = await getDocs(collection(db, 'roomTemplates'));
    let updatedCount = 0;
    const updateDetails = [];

    // Process each template sequentially to avoid overwhelming Firestore
    for (const doc of existingTemplates.docs) {
      const existingTemplate = doc.data();
      const roomId = existingTemplate.id;

      // Find the corresponding template with populated items
      const templateWithItems = templates.find(t => t.id === roomId);

      if (templateWithItems) {
        let needsUpdate = false;
        const updatesBySize = {};

        // Check each size for missing items
        ['small', 'medium', 'large'].forEach(size => {
          const currentItems = existingTemplate.sizes?.[size]?.items || [];
          const newItems = templateWithItems.sizes[size]?.items || [];

          // Update if current items array is empty but we have items to add
          if (currentItems.length === 0 && newItems.length > 0) {
            needsUpdate = true;
            updatesBySize[size] = {
              currentCount: currentItems.length,
              newCount: newItems.length,
              itemsAdded: newItems.length
            };
            console.log(`   📝 ${roomId} ${size} size: ${newItems.length} items to add`);
          }
        });

        if (needsUpdate) {
          // Update ONLY the items arrays - nothing else
          const updateData = {};
          Object.keys(updatesBySize).forEach(size => {
            updateData[`sizes.${size}.items`] = templateWithItems.sizes[size].items;
          });

          const docRef = doc.ref;
          await updateDoc(docRef, updateData);

          updatedCount++;
          updateDetails.push({
            roomId,
            roomName: existingTemplate.name,
            updatesBySize
          });
        }
      }
    }

    if (updatedCount > 0) {
      console.log(`\n✅ Updated ${updatedCount} existing room templates with populated items arrays`);

      // Export detailed update report
      const updateReport = {
        updatedRooms: updatedCount,
        totalExistingTemplates: existingTemplates.docs.length,
        updateDetails,
        timestamp: new Date().toISOString()
      };

      fs.writeFileSync(
        path.join(__dirname, 'output', 'room_template_update_report.json'),
        JSON.stringify(updateReport, null, 2)
      );
      console.log(`✅ Detailed update report exported to scripts/output/room_template_update_report.json`);

      // Show summary
      console.log('\n📋 Update Summary:');
      updateDetails.forEach(detail => {
        console.log(`   ${detail.roomName}:`);
        Object.entries(detail.updatesBySize).forEach(([size, update]) => {
          console.log(`     ${size}: +${update.itemsAdded} items`);
        });
      });
    } else {
      console.log('\n✅ All existing room templates already have their items populated!');
    }
  } catch (error) {
    console.error('Error updating room templates:', error.message);
  }
}

// Run the import
runImport();
