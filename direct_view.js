/**
 * Direct express server to view training material 3
 * This is a stripped-down server just to test if we can render the material
 */

const express = require('express');
const path = require('path');
const db = require('./config/db-wrapper');

// Create Express app
const app = express();

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Direct route to view material 3
app.get('/material-3', async (req, res) => {
  try {
    // Directly get the material from the database
    const material = await db.get('SELECT * FROM training_materials WHERE id = 3');
    
    if (!material) {
      return res.status(404).send('Material not found');
    }
    
    // Log what we're rendering for debugging
    console.log('Rendering material 3:', material);
    
    // Render a direct view
    return res.render('pages/training/simple', {
      material: material,
      title: material.title
    });
  } catch (error) {
    console.error('Error viewing material 3:', error);
    return res.status(500).send('Error: ' + error.message);
  }
});

// Start server on a different port to avoid conflicts
const PORT = 3030;
app.listen(PORT, () => {
  console.log(`Direct view server running on http://localhost:${PORT}`);
  console.log(`Access material 3 at http://localhost:${PORT}/material-3`);
});
