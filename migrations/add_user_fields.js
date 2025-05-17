const db = require('../config/database');

// Function to add new columns to users table
function migrateDatabase() {
  console.log('Starting migration: Adding gender and marital_status columns to users table...');
  
  // Check if gender column exists
  db.get("PRAGMA table_info(users)", [], (err, rows) => {
    if (err) {
      console.error('Error checking table structure:', err);
      return;
    }
    
    // Add gender column if it doesn't exist
    db.run("ALTER TABLE users ADD COLUMN gender TEXT", (err) => {
      if (err) {
        // Column might already exist
        console.log('Gender column already exists or error:', err.message);
      } else {
        console.log('Added gender column to users table');
      }
      
      // Add marital_status column
      db.run("ALTER TABLE users ADD COLUMN marital_status TEXT", (err) => {
        if (err) {
          // Column might already exist
          console.log('Marital status column already exists or error:', err.message);
        } else {
          console.log('Added marital_status column to users table');
        }
        
        console.log('Migration completed successfully');
      });
    });
  });
}

// Run the migration
migrateDatabase();
