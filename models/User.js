// Import dependencies
const db = require('../config/db-wrapper');
const bcrypt = require('bcrypt');

/**
 * User model
 */
class User {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<number>} New user ID
   */
  static async create(userData) {
    try {
      // Hash password if present
      if (userData.password) {
        const salt = await bcrypt.genSalt(10);
        userData.password = await bcrypt.hash(userData.password, salt);
      }

      // Prepare role
      userData.role = userData.role || 'client';

      // Stringify arrays
      userData = this.stringifyProfileArrays(userData);

      // Insert into database
      const query = 'INSERT INTO users (name, email, password, role, gender, marital_status, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))';
      const result = await db.run(query, [
        userData.name,
        userData.email,
        userData.password,
        userData.role,
        userData.gender || null,
        userData.marital_status || null,
        userData.avatar || null
      ]);

      return result.lastID;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async findById(id) {
    try {
      const query = 'SELECT id, name, email, gender, marital_status, role, created_at, avatar, bio, specialties, languages, experience_years FROM users WHERE id = ?';
      const rows = await db.all(query, [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      const row = rows[0];
      
      // Split name into first_name and last_name for compatibility
      const nameParts = row.name ? row.name.split(' ') : ['', ''];
      row.first_name = nameParts[0] || '';
      row.last_name = nameParts.slice(1).join(' ') || '';
      row.username = row.email; // Use email as username for compatibility
      
      // Parse JSON arrays
      return this.parseProfileArrays(row);
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async findByUsername(username) {
    try {
      // In our system, email is used as username
      return await this.findByEmail(username);
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {string} email - Email
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async findByEmail(email) {
    try {
      const query = 'SELECT id, name, email, gender, marital_status, role, created_at, avatar, bio, specialties, languages, experience_years, password FROM users WHERE email = ?';
      const rows = await db.all(query, [email]);
      
      if (rows.length === 0) {
        return null;
      }
      
      const row = rows[0];
      
      // Split name into first_name and last_name for compatibility
      const nameParts = row.name ? row.name.split(' ') : ['', ''];
      row.first_name = nameParts[0] || '';
      row.last_name = nameParts.slice(1).join(' ') || '';
      row.username = row.email; // Use email as username for compatibility
      
      // Parse JSON arrays
      return this.parseProfileArrays(row);
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find all users
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of user objects
   */
  static async findAll(filters = {}) {
    try {
      let query = 'SELECT id, name, email, role, created_at FROM users';
      let params = [];
      
      // Apply filters if any
      const whereConditions = [];
      
      if (filters.role) {
        whereConditions.push('role = ?');
        params.push(filters.role);
      }
      
      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      // Add ordering
      query += ' ORDER BY created_at DESC';
      
      const rows = await db.all(query, params);
      return rows;
    } catch (error) {
      console.error('Error finding all users:', error);
      throw error;
    }
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<boolean>} Success indicator
   */
  static async update(id, userData) {
    try {
      const currentUser = await this.findById(id);
      
      // Stringify arrays before update
      userData = this.stringifyProfileArrays(userData);
      if (!currentUser) {
        throw new Error('User not found');
      }
      
      // Prepare update fields and values
      let updateFields = [];
      let updateValues = [];
      
      // Handle name field (directly or from first_name/last_name)
      if (userData.name) {
        updateFields.push('name = ?');
        updateValues.push(userData.name);
      } else if (userData.first_name && userData.last_name) {
        updateFields.push('name = ?');
        updateValues.push(`${userData.first_name} ${userData.last_name}`);
      }
      
      // Handle other basic fields
      const basicFields = ['gender', 'marital_status', 'bio', 'avatar', 'experience_years', 'password', 'specialties', 'languages'];
      basicFields.forEach(field => {
        if (userData[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(userData[field]);
        }
      });
      
      // Always include role field to prevent NOT NULL constraint error
      updateFields.push('role = ?');
      updateValues.push(userData.role || currentUser.role);
      
      // If there's nothing to update, return success
      if (updateFields.length === 0) {
        return true;
      }
      
      // Prepare and execute update query
      const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
      updateValues.push(id);
      
      await db.run(query, updateValues);
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {Promise<boolean>} Success indicator
   */
  static async delete(id) {
    try {
      const query = 'DELETE FROM users WHERE id = ?';
      await db.run(query, [id]);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Verify password
   * @param {string} password - Plain password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} Is password valid
   */
  static async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Error verifying password:', error);
      throw error;
    }
  }

  /**
   * Authenticate user
   * @param {string} email - User email (used as username)
   * @param {string} password - User password
   * @returns {Promise<Object|null>} User object if authenticated, null otherwise
   */
  static async authenticate(email, password) {
    try {
      // Find user by email
      const user = await this.findByEmail(email);
      
      // If user not found or password doesn't match
      if (!user || !(await this.verifyPassword(password, user.password))) {
        return null;
      }
      
      // Remove password from user object before returning
      delete user.password;
      
      return user;
    } catch (error) {
      console.error('Error authenticating user:', error);
      throw error;
    }
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} Does email exist
   */
  static async emailExists(email) {
    try {
      const query = 'SELECT 1 FROM users WHERE email = ?';
      const rows = await db.all(query, [email]);
      return rows.length > 0;
    } catch (error) {
      console.error('Error checking if email exists:', error);
      throw error;
    }
  }

  /**
   * Count users
   * @param {Object} filters - Optional filters
   * @returns {Promise<number>} User count
   */
  static async count(filters = {}) {
    try {
      let query = 'SELECT COUNT(*) as count FROM users';
      let params = [];
      
      // Apply filters if any
      const whereConditions = [];
      
      if (filters.role) {
        whereConditions.push('role = ?');
        params.push(filters.role);
      }
      
      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      const result = await db.get(query, params);
      return result.count;
    } catch (error) {
      console.error('Error counting users:', error);
      throw error;
    }
  }

  /**
   * Get all psychologists
   * @returns {Promise<Array>} Array of psychologist user objects
   */
  static async getAllPsychologists() {
    try {
      const query = 'SELECT id, name, email, avatar, bio, specialties, languages, experience_years FROM users WHERE role = ?';
      const rows = await db.all(query, ['psychologist']);
      
      // Process each psychologist record
      return rows.map(row => {
        // Parse JSON fields
        const psychologist = this.parseProfileArrays(row);
        
        // Split name into first_name and last_name for compatibility with the view
        const nameParts = psychologist.name ? psychologist.name.split(' ') : ['', ''];
        psychologist.first_name = nameParts[0] || '';
        psychologist.last_name = nameParts.slice(1).join(' ') || '';
        psychologist.username = psychologist.email; // Use email as username for compatibility
        
        return psychologist;
      });
    } catch (error) {
      console.error('Error getting all psychologists:', error);
      throw error;
    }
  }

  /**
   * Parse profile arrays from JSON strings
   * @param {Object} user - User object
   * @returns {Object} - User with parsed arrays
   */
  static parseProfileArrays(user) {
    if (!user) return user;
    
    // Force specialties to be an array
    if (user.specialties && typeof user.specialties === 'string') {
      try {
        // Handle edge case where the JSON string is 'null'
        if (user.specialties === 'null') {
          user.specialties = [];
        } else {
          user.specialties = JSON.parse(user.specialties);
        }
      } catch (e) {
        console.error('Error parsing specialties JSON:', e);
        user.specialties = [];
      }
    }

    // Handle undefined or null
    if (!user.specialties || user.specialties === null) {
      user.specialties = [];
    }
    
    // Force languages to be an array
    if (user.languages && typeof user.languages === 'string') {
      try {
        // Handle edge case where the JSON string is 'null'
        if (user.languages === 'null') {
          user.languages = [];
        } else {
          user.languages = JSON.parse(user.languages);
        }
      } catch (e) {
        console.error('Error parsing languages JSON:', e);
        user.languages = [];
      }
    }

    // Handle undefined or null
    if (!user.languages || user.languages === null) {
      user.languages = [];
    }
    
    return user;
  }
  
  /**
   * Stringify profile arrays to JSON
   * @param {Object} userData - User data object
   * @returns {Object} - User data with stringified arrays
   */
  static stringifyProfileArrays(userData) {
    if (!userData) return userData;
    
    // Clone to avoid modifying the original
    const data = { ...userData };
    
    // Stringify specialties
    if (Array.isArray(data.specialties)) {
      data.specialties = JSON.stringify(data.specialties);
    }
    
    // Stringify languages
    if (Array.isArray(data.languages)) {
      data.languages = JSON.stringify(data.languages);
    }
    
    return data;
  }
}

module.exports = User;
