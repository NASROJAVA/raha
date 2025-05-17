const db = require('../config/db-wrapper');

class SessionFeedback {
  /**
   * Create a new session feedback
   * @param {Object} feedbackData - The feedback data
   * @returns {Promise<Object>} The created feedback
   */
  static async create(feedbackData) {
    try {
      const { session_id, rating, helpfulness, improvements, comments, follow_up } = feedbackData;
      
      // Convert improvements array to JSON string if it's an array
      const improvementsJson = Array.isArray(improvements) ? JSON.stringify(improvements) : '[]';
      
      const query = `
        INSERT INTO session_feedback 
        (session_id, rating, helpfulness, improvements, comments, follow_up, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `;
      
      const result = await db.run(query, [
        session_id,
        rating,
        helpfulness,
        improvementsJson,
        comments,
        follow_up
      ]);
      
      // Update the session to indicate feedback has been provided
      await db.run('UPDATE sessions SET has_feedback = 1 WHERE id = ?', [session_id]);
      
      return {
        id: result.lastID,
        session_id,
        rating,
        helpfulness,
        improvements,
        comments,
        follow_up
      };
    } catch (error) {
      console.error('Error creating session feedback:', error);
      throw error;
    }
  }

  /**
   * Get feedback by session ID
   * @param {number} sessionId - The session ID
   * @returns {Promise<Object|null>} The feedback or null if not found
   */
  static async getBySessionId(sessionId) {
    try {
      const query = `
        SELECT * FROM session_feedback WHERE session_id = ?
      `;
      
      const rows = await db.all(query, [sessionId]);
      
      if (rows.length === 0) {
        return null;
      }
      
      const feedback = rows[0];
      
      // Parse improvements JSON
      try {
        feedback.improvements = JSON.parse(feedback.improvements);
      } catch (e) {
        feedback.improvements = [];
      }
      
      return feedback;
    } catch (error) {
      console.error('Error getting feedback by session ID:', error);
      throw error;
    }
  }

