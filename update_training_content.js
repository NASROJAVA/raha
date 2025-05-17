/**
 * Script to update training material content in the database
 * This adds sample video URLs and other content to existing training materials
 */
const db = require('./config/db-wrapper');

async function updateTrainingContent() {
  try {
    console.log('Updating training material content...');
    
    // First, let's check the table structure to see what columns exist
    const tableInfo = await db.all("PRAGMA table_info(training_materials);", []);
    console.log('Table columns:', tableInfo.map(col => col.name));
    
    // Sample content for different training material types
    const updates = [
      {
        id: 1,
        content: `<h2>Introduction to Stress Management</h2>
        <p>Stress is a natural part of life, especially in the workplace. This article introduces key concepts and techniques for managing stress effectively.</p>
        <h2>Understanding Stress</h2>
        <p>Workplace stress can come from many sources: deadlines, conflicts with colleagues, high workloads, or poor work-life balance.</p>
        <p>The first step to managing stress is recognizing its symptoms, which may include:</p>
        <ul>
          <li>Anxiety or irritability</li>
          <li>Difficulty concentrating</li>
          <li>Fatigue or sleep problems</li>
          <li>Physical symptoms like headaches or muscle tension</li>
        </ul>
        <h2>Effective Stress Management Techniques</h2>
        <p>Here are some evidence-based approaches to managing workplace stress:</p>
        <ol>
          <li><strong>Deep breathing exercises</strong> - Taking slow, deep breaths for just 5 minutes can activate your parasympathetic nervous system and reduce stress.</li>
          <li><strong>Mindfulness meditation</strong> - Regular practice can help you stay present and reduce rumination about work concerns.</li>
          <li><strong>Physical activity</strong> - Even short walks can release endorphins and improve mood.</li>
          <li><strong>Time management</strong> - Prioritizing tasks and breaking them into smaller steps makes work more manageable.</li>
          <li><strong>Setting boundaries</strong> - Clearly separating work from personal time helps maintain balance.</li>
        </ol>
        <p>Remember that managing stress is a skill that improves with practice. Start with small changes and be patient with yourself as you develop healthier responses to workplace stress.</p>`,
        content_type: 'article',
        author: 'Dr. James Wilson'
      },
      {
        id: 2,
        content: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        file_path: '',
        content_type: 'video',
        author: 'Dr. Sarah Johnson'
      },
      {
        id: 3,
        content: 'https://www.youtube.com/embed/UYKyp1e_jYc',
        file_path: '',
        content_type: 'video',
        author: 'Dr. Michael Chen'
      },
      {
        id: 4,
        content: 'https://example.com/audio/guided-relaxation.mp3',
        file_path: '',
        content_type: 'audio',
        author: 'Emma Thompson'
      },
      {
        id: 5,
        content: '',
        file_path: 'https://example.com/documents/stress-workbook.pdf',
        content_type: 'document',
        author: 'Dr. James Wilson'
      }
    ];

    // Update each training material
    for (const update of updates) {
      const { id, content, file_path, content_type, author } = update;
      
      // Get the existing columns from our table info check
      const columnNames = tableInfo.map(col => col.name);
      
      // Build the update query based on which fields are provided
      let query = 'UPDATE training_materials SET ';
      const params = [];
      const fields = [];
      
      if (content !== undefined && columnNames.includes('content')) {
        fields.push('content = ?');
        params.push(content);
      }
      
      if (file_path !== undefined && columnNames.includes('file_path')) {
        fields.push('file_path = ?');
        params.push(file_path);
      }
      
      if (content_type !== undefined && columnNames.includes('content_type')) {
        fields.push('content_type = ?');
        params.push(content_type);
      }
      
      if (author !== undefined && columnNames.includes('author')) {
        fields.push('author = ?');
        params.push(author);
      }
      
      // Add updated_at timestamp if the column exists
      if (columnNames.includes('updated_at')) {
        fields.push('updated_at = ?');
        params.push(new Date().toISOString());
      }
      
      // Complete the query
      query += fields.join(', ') + ' WHERE id = ?';
      params.push(id);
      
      // Execute the update
      const result = await db.run(query, params);
      console.log(`Updated material ID ${id}: ${result.changes} row(s) affected`);
    }

    console.log('Training material content updated successfully!');
  } catch (error) {
    console.error('Error updating training material content:', error);
  } finally {
    // Close the database connection
    db.close();
  }
}

// Run the update function
updateTrainingContent();
