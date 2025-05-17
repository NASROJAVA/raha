/**
 * Script to update the file_url field for a training material
 */

const db = require('./config/db-wrapper');

// Update file_url for a specific training material
async function updateFileUrl(materialId, fileUrl) {
  try {
    console.log(`Updating file_url for material ID ${materialId}...`);
    
    // Update the file_url field
    const result = await db.run(
      'UPDATE training_materials SET file_url = ? WHERE id = ?',
      [fileUrl, materialId]
    );
    
    console.log(`Update result: ${result.changes} row(s) affected`);
    
    // Verify the update
    const material = await db.get(
      'SELECT id, title, content_type, content, file_url FROM training_materials WHERE id = ?',
      [materialId]
    );
    
    console.log('Updated material data:');
    console.log(material);
    
  } catch (error) {
    console.error('Error updating file_url:', error);
  } finally {
    // Close the database connection
    await db.close();
  }
}

// Update file_url for material ID 3
// Using a YouTube embed URL as an example
const materialId = 3;
const newFileUrl = 'https://www.youtube.com/embed/UYKyp1e_jYc';

updateFileUrl(materialId, newFileUrl)
  .then(() => {
    console.log('Update completed.');
  });