  /**
   * Get feedback by ID
   * @param {number} id - The feedback ID
   * @returns {Promise<Object|null>} The feedback or null if not found
   */
  static async getById(id) {
    try {
      const query = `
        SELECT * FROM session_feedback WHERE id = ?
      `;
      
      const rows = await db.all(query, [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      const feedback = rows[0];
      
      // Parse improvements JSON
      try {
        feedback.improvements = JSON.parse(feedback.improvements);
      } catch (e) {
        feedback.improvements = [];
      }
      
      return feedback;
    } catch (error) {
      console.error('Error getting feedback by ID:', error);
      throw error;
    }
  }

  /**
   * Get all feedback for a psychologist
   * @param {number} psychologistId - The psychologist ID
   * @returns {Promise<Array>} Array of feedback
   */
  static async getByPsychologistId(psychologistId) {
    try {
      const query = `
        SELECT sf.*, s.title as session_title, u.name as employee_name
        FROM session_feedback sf
        JOIN sessions s ON sf.session_id = s.id
        JOIN users u ON s.employee_id = u.id
        WHERE s.psychologist_id = ?
        ORDER BY sf.created_at DESC
      `;
      
      const rows = await db.all(query, [psychologistId]);
      
      // Parse improvements JSON for each feedback
      return rows.map(feedback => {
        try {
          feedback.improvements = JSON.parse(feedback.improvements);
        } catch (e) {
          feedback.improvements = [];
        }
        return feedback;
      });
    } catch (error) {
      console.error('Error getting feedback by psychologist ID:', error);
      throw error;
    }
  }

  /**
   * Get average rating for a psychologist
   * @param {number} psychologistId - The psychologist ID
   * @returns {Promise<number>} The average rating
   */
  static async getAverageRatingByPsychologistId(psychologistId) {
    try {
      const query = `
        SELECT AVG(sf.rating) as average_rating
        FROM session_feedback sf
        JOIN sessions s ON sf.session_id = s.id
        WHERE s.psychologist_id = ?
      `;
      
      const rows = await db.all(query, [psychologistId]);
      
      if (rows.length === 0 || rows[0].average_rating === null) {
        return 0;
      }
      
      // Ensure we return a number with 1 decimal place
      const rating = parseFloat(rows[0].average_rating);
      return isNaN(rating) ? 0 : parseFloat(rating.toFixed(1));
    } catch (error) {
      console.error('Error getting average rating by psychologist ID:', error);
      // Return 0 instead of throwing error to avoid breaking the dashboard
      return 0;
    }
  }

  /**
   * Get feedback statistics for a psychologist
   * @param {number} psychologistId - The psychologist ID
   * @returns {Promise<Object>} The feedback statistics
   */
  static async getStatsByPsychologistId(psychologistId) {
    try {
      // Get total feedback count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM session_feedback sf
        JOIN sessions s ON sf.session_id = s.id
        WHERE s.psychologist_id = ?
      `;
      
      const countRows = await db.all(countQuery, [psychologistId]);
      const total = countRows[0].total;
      
      // Get rating distribution
      const ratingQuery = `
        SELECT sf.rating, COUNT(*) as count
        FROM session_feedback sf
        JOIN sessions s ON sf.session_id = s.id
        WHERE s.psychologist_id = ?
        GROUP BY sf.rating
        ORDER BY sf.rating DESC
      `;
      
      const ratingRows = await db.all(ratingQuery, [psychologistId]);
      
      // Get improvement areas
      const improvementsQuery = `
        SELECT sf.improvements
        FROM session_feedback sf
        JOIN sessions s ON sf.session_id = s.id
        WHERE s.psychologist_id = ?
      `;
      
      const improvementsRows = await db.all(improvementsQuery, [psychologistId]);
      
      // Process improvement areas
      const improvementAreas = {};
      improvementsRows.forEach(row => {
        try {
          const improvements = JSON.parse(row.improvements);
          improvements.forEach(area => {
            improvementAreas[area] = (improvementAreas[area] || 0) + 1;
          });
        } catch (e) {
          // Skip invalid JSON
        }
      });
      
      // Format rating distribution
      const ratingDistribution = {};
      for (let i = 1; i <= 5; i++) {
        ratingDistribution[i] = 0;
      }
      
      ratingRows.forEach(row => {
        ratingDistribution[row.rating] = row.count;
      });
      
      return {
        total,
        averageRating: await this.getAverageRatingByPsychologistId(psychologistId),
        ratingDistribution,
        improvementAreas
      };
    } catch (error) {
      console.error('Error getting stats by psychologist ID:', error);
      throw error;
    }
  }

  /**
   * Get recent feedback for a psychologist
   * @param {number} psychologistId - The psychologist ID
   * @param {number} limit - Maximum number of feedback items to return
   * @returns {Promise<Array>} Array of recent feedback
   */
  static async getRecentFeedback(psychologistId, limit = 3) {
    try {
      // First check if the sessions table has a title column
      const checkQuery = `PRAGMA table_info(sessions)`;
      const tableInfo = await db.all(checkQuery, []);
      const hasTitle = tableInfo.some(col => col.name === 'title');
      
      // Build the query based on available columns
      let query;
      if (hasTitle) {
        query = `
          SELECT sf.*, s.title as session_title, u.name as employee_name, s.session_date
          FROM session_feedback sf
          JOIN sessions s ON sf.session_id = s.id
          JOIN users u ON s.employee_id = u.id
          WHERE s.psychologist_id = ?
          ORDER BY sf.created_at DESC
          LIMIT ?
        `;
      } else {
        // Fallback query without title column
        query = `
          SELECT sf.*, u.name as employee_name, s.session_date
          FROM session_feedback sf
          JOIN sessions s ON sf.session_id = s.id
          JOIN users u ON s.employee_id = u.id
          WHERE s.psychologist_id = ?
          ORDER BY sf.created_at DESC
          LIMIT ?
        `;
      }
      
      const rows = await db.all(query, [psychologistId, limit]);
      
      // Parse improvements JSON for each feedback
      return rows.map(feedback => {
        try {
          feedback.improvements = JSON.parse(feedback.improvements);
        } catch (e) {
          feedback.improvements = [];
        }
        
        // Add a default session title if missing
        if (!hasTitle) {
          feedback.session_title = 'Therapy Session';
        }
        
        return feedback;
      });
    } catch (error) {
      console.error('Error getting recent feedback:', error);
      throw error;
    }
  }
}

module.exports = SessionFeedback;
