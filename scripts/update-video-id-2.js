// Script to update video URL for training material with ID 2
const db = require('../config/db-wrapper');

async function updateVideoUrl() {
  try {
    // First, check what fields the video record currently has
    const current = await db.get('SELECT * FROM training_materials WHERE id = 2');
    console.log('Current record:', current);
    
    // Update both content and file_url fields to ensure the video works
    const videoUrl = 'https://vjs.zencdn.net/v/oceans.mp4';
    
    // Update the database record
    const result = await db.run(
      'UPDATE training_materials SET content = ?, file_url = ? WHERE id = ?',
      [videoUrl, videoUrl, 2]
    );
    
    console.log('Update result:', result);
    console.log('Video URL updated successfully for ID 2');
    
    // Verify the update
    const updated = await db.get('SELECT id, title, content, file_url FROM training_materials WHERE id = 2');
    console.log('Updated record:', updated);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating video URL:', error);
    process.exit(1);
  }
}

updateVideoUrl();
