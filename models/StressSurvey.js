const db = require('../config/db-wrapper');

class StressSurvey {
  /**
   * Create a new stress survey
   * @param {Object} surveyData - Survey data
   * @returns {Promise<Object>} Created survey
   */
  static async create(surveyData) {
    try {
      const { user_id, stress_level, survey_data } = surveyData;
      
      const query = `INSERT INTO stress_surveys (user_id, stress_level, survey_data) 
                    VALUES (?, ?, ?)`;
      
      const result = await db.run(query, [user_id, stress_level, JSON.stringify(survey_data)]);
      
      return {
        id: result.lastID,
        user_id,
        stress_level,
        survey_data,
        completed_at: new Date()
      };
    } catch (error) {
      console.error('Error creating stress survey:', error);
      throw error;
    }
  }
  
  /**
   * Get survey by ID
   * @param {number} id - Survey ID
   * @returns {Promise<Object|null>} Survey object or null if not found
   */
  static async findById(id) {
    try {
      const query = 'SELECT * FROM stress_surveys WHERE id = ?';
      const rows = await db.all(query, [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      const survey = rows[0];
      
      // Parse the JSON survey data
      if (survey.survey_data) {
        survey.survey_data = JSON.parse(survey.survey_data);
      }
      
      return survey;
    } catch (error) {
      console.error('Error finding stress survey by ID:', error);
      throw error;
    }
  }
  
  /**
   * Get latest surveys by user ID
   * @param {number} userId - User ID
   * @param {number} limit - Maximum number of surveys to return
   * @returns {Promise<Array>} Array of surveys
   */
  static async getLatestByUserId(userId, limit = 7) {
    try {
      const query = `SELECT * FROM stress_surveys 
                    WHERE user_id = ? 
                    ORDER BY completed_at DESC 
                    LIMIT ?`;
      
      const rows = await db.all(query, [userId, limit]);
      
      // Parse the JSON survey data for each row
      return rows.map(row => {
        if (row.survey_data) {
          row.survey_data = JSON.parse(row.survey_data);
        }
        return row;
      });
    } catch (error) {
      console.error('Error getting latest stress surveys by user ID:', error);
      throw error;
    }
  }
  
  /**
   * Get average stress level for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Average stress level
   */
  static async getAverageByUserId(userId) {
    try {
      const query = `SELECT AVG(stress_level) as average 
                    FROM stress_surveys 
                    WHERE user_id = ?`;
      
      const rows = await db.all(query, [userId]);
      
      return rows.length > 0 ? parseFloat(rows[0].average).toFixed(1) : 0;
    } catch (error) {
      console.error('Error getting average stress level:', error);
      throw error;
    }
  }
  
  /**
   * Get anonymous statistics for dashboard
   * @returns {Promise<Object>} Anonymous statistics
   */
  static async getAnonymousStatistics() {
    try {
      // Get average stress level
      const query = 'SELECT AVG(stress_level) as average FROM stress_surveys';
      const avgRows = await db.all(query, []);
      
      // Get count of surveys
      const countQuery = 'SELECT COUNT(*) as count FROM stress_surveys';
      const countRows = await db.all(countQuery, []);
      
      // Get count by stress level category
      const categoryQuery = `
        SELECT 
          CASE 
            WHEN stress_level BETWEEN 1 AND 3 THEN 'low'
            WHEN stress_level BETWEEN 4 AND 6 THEN 'medium'
            WHEN stress_level BETWEEN 7 AND 10 THEN 'high'
          END as category,
          COUNT(*) as count
        FROM stress_surveys
        GROUP BY category
      `;
      
      const categoryRows = await db.all(categoryQuery, []);
      
      // Format the data
      const categories = { low: 0, medium: 0, high: 0 };
      categoryRows.forEach(row => {
        if (row.category) {
          categories[row.category] = row.count;
        }
      });
      
      return {
        average: avgRows.length > 0 ? parseFloat(avgRows[0].average).toFixed(1) : 0,
        count: countRows.length > 0 ? countRows[0].count : 0,
        categories
      };
    } catch (error) {
      console.error('Error getting anonymous statistics:', error);
      throw error;
    }
  }
  
  /**
   * Get stress level distribution for statistics page
   * @returns {Promise<Array>} Stress level distribution
   */
  static async getStressLevelDistribution() {
    try {
      const query = `
        SELECT 
          CASE 
            WHEN stress_level BETWEEN 1 AND 2 THEN '1-2'
            WHEN stress_level BETWEEN 3 AND 4 THEN '3-4'
            WHEN stress_level BETWEEN 5 AND 6 THEN '5-6'
            WHEN stress_level BETWEEN 7 AND 8 THEN '7-8'
            WHEN stress_level BETWEEN 9 AND 10 THEN '9-10'
          END as range,
          COUNT(*) as count
        FROM stress_surveys
        GROUP BY range
        ORDER BY range
      `;
      
      const rows = await db.all(query, []);
      
      // Format the data for chart.js
      const distribution = [0, 0, 0, 0, 0]; // [1-2, 3-4, 5-6, 7-8, 9-10]
      
      rows.forEach(row => {
        if (row.range === '1-2') distribution[0] = row.count;
        else if (row.range === '3-4') distribution[1] = row.count;
        else if (row.range === '5-6') distribution[2] = row.count;
        else if (row.range === '7-8') distribution[3] = row.count;
        else if (row.range === '9-10') distribution[4] = row.count;
      });
      
      return distribution;
    } catch (error) {
      console.error('Error getting stress level distribution:', error);
      throw error;
    }
  }
  
  /**
   * Get stress trends for a specific user over a period of days
   * @param {number} userId - User ID
   * @param {number} days - Number of days to look back
   * @returns {Promise<Object>} Stress trends data
   */
  static async getStressTrends(userId, days = 30) {
    try {
      const query = `
        SELECT 
          date(completed_at) as date,
          AVG(stress_level) as average
        FROM stress_surveys
        WHERE user_id = ? 
        AND completed_at >= date('now', '-${days} days')
        GROUP BY date
        ORDER BY date
      `;
      
      const rows = await db.all(query, [userId]);
      
      // Create an array of dates for the last 'days' days
      const dates = [];
      const values = [];
      const now = new Date();
      
      // Create a map of date strings to values for quick lookup
      const dateMap = {};
      rows.forEach(row => {
        dateMap[row.date] = parseFloat(row.average).toFixed(1);
      });
      
      // Fill in the arrays with data or zeros
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        
        dates.push(dateStr);
        values.push(dateMap[dateStr] || 0);
      }
      
      return {
        dates,
        values
      };
    } catch (error) {
      console.error('Error getting stress trends:', error);
      throw error;
    }
  }
  
  /**
   * Get weekly trend data
   * @returns {Promise<Object>} Weekly trend data
   */
  static async getWeeklyTrend() {
    try {
      const query = `
        SELECT 
          strftime('%w', completed_at) as day_of_week,
          AVG(stress_level) as average
        FROM stress_surveys
        WHERE completed_at >= date('now', '-7 days')
        GROUP BY day_of_week
        ORDER BY day_of_week
      `;
      
      const rows = await db.all(query, []);
      
      // Format the data for chart.js
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const data = Array(7).fill(0); // Initialize with zeros
      
      rows.forEach(row => {
        const dayIndex = parseInt(row.day_of_week);
        data[dayIndex] = parseFloat(row.average).toFixed(1);
      });
      
      return {
        labels: dayLabels,
        data
      };
    } catch (error) {
      console.error('Error getting weekly trend:', error);
      throw error;
    }
  }
  
  /**
   * Get common stressors
   * @returns {Promise<Array>} Common stressors
   */
  static async getCommonStressors() {
    try {
      // This requires parsing the JSON survey_data field
      // For simplicity, we'll return mock data
      // In a real implementation, you would parse the survey_data JSON and extract stressors
      
      const mockStressors = [
        { name: 'Work', count: 45 },
        { name: 'Family', count: 32 },
        { name: 'Health', count: 28 },
        { name: 'Finances', count: 25 },
        { name: 'Relationships', count: 20 }
      ];
      
      return mockStressors;
    } catch (error) {
      console.error('Error getting common stressors:', error);
      throw error;
    }
  }
  
  /**
   * Get gender distribution of stress levels
   * @returns {Promise<Object>} Gender distribution
   */
  static async getGenderDistribution() {
    try {
      const query = `
        SELECT 
          u.gender,
          COUNT(*) as count
        FROM stress_surveys ss
        JOIN users u ON ss.user_id = u.id
        GROUP BY u.gender
      `;
      
      const rows = await db.all(query, []);
      
      // Format the data
      const distribution = {
        male: 0,
        female: 0,
        other: 0
      };
      
      rows.forEach(row => {
        if (row.gender in distribution) {
          distribution[row.gender] = row.count;
        } else {
          distribution.other += row.count;
        }
      });
      
      return distribution;
    } catch (error) {
      console.error('Error getting gender distribution:', error);
      throw error;
    }
  }
  
  /**
   * Get marital status distribution of stress levels
   * @returns {Promise<Object>} Marital status distribution
   */
  static async getMaritalDistribution() {
    try {
      const query = `
        SELECT 
          u.marital_status,
          COUNT(*) as count
        FROM stress_surveys ss
        JOIN users u ON ss.user_id = u.id
        GROUP BY u.marital_status
      `;
      
      const rows = await db.all(query, []);
      
      // Format the data
      const distribution = {
        single: 0,
        married: 0,
        divorced: 0,
        widowed: 0,
        other: 0
      };
      
      rows.forEach(row => {
        if (row.marital_status in distribution) {
          distribution[row.marital_status] = row.count;
        } else {
          distribution.other += row.count;
        }
      });
      
      return distribution;
    } catch (error) {
      console.error('Error getting marital distribution:', error);
      throw error;
    }
  }
}

module.exports = StressSurvey;
