const db = require('../config/db-wrapper');

class Recommendation {
  /**
   * Create a new recommendation
   * @param {Object} recommendationData - Recommendation data
   * @returns {Promise<Object>} Created recommendation
   */
  static async create(recommendationData) {
    try {
      const { title, content, category } = recommendationData;
      
      const query = `INSERT INTO recommendations (title, content, category) 
                    VALUES (?, ?, ?)`;
      
      const result = await db.run(query, [title, content, category]);
      
      return {
        id: result.lastID,
        title,
        content,
        category,
        created_at: new Date()
      };
    } catch (error) {
      console.error('Error creating recommendation:', error);
      throw error;
    }
  }
  
  /**
   * Get recommendation by ID
   * @param {number} id - Recommendation ID
   * @returns {Promise<Object|null>} Recommendation object or null if not found
   */
  static async findById(id) {
    try {
      const query = 'SELECT * FROM recommendations WHERE id = ?';
      
      const rows = await db.all(query, [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error finding recommendation by ID:', error);
      throw error;
    }
  }
  
  /**
   * Get all recommendations
   * @returns {Promise<Array>} Array of recommendations
   */
  static async getAll() {
    try {
      const query = 'SELECT * FROM recommendations ORDER BY created_at DESC';
      
      return await db.all(query, []);
    } catch (error) {
      console.error('Error getting all recommendations:', error);
      throw error;
    }
  }
  
  /**
   * Get recommendations by category
   * @param {string} category - Category
   * @returns {Promise<Array>} Array of recommendations
   */
  static async getByCategory(category) {
    try {
      const query = 'SELECT * FROM recommendations WHERE category = ? ORDER BY created_at DESC';
      
      return await db.all(query, [category]);
    } catch (error) {
      console.error('Error getting recommendations by category:', error);
      throw error;
    }
  }
  
  /**
   * Update recommendation
   * @param {number} id - Recommendation ID
   * @param {Object} recommendationData - Recommendation data to update
   * @returns {Promise<boolean>} Success indicator
   */
  static async update(id, recommendationData) {
    try {
      const { title, content, category } = recommendationData;
      
      const query = `UPDATE recommendations SET 
                    title = ?, 
                    content = ?, 
                    category = ? 
                    WHERE id = ?`;
      
      const result = await db.run(query, [title, content, category, id]);
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating recommendation:', error);
      throw error;
    }
  }
  
  /**
   * Delete recommendation
   * @param {number} id - Recommendation ID
   * @returns {Promise<boolean>} Success indicator
   */
  static async delete(id) {
    try {
      const query = 'DELETE FROM recommendations WHERE id = ?';
      
      const result = await db.run(query, [id]);
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting recommendation:', error);
      throw error;
    }
  }
  
  /**
   * Search recommendations
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Array of recommendations
   */
  static async search(searchTerm) {
    try {
      const query = `SELECT * FROM recommendations 
                    WHERE title LIKE ? OR content LIKE ? 
                    ORDER BY created_at DESC`;
      
      const searchPattern = `%${searchTerm}%`;
      
      return await db.all(query, [searchPattern, searchPattern]);
    } catch (error) {
      console.error('Error searching recommendations:', error);
      throw error;
    }
  }
  
  /**
   * Get a random recommendation
   * @returns {Promise<Object|null>} Random recommendation or null if none found
   */
  static async getRandomRecommendation() {
    try {
      // First check if there are any recommendations
      const countQuery = 'SELECT COUNT(*) as count FROM recommendations';
      const countResult = await db.all(countQuery, []);
      
      if (countResult[0].count === 0) {
        // If no recommendations exist, return default recommendation
        return {
          id: 0,
          title: 'تذكر أن تأخذ استراحة',
          content: 'من المهم أخذ فترات راحة منتظمة خلال يوم العمل. حاول أن تأخذ استراحة قصيرة كل ساعة أو ساعتين للمشي أو التمدد أو التنفس بعمق.',
          category: 'عام',
          created_at: new Date()
        };
      }
      
      // Get a random recommendation using SQLite's RANDOM() function
      const query = 'SELECT * FROM recommendations ORDER BY RANDOM() LIMIT 1';
      const rows = await db.all(query, []);
      
      if (rows.length === 0) {
        // Fallback recommendation if query fails
        return {
          id: 0,
          title: 'تذكر أن تأخذ استراحة',
          content: 'من المهم أخذ فترات راحة منتظمة خلال يوم العمل. حاول أن تأخذ استراحة قصيرة كل ساعة أو ساعتين للمشي أو التمدد أو التنفس بعمق.',
          category: 'عام',
          created_at: new Date()
        };
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error getting random recommendation:', error);
      // Return a default recommendation in case of error
      return {
        id: 0,
        title: 'تذكر أن تأخذ استراحة',
        content: 'من المهم أخذ فترات راحة منتظمة خلال يوم العمل. حاول أن تأخذ استراحة قصيرة كل ساعة أو ساعتين للمشي أو التمدد أو التنفس بعمق.',
        category: 'عام',
        created_at: new Date()
      };
    }
  }
}

module.exports = Recommendation;
