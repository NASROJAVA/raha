-- Stress Surveys Table
CREATE TABLE IF NOT EXISTS stress_surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  stress_level INTEGER NOT NULL,
  survey_data TEXT NOT NULL, -- JSON string with survey answers
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stress_surveys_user_id ON stress_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_stress_surveys_completed_at ON stress_surveys(completed_at);
