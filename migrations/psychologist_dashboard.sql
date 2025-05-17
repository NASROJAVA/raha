-- Psychologist Availability Table
CREATE TABLE IF NOT EXISTS psychologist_availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  psychologist_id INTEGER NOT NULL,
  monday TEXT NOT NULL, -- JSON string with format {enabled: boolean, start: string, end: string}
  tuesday TEXT NOT NULL,
  wednesday TEXT NOT NULL,
  thursday TEXT NOT NULL,
  friday TEXT NOT NULL,
  saturday TEXT NOT NULL,
  sunday TEXT NOT NULL,
  session_duration INTEGER NOT NULL DEFAULT 60, -- in minutes
  break_time INTEGER NOT NULL DEFAULT 15, -- in minutes
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (psychologist_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Blocked Dates Table
CREATE TABLE IF NOT EXISTS blocked_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  psychologist_id INTEGER NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD format
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (psychologist_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create a users table if it doesn't exist yet (in case it's missing)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT CHECK(role IN ('employee', 'psychologist', 'admin')) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add new fields to users table for psychologist profile
ALTER TABLE users ADD COLUMN specialties TEXT; -- JSON array of specialties
ALTER TABLE users ADD COLUMN languages TEXT; -- JSON array of languages
ALTER TABLE users ADD COLUMN experience_years INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN avatar TEXT;
ALTER TABLE users ADD COLUMN email_notifications INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN feedback_notifications INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN message_notifications INTEGER DEFAULT 1;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_psychologist_availability_psychologist_id ON psychologist_availability(psychologist_id);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_psychologist_id ON blocked_dates(psychologist_id);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_date ON blocked_dates(date);
