const db = require('../config/db-wrapper');

class Post {
  /**
   * Create a new post
   * @param {Object} postData - Post data
   * @returns {Promise<Object>} Created post
   */
  static async create(postData) {
    try {
      const { user_id, title, content } = postData;
      
      const query = `INSERT INTO posts (user_id, title, content) 
                    VALUES (?, ?, ?)`;
      
      const result = await db.run(query, [user_id, title, content]);
      
      return {
        id: result.lastID,
        user_id,
        title,
        content,
        created_at: new Date(),
        updated_at: new Date()
      };
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }
  
  /**
   * Get post by ID
   * @param {number} id - Post ID
   * @returns {Promise<Object|null>} Post object or null if not found
   */
  static async findById(id) {
    try {
      const query = `SELECT p.*, u.name, u.email 
                    FROM posts p 
                    JOIN users u ON p.user_id = u.id 
                    WHERE p.id = ?`;
      
      const rows = await db.all(query, [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      const row = rows[0];
      
      // Add compatibility fields
      const nameParts = row.name ? row.name.split(' ') : ['', ''];
      row.first_name = nameParts[0] || '';
      row.last_name = nameParts.slice(1).join(' ') || '';
      row.username = row.email; // Use email as username for compatibility
      
      return row;
    } catch (error) {
      console.error('Error finding post by ID:', error);
      throw error;
    }
  }
  
  /**
   * Get all posts
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of posts
   */
  static async getAll(options = {}) {
    try {
      const { limit = 10, offset = 0, user_id = null } = options;
      
      let query = `SELECT p.*, u.name, u.email 
                  FROM posts p 
                  JOIN users u ON p.user_id = u.id`;
      
      const params = [];
      
      if (user_id) {
        query += ' WHERE p.user_id = ?';
        params.push(user_id);
      }
      
      query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const rows = await db.all(query, params);
      
      // Process each post
      return rows.map(row => {
        // Add compatibility fields
        const nameParts = row.name ? row.name.split(' ') : ['', ''];
        row.first_name = nameParts[0] || '';
        row.last_name = nameParts.slice(1).join(' ') || '';
        row.username = row.email; // Use email as username for compatibility
        
        return row;
      });
    } catch (error) {
      console.error('Error getting all posts:', error);
      throw error;
    }
  }
  
  /**
   * Update post
   * @param {number} id - Post ID
   * @param {Object} postData - Post data to update
   * @returns {Promise<boolean>} Success indicator
   */
  static async update(id, postData) {
    try {
      const { title, content } = postData;
      
      const query = `UPDATE posts SET 
                    title = ?, 
                    content = ?, 
                    updated_at = ? 
                    WHERE id = ?`;
      
      const result = await db.run(query, [title, content, new Date(), id]);
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }
  
  /**
   * Delete post
   * @param {number} id - Post ID
   * @returns {Promise<boolean>} Success indicator
   */
  static async delete(id) {
    try {
      const query = 'DELETE FROM posts WHERE id = ?';
      
      const result = await db.run(query, [id]);
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }
  
  /**
   * Count posts
   * @param {Object} options - Query options
   * @returns {Promise<number>} Post count
   */
  static async count(options = {}) {
    try {
      const { user_id = null } = options;
      
      let query = 'SELECT COUNT(*) as count FROM posts';
      const params = [];
      
      if (user_id) {
        query += ' WHERE user_id = ?';
        params.push(user_id);
      }
      
      const rows = await db.all(query, params);
      
      return rows[0].count;
    } catch (error) {
      console.error('Error counting posts:', error);
      throw error;
    }
  }
  
  /**
   * Search posts
   * @param {string} searchTerm - Search term
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of posts
   */
  static async search(searchTerm, options = {}) {
    try {
      const { limit = 10, offset = 0 } = options;
      
      const query = `SELECT p.*, u.name, u.email 
                    FROM posts p 
                    JOIN users u ON p.user_id = u.id 
                    WHERE p.title LIKE ? OR p.content LIKE ? 
                    ORDER BY p.created_at DESC 
                    LIMIT ? OFFSET ?`;
      
      const searchPattern = `%${searchTerm}%`;
      const params = [searchPattern, searchPattern, limit, offset];
      
      const rows = await db.all(query, params);
      
      // Process each post
      return rows.map(row => {
        // Add compatibility fields
        const nameParts = row.name ? row.name.split(' ') : ['', ''];
        row.first_name = nameParts[0] || '';
        row.last_name = nameParts.slice(1).join(' ') || '';
        row.username = row.email; // Use email as username for compatibility
        
        return row;
      });
    } catch (error) {
      console.error('Error searching posts:', error);
      throw error;
    }
  }
}

module.exports = Post;
