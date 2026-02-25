/**
 * =====================================================
 * APP SERVER (Task Management Server)
 * =====================================================
 *
 * Handles all task-related CRUD operations:
 * - Create tasks
 * - Read tasks (single, all, filtered)
 * - Update tasks
 * - Delete tasks
 * - Task statistics
 *
 * All endpoints are protected by AuthMiddleware.
 */

// Uses globals: dbApi, authMiddleware, HTTP_STATUS, HTTP_METHODS, API_ROUTES, ERROR_MESSAGES, SUCCESS_MESSAGES, VALIDATION, TASK_STATUS, TASK_PRIORITY, STATUS_ORDER

/**
 * AppServer class
 * Processes task management requests
 */
class AppServer {
  constructor() {
    this.name = "AppServer";
    console.log(`[${this.name}] Initialized`);
  }

  /**
   * Main request handler - routes requests to appropriate methods
   * All routes are protected by AuthMiddleware
   * @param {Object} request - The incoming request
   * @returns {Object} Response object with status and body
   */
  handleRequest(request) {
    const { method, url } = request;

    console.log(`[${this.name}] ${method} ${url}`);

    // All AppServer routes require authentication
    // Use middleware to protect and inject user info
    return authMiddleware.protect(request, (authenticatedRequest) => {
      return this._routeRequest(authenticatedRequest);
    });
  }

  /**
   * Route the authenticated request to the appropriate handler
   * @param {Object} request - The authenticated request with userId
   * @returns {Object} Response
   * @private
   */
  _routeRequest(request) {
    const { method, url } = request;

    // Task statistics endpoint
    if (url === API_ROUTES.TASKS.STATS && method === HTTP_METHODS.GET) {
      return this.getStats(request);
    }

    // Base tasks endpoint
    if (url === API_ROUTES.TASKS.BASE) {
      switch (method) {
        case HTTP_METHODS.GET:
          return this.getAllTasks(request);
        case HTTP_METHODS.POST:
          return this.createTask(request);
      }
    }

    // Tasks by status endpoint (e.g., /api/tasks/status/todo)
    const statusMatch = url.match(/^\/api\/tasks\/status\/(.+)$/);
    if (statusMatch && method === HTTP_METHODS.GET) {
      request.params = { status: statusMatch[1] };
      return this.getTasksByStatus(request);
    }

    // Single task endpoint (e.g., /api/tasks/123)
    const taskIdMatch = url.match(/^\/api\/tasks\/([a-zA-Z0-9-]+)$/);
    if (taskIdMatch) {
      request.params = { taskId: taskIdMatch[1] };

      switch (method) {
        case HTTP_METHODS.GET:
          return this.getTaskById(request);
        case HTTP_METHODS.PUT:
          return this.updateTask(request);
        case HTTP_METHODS.DELETE:
          return this.deleteTask(request);
      }
    }

    // No matching route
    return this._notFound();
  }

  /**
   * Get all tasks for the authenticated user
   * @param {Object} request - Authenticated request
   * @returns {Object} Response with tasks
   */
  getAllTasks(request) {
    console.log(`[${this.name}] Getting all tasks for user:`, request.userId);

    const tasks = dbApi.getTasksByUser(request.userId);

    // Apply sorting if specified in query params
    const sortBy = request.query?.sortBy || "createdAt";
    const sortOrder = request.query?.sortOrder || "desc";

    this._sortTasks(tasks, sortBy, sortOrder);

    return {
      status: HTTP_STATUS.OK,
      body: {
        success: true,
        data: {
          tasks: tasks,
          count: tasks.length,
        },
      },
    };
  }

  /**
   * Get tasks filtered by status
   * @param {Object} request - Authenticated request with status param
   * @returns {Object} Response with filtered tasks
   */
  getTasksByStatus(request) {
    const { status } = request.params;

    console.log(`[${this.name}] Getting tasks with status:`, status);

    // Validate status
    if (!Object.values(TASK_STATUS).includes(status)) {
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        body: {
          success: false,
          error: {
            code: "INVALID_STATUS",
            message: "Invalid task status",
          },
        },
      };
    }

    const tasks = dbApi.getTasksByStatus(request.userId, status);

