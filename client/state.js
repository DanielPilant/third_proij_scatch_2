/**
 * =====================================================
 * STATE MANAGEMENT
 * =====================================================
 *
 * Centralized state management system (similar to Redux/Vuex).
 * Manages application state with:
 * - Immutable state updates
 * - Subscription system for reactive UI updates
 * - Persistence to sessionStorage for page refreshes
 */

// Uses globals: deepClone from constants.js

/**
 * Initial application state
 */
const initialState = {
  // Authentication state
  auth: {
    isAuthenticated: false,
    user: null,
    token: null,
    expiresAt: null,
  },

  // Tasks state
  tasks: {
    items: [],
    loading: false,
    error: null,
  },

  // Dashboard stats
  stats: {
    data: null,
    loading: false,
    error: null,
  },

  // UI state
  ui: {
    currentRoute: null,
    sidebarOpen: false,
    modalOpen: null,
    editingTask: null,
  },

  // Network state (for dev panel)
  network: {
    stats: {
      totalRequests: 0,
      droppedPackets: 0,
      successfulRequests: 0,
      totalRetries: 0,
    },
  },
};

// Storage key for persistence
const STORAGE_KEY = "taskmaster_state";

/**
 * State class - Centralized state management
 */
class State {
  constructor() {
    // Try to restore state from session storage
    this._state = this._loadPersistedState() || deepClone(initialState);

    // Subscribers for state changes
    this._subscribers = [];

    // Specific property subscribers
    this._propertySubscribers = {};

    console.log("[State] Initialized with state:", this._state);
  }

  /**
   * Get the current state (read-only copy)
   * @returns {Object} Current state
   */
  getState() {
    return deepClone(this._state);
  }

  /**
   * Get a specific part of the state
   * @param {string} path - Dot-notation path (e.g., 'auth.user')
   * @returns {*} Value at path
   */
  get(path) {
    const value = this._getByPath(this._state, path);
    return value && typeof value === "object" ? deepClone(value) : value;
  }

  /**
   * Update state with new values
   * @param {string} path - Dot-notation path to update
   * @param {*} value - New value
   */
  set(path, value) {
    const oldState = deepClone(this._state);
    this._setByPath(this._state, path, value);

    // Persist state
    this._persistState();

    // Notify subscribers
    this._notifySubscribers(path, oldState);
  }

  /**
   * Update multiple state values at once
   * @param {Object} updates - Object with path:value pairs
   */
  setMultiple(updates) {
    const oldState = deepClone(this._state);

    Object.entries(updates).forEach(([path, value]) => {
      this._setByPath(this._state, path, value);
    });

    this._persistState();

    // Notify for each changed path
    Object.keys(updates).forEach((path) => {
      this._notifySubscribers(path, oldState);
    });
  }

