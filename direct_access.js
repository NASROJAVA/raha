/**
 * Direct database access script to check if the training material exists
 * and display all information about it
 */

const db = require('./config/db-wrapper');

// Get material by ID without using the model
async function getMaterialDirectly(materialId) {
  try {
    console.log(`Looking for material ID ${materialId} directly...`);
    
    // Direct database query
    const materials = await db.all('SELECT * FROM training_materials WHERE id = ?', [materialId]);
    
    if (!materials || materials.length === 0) {
      console.log(`No material found with ID ${materialId}`);
      return null;
    }
    
    const material = materials[0];
    console.log('Material found:');
    console.log(JSON.stringify(material, null, 2));
    
    return material;
  } catch (error) {
    console.error('Error accessing material directly:', error);
    return null;
  }
}

// List all materials in the database
async function listAllMaterials() {
  try {
    console.log('Listing all materials in the database...');
    
    // Get all materials
    const materials = await db.all('SELECT id, title, content_type FROM training_materials ORDER BY id');
    
    if (!materials || materials.length === 0) {
      console.log('No materials found in the database');
      return;
    }
    
    console.log(`Found ${materials.length} materials:`);
    materials.forEach(material => {
      console.log(`- ID: ${material.id}, Title: ${material.title}, Type: ${material.content_type}`);
    });
  } catch (error) {
    console.error('Error listing materials:', error);
  }
}

// Check if the table exists and has the right structure
async function checkTable() {
  try {
    console.log('Checking training_materials table structure...');
    
    // Get table information
    const tableInfo = await db.all('PRAGMA table_info(training_materials)');
    
    console.log('Table columns:');
    console.log(tableInfo.map(col => `${col.name} (${col.type})`));
    
    // Count materials
    const count = await db.get('SELECT COUNT(*) as count FROM training_materials');
    console.log(`Total training materials: ${count.count}`);
    
  } catch (error) {
    console.error('Error checking table:', error);
  }
}

// Main function to run all checks
async function runChecks() {
  try {
    // Check table structure
    await checkTable();
    
    // List all materials
    await listAllMaterials();
    
    // Check specific material
    const materialId = 3;
    await getMaterialDirectly(materialId);
    
  } catch (error) {
    console.error('Error in checks:', error);
  } finally {
    // Close database connection
    await db.close();
  }
}

// Run the checks
console.log('Starting direct database access checks...');
runChecks().then(() => {
  console.log('All checks completed.');
});
