const db = require('../config/db-wrapper');

class Session {
  /**
   * Create a new session (appointment)
   * @param {Object} sessionData - Session data
   * @returns {Promise<Object>} Created session
   */
  static async create(sessionData) {
    try {
      const { 
        employee_id, 
        psychologist_id, 
        title,
        description,
        session_date, 
        start_time, 
        end_time, 
        type, 
        location,
        duration_minutes = 60 // Default session duration is 60 minutes
      } = sessionData;
      
      // Calculate end_time if not provided
      let calculatedEndTime = end_time;
      if (!calculatedEndTime && start_time) {
        // Parse start_time (expected format: HH:MM)
        const [startHours, startMinutes] = start_time.split(':').map(Number);
        
        // Calculate end time by adding duration_minutes
        let endHours = startHours;
        let endMinutes = startMinutes + duration_minutes;
        
        // Adjust for hour overflow
        if (endMinutes >= 60) {
          endHours += Math.floor(endMinutes / 60);
          endMinutes = endMinutes % 60;
        }
        
        // Format end time as HH:MM
        calculatedEndTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
      }
      
      // Log the actual data we're inserting
      console.log('Creating session with data:', {
        employee_id,
        psychologist_id,
        title,
        description,
        session_date,
        start_time,
        end_time: calculatedEndTime,
        type,
        location,
        status: 'scheduled',
        duration_minutes
      });
      
      const query = `
        INSERT INTO sessions (
          employee_id, psychologist_id, title, description, 
          session_date, start_time, end_time, type, location, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await db.run(query, [
        employee_id,
        psychologist_id,
        title || 'Session',
        description || '',
        session_date,
        start_time,
        calculatedEndTime, // Use calculated end_time
        type,
        location || '',
        'scheduled' // Default status
      ]);
      
      return {
        id: result.lastID,
        employee_id,
        psychologist_id,
        title,
        description,
        session_date,
        start_time,
        end_time: calculatedEndTime,
        type,
        location,
        status: 'scheduled',
        duration_minutes,
        created_at: new Date()
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }
  
  /**
   * Get session by ID
   * @param {number} id - Session ID
   * @returns {Promise<Object|null>} Session object or null if not found
   */
  static async findById(id) {
    try {
      const query = `
        SELECT s.*, 
          e.name as employee_name, 
          e.email as employee_email,
          e.avatar as employee_avatar,
          p.name as psychologist_name,
          p.email as psychologist_email,
          p.avatar as psychologist_avatar,
          sf.rating,
          sf.improvements,
          sf.comments as feedback_comments,
          sf.follow_up as feedback_follow_up
        FROM sessions s
        JOIN users e ON s.employee_id = e.id
        JOIN users p ON s.psychologist_id = p.id
        LEFT JOIN session_feedback sf ON s.id = sf.session_id
        WHERE s.id = ?
      `;
      
      const rows = await db.all(query, [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      const session = rows[0];
      
      // Format session data
      session.employee = {
        id: session.employee_id,
        name: session.employee_name,
        email: session.employee_email,
        avatar: session.employee_avatar
      };
      
      session.psychologist = {
        id: session.psychologist_id,
        name: session.psychologist_name,
        email: session.psychologist_email,
        avatar: session.psychologist_avatar
      };
      
      // Add feedback if available
      if (session.rating) {
        session.feedback = {
          rating: session.rating,
          improvements: session.improvements ? JSON.parse(session.improvements) : [],
          comments: session.feedback_comments,
          follow_up: session.feedback_follow_up
        };
        
        // Remove raw feedback fields
        delete session.rating;
        delete session.improvements;
        delete session.feedback_comments;
        delete session.feedback_follow_up;
      }
      
      // Remove redundant fields
      delete session.employee_name;
      delete session.employee_email;
      delete session.employee_avatar;
      delete session.psychologist_name;
      delete session.psychologist_email;
      delete session.psychologist_avatar;
      
      return session;
    } catch (error) {
      console.error('Error finding session by ID:', error);
      throw error;
    }
  }
  
  /**
   * Get sessions by employee ID
   * @param {number} employeeId - Employee ID
   * @returns {Promise<Array>} Array of sessions
   */
  static async getByEmployeeId(employeeId) {
    try {
      const query = `
        SELECT s.*, 
          p.name as psychologist_name,
          p.avatar as psychologist_avatar
        FROM sessions s
        JOIN users p ON s.psychologist_id = p.id
        WHERE s.employee_id = ?
        ORDER BY s.session_date DESC
      `;
      
      const rows = await db.all(query, [employeeId]);
      
      return rows.map(session => {
        session.psychologist = {
          id: session.psychologist_id,
          name: session.psychologist_name,
          avatar: session.psychologist_avatar
        };
        
        // Remove redundant fields
        delete session.psychologist_name;
        delete session.psychologist_avatar;
        
        return session;
      });
    } catch (error) {
      console.error('Error getting sessions by employee ID:', error);
      throw error;
    }
  }
  
  /**
   * Get sessions by psychologist ID
   * @param {number} psychologistId - Psychologist ID
   * @returns {Promise<Array>} Array of sessions
   */
  static async getByPsychologistId(psychologistId) {
    try {
      const query = `
        SELECT s.*, 
          e.name as employee_name,
          e.avatar as employee_avatar
        FROM sessions s
        JOIN users e ON s.employee_id = e.id
        WHERE s.psychologist_id = ?
        ORDER BY s.session_date DESC, s.start_time ASC
      `;
      
      const rows = await db.all(query, [psychologistId]);
      
      return rows.map(session => {
        session.employee = {
          id: session.employee_id,
          name: session.employee_name,
          avatar: session.employee_avatar
        };
        
        // Remove redundant fields
        delete session.employee_name;
        delete session.employee_avatar;
        
        return session;
      });
    } catch (error) {
      console.error('Error getting sessions by psychologist ID:', error);
      throw error;
    }
  }
  
  /**
   * Get upcoming sessions for a user (either employee or psychologist)
   * @param {number} userId - User ID
   * @param {string} role - User role ('employee' or 'psychologist')
   * @param {number} limit - Maximum number of sessions to return
   * @returns {Promise<Array>} Array of upcoming sessions
   */
  static async getUpcomingSessions(userId, role, limit = 5) {
    try {
      let query;
      
      if (role === 'employee') {
        query = `
          SELECT s.*, 
            p.name as psychologist_name,
            p.avatar as psychologist_avatar
          FROM sessions s
          JOIN users p ON s.psychologist_id = p.id
          WHERE s.employee_id = ? 
          AND (s.status = 'scheduled' OR s.status = 'active') 
          AND s.session_date >= date('now')
          ORDER BY s.session_date ASC
          LIMIT ?
        `;
      } else {
        query = `
          SELECT s.*, 
            e.name as employee_name,
            e.avatar as employee_avatar
          FROM sessions s
          JOIN users e ON s.employee_id = e.id
          WHERE s.psychologist_id = ? 
          AND (s.status = 'scheduled' OR s.status = 'active') 
          AND s.session_date >= date('now')
          ORDER BY s.session_date ASC
          LIMIT ?
        `;
      }
      
      const rows = await db.all(query, [userId, limit]);
      
      return rows.map(session => {
        if (role === 'employee') {
          session.psychologist = {
            id: session.psychologist_id,
            name: session.psychologist_name,
            avatar: session.psychologist_avatar
          };
          
          // Remove redundant fields
          delete session.psychologist_name;
          delete session.psychologist_avatar;
        } else {
          session.employee = {
            id: session.employee_id,
            name: session.employee_name,
            avatar: session.employee_avatar
          };
          
          // Remove redundant fields
          delete session.employee_name;
          delete session.employee_avatar;
        }
        
        return session;
      });
    } catch (error) {
      console.error('Error getting upcoming sessions:', error);
      throw error;
    }
  }
  
  /**
   * Get past sessions for a user (either employee or psychologist)
   * @param {number} userId - User ID
   * @param {string} role - User role ('employee' or 'psychologist')
   * @param {number} limit - Maximum number of sessions to return
   * @returns {Promise<Array>} Array of past sessions
   */
  static async getPastSessions(userId, role, limit = 10) {
    try {
      let query;
      
      if (role === 'employee') {
        query = `
          SELECT s.*, 
            p.name as psychologist_name,
            p.avatar as psychologist_avatar,
            sf.rating
          FROM sessions s
          JOIN users p ON s.psychologist_id = p.id
          LEFT JOIN session_feedback sf ON s.id = sf.session_id
          WHERE s.employee_id = ? AND (s.status = 'completed' OR s.status = 'cancelled' OR s.status = 'no-show') AND s.session_date < date('now')
          ORDER BY s.session_date DESC
          LIMIT ?
        `;
      } else {
        query = `
          SELECT s.*, 
            e.name as employee_name,
            e.avatar as employee_avatar,
            sf.rating
          FROM sessions s
          JOIN users e ON s.employee_id = e.id
          LEFT JOIN session_feedback sf ON s.id = sf.session_id
          WHERE s.psychologist_id = ? AND (s.status = 'completed' OR s.status = 'cancelled' OR s.status = 'no-show') AND s.session_date < date('now')
          ORDER BY s.session_date DESC
          LIMIT ?
        `;
      }
      
      const rows = await db.all(query, [userId, limit]);
      
      return rows.map(session => {
        if (role === 'employee') {
          session.psychologist = {
            id: session.psychologist_id,
            name: session.psychologist_name,
            avatar: session.psychologist_avatar
          };
          
          // Remove redundant fields
          delete session.psychologist_name;
          delete session.psychologist_avatar;
        } else {
          session.employee = {
            id: session.employee_id,
            name: session.employee_name,
            avatar: session.employee_avatar
          };
          
          // Remove redundant fields
          delete session.employee_name;
          delete session.employee_avatar;
        }
        
        if (session.rating) {
          session.has_feedback = true;
        }
        
        return session;
      });
    } catch (error) {
      console.error('Error getting past sessions:', error);
      throw error;
    }
  }
  
  /**
   * Get today's sessions for a user (either employee or psychologist)
   * @param {number} userId - User ID
   * @param {string} role - User role ('employee' or 'psychologist')
   * @param {number} limit - Maximum number of sessions to return
   * @returns {Promise<Array>} Array of today's sessions
   */
  static async getTodaySessions(userId, role, limit = 5) {
    try {
      let query;
      
      if (role === 'employee') {
        query = `
          SELECT s.*, 
            p.name as psychologist_name,
            p.avatar as psychologist_avatar
          FROM sessions s
          JOIN users p ON s.psychologist_id = p.id
          WHERE s.employee_id = ? AND s.status = 'scheduled' 
            AND s.session_date = date('now')
          ORDER BY s.session_date ASC
          LIMIT ?
        `;
      } else {
        query = `
          SELECT s.*, 
            e.name as employee_name,
            e.avatar as employee_avatar
          FROM sessions s
          JOIN users e ON s.employee_id = e.id
          WHERE s.psychologist_id = ? AND s.status = 'scheduled' 
            AND s.session_date = date('now')
          ORDER BY s.session_date ASC
          LIMIT ?
        `;
      }
      
      const rows = await db.all(query, [userId, limit]);
      
      return rows.map(session => {
        if (role === 'employee') {
          session.psychologist = {
            id: session.psychologist_id,
            name: session.psychologist_name,
            avatar: session.psychologist_avatar
          };
          
          // Remove redundant fields
          delete session.psychologist_name;
          delete session.psychologist_avatar;
        } else {
          session.employee = {
            id: session.employee_id,
            name: session.employee_name,
            avatar: session.employee_avatar
          };
          
          // Remove redundant fields
          delete session.employee_name;
          delete session.employee_avatar;
        }
        
        return session;
      });
    } catch (error) {
      console.error('Error getting today\'s sessions:', error);
      throw error;
    }
  }
  
  /**
   * Update session status
   * @param {number} id - Session ID
   * @param {string} status - New status
   * @returns {Promise<boolean>} Success indicator
   */
  static async updateStatus(id, status) {
    try {
      const validStatuses = ['scheduled', 'active', 'completed', 'cancelled', 'no-show'];
      
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      }
      
      const query = 'UPDATE sessions SET status = ?, updated_at = datetime(\'now\') WHERE id = ?';
      
      const result = await db.run(query, [status, id]);
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating session status:', error);
      throw error;
    }
  }
  
  /**
   * Check if a psychologist is available at a specific time
   * @param {number} psychologistId - The psychologist ID
   * @param {string} sessionDate - The date to check (YYYY-MM-DD)
   * @param {string} startTime - The start time (HH:MM)
   * @param {string} endTime - The end time (HH:MM)
   * @returns {Promise<boolean>} - True if available, false if not
   */
  static async checkPsychologistAvailability(psychologistId, sessionDate, startTime, endTime) {
    try {
      // Check if the date is blocked
      const blockedQuery = `
        SELECT COUNT(*) as count
        FROM blocked_dates
        WHERE psychologist_id = ? AND date = ?
      `;
      
      const blockedRows = await db.all(blockedQuery, [psychologistId, sessionDate]);
      
      // If the date is blocked, the psychologist is not available
      if (blockedRows[0].count > 0) {
        console.log(`Date ${sessionDate} is blocked for psychologist ${psychologistId}`);
        return false;
      }
      
      // Get the day of week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = new Date(sessionDate).getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      
      // Check if the psychologist works on this day
      const availabilityQuery = `
        SELECT ${dayName} as day_schedule
        FROM psychologist_availability
        WHERE psychologist_id = ?
      `;
      
      const availabilityRows = await db.all(availabilityQuery, [psychologistId]);
      
      // If no availability or not working on this day, return false
      if (availabilityRows.length === 0 || !availabilityRows[0].day_schedule) {
        console.log(`Psychologist ${psychologistId} has no availability set for ${dayName}`);
        return false;
      }
      
      let daySchedule;
      try {
        daySchedule = JSON.parse(availabilityRows[0].day_schedule);
      } catch (e) {
        console.error(`Error parsing day schedule for psychologist ${psychologistId}:`, e);
        return false;
      }
      
      // If the day is not enabled, return false
      if (!daySchedule.enabled) {
        console.log(`Psychologist ${psychologistId} does not work on ${dayName}`);
        return false;
      }
      
      // Check if the requested slot is within working hours
      const workingStartTime = daySchedule.start;
      const workingEndTime = daySchedule.end;
      
      if (startTime < workingStartTime || endTime > workingEndTime) {
        console.log(`Requested time ${startTime}-${endTime} is outside working hours ${workingStartTime}-${workingEndTime}`);
        return false;
      }
      
      // Check for conflicts with existing sessions
      const sessionsQuery = `
        SELECT start_time, end_time
        FROM sessions
        WHERE psychologist_id = ?
          AND session_date = ?
          AND status IN ('scheduled', 'active')
      `;
      
      const existingSessions = await db.all(sessionsQuery, [psychologistId, sessionDate]);
      
      // Check for time conflicts with existing sessions
      const hasConflict = existingSessions.some(session => {
        const sessionStart = session.start_time;
        const sessionEnd = session.end_time;
        
        return (
          (startTime <= sessionStart && endTime > sessionStart) ||
          (startTime < sessionEnd && endTime >= sessionEnd) ||
          (startTime >= sessionStart && endTime <= sessionEnd)
        );
      });
      
      if (hasConflict) {
        console.log(`Time conflict found for psychologist ${psychologistId} at ${startTime}-${endTime}`);
        return false;
      }
      
      // If we made it here, the slot is available
      return true;
    } catch (error) {
      console.error('Error checking psychologist availability:', error);
      // In case of error, assume the psychologist is not available
      return false;
    }
  }

  /**
   * Get sessions for a psychologist on a specific date
   * @param {number} psychologistId - The psychologist ID
   * @param {string} date - The date to check (YYYY-MM-DD)
   * @returns {Promise<Array>} - Array of sessions
   */
  static async getSessionsByDate(psychologistId, date) {
    try {
      const query = `
        SELECT * FROM sessions 
        WHERE psychologist_id = ? 
        AND session_date = ? 
        AND status NOT IN ('cancelled', 'declined')
      `;
      
      // Log the query for debugging
      console.log('Query:', query);
      
      const rows = await db.all(query, [psychologistId, date]);
      console.log(`Found ${rows.length} sessions for psychologist ${psychologistId} on ${date}`);
      return rows;
    } catch (error) {
      console.error('Error getting sessions by date:', error);
      return [];
    }
  }

  /**
   * Get available time slots for a psychologist on a specific date
   * @param {number} psychologistId - The psychologist ID
   * @param {string} date - The date to check (YYYY-MM-DD)
   * @returns {Promise<Array>} - Array of available time slots
   */
  static async getAvailableTimeSlots(psychologistId, date) {
    try {
      // First, check if the date is blocked
      const blockedQuery = `
        SELECT COUNT(*) as count
        FROM blocked_dates
        WHERE psychologist_id = ? AND date = ?
      `;
      
      console.log(`Checking if date ${date} is blocked for psychologist ${psychologistId}`);
      
      const blockedRows = await db.all(blockedQuery, [psychologistId, date]);
      
      // If the date is blocked, return empty array
      if (blockedRows[0].count > 0) {
        return [];
      }
      
      // Get the day of week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = new Date(date).getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      
      // Check if the psychologist works on this day
      const availabilityQuery = `
        SELECT ${dayName} as day_schedule
        FROM psychologist_availability
        WHERE psychologist_id = ?
      `;
      
      const availabilityRows = await db.all(availabilityQuery, [psychologistId]);
      
      // If no availability or not working on this day, return empty array
      if (availabilityRows.length === 0 || !availabilityRows[0].day_schedule) {
        return [];
      }
      
      const daySchedule = JSON.parse(availabilityRows[0].day_schedule);
      
      // If the day is not enabled, return empty array
      if (!daySchedule.enabled) {
        return [];
      }
      
      // Get the working hours for this day
      const workingStartTime = daySchedule.start;
      const workingEndTime = daySchedule.end;
      
      // Get existing sessions for this date
      const existingSessions = await this.getSessionsByDate(psychologistId, date);
      
      // Generate time slots (assuming 1-hour sessions with 15-minute breaks)
      const timeSlots = [];
      const slotDuration = 60; // 60 minutes per session
      const breakDuration = 15; // 15 minutes break between sessions
      
      // Parse working hours
      const startHour = parseInt(workingStartTime.split(':')[0]);
      const startMinute = parseInt(workingStartTime.split(':')[1]);
      const endHour = parseInt(workingEndTime.split(':')[0]);
      const endMinute = parseInt(workingEndTime.split(':')[1]);
      
      // Create a Date object for the start time
      const startDate = new Date(date);
      startDate.setHours(startHour, startMinute, 0, 0);
      
      // Create a Date object for the end time
      const endDate = new Date(date);
      endDate.setHours(endHour, endMinute, 0, 0);
      
      // Generate slots
      let currentSlotStart = new Date(startDate);
      let slotId = 1;
      
      while (currentSlotStart.getTime() + slotDuration * 60000 <= endDate.getTime()) {
        const currentSlotEnd = new Date(currentSlotStart.getTime() + slotDuration * 60000);
        
        // Format times as HH:MM
        const startTime = currentSlotStart.toTimeString().substring(0, 5);
        const endTime = currentSlotEnd.toTimeString().substring(0, 5);
        
        // Check if this slot conflicts with any existing session
        const isAvailable = !existingSessions.some(session => {
          const sessionStart = session.start_time;
          const sessionEnd = session.end_time;
          
          return (
            (startTime <= sessionStart && endTime > sessionStart) ||
            (startTime < sessionEnd && endTime >= sessionEnd) ||
            (startTime >= sessionStart && endTime <= sessionEnd)
          );
        });
        
        if (isAvailable) {
          timeSlots.push({
            id: slotId++,
            startTime,
            endTime,
            available: true
          });
        }
        
        // Move to the next slot (adding session duration + break)
        currentSlotStart = new Date(currentSlotStart.getTime() + (slotDuration + breakDuration) * 60000);
      }
      
      return timeSlots;
    } catch (error) {
      console.error('Error getting available time slots:', error);
      return [];
    }
  }

  /**
   * Update session status automatically based on time and attendance
   * @param {number} sessionId - Session ID
   * @param {Object} options - Options for status update
   * @param {boolean} options.participantJoined - Whether any participant has joined
   * @param {boolean} options.isEmployee - Whether the participant is an employee
   * @param {boolean} options.isPsychologist - Whether the participant is a psychologist
   * @returns {Promise<Object>} Updated session
   */
  static async updateSessionStatus(sessionId, options = {}) {
    try {
      const { participantJoined = false, isEmployee = false, isPsychologist = false } = options;
      
      // Get the session
      const session = await this.findById(sessionId);
      if (!session) {
        throw new Error(`Session with ID ${sessionId} not found`);
      }
      
      // Use system's local time directly without time zone conversion
      const now = new Date();
      const sessionDate = new Date(session.session_date);
      
      // Parse start and end times
      let startHour = 0, startMinute = 0;
      let endHour = 0, endMinute = 0;

      if (session.start_time && typeof session.start_time === 'string') {
        const startTimeParts = session.start_time.split(':');
        startHour = parseInt(startTimeParts[0] || 0);
        startMinute = parseInt(startTimeParts[1] || 0);
      }
      
      if (session.end_time && typeof session.end_time === 'string') {
        const endTimeParts = session.end_time.split(':');
        endHour = parseInt(endTimeParts[0] || 0);
        endMinute = parseInt(endTimeParts[1] || 0);
      }
      
      // Set start and end times on session date
      const sessionStartDate = new Date(sessionDate);
      sessionStartDate.setHours(startHour, startMinute, 0);
      
      const sessionEndDate = new Date(sessionDate);
      sessionEndDate.setHours(endHour, endMinute, 0);
      
      // Calculate 5 minutes before session start
      const fiveMinBeforeStart = new Date(sessionStartDate);
      fiveMinBeforeStart.setMinutes(sessionStartDate.getMinutes() - 5);
      
      let newStatus = session.status;
      let updateNeeded = false;
      
      // Status logic based on time and attendance
      if (now > sessionEndDate) {
        // Session time has ended
        if (session.status === 'active') {
          // If session was active, mark as completed
          newStatus = 'completed';
          updateNeeded = true;
        } else if (session.status === 'scheduled') {
          // If session was scheduled but no one joined, mark as missed
          newStatus = 'missed';
          updateNeeded = true;
        }
      } else if (now >= fiveMinBeforeStart && now <= sessionEndDate) {
        // During session time (including 5 min before)
        if (participantJoined) {
          // If any participant has joined and session is not already active/completed/cancelled
          if (session.status === 'scheduled') {
            newStatus = 'active';
            updateNeeded = true;
          }
        }
      }
      
      // Update the session status if needed
      if (updateNeeded) {
        const updateQuery = 'UPDATE sessions SET status = ? WHERE id = ?';
        await db.run(updateQuery, [newStatus, sessionId]);
        
        // Return updated session
        const updatedSession = await this.findById(sessionId);
        return updatedSession;
      }
      
      return session;
    } catch (error) {
      console.error('Error updating session status:', error);
      throw error;
    }
  }
  
  /**
   * Check if a session overlaps with existing sessions for a psychologist or employee
   * @param {number} userId - User ID (psychologist or employee)
   * @param {string} userRole - User role ('psychologist' or 'employee')
   * @param {string} sessionDate - Session date (YYYY-MM-DD)
   * @param {string} startTime - Start time (HH:MM)
   * @param {string} endTime - End time (HH:MM)
   * @param {number} excludeSessionId - Optional session ID to exclude from check (for updates)
   * @returns {Promise<boolean>} True if overlap exists, false otherwise
   */
  static async checkSessionOverlap(userId, userRole, sessionDate, startTime, endTime, excludeSessionId = null) {
    try {
      const userField = userRole === 'psychologist' ? 'psychologist_id' : 'employee_id';
      
      let query = `
        SELECT id FROM sessions 
        WHERE ${userField} = ? 
        AND session_date = ? 
        AND status NOT IN ('cancelled', 'missed')
        AND (
          (start_time <= ? AND end_time > ?) OR
          (start_time < ? AND end_time >= ?) OR
          (start_time >= ? AND end_time <= ?)
        )
      `;
      
      const params = [
        userId,
        sessionDate,
        endTime, startTime,    // Case 1: Existing session starts before and ends during new session
        startTime, endTime,    // Case 2: Existing session starts during and ends after new session
        startTime, endTime     // Case 3: Existing session is completely within new session time
      ];
      
      // If we're updating an existing session, exclude it from the check
      if (excludeSessionId) {
        query += ' AND id != ?';
        params.push(excludeSessionId);
      }
      
      const rows = await db.all(query, params);
      return rows.length > 0;
    } catch (error) {
      console.error('Error checking session overlap:', error);
      throw error;
    }
  }
}



module.exports = Session;
