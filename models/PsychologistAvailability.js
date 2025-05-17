const db = require('../config/db-wrapper');

class PsychologistAvailability {
  /**
   * Get availability settings for a psychologist
   * @param {number} psychologistId - The psychologist ID
   * @returns {Promise<Object>} - The availability settings
   */
  static async getByPsychologistId(psychologistId) {
    try {
      // Check if availability settings exist
      const rows = await db.all(
        'SELECT * FROM psychologist_availability WHERE psychologist_id = ?',
        [psychologistId]
      );

      // If no settings exist, create default settings
      if (rows.length === 0) {
        const defaultSettings = {
          psychologist_id: psychologistId,
          monday: JSON.stringify({ enabled: true, start: '09:00', end: '17:00' }),
          tuesday: JSON.stringify({ enabled: true, start: '09:00', end: '17:00' }),
          wednesday: JSON.stringify({ enabled: true, start: '09:00', end: '17:00' }),
          thursday: JSON.stringify({ enabled: true, start: '09:00', end: '17:00' }),
          friday: JSON.stringify({ enabled: true, start: '09:00', end: '17:00' }),
          saturday: JSON.stringify({ enabled: false, start: '09:00', end: '17:00' }),
          sunday: JSON.stringify({ enabled: false, start: '09:00', end: '17:00' }),
          session_duration: 60,
          break_time: 15,
          created_at: new Date(),
          updated_at: new Date()
        };

        const result = await db.run(
          `INSERT INTO psychologist_availability 
           (psychologist_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, session_duration, break_time, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            defaultSettings.psychologist_id,
            defaultSettings.monday,
            defaultSettings.tuesday,
            defaultSettings.wednesday,
            defaultSettings.thursday,
            defaultSettings.friday,
            defaultSettings.saturday,
            defaultSettings.sunday,
            defaultSettings.session_duration,
            defaultSettings.break_time,
            defaultSettings.created_at,
            defaultSettings.updated_at
          ]
        );

        return {
          id: result.lastID,
          ...defaultSettings,
          monday: JSON.parse(defaultSettings.monday),
          tuesday: JSON.parse(defaultSettings.tuesday),
          wednesday: JSON.parse(defaultSettings.wednesday),
          thursday: JSON.parse(defaultSettings.thursday),
          friday: JSON.parse(defaultSettings.friday),
          saturday: JSON.parse(defaultSettings.saturday),
          sunday: JSON.parse(defaultSettings.sunday)
        };
      }

      // Parse JSON fields
      const availability = rows[0];
      availability.monday = JSON.parse(availability.monday);
      availability.tuesday = JSON.parse(availability.tuesday);
      availability.wednesday = JSON.parse(availability.wednesday);
      availability.thursday = JSON.parse(availability.thursday);
      availability.friday = JSON.parse(availability.friday);
      availability.saturday = JSON.parse(availability.saturday);
      availability.sunday = JSON.parse(availability.sunday);

      return availability;
    } catch (error) {
      console.error('Error getting psychologist availability:', error);
      throw error;
    }
  }

  /**
   * Update working hours for a psychologist
   * @param {number} psychologistId - The psychologist ID
   * @param {Object} workingHours - The working hours data
   * @returns {Promise<boolean>} - True if successful
   */
  static async updateWorkingHours(psychologistId, workingHours) {
    try {
      const {
        monday,
        tuesday,
        wednesday,
        thursday,
        friday,
        saturday,
        sunday,
        session_duration,
        break_time
      } = workingHours;

      // Update availability settings
      await db.run(
        `UPDATE psychologist_availability SET 
         monday = ?, 
         tuesday = ?, 
         wednesday = ?, 
         thursday = ?, 
         friday = ?, 
         saturday = ?, 
         sunday = ?,
         session_duration = ?,
         break_time = ?,
         updated_at = ?
         WHERE psychologist_id = ?`,
        [
          JSON.stringify(workingHours.monday),
          JSON.stringify(workingHours.tuesday),
          JSON.stringify(workingHours.wednesday),
          JSON.stringify(workingHours.thursday),
          JSON.stringify(workingHours.friday),
          JSON.stringify(workingHours.saturday),
          JSON.stringify(workingHours.sunday),
          workingHours.session_duration,
          workingHours.break_time,
          new Date(),
          psychologistId
        ]
      );

      return true;
    } catch (error) {
      console.error('Error updating working hours:', error);
      throw error;
    }
  }

  /**
   * Get blocked dates for a psychologist
   * @param {number} psychologistId - The psychologist ID
   * @returns {Promise<Array>} - The blocked dates
   */
  static async getBlockedDates(psychologistId) {
    try {
      const rows = await db.all(
        'SELECT * FROM blocked_dates WHERE psychologist_id = ? ORDER BY date ASC',
        [psychologistId]
      );

      return rows;
    } catch (error) {
      console.error('Error getting blocked dates:', error);
      throw error;
    }
  }

  /**
   * Block a date for a psychologist
   * @param {number} psychologistId - The psychologist ID
   * @param {string} date - The date to block (YYYY-MM-DD)
   * @param {string} reason - The reason for blocking
   * @returns {Promise<boolean>} - True if successful
   */
  static async blockDate(psychologistId, date, reason) {
    try {
      // Check if date is already blocked
      const [existingRows] = await db.execute(
        'SELECT * FROM blocked_dates WHERE psychologist_id = ? AND date = ?',
        [psychologistId, date]
      );

      if (existingRows.length > 0) {
        // Update existing blocked date
        await db.run(
          'UPDATE blocked_dates SET reason = ?, updated_at = ? WHERE psychologist_id = ? AND date = ?',
          [reason, new Date(), psychologistId, date]
        );
      } else {
        // Insert new blocked date
        await db.run(
          'INSERT INTO blocked_dates (psychologist_id, date, reason, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          [psychologistId, date, reason, new Date(), new Date()]
        );
      }

      return true;
    } catch (error) {
      console.error('Error blocking date:', error);
      throw error;
    }
  }

  /**
   * Unblock a date for a psychologist
   * @param {number} dateId - The blocked date ID
   * @param {number} psychologistId - The psychologist ID
   * @returns {Promise<boolean>} - True if successful
   */
  static async unblockDate(dateId, psychologistId) {
    try {
      const result = await db.run(
        'DELETE FROM blocked_dates WHERE id = ? AND psychologist_id = ?',
        [dateId, psychologistId]
      );

      return result.changes > 0;
    } catch (error) {
      console.error('Error unblocking date:', error);
      throw error;
    }
  }
  
  /**
   * Get blocked dates for a psychologist
   * @param {number} psychologistId - The psychologist ID
   * @returns {Promise<Array>} - The blocked dates
   */
  static async getBlockedDates(psychologistId) {
    try {
      const rows = await db.all(
        'SELECT * FROM blocked_dates WHERE psychologist_id = ? ORDER BY date ASC',
        [psychologistId]
      );
      return rows || [];
    } catch (error) {
      console.error('Error getting blocked dates:', error);
      return [];
    }
  }
}

module.exports = PsychologistAvailability;
