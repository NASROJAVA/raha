// Script to update video URL for training material with ID 3
const db = require('../config/db-wrapper');

async function updateVideoUrl() {
  try {
    // Sample video URL - you might want to replace this with an actual video file in your project
    const videoUrl = 'https://vjs.zencdn.net/v/oceans.mp4';
    
    // Update the database record
    const result = await db.run(
      'UPDATE training_materials SET video_url = ? WHERE id = ?',
      [videoUrl, 3]
    );
    
    console.log('Update result:', result);
    console.log('Video URL updated successfully for ID 3');
    
    // Verify the update
    const updated = await db.get('SELECT id, title, video_url FROM training_materials WHERE id = 3');
    console.log('Updated record:', updated);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating video URL:', error);
    process.exit(1);
  }
}

updateVideoUrl();
