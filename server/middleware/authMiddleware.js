/**
 * =====================================================
 * AUTH MIDDLEWARE
 * =====================================================
 *
 * Middleware that validates authentication tokens before
 * allowing requests to reach the AppServer.
 *
 * This simulates real server-side authentication middleware
 * like JWT verification in Express.js.
 */

// Uses globals: dbApi, HTTP_STATUS, ERROR_MESSAGES

/**
 * AuthMiddleware class
 * Validates tokens and extracts user information from requests
 */
class AuthMiddleware {
  /**
   * Extract token from request headers
   * Looks for Authorization: Bearer <token> header
   * @param {Object} request - The incoming request object
   * @returns {string|null} The token or null
   */
  extractToken(request) {
    const authHeader =
      request.headers?.["Authorization"] || request.headers?.["authorization"];

    if (!authHeader) {
      return null;
    }

    // Support "Bearer <token>" format
    if (authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    // Also support raw token
    return authHeader;
  }

  /**
   * Validate the request and add user info if token is valid
   * @param {Object} request - The incoming request object
   * @returns {Object} Result with success status and user/error info
   */
  authenticate(request) {
    const token = this.extractToken(request);

    if (!token) {
      console.log("[AuthMiddleware] No token provided");
      return {
        success: false,
        status: HTTP_STATUS.UNAUTHORIZED,
        error: {
          code: "NO_TOKEN",
          message: ERROR_MESSAGES.UNAUTHORIZED,
        },
      };
    }

    // Validate the token through DBAPI
    const session = dbApi.validateSession(token);

    if (!session) {
      console.log("[AuthMiddleware] Invalid or expired token");
      return {
        success: false,
        status: HTTP_STATUS.UNAUTHORIZED,
        error: {
          code: "INVALID_TOKEN",
          message: ERROR_MESSAGES.SESSION_EXPIRED,
        },
      };
    }

    // Get user data
    const user = dbApi.findUserById(session.userId);

    if (!user) {
      console.log("[AuthMiddleware] User not found for token");
      return {
        success: false,
        status: HTTP_STATUS.UNAUTHORIZED,
        error: {
          code: "USER_NOT_FOUND",
          message: ERROR_MESSAGES.UNAUTHORIZED,
        },
      };
    }

    console.log("[AuthMiddleware] Token validated for user:", user.email);

    // Return success with user info attached
    return {
      success: true,
      userId: user.id,
      user: user,
      token: token,
    };
  }

  /**
   * Middleware function to wrap protected routes
   * @param {Object} request - The incoming request
   * @param {Function} handler - The route handler to call if authenticated
   * @returns {Object} Server response
   */
  protect(request, handler) {
    const authResult = this.authenticate(request);

    if (!authResult.success) {
      return {
        status: authResult.status,
        body: {
          success: false,
          error: authResult.error,
        },
      };
    }

    // Add user info to request for the handler
    request.userId = authResult.userId;
    request.user = authResult.user;

    // Call the actual handler
    return handler(request);
  }
}

// Create singleton instance
var authMiddleware = new AuthMiddleware();
window.authMiddleware = authMiddleware;
