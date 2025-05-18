-- Update stress_surveys table to allow stress levels from 0 to 100
DROP TABLE IF EXISTS stress_surveys_temp;

CREATE TABLE stress_surveys_temp (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  stress_level INTEGER NOT NULL CHECK(stress_level BETWEEN 0 AND 100),
  survey_data TEXT NOT NULL,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Copy data from old table to new table
INSERT INTO stress_surveys_temp(id, user_id, stress_level, survey_data, completed_at, created_at, updated_at)
SELECT id, user_id, 
       -- Convert old stress levels (1-5) to new scale (0-100)
       CAST(((stress_level - 1) * 25) AS INTEGER),
       survey_data, completed_at, created_at, updated_at 
FROM stress_surveys;

-- Drop old table and rename new table
DROP TABLE stress_surveys;
ALTER TABLE stress_surveys_temp RENAME TO stress_surveys;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_stress_surveys_user_id ON stress_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_stress_surveys_completed_at ON stress_surveys(completed_at);
