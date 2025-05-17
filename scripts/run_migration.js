const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get database path from environment variables or use default
const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/raha.db');

// Connect to the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

// Read the SQL migration file
const migrationFile = process.argv[2] || 'psychologist_dashboard.sql';
const migrationPath = path.join(__dirname, '../migrations', migrationFile);

fs.readFile(migrationPath, 'utf8', (err, sql) => {
  if (err) {
    console.error(`Error reading migration file ${migrationPath}:`, err.message);
    db.close();
    process.exit(1);
  }

  console.log(`Running migration: ${migrationFile}`);

  // Split the SQL file into individual statements
  const statements = sql
    .split(';')
    .map(statement => statement.trim())
    .filter(statement => statement.length > 0);

  // Begin a transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Execute each statement
    statements.forEach((statement, index) => {
      db.run(statement, (err) => {
        if (err) {
          console.error(`Error executing statement ${index + 1}:`, err.message);
          console.error('Statement:', statement);
          db.run('ROLLBACK');
          db.close();
          process.exit(1);
        }
      });
    });

    // Commit the transaction
    db.run('COMMIT', (err) => {
      if (err) {
        console.error('Error committing transaction:', err.message);
        db.run('ROLLBACK');
        db.close();
        process.exit(1);
      }

      console.log('Migration completed successfully!');
      db.close();
    });
  });
});
