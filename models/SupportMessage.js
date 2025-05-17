const db = require('../config/db-wrapper');

class SupportMessage {
  /**
   * Create a new message
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Created message
   */
  static async create(messageData) {
    try {
      const { sender_id, receiver_id, message } = messageData;
      
      const query = `INSERT INTO support_messages (sender_id, receiver_id, message) 
                    VALUES (?, ?, ?)`;
      
      const result = await db.run(query, [sender_id, receiver_id, message]);
      
      return {
        id: result.lastID,
        sender_id,
        receiver_id,
        message,
        is_read: 0,
        created_at: new Date()
      };
    } catch (error) {
      console.error('Error creating support message:', error);
      throw error;
    }
  }
  
  /**
   * Get message by ID
   * @param {number} id - Message ID
   * @returns {Promise<Object|null>} Message object or null if not found
   */
  static async findById(id) {
    try {
      const query = 'SELECT * FROM support_messages WHERE id = ?';
      const rows = await db.all(query, [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error finding support message by ID:', error);
      throw error;
    }
  }
  
  /**
   * Get conversation between two users
   * @param {number} userId1 - First user ID
   * @param {number} userId2 - Second user ID
   * @returns {Promise<Array>} Array of messages
   */
  static async getConversation(userId1, userId2) {
    try {
      const query = `SELECT sm.*, 
                      u1.name as sender_name, 
                      u1.email as sender_email,
                      u2.name as receiver_name, 
                      u2.email as receiver_email
                    FROM support_messages sm
                    JOIN users u1 ON sm.sender_id = u1.id
                    JOIN users u2 ON sm.receiver_id = u2.id
                    WHERE (sm.sender_id = ? AND sm.receiver_id = ?)
                       OR (sm.sender_id = ? AND sm.receiver_id = ?)
                    ORDER BY sm.created_at ASC`;
      
      const messages = await db.all(query, [userId1, userId2, userId2, userId1]);
      
      // Process names for easier display
      return messages.map(message => {
        // Split sender name
        const senderNameParts = message.sender_name ? message.sender_name.split(' ') : ['', ''];
        message.sender_first_name = senderNameParts[0] || '';
        message.sender_last_name = senderNameParts.slice(1).join(' ') || '';
        
        // Split receiver name
        const receiverNameParts = message.receiver_name ? message.receiver_name.split(' ') : ['', ''];
        message.receiver_first_name = receiverNameParts[0] || '';
        message.receiver_last_name = receiverNameParts.slice(1).join(' ') || '';
        
        return message;
      });
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }
  
  /**
   * Get messages for a user
   * @param {number} userId - User ID
   * @param {string} type - Message type ('sent', 'received', or 'all')
   * @returns {Promise<Array>} Array of messages
   */
  static async getMessagesForUser(userId, type = 'all') {
    try {
      let query;
      let params;
      
      if (type === 'sent') {
        query = `SELECT sm.*, 
                  u.name as receiver_name, 
                  u.email as receiver_email
                FROM support_messages sm
                JOIN users u ON sm.receiver_id = u.id
                WHERE sm.sender_id = ?
                ORDER BY sm.created_at DESC`;
        params = [userId];
      } else if (type === 'received') {
        query = `SELECT sm.*, 
                  u.name as sender_name, 
                  u.email as sender_email
                FROM support_messages sm
                JOIN users u ON sm.sender_id = u.id
                WHERE sm.receiver_id = ?
                ORDER BY sm.created_at DESC`;
        params = [userId];
      } else {
        query = `SELECT sm.*, 
                  CASE 
                    WHEN sm.sender_id = ? THEN u2.name
                    ELSE u1.name
                  END as other_user_name,
                  CASE 
                    WHEN sm.sender_id = ? THEN u2.email
                    ELSE u1.email
                  END as other_user_email,
                  CASE 
                    WHEN sm.sender_id = ? THEN 'sent'
                    ELSE 'received'
                  END as message_type
                FROM support_messages sm
                JOIN users u1 ON sm.sender_id = u1.id
                JOIN users u2 ON sm.receiver_id = u2.id
                WHERE sm.sender_id = ? OR sm.receiver_id = ?
                ORDER BY sm.created_at DESC`;
        params = [userId, userId, userId, userId, userId];
      }
      
      return await db.all(query, params);
    } catch (error) {
      console.error('Error getting messages for user:', error);
      throw error;
    }
  }
  
  /**
   * Mark message(s) as read
   * @param {number|Array<number>} ids - Message ID or array of message IDs
   * @returns {Promise<boolean>} Success indicator
   */
  static async markAsRead(ids) {
    try {
      // Handle single ID or array of IDs
      if (Array.isArray(ids)) {
        if (ids.length === 0) return false;
        
        // Create placeholders for the query
        const placeholders = ids.map(() => '?').join(',');
        const query = `UPDATE support_messages SET is_read = 1 WHERE id IN (${placeholders})`;
        const result = await db.run(query, ids);
        return result.changes > 0;
      } else {
        // Single ID case
        const query = 'UPDATE support_messages SET is_read = 1 WHERE id = ?';
        const result = await db.run(query, [ids]);
        return result.changes > 0;
      }
    } catch (error) {
      console.error('Error marking message(s) as read:', error);
      throw error;
    }
  }
  
  /**
   * Mark all messages as read for a receiver
   * @param {number} receiverId - Receiver ID
   * @returns {Promise<boolean>} Success indicator
   */
  static async markAllAsRead(receiverId) {
    try {
      const query = 'UPDATE support_messages SET is_read = 1 WHERE receiver_id = ? AND is_read = 0';
      const result = await db.run(query, [receiverId]);
      return result.changes > 0;
    } catch (error) {
      console.error('Error marking all messages as read:', error);
      throw error;
    }
  }
  
  /**
   * Mark all messages in a conversation as read
   * @param {number} senderId - Sender ID
   * @param {number} receiverId - Receiver ID
   * @returns {Promise<boolean>} Success indicator
   */
  static async markConversationAsRead(senderId, receiverId) {
    try {
      const query = 'UPDATE support_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0';
      const result = await db.run(query, [senderId, receiverId]);
      return result.changes > 0;
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  }
  
  /**
   * Get unread count for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Unread count
   */
  static async getUnreadCount(userId) {
    try {
      const query = 'SELECT COUNT(*) as count FROM support_messages WHERE receiver_id = ? AND is_read = 0';
      const rows = await db.all(query, [userId]);
      return rows.length > 0 ? rows[0].count : 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }
  
  /**
   * Find unread messages for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of unread messages
   */
  static async findUnreadForUser(userId) {
    try {
      const query = `SELECT sm.*, 
                      u.name as sender_name, 
                      u.email as sender_email,
                      u.role as sender_role
                    FROM support_messages sm
                    JOIN users u ON sm.sender_id = u.id
                    WHERE sm.receiver_id = ? AND sm.is_read = 0
                    ORDER BY sm.created_at DESC`;
      
      const messages = await db.all(query, [userId]);
      
      // Format messages with sender details
      return messages.map(message => {
        // Split sender name
        const senderNameParts = message.sender_name ? message.sender_name.split(' ') : ['', ''];
        
        return {
          id: message.id,
          sender_id: message.sender_id,
          receiver_id: message.receiver_id,
          message: message.message,
          created_at: message.created_at,
          read: message.is_read === 1,
          sender: {
            id: message.sender_id,
            name: message.sender_name || 'User',
            email: message.sender_email,
            role: message.sender_role,
            first_name: senderNameParts[0] || '',
            last_name: senderNameParts.slice(1).join(' ') || ''
          }
        };
      });
    } catch (error) {
      console.error('Error finding unread messages for user:', error);
      throw error;
    }
  }
  
  /**
   * Delete a message
   * @param {number} id - Message ID
   * @returns {Promise<boolean>} Success indicator
   */
  static async delete(id) {
    try {
      const query = 'DELETE FROM support_messages WHERE id = ?';
      const result = await db.run(query, [id]);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
}

module.exports = SupportMessage;