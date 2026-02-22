/**
 * =====================================================
 * SHARED CONSTANTS
 * =====================================================
 * This file contains all shared constants, enums, and configuration
 * used throughout the application. This ensures consistency between
 * the client and simulated server layers.
 */

// =====================================================
// HTTP STATUS CODES
// =====================================================
export const HTTP_STATUS = Object.freeze({
  // Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,

  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,

  // Custom Network Simulation
  NETWORK_ERROR: 0,
  TIMEOUT: 408,
});

// =====================================================
// HTTP METHODS (RESTful conventions)
// =====================================================
export const HTTP_METHODS = Object.freeze({
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
});

// =====================================================
// API ROUTES
// =====================================================
export const API_ROUTES = Object.freeze({
  // Authentication Server Routes
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    LOGOUT: "/api/auth/logout",
    VALIDATE: "/api/auth/validate",
    REFRESH: "/api/auth/refresh",
  },

  // Application Server Routes (Tasks)
  TASKS: {
    BASE: "/api/tasks",
    BY_ID: (id) => `/api/tasks/${id}`,
    BY_STATUS: (status) => `/api/tasks/status/${status}`,
    STATS: "/api/tasks/stats",
  },

  // User Routes
  USERS: {
    PROFILE: "/api/users/profile",
    UPDATE: "/api/users/update",
  },
});

// =====================================================
// TASK ENUMS
// =====================================================
export const TASK_STATUS = Object.freeze({
  TODO: "todo",
  IN_PROGRESS: "in-progress",
  DONE: "done",
});

export const TASK_PRIORITY = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
});

// Status flow order for navigation
export const STATUS_ORDER = [
  TASK_STATUS.TODO,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.DONE,
];

// =====================================================
// DATABASE CONFIGURATION
// =====================================================
export const DB_CONFIG = Object.freeze({
  // LocalStorage keys for our "databases"
  KEYS: {
    USERS: "taskmaster_users",
    SESSIONS: "taskmaster_sessions",
    TASKS: "taskmaster_tasks",
  },

  // Token configuration
  TOKEN_PREFIX: "tm_token_",
  TOKEN_EXPIRY_HOURS: 24,
});

// =====================================================
// NETWORK SIMULATION CONFIGURATION
// =====================================================
export const NETWORK_CONFIG = Object.freeze({
  // Default latency range (ms)
  DEFAULT_MIN_LATENCY: 1000,
  DEFAULT_MAX_LATENCY: 3000,

  // Default packet drop rate (percentage)
  DEFAULT_DROP_RATE: 20,

  // Retry configuration
  DEFAULT_MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 500, // Base delay for exponential backoff

  // Request timeout
  DEFAULT_TIMEOUT: 30000, // 30 seconds
});

// =====================================================
// FAJAX (Fake AJAX) CONSTANTS
// =====================================================
export const FAJAX_READY_STATE = Object.freeze({
  UNSENT: 0,
  OPENED: 1,
  HEADERS_RECEIVED: 2,
  LOADING: 3,
  DONE: 4,
});

// =====================================================
// VALIDATION RULES
// =====================================================
export const VALIDATION = Object.freeze({
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 100,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  TASK_TITLE_MIN_LENGTH: 1,
  TASK_TITLE_MAX_LENGTH: 100,
  TASK_DESCRIPTION_MAX_LENGTH: 500,
});

// =====================================================
// TOAST NOTIFICATION TYPES
// =====================================================
export const TOAST_TYPES = Object.freeze({
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
});

// Toast duration in milliseconds
export const TOAST_DURATION = 5000;

// =====================================================
// CLIENT ROUTES (for SPA Router)
// =====================================================
export const CLIENT_ROUTES = Object.freeze({
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  TASKS: "/tasks",
  DEFAULT: "/dashboard",
});

// Routes that don't require authentication
export const PUBLIC_ROUTES = [CLIENT_ROUTES.LOGIN, CLIENT_ROUTES.REGISTER];

// =====================================================
// ERROR MESSAGES
// =====================================================
export const ERROR_MESSAGES = Object.freeze({
  // Auth errors
  INVALID_CREDENTIALS: "Invalid email or password",
  EMAIL_EXISTS: "An account with this email already exists",
  SESSION_EXPIRED: "Your session has expired. Please login again",
  UNAUTHORIZED: "You must be logged in to perform this action",

  // Validation errors
  INVALID_EMAIL: "Please enter a valid email address",
  PASSWORD_TOO_SHORT: `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`,
  PASSWORD_MISMATCH: "Passwords do not match",
  NAME_REQUIRED: "Please enter your name",
  TITLE_REQUIRED: "Task title is required",

  // Network errors
  NETWORK_ERROR: "Network error. Please check your connection",
  REQUEST_TIMEOUT: "Request timed out. Please try again",
  PACKET_DROPPED: "Network request failed. Retrying...",
  MAX_RETRIES_EXCEEDED: "Unable to complete request after multiple attempts",

  // Task errors
  TASK_NOT_FOUND: "Task not found",
  TASK_CREATE_FAILED: "Failed to create task",
  TASK_UPDATE_FAILED: "Failed to update task",
  TASK_DELETE_FAILED: "Failed to delete task",

  // Generic
  UNKNOWN_ERROR: "An unexpected error occurred",
});

// =====================================================
// SUCCESS MESSAGES
// =====================================================
export const SUCCESS_MESSAGES = Object.freeze({
  LOGIN_SUCCESS: "Welcome back!",
  REGISTER_SUCCESS: "Account created successfully!",
  LOGOUT_SUCCESS: "You have been logged out",
  TASK_CREATED: "Task created successfully",
  TASK_UPDATED: "Task updated successfully",
  TASK_DELETED: "Task deleted successfully",
  TASK_STATUS_UPDATED: "Task status updated",
});

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Generates a unique ID (UUID v4 format)
 * @returns {string} A unique identifier
 */
export function generateId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates a session token
 * @returns {string} A session token
 */
export function generateToken() {
  return DB_CONFIG.TOKEN_PREFIX + generateId() + "_" + Date.now();
}

/**
 * Gets current timestamp in ISO format
 * @returns {string} ISO timestamp
 */
export function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Validates an email address
 * @param {string} email - The email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  return VALIDATION.EMAIL_REGEX.test(email);
}

/**
 * Formats a date string for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Formats a date for relative display (e.g., "2 days ago")
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string
 */
export function formatRelativeDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(dateString);
}

/**
 * Calculates days until a due date
 * @param {string} dueDate - ISO date string
 * @returns {number} Days until due (negative if overdue)
 */
export function getDaysUntilDue(dueDate) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due - now;
  return Math.ceil(diffMs / 86400000);
}

/**
 * Deep clones an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Export a frozen config object for easy access
export const CONFIG = Object.freeze({
  APP_NAME: "TaskMaster Pro",
  VERSION: "1.0.0",
  DEBUG: true,
});
