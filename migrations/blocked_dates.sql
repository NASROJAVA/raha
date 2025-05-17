-- Create blocked_dates table
CREATE TABLE IF NOT EXISTS blocked_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  psychologist_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (psychologist_id) REFERENCES users (id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_blocked_dates_psychologist_id ON blocked_dates (psychologist_id);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_date ON blocked_dates (date);
