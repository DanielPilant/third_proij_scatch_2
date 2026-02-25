/**
 * =====================================================
 * AUTH SERVER
 * =====================================================
 *
 * Handles all authentication-related operations:
 * - User registration
 * - User login
 * - Session validation
 * - Logout
 *
 * This simulates a dedicated authentication microservice.
 */

// Uses globals: dbApi, HTTP_STATUS, HTTP_METHODS, API_ROUTES, ERROR_MESSAGES, SUCCESS_MESSAGES, VALIDATION, isValidEmail

/**
 * AuthServer class
 * Processes authentication requests
 */
class AuthServer {
  constructor() {
    this.name = "AuthServer";
    console.log(`[${this.name}] Initialized`);
  }

  /**
   * Main request handler - routes requests to appropriate methods
   * @param {Object} request - The incoming request
   * @returns {Object} Response object with status and body
   */
  handleRequest(request) {
    const { method, url, body } = request;

    console.log(`[${this.name}] ${method} ${url}`);

    // Route to appropriate handler
    switch (url) {
      case API_ROUTES.AUTH.LOGIN:
        if (method === HTTP_METHODS.POST) {
          return this.login(body);
        }
        break;

      case API_ROUTES.AUTH.REGISTER:
        if (method === HTTP_METHODS.POST) {
          return this.register(body);
        }
        break;

      case API_ROUTES.AUTH.LOGOUT:
        if (method === HTTP_METHODS.POST) {
          return this.logout(request);
        }
        break;

      case API_ROUTES.AUTH.VALIDATE:
        if (method === HTTP_METHODS.GET) {
          return this.validateToken(request);
        }
        break;
    }

    // No matching route
    return this._notFound();
  }

  /**
   * Handle user registration
   * @param {Object} data - Registration data (name, email, password)
   * @returns {Object} Response
   */
  register(data) {
    console.log(`[${this.name}] Processing registration`);

    // Validate input
    const validation = this._validateRegistration(data);
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

    // Check if email already exists
    const existingUser = dbApi.findUserByEmail(data.email);
    if (existingUser) {
      return {
        status: HTTP_STATUS.CONFLICT,
        body: {
          success: false,
          error: {
            code: "EMAIL_EXISTS",
            message: ERROR_MESSAGES.EMAIL_EXISTS,
          },
        },
      };
    }

    // Create the user
    const user = dbApi.createUser({
      name: data.name,
      email: data.email,
      password: data.password, // In production, this would be hashed!
    });

    if (!user) {
      return this._serverError("Failed to create user");
    }

    // Create session for the new user
    const session = dbApi.createSession(user.id);

    // Seed demo tasks for new users
    dbApi.seedDemoTasks(user.id);

    console.log(`[${this.name}] User registered successfully:`, user.email);

    return {
      status: HTTP_STATUS.CREATED,
      body: {
        success: true,
        message: SUCCESS_MESSAGES.REGISTER_SUCCESS,
        data: {
          user: user,
          token: session.token,
          expiresAt: session.expiresAt,
        },
      },
    };
  }

  /**
   * Handle user login
   * @param {Object} data - Login credentials (email, password)
   * @returns {Object} Response
   */
  login(data) {
    console.log(`[${this.name}] Processing login`);

    // Validate input
    if (!data?.email || !data?.password) {
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        body: {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Email and password are required",
          },
        },
      };
    }

    // Validate credentials
    const user = dbApi.validateCredentials(data.email, data.password);

    if (!user) {
      return {
        status: HTTP_STATUS.UNAUTHORIZED,
        body: {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: ERROR_MESSAGES.INVALID_CREDENTIALS,
          },
        },
      };
    }

    // Create new session
    const session = dbApi.createSession(user.id);

    console.log(`[${this.name}] User logged in:`, user.email);

    return {
      status: HTTP_STATUS.OK,
      body: {
        success: true,
        message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
        data: {
          user: user,
          token: session.token,
          expiresAt: session.expiresAt,
        },
      },
    };
  }

  /**
   * Handle user logout
   * @param {Object} request - Request with authorization header
   * @returns {Object} Response
   */
  logout(request) {
    console.log(`[${this.name}] Processing logout`);

    // Extract token from Authorization header
    const authHeader =
      request.headers?.["Authorization"] || request.headers?.["authorization"];

    let token = null;
    if (authHeader) {
      token = authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : authHeader;
    }

    if (token) {
      dbApi.invalidateSession(token);
      console.log(`[${this.name}] Session invalidated`);
    }

    return {
      status: HTTP_STATUS.OK,
      body: {
        success: true,
        message: SUCCESS_MESSAGES.LOGOUT_SUCCESS,
      },
    };
  }

  /**
   * Validate a session token
   * @param {Object} request - Request with authorization header
   * @returns {Object} Response
   */
  validateToken(request) {
    console.log(`[${this.name}] Validating token`);

    // Extract token
    const authHeader =
      request.headers?.["Authorization"] || request.headers?.["authorization"];

    let token = null;
    if (authHeader) {
      token = authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : authHeader;
    }

    if (!token) {
      return {
        status: HTTP_STATUS.UNAUTHORIZED,
        body: {
          success: false,
          error: {
            code: "NO_TOKEN",
            message: ERROR_MESSAGES.UNAUTHORIZED,
          },
        },
      };
    }

    // Validate through DBAPI
    const session = dbApi.validateSession(token);

    if (!session) {
      return {
        status: HTTP_STATUS.UNAUTHORIZED,
        body: {
          success: false,
          valid: false,
          error: {
            code: "INVALID_TOKEN",
            message: ERROR_MESSAGES.SESSION_EXPIRED,
          },
        },
      };
    }

    // Get user data
    const user = dbApi.findUserById(session.userId);

    return {
      status: HTTP_STATUS.OK,
      body: {
        success: true,
        valid: true,
        data: {
          user: user,
          expiresAt: session.expiresAt,
        },
      },
    };
  }

  /**
   * Validate registration data
   * @param {Object} data - Registration data
   * @returns {Object} Validation result
   * @private
   */
  _validateRegistration(data) {
    // Name validation
    if (!data?.name || data.name.trim().length < VALIDATION.NAME_MIN_LENGTH) {
      return {
        valid: false,
        field: "name",
        error: ERROR_MESSAGES.NAME_REQUIRED,
      };
    }

    if (data.name.trim().length > VALIDATION.NAME_MAX_LENGTH) {
      return {
        valid: false,
        field: "name",
        error: `Name must be less than ${VALIDATION.NAME_MAX_LENGTH} characters`,
      };
    }

    // Email validation
    if (!data?.email || !isValidEmail(data.email)) {
      return {
        valid: false,
        field: "email",
        error: ERROR_MESSAGES.INVALID_EMAIL,
      };
    }

    // Password validation
    if (
      !data?.password ||
      data.password.length < VALIDATION.PASSWORD_MIN_LENGTH
    ) {
      return {
        valid: false,
        field: "password",
        error: ERROR_MESSAGES.PASSWORD_TOO_SHORT,
      };
    }

    if (data.password.length > VALIDATION.PASSWORD_MAX_LENGTH) {
      return {
        valid: false,
        field: "password",
        error: `Password must be less than ${VALIDATION.PASSWORD_MAX_LENGTH} characters`,
      };
    }

    return { valid: true };
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
var authServer = new AuthServer();
window.authServer = authServer;
