-- Training Materials Table
CREATE TABLE IF NOT EXISTS training_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content_type TEXT CHECK(content_type IN ('article', 'video', 'audio', 'document')) NOT NULL,
  file_path TEXT,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_training_materials_content_type ON training_materials(content_type);
CREATE INDEX IF NOT EXISTS idx_training_materials_created_at ON training_materials(created_at);
