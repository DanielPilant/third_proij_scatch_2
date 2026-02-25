/**
 * =====================================================
 * DATABASE API (DBAPI) - Query Interface for Servers
 * =====================================================
 *
 * This class provides the ONLY interface that servers should use
 * to interact with the database. It wraps the low-level Database
 * class with domain-specific methods.
 *
 * ARCHITECTURE RULE: Servers MUST use this DBAPI class.
 * They should NEVER import or use the Database class directly.
 */

// Uses globals: database, DB_CONFIG, generateToken, getCurrentTimestamp, TASK_STATUS, TASK_PRIORITY from constants.js

/**
 * DBAPI - High-level database query interface
 * Provides domain-specific methods for Users, Sessions, and Tasks
 */
class DBAPI {
  constructor() {
    // Reference to table names for cleaner code
    this.tables = DB_CONFIG.KEYS;
  }

  // =====================================================
  // USER OPERATIONS
  // =====================================================

  /**
   * Create a new user
   * @param {Object} userData - User data (name, email, password)
   * @returns {Object|null} Created user (without password) or null
   */
  createUser(userData) {
    const { name, email, password } = userData;

    // Check if email already exists
    if (this.findUserByEmail(email)) {
      console.warn("[DBAPI] User with this email already exists");
      return null;
    }

    // Create user record
    const user = database.insert(this.tables.USERS, {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password, // In production, this would be hashed!
      avatar: name.charAt(0).toUpperCase(),
    });

    if (user) {
      // Return user without password
      const { password: _, ...safeUser } = user;
      return safeUser;
    }
    return null;
  }

  /**
   * Find a user by email
   * @param {string} email - User email
   * @returns {Object|null} User record or null
   */
  findUserByEmail(email) {
    return database.findOne(this.tables.USERS, {
      email: email.toLowerCase().trim(),
    });
  }

  /**
   * Find a user by ID
   * @param {string} id - User ID
   * @returns {Object|null} User record (without password) or null
   */
  findUserById(id) {
    const user = database.findById(this.tables.USERS, id);
    if (user) {
      const { password: _, ...safeUser } = user;
      return safeUser;
    }
    return null;
  }

  /**
   * Validate user credentials
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object|null} User (without password) if valid, null if invalid
   */
  validateCredentials(email, password) {
    const user = this.findUserByEmail(email);

    if (user && user.password === password) {
      const { password: _, ...safeUser } = user;
      return safeUser;
    }
    return null;
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated user or null
   */
  updateUser(userId, updates) {
    // Prevent updating sensitive fields directly
    const { id, password, createdAt, ...safeUpdates } = updates;

    const updated = database.updateById(this.tables.USERS, userId, safeUpdates);
    if (updated) {
      const { password: _, ...safeUser } = updated;
      return safeUser;
    }
    return null;
  }

  // =====================================================
  // SESSION OPERATIONS
  // =====================================================

  /**
   * Create a new session for a user
   * @param {string} userId - User ID
   * @returns {Object} Session object with token
   */
  createSession(userId) {
    // First, invalidate any existing sessions for this user
    this.invalidateUserSessions(userId);

    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + DB_CONFIG.TOKEN_EXPIRY_HOURS);

    const session = database.insert(this.tables.SESSIONS, {
      userId,
      token,
      expiresAt: expiresAt.toISOString(),
      lastActivity: getCurrentTimestamp(),
    });

    return session;
  }

  /**
   * Validate a session token
   * @param {string} token - Session token
   * @returns {Object|null} Session if valid, null if invalid/expired
   */
  validateSession(token) {
    const session = database.findOne(this.tables.SESSIONS, { token });

    if (!session) {
      return null;
    }

    // Check if session has expired
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < new Date()) {
      // Session expired - clean it up
      this.invalidateSession(token);
      return null;
    }

    // Update last activity
    database.updateById(this.tables.SESSIONS, session.id, {
      lastActivity: getCurrentTimestamp(),
    });

