const db = require('../config/database');

class StressSurvey {
  // Create a new stress survey
  static create(surveyData) {
    const { user_id, stress_level, survey_data } = surveyData;
    
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO stress_surveys (user_id, stress_level, survey_data) 
                    VALUES (?, ?, ?)`;
      
      db.run(query, [user_id, stress_level, JSON.stringify(survey_data)], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            user_id,
            stress_level,
            survey_data,
            completed_at: new Date()
          });
        }
      });
    });
  }
  
  // Get survey by ID
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM stress_surveys WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row) {
            // Parse the JSON survey data
            row.survey_data = JSON.parse(row.survey_data);
          }
          resolve(row);
        }
      });
    });
  }
  
  // Get latest surveys by user ID
  static getLatestByUserId(userId, limit = 7) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM stress_surveys 
                    WHERE user_id = ? 
                    ORDER BY completed_at DESC 
                    LIMIT ?`;
      
      db.all(query, [userId, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Parse the JSON survey data for each row
          rows.forEach(row => {
            row.survey_data = JSON.parse(row.survey_data);
          });
          resolve(rows);
        }
      });
    });
  }
  
  // Get average stress level for a user
  static getAverageByUserId(userId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT AVG(stress_level) as average 
                    FROM stress_surveys 
                    WHERE user_id = ?`;
      
      db.get(query, [userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? parseFloat(row.average).toFixed(1) : 0);
        }
      });
    });
  }
  
  // Get anonymous statistics for dashboard
  static getAnonymousStatistics() {
    return new Promise((resolve, reject) => {
      // Get average stress level
      db.get('SELECT AVG(stress_level) as average FROM stress_surveys', [], (err, avgRow) => {
        if (err) {
          return reject(err);
        }
        
        // Get count of surveys
        db.get('SELECT COUNT(*) as count FROM stress_surveys', [], (err, countRow) => {
          if (err) {
            return reject(err);
          }
          
          // Get count by stress level category
          const query = `
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
          
          db.all(query, [], (err, categoryRows) => {
            if (err) {
              return reject(err);
            }
            
            // Format the data
            const categories = { low: 0, medium: 0, high: 0 };
            categoryRows.forEach(row => {
              if (row.category) {
                categories[row.category] = row.count;
              }
            });
            
            resolve({
              average: avgRow.average ? parseFloat(avgRow.average).toFixed(1) : 0,
              count: countRow.count,
              categories
            });
          });
        });
      });
    });
  }
  
  // Get stress level distribution for statistics page
  static getStressLevelDistribution() {
    return new Promise((resolve, reject) => {
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
      
      db.all(query, [], (err, rows) => {
        if (err) {
          return reject(err);
        }
        
        // Format the data for chart.js
        const distribution = [0, 0, 0, 0, 0]; // [1-2, 3-4, 5-6, 7-8, 9-10]
        
        rows.forEach(row => {
          if (row.range === '1-2') distribution[0] = row.count;
          else if (row.range === '3-4') distribution[1] = row.count;
          else if (row.range === '5-6') distribution[2] = row.count;
          else if (row.range === '7-8') distribution[3] = row.count;
          else if (row.range === '9-10') distribution[4] = row.count;
        });
        
        resolve(distribution);
      });
    });
  }
  
  // Get weekly trend data
  static getWeeklyTrend() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          strftime('%w', completed_at) as day_of_week,
          AVG(stress_level) as average
        FROM stress_surveys
        WHERE completed_at >= date('now', '-7 days')
        GROUP BY day_of_week
        ORDER BY day_of_week
      `;
      
      db.all(query, [], (err, rows) => {
        if (err) {
          return reject(err);
        }
        
        // Initialize array with default values
        const weeklyData = [0, 0, 0, 0, 0, 0, 0]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
        
        // Fill in actual data
        rows.forEach(row => {
          const dayIndex = parseInt(row.day_of_week);
          weeklyData[dayIndex] = parseFloat(row.average).toFixed(1);
        });
        
        resolve(weeklyData);
      });
    });
  }
  
  // Get common stressors
  static getCommonStressors() {
    return new Promise((resolve, reject) => {
      // This requires parsing the JSON survey_data field
      // For simplicity, we'll return mock data
      // In a real implementation, you would parse the survey_data JSON and extract stressors
      
      const mockStressors = [
        { name: 'العمل', percentage: 65 },
        { name: 'العلاقات الشخصية', percentage: 45 },
        { name: 'الصحة', percentage: 35 },
        { name: 'المالية', percentage: 60 },
        { name: 'الدراسة', percentage: 40 }
      ];
      
      resolve(mockStressors);
    });
  }
  
  // Get gender distribution of stress levels
  static getGenderDistribution() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          u.gender,
          COUNT(*) as count
        FROM stress_surveys ss
        JOIN users u ON ss.user_id = u.id
        WHERE u.gender IS NOT NULL
        GROUP BY u.gender
      `;
      
      db.all(query, [], (err, rows) => {
        if (err) {
          return reject(err);
        }
        
        // Format the data
        const distribution = { male: 0, female: 0 };
        
        rows.forEach(row => {
          if (row.gender === 'male') distribution.male = row.count;
          else if (row.gender === 'female') distribution.female = row.count;
        });
        
        resolve(distribution);
      });
    });
  }
  
  // Get marital status distribution of stress levels
  static getMaritalDistribution() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          u.marital_status,
          COUNT(*) as count
        FROM stress_surveys ss
        JOIN users u ON ss.user_id = u.id
        WHERE u.marital_status IS NOT NULL
        GROUP BY u.marital_status
      `;
      
      db.all(query, [], (err, rows) => {
        if (err) {
          return reject(err);
        }
        
        // Format the data
        const distribution = { single: 0, married: 0, divorced: 0, widowed: 0 };
        
        rows.forEach(row => {
          if (distribution.hasOwnProperty(row.marital_status)) {
            distribution[row.marital_status] = row.count;
          }
        });
        
        resolve(distribution);
      });
    });
  }
}

module.exports = StressSurvey;
