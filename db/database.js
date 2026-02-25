/**
 * =====================================================
 * DATABASE LAYER - LocalStorage Abstraction
 * =====================================================
 *
 * This is the ONLY file that directly touches localStorage.
 * It provides a low-level interface for reading and writing
 * data to our simulated database (localStorage).
 *
 * CRITICAL: All other parts of the application MUST use the
 * DBAPI class to interact with data - never localStorage directly.
 */

// Uses globals: DB_CONFIG, generateId, getCurrentTimestamp from constants.js

/**
 * Database class - Low level localStorage operations
 * This class provides the foundation for our simulated database.
 */
class Database {
  constructor() {
    // Initialize database tables if they don't exist
    this._initializeTables();
  }

  /**
   * Initialize all database tables (localStorage keys)
   * Creates empty arrays for each table if they don't exist
   * @private
   */
  _initializeTables() {
    const tables = Object.values(DB_CONFIG.KEYS);

    tables.forEach((tableName) => {
      if (!localStorage.getItem(tableName)) {
        localStorage.setItem(tableName, JSON.stringify([]));
        console.log(`[Database] Initialized table: ${tableName}`);
      }
    });
  }

  /**
   * Read all records from a table
   * @param {string} tableName - The table/collection name
   * @returns {Array} Array of records
   */
  readAll(tableName) {
    try {
      const data = localStorage.getItem(tableName);
      if (!data) {
        console.warn(`[Database] Table not found: ${tableName}`);
        return [];
      }
      return JSON.parse(data);
    } catch (error) {
      console.error(`[Database] Error reading from ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Write all records to a table (replaces entire table)
   * @param {string} tableName - The table/collection name
   * @param {Array} data - Array of records to write
   * @returns {boolean} Success status
   */
  writeAll(tableName, data) {
    try {
      if (!Array.isArray(data)) {
        console.error(
          `[Database] Data must be an array for table: ${tableName}`,
        );
        return false;
      }
      localStorage.setItem(tableName, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`[Database] Error writing to ${tableName}:`, error);
      // Handle quota exceeded error
      if (error.name === "QuotaExceededError") {
        console.error("[Database] Storage quota exceeded!");
      }
      return false;
    }
  }

  /**
   * Insert a single record into a table
   * Automatically adds id, createdAt, and updatedAt fields
   * @param {string} tableName - The table/collection name
   * @param {Object} record - The record to insert
   * @returns {Object|null} The inserted record with generated fields, or null on failure
   */
  insert(tableName, record) {
    try {
      const records = this.readAll(tableName);

      // Generate metadata for the new record
      const newRecord = {
        id: generateId(),
        ...record,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      };

      records.push(newRecord);

      if (this.writeAll(tableName, records)) {
        console.log(
          `[Database] Inserted record into ${tableName}:`,
          newRecord.id,
        );
        return newRecord;
      }
      return null;
    } catch (error) {
      console.error(`[Database] Error inserting into ${tableName}:`, error);
      return null;
    }
  }

  /**
   * Find a single record by ID
   * @param {string} tableName - The table/collection name
   * @param {string} id - The record ID
   * @returns {Object|null} The found record or null
   */
  findById(tableName, id) {
    try {
      const records = this.readAll(tableName);
      return records.find((record) => record.id === id) || null;
    } catch (error) {
      console.error(`[Database] Error finding record in ${tableName}:`, error);
      return null;
    }
  }

  /**
   * Find records matching a query
   * @param {string} tableName - The table/collection name
   * @param {Object} query - Query object with field-value pairs
   * @returns {Array} Array of matching records
   */
  find(tableName, query = {}) {
    try {
      const records = this.readAll(tableName);

      // If no query, return all records
      if (Object.keys(query).length === 0) {
        return records;
      }

      // Filter records based on query
      return records.filter((record) => {
        return Object.entries(query).every(([key, value]) => {
          return record[key] === value;
        });
      });
    } catch (error) {
      console.error(`[Database] Error finding records in ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Find a single record matching a query
   * @param {string} tableName - The table/collection name
   * @param {Object} query - Query object with field-value pairs
   * @returns {Object|null} The first matching record or null
   */
  findOne(tableName, query) {
    try {
      const records = this.find(tableName, query);
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      console.error(`[Database] Error finding record in ${tableName}:`, error);
      return null;
    }
  }

  /**
   * Update a record by ID
   * @param {string} tableName - The table/collection name
   * @param {string} id - The record ID
   * @param {Object} updates - Object with fields to update
   * @returns {Object|null} The updated record or null
   */
  updateById(tableName, id, updates) {
    try {
      const records = this.readAll(tableName);
      const index = records.findIndex((record) => record.id === id);

      if (index === -1) {
        console.warn(`[Database] Record not found for update: ${id}`);
        return null;
      }

      // Merge updates with existing record
      records[index] = {
        ...records[index],
        ...updates,
        id: records[index].id, // Preserve original ID
        createdAt: records[index].createdAt, // Preserve creation time
        updatedAt: getCurrentTimestamp(), // Update modification time
      };

      if (this.writeAll(tableName, records)) {
        console.log(`[Database] Updated record in ${tableName}:`, id);
        return records[index];
      }
      return null;
    } catch (error) {
      console.error(`[Database] Error updating record in ${tableName}:`, error);
      return null;
    }
  }

  /**
   * Update multiple records matching a query
   * @param {string} tableName - The table/collection name
   * @param {Object} query - Query to match records
   * @param {Object} updates - Updates to apply
   * @returns {number} Number of records updated
   */
  updateMany(tableName, query, updates) {
    try {
      const records = this.readAll(tableName);
      let updatedCount = 0;

      const updatedRecords = records.map((record) => {
        // Check if record matches query
        const matches = Object.entries(query).every(([key, value]) => {
          return record[key] === value;
        });

        if (matches) {
          updatedCount++;
          return {
            ...record,
            ...updates,
            id: record.id,
            createdAt: record.createdAt,
            updatedAt: getCurrentTimestamp(),
          };
        }
        return record;
      });

      if (this.writeAll(tableName, updatedRecords)) {
        console.log(
          `[Database] Updated ${updatedCount} records in ${tableName}`,
        );
        return updatedCount;
      }
      return 0;
    } catch (error) {
      console.error(
        `[Database] Error updating records in ${tableName}:`,
        error,
      );
      return 0;
    }
  }

  /**
   * Delete a record by ID
   * @param {string} tableName - The table/collection name
   * @param {string} id - The record ID
   * @returns {boolean} Success status
   */
  deleteById(tableName, id) {
    try {
      const records = this.readAll(tableName);
      const initialLength = records.length;
      const filteredRecords = records.filter((record) => record.id !== id);

      if (filteredRecords.length === initialLength) {
        console.warn(`[Database] Record not found for deletion: ${id}`);
        return false;
      }

      if (this.writeAll(tableName, filteredRecords)) {
        console.log(`[Database] Deleted record from ${tableName}:`, id);
        return true;
      }
      return false;
    } catch (error) {
      console.error(
        `[Database] Error deleting record from ${tableName}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Delete multiple records matching a query
   * @param {string} tableName - The table/collection name
   * @param {Object} query - Query to match records to delete
   * @returns {number} Number of records deleted
   */
  deleteMany(tableName, query) {
    try {
      const records = this.readAll(tableName);
      const initialLength = records.length;

      const filteredRecords = records.filter((record) => {
        // Keep records that DON'T match the query
        return !Object.entries(query).every(([key, value]) => {
          return record[key] === value;
        });
      });

      const deletedCount = initialLength - filteredRecords.length;

      if (this.writeAll(tableName, filteredRecords)) {
        console.log(
          `[Database] Deleted ${deletedCount} records from ${tableName}`,
        );
        return deletedCount;
      }
      return 0;
    } catch (error) {
      console.error(
        `[Database] Error deleting records from ${tableName}:`,
        error,
      );
      return 0;
    }
  }

  /**
   * Count records in a table, optionally filtered by query
   * @param {string} tableName - The table/collection name
   * @param {Object} query - Optional query to filter
   * @returns {number} Count of records
   */
  count(tableName, query = {}) {
    return this.find(tableName, query).length;
  }

  /**
   * Clear all records from a table
   * @param {string} tableName - The table/collection name
   * @returns {boolean} Success status
   */
  clearTable(tableName) {
    return this.writeAll(tableName, []);
  }

  /**
   * Clear all tables (reset database)
   * @returns {boolean} Success status
   */
  clearAll() {
    try {
      Object.values(DB_CONFIG.KEYS).forEach((tableName) => {
        this.clearTable(tableName);
      });
      console.log("[Database] All tables cleared");
      return true;
    } catch (error) {
      console.error("[Database] Error clearing all tables:", error);
      return false;
    }
  }

  /**
   * Export all data (for debugging)
   * @returns {Object} All database data
   */
  exportAll() {
    const data = {};
    Object.entries(DB_CONFIG.KEYS).forEach(([name, tableName]) => {
      data[name] = this.readAll(tableName);
    });
    return data;
  }
}

// Create singleton instance
var database = new Database();
window.database = database;