  /**
   * Subscribe to all state changes
   * @param {Function} callback - Function(newState, oldState)
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this._subscribers.push(callback);

    return () => {
      const index = this._subscribers.indexOf(callback);
      if (index > -1) {
        this._subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to changes in a specific state path
   * @param {string} path - State path to watch
   * @param {Function} callback - Function(newValue, oldValue)
   * @returns {Function} Unsubscribe function
   */
  watch(path, callback) {
    if (!this._propertySubscribers[path]) {
      this._propertySubscribers[path] = [];
    }
    this._propertySubscribers[path].push(callback);

    return () => {
      const subscribers = this._propertySubscribers[path];
      if (subscribers) {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Reset state to initial values
   * @param {string} path - Optional path to reset (resets all if not provided)
   */
  reset(path = null) {
    if (path) {
      const initialValue = this._getByPath(initialState, path);
      this.set(path, deepClone(initialValue));
    } else {
      this._state = deepClone(initialState);
      this._persistState();
      this._notifySubscribers(null, null);
    }
  }

  /**
   * Clear all persisted state
   */
  clearPersisted() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("[State] Failed to clear persisted state:", e);
    }
  }

  // =====================================================
  // Auth-specific convenience methods
  // =====================================================

  /**
   * Set authentication state
   * @param {Object} authData - { user, token, expiresAt }
   */
  setAuth(authData) {
    this.setMultiple({
      "auth.isAuthenticated": true,
      "auth.user": authData.user,
      "auth.token": authData.token,
      "auth.expiresAt": authData.expiresAt,
    });
  }

  /**
   * Clear authentication state
   */
  clearAuth() {
    this.set("auth", deepClone(initialState.auth));
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return this._state.auth.isAuthenticated && !!this._state.auth.token;
  }

  /**
   * Get current user
   * @returns {Object|null}
   */
  getUser() {
    return this.get("auth.user");
  }

  /**
   * Get auth token
   * @returns {string|null}
   */
  getToken() {
    return this._state.auth.token;
  }

  // =====================================================
  // Tasks-specific convenience methods
  // =====================================================

  /**
   * Set tasks list
   * @param {Array} tasks - Tasks array
   */
  setTasks(tasks) {
    this.setMultiple({
      "tasks.items": tasks,
      "tasks.loading": false,
      "tasks.error": null,
    });
  }

  /**
   * Add a task to the list
   * @param {Object} task - Task to add
   */
  addTask(task) {
    const tasks = [...this._state.tasks.items, task];
    this.set("tasks.items", tasks);
  }

  /**
   * Update a task in the list
   * @param {string} taskId - Task ID
   * @param {Object} updates - Updates to apply
   */
  updateTask(taskId, updates) {
    const tasks = this._state.tasks.items.map((task) => {
      if (task.id === taskId) {
        return { ...task, ...updates };
      }
      return task;
    });
    this.set("tasks.items", tasks);
  }

  /**
   * Remove a task from the list
   * @param {string} taskId - Task ID to remove
   */
  removeTask(taskId) {
    const tasks = this._state.tasks.items.filter((task) => task.id !== taskId);
    this.set("tasks.items", tasks);
  }

  /**
   * Get tasks list
   * @returns {Array}
   */
  getTasks() {
    return this.get("tasks.items");
  }

  /**
   * Set tasks loading state
   * @param {boolean} loading
   */
  setTasksLoading(loading) {
    this.set("tasks.loading", loading);
  }

  // =====================================================
  // Private helper methods
  // =====================================================

  /**
   * Get value by dot-notation path
   * @param {Object} obj - Object to traverse
   * @param {string} path - Dot-notation path
   * @returns {*} Value at path
   * @private
   */
  _getByPath(obj, path) {
    return path.split(".").reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * Set value by dot-notation path
   * @param {Object} obj - Object to update
   * @param {string} path - Dot-notation path
   * @param {*} value - New value
   * @private
   */
  _setByPath(obj, path, value) {
    const keys = path.split(".");
    const lastKey = keys.pop();

    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  /**
   * Notify all subscribers of state changes
   * @param {string} changedPath - Path that changed
   * @param {Object} oldState - Previous state
   * @private
   */
  _notifySubscribers(changedPath, oldState) {
    // Notify general subscribers
    const newState = this.getState();
    this._subscribers.forEach((callback) => {
      try {
        callback(newState, oldState);
      } catch (e) {
        console.error("[State] Subscriber error:", e);
      }
    });

    // Notify property-specific subscribers
    if (changedPath) {
      // Check all registered paths to see if they're affected
      Object.entries(this._propertySubscribers).forEach(
        ([path, subscribers]) => {
          if (changedPath.startsWith(path) || path.startsWith(changedPath)) {
            const newValue = this.get(path);
            const oldValue = oldState ? this._getByPath(oldState, path) : null;

            subscribers.forEach((callback) => {
              try {
                callback(newValue, oldValue);
              } catch (e) {
                console.error("[State] Property subscriber error:", e);
              }
            });
          }
        },
      );
    }
  }

  /**
   * Persist state to session storage
   * @private
   */
  _persistState() {
    try {
      // Only persist certain parts of state
      const persistedState = {
        auth: this._state.auth,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
    } catch (e) {
      console.error("[State] Failed to persist state:", e);
    }
  }

  /**
   * Load persisted state from session storage
   * @returns {Object|null}
   * @private
   */
  _loadPersistedState() {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with initial state to ensure all properties exist
        return {
          ...deepClone(initialState),
          ...parsed,
        };
      }
    } catch (e) {
      console.error("[State] Failed to load persisted state:", e);
    }
    return null;
  }
}

// Create singleton instance
var state = new State();
window.state = state;
