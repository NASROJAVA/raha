/**
 * Script to update the video URL for training material ID 3
 * with a working YouTube video URL
 */

const db = require('./config/db-wrapper');

// Update video URL with a working YouTube URL
async function updateVideoUrl() {
  try {
    console.log('Updating video URL for training material ID 3...');
    
    // Working YouTube URL for a mindfulness video
    const workingVideoUrl = 'https://www.youtube.com/embed/ZToicYcHIOU';
    
    // Update both content and file_url fields
    const result = await db.run(
      'UPDATE training_materials SET content = ?, file_url = ? WHERE id = 3',
      [workingVideoUrl, workingVideoUrl]
    );
    
    console.log(`Update result: ${result.changes} row(s) affected`);
    
    // Verify the update worked
    const material = await db.get('SELECT * FROM training_materials WHERE id = 3');
    console.log('Updated material:');
    console.log(material);
    
  } catch (error) {
    console.error('Error updating video URL:', error);
  } finally {
    await db.close();
  }
}

// Run the update
updateVideoUrl().then(() => {
  console.log('Video URL update completed!');
});
