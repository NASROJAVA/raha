// Script to check audio material with ID 4
const db = require('../config/db-wrapper');

async function checkAudioMaterial() {
  try {
    // Get the audio material from the database
    const material = await db.get('SELECT * FROM training_materials WHERE id = ?', [4]);
    
    console.log('Audio material found:', material ? 'Yes' : 'No');
    if (material) {
      console.log('Audio material details:');
      console.log(JSON.stringify(material, null, 2));
      console.log('\nFile URL:', material.file_url);
      console.log('Content:', material.content);
      console.log('Content Type:', material.content_type);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking audio material:', error);
    process.exit(1);
  }
}

checkAudioMaterial();
