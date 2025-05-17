const db = require('../config/db');

// Function to check if a table exists
async function checkTableSchema(tableName) {
  try {
    console.log(`Checking schema for table: ${tableName}`);
    
    // Get table info
    const [tableInfo] = await db.execute(`PRAGMA table_info(${tableName})`);
    
    if (tableInfo.length === 0) {
      console.log(`Table '${tableName}' does not exist in the database.`);
      return;
    }
    
    console.log(`\nColumns in '${tableName}' table:`);
    tableInfo.forEach(column => {
      console.log(`- ${column.name} (${column.type})`);
    });
    
    // Check for indexes
    const [indexes] = await db.execute(`PRAGMA index_list(${tableName})`);
    
    if (indexes.length > 0) {
      console.log(`\nIndexes on '${tableName}' table:`);
      for (const index of indexes) {
        console.log(`- ${index.name}`);
      }
    } else {
      console.log(`\nNo indexes found for '${tableName}' table.`);
    }
    
  } catch (error) {
    console.error(`Error checking table schema:`, error);
  }
}

// Check the sessions table
checkTableSchema('sessions')
  .then(() => {
    console.log('\nSchema check completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
