const db = require('../config/database');

class SessionMessage {
  // Create a new session message
  static async create(messageData) {
    return new Promise((resolve, reject) => {
      const { sessionId, senderId, role, message, timestamp } = messageData;
      
      const query = `
        INSERT INTO session_messages 
        (session_id, sender_id, sender_role, message, created_at) 
        VALUES (?, ?, ?, ?, ?)
      `;
      
      db.run(query, [sessionId, senderId, role, message, timestamp || new Date().toISOString()], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            sessionId,
            senderId,
            role,
            message,
            timestamp: timestamp || new Date().toISOString()
          });
        }
      });
    });
  }
  
  // Get messages for a specific session
  static async getBySessionId(sessionId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM session_messages 
        WHERE session_id = ? 
        ORDER BY created_at ASC
      `;
      
      db.all(query, [sessionId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  // Mark all messages in a session as read
  static async markAsRead(sessionId, userId) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE session_messages
        SET is_read = 1
        WHERE session_id = ? AND sender_id != ? AND is_read = 0
      `;
      
      db.run(query, [sessionId, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ updated: this.changes });
        }
      });
    });
  }
  
  // Get unread message count for a user in a session
  static async getUnreadCount(sessionId, userId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT COUNT(*) as count
        FROM session_messages
        WHERE session_id = ? AND sender_id != ? AND is_read = 0
      `;
      
      db.get(query, [sessionId, userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }
}

module.exports = SessionMessage;