    return session;
  }

  /**
   * Get user ID from a valid token
   * @param {string} token - Session token
   * @returns {string|null} User ID or null
   */
  getUserIdFromToken(token) {
    const session = this.validateSession(token);
    return session ? session.userId : null;
  }

  /**
   * Invalidate a session (logout)
   * @param {string} token - Session token
   * @returns {boolean} Success status
   */
  invalidateSession(token) {
    const session = database.findOne(this.tables.SESSIONS, { token });
    if (session) {
      return database.deleteById(this.tables.SESSIONS, session.id);
    }
    return false;
  }

  /**
   * Invalidate all sessions for a user
   * @param {string} userId - User ID
   * @returns {number} Number of sessions invalidated
   */
  invalidateUserSessions(userId) {
    return database.deleteMany(this.tables.SESSIONS, { userId });
  }

  // =====================================================
  // TASK OPERATIONS
  // =====================================================

  /**
   * Create a new task
   * @param {string} userId - Owner user ID
   * @param {Object} taskData - Task data
   * @returns {Object|null} Created task or null
   */
  createTask(userId, taskData) {
    const task = database.insert(this.tables.TASKS, {
      userId,
      title: taskData.title.trim(),
      description: taskData.description?.trim() || "",
      status: taskData.status || TASK_STATUS.TODO,
      priority: taskData.priority || TASK_PRIORITY.MEDIUM,
      dueDate: taskData.dueDate || null,
      completedAt: null,
    });

    return task;
  }

  /**
   * Get all tasks for a user
   * @param {string} userId - User ID
   * @returns {Array} Array of tasks
   */
  getTasksByUser(userId) {
    return database.find(this.tables.TASKS, { userId });
  }

  /**
   * Get tasks filtered by status
   * @param {string} userId - User ID
   * @param {string} status - Task status
   * @returns {Array} Filtered tasks
   */
  getTasksByStatus(userId, status) {
    return database.find(this.tables.TASKS, { userId, status });
  }

  /**
   * Get a single task by ID (with user validation)
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID (for ownership validation)
   * @returns {Object|null} Task or null
   */
  getTaskById(taskId, userId) {
    const task = database.findById(this.tables.TASKS, taskId);

    // Ensure user owns this task
    if (task && task.userId === userId) {
      return task;
    }
    return null;
  }

  /**
   * Update a task
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID (for ownership validation)
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated task or null
   */
  updateTask(taskId, userId, updates) {
    // First verify ownership
    const existingTask = this.getTaskById(taskId, userId);
    if (!existingTask) {
      return null;
    }

    // Prevent updating certain fields
    const { id, userId: _, createdAt, ...safeUpdates } = updates;

    // If status is being changed to 'done', set completedAt
    if (
      safeUpdates.status === TASK_STATUS.DONE &&
      existingTask.status !== TASK_STATUS.DONE
    ) {
      safeUpdates.completedAt = getCurrentTimestamp();
    } else if (safeUpdates.status && safeUpdates.status !== TASK_STATUS.DONE) {
      safeUpdates.completedAt = null;
    }

    return database.updateById(this.tables.TASKS, taskId, safeUpdates);
  }

  /**
   * Delete a task
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID (for ownership validation)
   * @returns {boolean} Success status
   */
  deleteTask(taskId, userId) {
    // First verify ownership
    const existingTask = this.getTaskById(taskId, userId);
    if (!existingTask) {
      return false;
    }

    return database.deleteById(this.tables.TASKS, taskId);
  }

  /**
   * Get task statistics for a user
   * @param {string} userId - User ID
   * @returns {Object} Statistics object
   */
  getTaskStats(userId) {
    const tasks = this.getTasksByUser(userId);

    const stats = {
      total: tasks.length,
      todo: 0,
      inProgress: 0,
      done: 0,
      byPriority: {
        high: 0,
        medium: 0,
        low: 0,
      },
      overdue: 0,
      dueToday: 0,
      dueSoon: 0, // Due within 3 days
      productivityScore: 0,
      recentlyCompleted: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    tasks.forEach((task) => {
      // Count by status
      switch (task.status) {
        case TASK_STATUS.TODO:
          stats.todo++;
          break;
        case TASK_STATUS.IN_PROGRESS:
          stats.inProgress++;
          break;
        case TASK_STATUS.DONE:
          stats.done++;
          break;
      }

      // Count by priority
      if (stats.byPriority.hasOwnProperty(task.priority)) {
        stats.byPriority[task.priority]++;
      }

      // Check due dates (only for non-completed tasks)
      if (task.dueDate && task.status !== TASK_STATUS.DONE) {
        const dueDate = new Date(task.dueDate);

        if (dueDate < today) {
          stats.overdue++;
        } else if (dueDate.toDateString() === today.toDateString()) {
          stats.dueToday++;
        } else if (dueDate <= threeDaysFromNow) {
          stats.dueSoon++;
        }
      }

      // Track recently completed tasks
      if (task.status === TASK_STATUS.DONE && task.completedAt) {
        const completedDate = new Date(task.completedAt);
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        if (completedDate >= sevenDaysAgo) {
          stats.recentlyCompleted.push(task);
        }
      }
    });

    // Sort recently completed by completion date (most recent first)
    stats.recentlyCompleted.sort((a, b) => {
      return new Date(b.completedAt) - new Date(a.completedAt);
    });

    // Limit to 5 most recent
    stats.recentlyCompleted = stats.recentlyCompleted.slice(0, 5);

    // Calculate productivity score (percentage of completed tasks)
    if (stats.total > 0) {
      stats.productivityScore = Math.round((stats.done / stats.total) * 100);
    }

    return stats;
  }

  /**
   * Get upcoming deadlines
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of tasks to return
   * @returns {Array} Tasks with upcoming deadlines
   */
  getUpcomingDeadlines(userId, limit = 5) {
    const tasks = this.getTasksByUser(userId);
    const now = new Date();

    // Filter tasks with due dates that aren't completed
    const upcomingTasks = tasks
      .filter((task) => {
        return (
          task.dueDate &&
          task.status !== TASK_STATUS.DONE &&
          new Date(task.dueDate) >= now
        );
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, limit);

    return upcomingTasks;
  }

  // =====================================================
  // UTILITY OPERATIONS
  // =====================================================

  /**
   * Clear all data (useful for testing)
   * @returns {boolean} Success status
   */
  clearAllData() {
    return database.clearAll();
  }

  /**
   * Export all data for debugging
   * @returns {Object} All database data
   */
  exportData() {
    return database.exportAll();
  }

  /**
   * Seed demo data for testing
   * @param {string} userId - User ID to associate demo tasks with
   * @returns {Array} Created demo tasks
   */
  seedDemoTasks(userId) {
    const demoTasks = [
      {
        title: "Complete project proposal",
        description: "Draft and finalize the Q1 project proposal document",
        status: TASK_STATUS.DONE,
        priority: TASK_PRIORITY.HIGH,
        dueDate: this._getRelativeDate(-2),
      },
      {
        title: "Review code pull requests",
        description: "Review and merge pending PRs from the team",
        status: TASK_STATUS.IN_PROGRESS,
        priority: TASK_PRIORITY.HIGH,
        dueDate: this._getRelativeDate(0),
      },
      {
        title: "Update documentation",
        description: "Update API documentation with new endpoints",
        status: TASK_STATUS.TODO,
        priority: TASK_PRIORITY.MEDIUM,
        dueDate: this._getRelativeDate(3),
      },
      {
        title: "Team meeting preparation",
        description: "Prepare slides for weekly team sync",
        status: TASK_STATUS.TODO,
        priority: TASK_PRIORITY.MEDIUM,
        dueDate: this._getRelativeDate(1),
      },
      {
        title: "Fix authentication bug",
        description: "Investigate and fix the login timeout issue",
        status: TASK_STATUS.IN_PROGRESS,
        priority: TASK_PRIORITY.HIGH,
        dueDate: this._getRelativeDate(2),
      },
      {
        title: "Refactor database queries",
        description: "Optimize slow database queries in the reports module",
        status: TASK_STATUS.TODO,
        priority: TASK_PRIORITY.LOW,
        dueDate: this._getRelativeDate(7),
      },
    ];

    const createdTasks = [];
    demoTasks.forEach((taskData) => {
      const task = this.createTask(userId, taskData);
      if (task) {
        createdTasks.push(task);
      }
    });

    return createdTasks;
  }

  /**
   * Helper to get a date relative to today
   * @param {number} days - Days from today (negative for past)
   * @returns {string} ISO date string
   * @private
   */
  _getRelativeDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  }
}

// Create singleton instance
var dbApi = new DBAPI();
window.dbApi = dbApi;
