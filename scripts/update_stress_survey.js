const db = require('../config/db-wrapper');

async function updateStressSurveySchema() {
  try {
    // Drop temporary table if it exists
    await db.run('DROP TABLE IF EXISTS stress_surveys_temp');

    // Create temporary table with new constraint
    await db.run(`
      CREATE TABLE stress_surveys_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        stress_level INTEGER NOT NULL CHECK(stress_level BETWEEN 0 AND 100),
        survey_data TEXT NOT NULL,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // First, let's check the data we're working with
    const surveys = await db.all('SELECT * FROM stress_surveys');
    console.log('Current surveys:', surveys);

    // Copy and convert data with NULL handling
    await db.run(`
      INSERT INTO stress_surveys_temp(id, user_id, stress_level, survey_data, completed_at)
      SELECT 
        id, 
        user_id, 
        CAST(((stress_level - 1) * 25) AS INTEGER), -- Convert 1-5 scale to 0-100
        COALESCE(survey_data, '{}'), -- Use empty object if NULL
        completed_at
      FROM stress_surveys
    `);

    // Drop old table
    await db.run('DROP TABLE stress_surveys');

    // Rename new table
    await db.run('ALTER TABLE stress_surveys_temp RENAME TO stress_surveys');

    // Recreate indexes
    await db.run('CREATE INDEX idx_stress_surveys_user_id ON stress_surveys(user_id)');
    await db.run('CREATE INDEX idx_stress_surveys_completed_at ON stress_surveys(completed_at)');

    console.log('Successfully updated stress_surveys table schema');
    process.exit(0);
  } catch (error) {
    console.error('Error updating schema:', error);
    process.exit(1);
  }
}

updateStressSurveySchema();
