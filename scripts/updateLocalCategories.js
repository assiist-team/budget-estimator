// Script to update local items.json with new categories
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Category mapping (same as used in Firestore update)
const categoryMapping = {
  // Room-specific furniture becomes just Furniture
  'bedroom_furniture': 'Furniture',
  'living_room_furniture': 'Furniture',
  'kitchen_furniture': 'Kitchen', // Kitchen furniture stays in Kitchen
  'dining_furniture': 'Furniture',

  // Already correct categories
  'textiles': 'Textiles',
  'lighting': 'Lighting',
  'accessories': 'Accessories',
  'decorative': 'Accessories', // Decorative items are accessories

  // Electronics become Entertainment
  'electronics': 'Entertainment'
};

// Specific item reassignments based on functionality
const itemSpecificMapping = {
  // Bedding items (currently in textiles or bedroom_furniture)
  'sleeping_pillows': 'Bedding',
  'down_pillows': 'Bedding',
  'pillow_protectors': 'Bedding',
  'sheets': 'Bedding',
  'throw_blanket_on_bed': 'Bedding',
  'chair_throw_blanket': 'Bedding',
  'mattress_protector': 'Bedding',

  // Throw pillows are accessories, not bedding
  'throw_pillows': 'Accessories',
  'chair_throw_pillow': 'Accessories',

  // Kitchen towels are textiles
  'kitchen_towels': 'Textiles',

  // Curtains and rods are textiles (already correct)
  'curtain_set': 'Textiles',
  'curtain_rod': 'Textiles',
  'area_rug': 'Textiles',
  'kitchen_runner_rug': 'Textiles'
};

function updateLocalCategories() {
  console.log('🔄 Updating local items.json categories...\n');

  try {
    // Read current items.json
    const itemsPath = path.join(__dirname, 'output', 'items.json');
    const data = fs.readFileSync(itemsPath, 'utf8');
    const items = JSON.parse(data);

    console.log(`📦 Found ${items.length} items in local file`);

    let updatedCount = 0;

    // Update each item's category
    items.forEach(item => {
      const currentCategory = item.category;
      let newCategory = null;

      // Check for item-specific mapping first
      if (itemSpecificMapping[item.id]) {
        newCategory = itemSpecificMapping[item.id];
      }
      // Otherwise use category mapping
      else if (categoryMapping[currentCategory]) {
        newCategory = categoryMapping[currentCategory];
      }

      if (newCategory && newCategory !== currentCategory) {
        console.log(`  📝 ${item.id}: '${currentCategory}' → '${newCategory}'`);
        item.category = newCategory;
        item.updatedAt = new Date().toISOString();
        updatedCount++;
      }
    });

    // Write back to file
    fs.writeFileSync(itemsPath, JSON.stringify(items, null, 2));

    console.log(`\n✅ Local update complete!`);
    console.log(`  📈 Updated: ${updatedCount} items`);
    console.log(`  📊 Total: ${items.length} items`);
    console.log(`  💾 Saved to: ${itemsPath}`);

  } catch (error) {
    console.error('❌ Error updating local categories:', error);
    process.exit(1);
  }
}

// Run the update
updateLocalCategories();
