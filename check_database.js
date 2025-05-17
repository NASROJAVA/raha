/**
 * Database check script for Raha platform
 * This script checks all tables in the database and lists their contents
 */

const db = require('./config/db-wrapper');

// Function to list all tables
async function listTables() {
  try {
    console.log('Checking all tables in the database...');
    
    // Get all tables in SQLite
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    
    console.log('Tables found:', tables.map(t => t.name));
    
    // For each table, print its structure and some sample data
    for (const table of tables) {
      // Skip SQLite internal tables
      if (table.name.startsWith('sqlite_')) continue;
      
      // Check table structure
      console.log(`\n=== Table: ${table.name} ===`);
      const columns = await db.all(`PRAGMA table_info(${table.name})`);
      console.log('Columns:', columns.map(c => c.name));
      
      // Count rows
      const countResult = await db.get(`SELECT COUNT(*) as count FROM ${table.name}`);
      console.log(`Total rows: ${countResult.count}`);
      
      // Get sample data (first 5 rows)
      if (countResult.count > 0) {
        const rows = await db.all(`SELECT * FROM ${table.name} LIMIT 5`);
        console.log('Sample data:');
        console.log(rows);
      }
    }
    
    // Specifically check for training_materials table
    console.log('\n=== Checking for training_materials specifically ===');
    const trainingMaterials = await db.all('SELECT * FROM training_materials');
    console.log(`Found ${trainingMaterials.length} training materials:`);
    trainingMaterials.forEach(material => {
      console.log(`- ID: ${material.id}, Title: ${material.title}, Type: ${material.content_type}`);
    });
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    // Close the database connection
    await db.close();
  }
}

// Run the function
listTables().then(() => {
  console.log('Database check complete.');
});
