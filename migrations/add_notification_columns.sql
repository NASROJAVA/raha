-- Add notification columns to users table
ALTER TABLE users ADD COLUMN email_notifications_sessions INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN email_notifications_feedback INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN email_notifications_messages INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN bio TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN specialties TEXT DEFAULT '[]';
ALTER TABLE users ADD COLUMN languages TEXT DEFAULT '[]';
ALTER TABLE users ADD COLUMN experience_years INTEGER DEFAULT 0;
