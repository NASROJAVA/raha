const db = require('../config/db-wrapper');

class Comment {
  /**
   * Create a new comment
   * @param {Object} commentData - Comment data
   * @returns {Promise<Object>} Created comment
   */
  static async create(commentData) {
    try {
      const { post_id, user_id, content } = commentData;
      
      const query = `INSERT INTO comments (post_id, user_id, content) 
                    VALUES (?, ?, ?)`;
      
      const result = await db.run(query, [post_id, user_id, content]);
      
      return {
        id: result.lastID,
        post_id,
        user_id,
        content,
        created_at: new Date()
      };
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }
  
  /**
   * Get comment by ID
   * @param {number} id - Comment ID
   * @returns {Promise<Object|null>} Comment object or null if not found
   */
  static async findById(id) {
    try {
      const query = `SELECT c.*, u.name, u.email 
                    FROM comments c 
                    JOIN users u ON c.user_id = u.id 
                    WHERE c.id = ?`;
      
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
      console.error('Error finding comment by ID:', error);
      throw error;
    }
  }
  
  /**
   * Get comments for a post
   * @param {number} postId - Post ID
   * @returns {Promise<Array>} Array of comments
   */
  static async getByPostId(postId) {
    try {
      const query = `SELECT c.*, u.name, u.email 
                    FROM comments c 
                    JOIN users u ON c.user_id = u.id 
                    WHERE c.post_id = ? 
                    ORDER BY c.created_at ASC`;
      
      const rows = await db.all(query, [postId]);
      
      // Process each comment
      return rows.map(row => {
        // Add compatibility fields
        const nameParts = row.name ? row.name.split(' ') : ['', ''];
        row.first_name = nameParts[0] || '';
        row.last_name = nameParts.slice(1).join(' ') || '';
        row.username = row.email; // Use email as username for compatibility
        
        return row;
      });
    } catch (error) {
      console.error('Error getting comments for post:', error);
      throw error;
    }
  }
  
  /**
   * Update comment
   * @param {number} id - Comment ID
   * @param {Object} commentData - Comment data to update
   * @returns {Promise<boolean>} Success indicator
   */
  static async update(id, commentData) {
    try {
      const { content } = commentData;
      
      const query = 'UPDATE comments SET content = ? WHERE id = ?';
      
      const result = await db.run(query, [content, id]);
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }
  
  /**
   * Delete comment
   * @param {number} id - Comment ID
   * @returns {Promise<boolean>} Success indicator
   */
  static async delete(id) {
    try {
      const query = 'DELETE FROM comments WHERE id = ?';
      
      const result = await db.run(query, [id]);
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }
  
  /**
   * Count comments for a post
   * @param {number} postId - Post ID
   * @returns {Promise<number>} Comment count
   */
  static async countByPostId(postId) {
    try {
      const query = 'SELECT COUNT(*) as count FROM comments WHERE post_id = ?';
      
      const rows = await db.all(query, [postId]);
      
      return rows[0].count;
    } catch (error) {
      console.error('Error counting comments for post:', error);
      throw error;
    }
  }
}

module.exports = Comment;
