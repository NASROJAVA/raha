const db = require('../config/db-wrapper');

class TrainingMaterial {
  /**
   * Create a new training material
   * @param {Object} materialData - Training material data
   * @returns {Promise<Object>} Created training material
   */
  static async create(materialData) {
    try {
      const { title, description, content_type, file_path, content } = materialData;
      
      const query = `INSERT INTO training_materials (title, description, content_type, file_path, content) 
                    VALUES (?, ?, ?, ?, ?)`;
      
      const result = await db.run(query, [title, description, content_type, file_path || null, content || null]);
      
      return {
        id: result.lastID,
        title,
        description,
        content_type,
        file_path: file_path || null,
        content: content || null,
        created_at: new Date(),
        updated_at: new Date()
      };
    } catch (error) {
      console.error('Error creating training material:', error);
      throw error;
    }
  }
  
  /**
   * Get training material by ID
   * @param {number} id - Training material ID
   * @returns {Promise<Object|null>} Training material object or null if not found
   */
  static async findById(id) {
    try {
      const query = 'SELECT * FROM training_materials WHERE id = ?';
      
      const rows = await db.all(query, [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error finding training material by ID:', error);
      throw error;
    }
  }
  
  /**
   * Get all training materials
   * @returns {Promise<Array>} Array of training materials
   */
  static async getAll() {
    try {
      const query = 'SELECT * FROM training_materials ORDER BY created_at DESC';
      
      return await db.all(query, []);
    } catch (error) {
      console.error('Error getting all training materials:', error);
      throw error;
    }
  }
  
  /**
   * Get training materials by content type
   * @param {string} contentType - Content type
   * @returns {Promise<Array>} Array of training materials
   */
  static async getByContentType(contentType) {
    try {
      const query = 'SELECT * FROM training_materials WHERE content_type = ? ORDER BY created_at DESC';
      
      return await db.all(query, [contentType]);
    } catch (error) {
      console.error('Error getting training materials by content type:', error);
      throw error;
    }
  }
  
  /**
   * Update training material
   * @param {number} id - Training material ID
   * @param {Object} materialData - Training material data to update
   * @returns {Promise<boolean>} Success indicator
   */
  static async update(id, materialData) {
    try {
      const { title, description, content_type, file_path, content } = materialData;
      
      const query = `UPDATE training_materials SET 
                    title = ?, 
                    description = ?, 
                    content_type = ?, 
                    file_path = ?, 
                    content = ?, 
                    updated_at = ? 
                    WHERE id = ?`;
      
      const result = await db.run(query, [
        title, 
        description, 
        content_type, 
        file_path || null, 
        content || null, 
        new Date(), 
        id
      ]);
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating training material:', error);
      throw error;
    }
  }
  
  /**
   * Delete training material
   * @param {number} id - Training material ID
   * @returns {Promise<boolean>} Success indicator
   */
  static async delete(id) {
    try {
      const query = 'DELETE FROM training_materials WHERE id = ?';
      
      const result = await db.run(query, [id]);
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting training material:', error);
      throw error;
    }
  }
  
  /**
   * Search training materials
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Array of training materials
   */
  static async search(searchTerm) {
    try {
      const query = `SELECT * FROM training_materials 
                    WHERE title LIKE ? OR description LIKE ? 
                    ORDER BY created_at DESC`;
      
      const searchPattern = `%${searchTerm}%`;
      
      return await db.all(query, [searchPattern, searchPattern]);
    } catch (error) {
      console.error('Error searching training materials:', error);
      throw error;
    }
  }
}

module.exports = TrainingMaterial;
