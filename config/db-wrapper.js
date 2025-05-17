/**
 * Standardized database wrapper for Raha platform
 * Provides a consistent promise-based interface for SQLite operations
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Get database path from environment variables or use default
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'raha.db');

// Ensure the directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const sqliteDb = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

/**
 * Standardized database wrapper with promise-based methods
 */
const db = {
  /**
   * Execute a query that doesn't return any rows (INSERT, UPDATE, DELETE)
   * @param {string} sql - SQL query to execute
   * @param {Array} params - Parameters for the query
   * @returns {Promise<{lastID: number, changes: number}>} - Object with lastID and changes properties
   */
  run: function(sql, params = []) {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  /**
   * Execute a query that returns multiple rows (SELECT)
   * @param {string} sql - SQL query to execute
   * @param {Array} params - Parameters for the query
   * @returns {Promise<Array>} - Array of result rows
   */
  all: function(sql, params = []) {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  },

  /**
   * Execute a query that returns a single row (SELECT)
   * @param {string} sql - SQL query to execute
   * @param {Array} params - Parameters for the query
   * @returns {Promise<Object|null>} - Result row or null if not found
   */
  get: function(sql, params = []) {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  },

  /**
   * Execute a query (compatible with MySQL-style interface)
   * @param {string} sql - SQL query to execute
   * @param {Array} params - Parameters for the query
   * @returns {Promise<Array>} - Array with result rows or metadata
   */
  execute: function(sql, params = []) {
    return new Promise((resolve, reject) => {
      // For INSERT queries, get the last inserted ID
      if (sql.trim().toLowerCase().startsWith('insert')) {
        sqliteDb.run(sql, params, function(err) {
          if (err) return reject(err);
          resolve([{ insertId: this.lastID, affectedRows: this.changes }]);
        });
      }
      // For UPDATE/DELETE queries, get affected rows
      else if (sql.trim().toLowerCase().startsWith('update') || sql.trim().toLowerCase().startsWith('delete')) {
        sqliteDb.run(sql, params, function(err) {
          if (err) return reject(err);
          resolve([{ affectedRows: this.changes }]);
        });
      }
      // For SELECT queries, get rows
      else {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve([rows || []]);
        });
      }
    });
  },

  /**
   * Close the database connection
   * @returns {Promise<void>}
   */
  close: function() {
    return new Promise((resolve, reject) => {
      sqliteDb.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
};

module.exports = db;
