// Script to check the schema of training_materials table
const db = require('../config/db-wrapper');

async function checkTableSchema() {
  try {
    // Get information about the training_materials table
    const schema = await db.all("PRAGMA table_info(training_materials)");
    console.log('Table schema for training_materials:');
    console.log(schema);
    
    // Get sample row to see what data looks like
    const sample = await db.get('SELECT * FROM training_materials WHERE id = 3');
    console.log('\nSample row for ID 3:');
    console.log(sample);
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking schema:', error);
    process.exit(1);
  }
}

checkTableSchema();
