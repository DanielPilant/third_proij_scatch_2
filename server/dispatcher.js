/**
 * =====================================================
 * SERVER DISPATCHER
 * =====================================================
 *
 * Central routing layer that dispatches incoming network requests
 * to the appropriate server (AuthServer or AppServer).
 *
 * This simulates a reverse proxy or API gateway that routes
 * requests to different microservices based on the URL path.
 */

import authServer from "./auth/authServer.js";
import appServer from "./app/appServer.js";
import { HTTP_STATUS, API_ROUTES } from "../shared/constants.js";

/**
 * ServerDispatcher class
 * Routes requests to the appropriate server based on URL
 */
class ServerDispatcher {
  constructor() {
    this.name = "ServerDispatcher";
    console.log(`[${this.name}] Initialized`);

    // Define route prefixes for each server
    this.routeMap = [
      {
        prefix: "/api/auth",
        server: authServer,
        name: "AuthServer",
      },
      {
        prefix: "/api/tasks",
        server: appServer,
        name: "AppServer",
      },
      {
        prefix: "/api/users",
        server: appServer,
        name: "AppServer",
      },
    ];
  }

  /**
   * Dispatch a request to the appropriate server
   * @param {Object} request - The incoming request object
   * @returns {Object} Server response
   */
  dispatch(request) {
    const { method, url, headers, body } = request;

    console.log(`[${this.name}] Dispatching: ${method} ${url}`);

    // Validate request structure
    if (!url) {
      return this._badRequest("URL is required");
    }

    // Parse query string if present
    const parsedUrl = this._parseUrl(url);

    // Build normalized request object
    const normalizedRequest = {
      method: method?.toUpperCase() || "GET",
      url: parsedUrl.path,
      headers: this._normalizeHeaders(headers),
      body: this._parseBody(body),
      query: parsedUrl.query,
      params: {}, // Will be populated by servers
    };

    // Find the appropriate server for this route
    const route = this._findRoute(parsedUrl.path);

    if (!route) {
      console.log(`[${this.name}] No route found for: ${url}`);
      return this._notFound();
    }

    console.log(`[${this.name}] Routing to: ${route.name}`);

    try {
      // Dispatch to the server
      const response = route.server.handleRequest(normalizedRequest);

      // Ensure response has proper structure
      return this._normalizeResponse(response);
    } catch (error) {
      console.error(`[${this.name}] Server error:`, error);
      return this._serverError(error.message);
    }
  }

  /**
   * Find the appropriate server for a URL path
   * @param {string} path - The URL path
   * @returns {Object|null} Route configuration or null
   * @private
   */
  _findRoute(path) {
    return this.routeMap.find((route) => path.startsWith(route.prefix));
  }

  /**
   * Parse URL to extract path and query parameters
   * @param {string} url - Full URL or path
   * @returns {Object} Parsed URL with path and query
   * @private
   */
  _parseUrl(url) {
    const [path, queryString] = url.split("?");
    const query = {};

    if (queryString) {
      queryString.split("&").forEach((param) => {
        const [key, value] = param.split("=");
        if (key) {
          query[decodeURIComponent(key)] = value
            ? decodeURIComponent(value)
            : true;
        }
      });
    }

    return { path, query };
  }

  /**
   * Normalize request headers to consistent format
   * @param {Object} headers - Raw headers object
   * @returns {Object} Normalized headers
   * @private
   */
  _normalizeHeaders(headers) {
    if (!headers) return {};

    const normalized = {};

    Object.entries(headers).forEach(([key, value]) => {
      // Store both original and lowercase versions for compatibility
      normalized[key] = value;
    });

    return normalized;
  }

  /**
   * Parse request body (deserialize JSON if string)
   * @param {*} body - Request body
   * @returns {*} Parsed body
   * @private
   */
  _parseBody(body) {
    if (!body) return null;

    // If already an object, return as is
    if (typeof body === "object") {
      return body;
    }

    // Try to parse JSON string
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch (e) {
        // Not JSON, return as string
        return body;
      }
    }

    return body;
  }

  /**
   * Ensure response has proper structure
   * @param {Object} response - Raw server response
   * @returns {Object} Normalized response
   * @private
   */
  _normalizeResponse(response) {
    if (!response) {
      return this._serverError("Server returned no response");
    }

    return {
      status: response.status || HTTP_STATUS.OK,
      headers: response.headers || {
        "Content-Type": "application/json",
      },
      body: response.body || {},
    };
  }

  /**
   * Create a 400 Bad Request response
   * @param {string} message - Error message
   * @returns {Object} Response
   * @private
   */
  _badRequest(message) {
    return {
      status: HTTP_STATUS.BAD_REQUEST,
      headers: { "Content-Type": "application/json" },
      body: {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: message,
        },
      },
    };
  }

  /**
   * Create a 404 Not Found response
   * @returns {Object} Response
   * @private
   */
  _notFound() {
    return {
      status: HTTP_STATUS.NOT_FOUND,
      headers: { "Content-Type": "application/json" },
      body: {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "The requested resource was not found",
        },
      },
    };
  }

  /**
   * Create a 500 Internal Server Error response
   * @param {string} message - Error message
   * @returns {Object} Response
   * @private
   */
  _serverError(message = "Internal server error") {
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      headers: { "Content-Type": "application/json" },
      body: {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: message,
        },
      },
    };
  }

  /**
   * Get list of available routes (for debugging)
   * @returns {Array} Available routes
   */
  getRoutes() {
    return this.routeMap.map((route) => ({
      prefix: route.prefix,
      server: route.name,
    }));
  }
}

// Export singleton instance
const serverDispatcher = new ServerDispatcher();
export default serverDispatcher;

// Also export the class
export { ServerDispatcher };
