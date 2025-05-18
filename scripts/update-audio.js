// Script to update audio material with ID 4 to have a valid audio URL
const db = require('../config/db-wrapper');

async function updateAudioMaterial() {
  try {
    // Use a real audio file URL that's publicly accessible
    const validAudioUrl = 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg';
    
    // Update both content and file_url fields to ensure the audio works
    const result = await db.run(
      'UPDATE training_materials SET content = ?, file_url = ? WHERE id = ?',
      [validAudioUrl, validAudioUrl, 4]
    );
    
    console.log('Update result:', result);
    console.log('Audio URL updated successfully for ID 4');
    
    // Verify the update
    const updated = await db.get('SELECT id, title, content, file_url, content_type FROM training_materials WHERE id = 4');
    console.log('Updated record:', updated);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating audio URL:', error);
    process.exit(1);
  }
}

updateAudioMaterial();