    return {
      status: HTTP_STATUS.OK,
      body: {
        success: true,
        data: {
          tasks: tasks,
          count: tasks.length,
          status: status,
        },
      },
    };
  }

  /**
   * Get a single task by ID
   * @param {Object} request - Authenticated request with taskId param
   * @returns {Object} Response with task
   */
  getTaskById(request) {
    const { taskId } = request.params;

    console.log(`[${this.name}] Getting task:`, taskId);

    const task = dbApi.getTaskById(taskId, request.userId);

    if (!task) {
      return {
        status: HTTP_STATUS.NOT_FOUND,
        body: {
          success: false,
          error: {
            code: "TASK_NOT_FOUND",
            message: ERROR_MESSAGES.TASK_NOT_FOUND,
          },
        },
      };
    }

    return {
      status: HTTP_STATUS.OK,
      body: {
        success: true,
        data: {
          task: task,
        },
      },
    };
  }

  /**
   * Create a new task
   * @param {Object} request - Authenticated request with task data
   * @returns {Object} Response with created task
   */
  createTask(request) {
    const taskData = request.body;

    console.log(`[${this.name}] Creating task:`, taskData?.title);

    // Validate task data
    const validation = this._validateTask(taskData);
    if (!validation.valid) {
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        body: {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error,
            field: validation.field,
          },
        },
      };
    }

    // Create the task
    const task = dbApi.createTask(request.userId, {
      title: taskData.title,
      description: taskData.description || "",
      status: taskData.status || TASK_STATUS.TODO,
      priority: taskData.priority || TASK_PRIORITY.MEDIUM,
      dueDate: taskData.dueDate || null,
    });

    if (!task) {
      return this._serverError(ERROR_MESSAGES.TASK_CREATE_FAILED);
    }

    console.log(`[${this.name}] Task created:`, task.id);

    return {
      status: HTTP_STATUS.CREATED,
      body: {
        success: true,
        message: SUCCESS_MESSAGES.TASK_CREATED,
        data: {
          task: task,
        },
      },
    };
  }

  /**
   * Update an existing task
   * @param {Object} request - Authenticated request with task updates
   * @returns {Object} Response with updated task
   */
  updateTask(request) {
    const { taskId } = request.params;
    const updates = request.body;

    console.log(`[${this.name}] Updating task:`, taskId);

    // Check if task exists and belongs to user
    const existingTask = dbApi.getTaskById(taskId, request.userId);
    if (!existingTask) {
      return {
        status: HTTP_STATUS.NOT_FOUND,
        body: {
          success: false,
          error: {
            code: "TASK_NOT_FOUND",
            message: ERROR_MESSAGES.TASK_NOT_FOUND,
          },
        },
      };
    }

    // Validate updates if title is being changed
    if (updates.title !== undefined) {
      const validation = this._validateTask(updates, true);
      if (!validation.valid) {
        return {
          status: HTTP_STATUS.BAD_REQUEST,
          body: {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: validation.error,
              field: validation.field,
            },
          },
        };
      }
    }

    // Validate status if provided
    if (
      updates.status &&
      !Object.values(TASK_STATUS).includes(updates.status)
    ) {
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        body: {
          success: false,
          error: {
            code: "INVALID_STATUS",
            message: "Invalid task status",
          },
        },
      };
    }

    // Validate priority if provided
    if (
      updates.priority &&
      !Object.values(TASK_PRIORITY).includes(updates.priority)
    ) {
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        body: {
          success: false,
          error: {
            code: "INVALID_PRIORITY",
            message: "Invalid task priority",
          },
        },
      };
    }

    // Perform update
    const updatedTask = dbApi.updateTask(taskId, request.userId, updates);

    if (!updatedTask) {
      return this._serverError(ERROR_MESSAGES.TASK_UPDATE_FAILED);
    }

    console.log(`[${this.name}] Task updated:`, taskId);

    return {
      status: HTTP_STATUS.OK,
      body: {
        success: true,
        message: SUCCESS_MESSAGES.TASK_UPDATED,
        data: {
          task: updatedTask,
        },
      },
    };
  }

  /**
   * Delete a task
   * @param {Object} request - Authenticated request with taskId
   * @returns {Object} Response
   */
  deleteTask(request) {
    const { taskId } = request.params;

    console.log(`[${this.name}] Deleting task:`, taskId);

    // Check if task exists
    const existingTask = dbApi.getTaskById(taskId, request.userId);
    if (!existingTask) {
      return {
        status: HTTP_STATUS.NOT_FOUND,
        body: {
          success: false,
          error: {
            code: "TASK_NOT_FOUND",
            message: ERROR_MESSAGES.TASK_NOT_FOUND,
          },
        },
      };
    }

    // Delete the task
    const deleted = dbApi.deleteTask(taskId, request.userId);

    if (!deleted) {
      return this._serverError(ERROR_MESSAGES.TASK_DELETE_FAILED);
    }

    console.log(`[${this.name}] Task deleted:`, taskId);

    return {
      status: HTTP_STATUS.OK,
      body: {
        success: true,
        message: SUCCESS_MESSAGES.TASK_DELETED,
        data: {
          taskId: taskId,
        },
      },
    };
  }

  /**
   * Get task statistics for the user
   * @param {Object} request - Authenticated request
   * @returns {Object} Response with stats
   */
  getStats(request) {
    console.log(`[${this.name}] Getting stats for user:`, request.userId);

    const stats = dbApi.getTaskStats(request.userId);
    const upcomingDeadlines = dbApi.getUpcomingDeadlines(request.userId, 5);

    return {
      status: HTTP_STATUS.OK,
      body: {
        success: true,
        data: {
          stats: stats,
          upcomingDeadlines: upcomingDeadlines,
        },
      },
    };
  }

  /**
   * Validate task data
   * @param {Object} data - Task data
   * @param {boolean} isUpdate - Whether this is an update (allows empty title)
   * @returns {Object} Validation result
   * @private
   */
  _validateTask(data, isUpdate = false) {
    // Title validation (required for create, optional for update)
    if (!isUpdate || data.title !== undefined) {
      if (
        !data?.title ||
        data.title.trim().length < VALIDATION.TASK_TITLE_MIN_LENGTH
      ) {
        return {
          valid: false,
          field: "title",
          error: ERROR_MESSAGES.TITLE_REQUIRED,
        };
      }

      if (data.title.trim().length > VALIDATION.TASK_TITLE_MAX_LENGTH) {
        return {
          valid: false,
          field: "title",
          error: `Title must be less than ${VALIDATION.TASK_TITLE_MAX_LENGTH} characters`,
        };
      }
    }

    // Description validation (optional)
    if (
      data.description &&
      data.description.length > VALIDATION.TASK_DESCRIPTION_MAX_LENGTH
    ) {
      return {
        valid: false,
        field: "description",
        error: `Description must be less than ${VALIDATION.TASK_DESCRIPTION_MAX_LENGTH} characters`,
      };
    }

    return { valid: true };
  }

  /**
   * Sort tasks array in place
   * @param {Array} tasks - Tasks array
   * @param {string} sortBy - Field to sort by
   * @param {string} order - 'asc' or 'desc'
   * @private
   */
  _sortTasks(tasks, sortBy, order) {
    const priorityOrder = { high: 3, medium: 2, low: 1 };

    tasks.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "priority":
          comparison =
            (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
          break;
        case "dueDate":
          const dateA = a.dueDate
            ? new Date(a.dueDate)
            : new Date("9999-12-31");
          const dateB = b.dueDate
            ? new Date(b.dueDate)
            : new Date("9999-12-31");
          comparison = dateA - dateB;
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "createdAt":
        default:
          comparison = new Date(a.createdAt) - new Date(b.createdAt);
          break;
      }

      return order === "desc" ? -comparison : comparison;
    });
  }

  /**
   * Generate 404 Not Found response
   * @returns {Object} Response
   * @private
   */
  _notFound() {
    return {
      status: HTTP_STATUS.NOT_FOUND,
      body: {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Route not found",
        },
      },
    };
  }

  /**
   * Generate 500 Internal Server Error response
   * @param {string} message - Error message
   * @returns {Object} Response
   * @private
   */
  _serverError(message = ERROR_MESSAGES.UNKNOWN_ERROR) {
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: message,
        },
      },
    };
  }
}

// Create singleton instance
var appServer = new AppServer();
window.appServer = appServer;
