/**
 * =====================================================
 * CLIENT-SIDE ROUTER
 * =====================================================
 *
 * Hash-based SPA router for navigation between views
 * without page reloads. Features:
 * - Route registration with callbacks
 * - Route guards (authentication)
 * - URL parameter parsing
 * - Navigation history
 */

import state from "./state.js";
import { CLIENT_ROUTES, PUBLIC_ROUTES } from "../shared/constants.js";

/**
 * Router class - Client-side hash-based routing
 */
class Router {
  constructor() {
    // Registered routes
    this._routes = new Map();

    // Default route
    this._defaultRoute = CLIENT_ROUTES.DEFAULT;

    // Route guard function
    this._authGuard = null;

    // Current route info
    this._currentRoute = null;

    // View container element
    this._viewContainer = null;

    // Route change listeners
    this._listeners = [];

    // Bind hashchange event
    this._onHashChange = this._onHashChange.bind(this);

    console.log("[Router] Initialized");
  }

  /**
   * Initialize the router
   * @param {HTMLElement|string} container - View container element or selector
   */
  init(container) {
    // Get container element
    if (typeof container === "string") {
      this._viewContainer = document.querySelector(container);
    } else {
      this._viewContainer = container;
    }

    if (!this._viewContainer) {
      console.error("[Router] View container not found");
      return;
    }

    // Listen for hash changes
    window.addEventListener("hashchange", this._onHashChange);

    // Handle initial route
    this._onHashChange();

    console.log("[Router] Started listening for route changes");
  }

  /**
   * Register a route
   * @param {string} path - Route path (e.g., '/dashboard')
   * @param {Function} handler - Handler function that returns HTML or renders view
   * @param {Object} options - Route options (title, requiresAuth, etc.)
   */
  register(path, handler, options = {}) {
    this._routes.set(path, {
      handler,
      options: {
        title: options.title || "TaskMaster Pro",
        requiresAuth: options.requiresAuth !== false,
        ...options,
      },
    });

    console.log(`[Router] Registered route: ${path}`, options);
  }

  /**
   * Navigate to a route
   * @param {string} path - Route path
   * @param {Object} params - Optional URL parameters
   */
  navigate(path, params = {}) {
    // Build query string if params provided
    let queryString = "";
    if (Object.keys(params).length > 0) {
      queryString =
        "?" +
        Object.entries(params)
          .map(
            ([key, value]) =>
              `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
          )
          .join("&");
    }

    const fullPath = `#${path}${queryString}`;
    console.log(`[Router] Navigating to: ${fullPath}`);

    window.location.hash = fullPath;
  }

  /**
   * Navigate back in history
   */
  back() {
    window.history.back();
  }

  /**
   * Navigate forward in history
   */
  forward() {
    window.history.forward();
  }

  /**
   * Replace current route without adding to history
   * @param {string} path - Route path
   */
  replace(path) {
    const fullPath =
      window.location.pathname + window.location.search + `#${path}`;
    window.history.replaceState(null, "", fullPath);
    this._onHashChange();
  }

  /**
   * Set the authentication guard function
   * @param {Function} guardFn - Function that returns true if navigation allowed
   */
  setAuthGuard(guardFn) {
    this._authGuard = guardFn;
  }

  /**
   * Get current route information
   * @returns {Object} Current route info
   */
  getCurrentRoute() {
    return this._currentRoute;
  }

  /**
   * Add a route change listener
   * @param {Function} callback - Function(newRoute, oldRoute)
   * @returns {Function} Unsubscribe function
   */
  onRouteChange(callback) {
    this._listeners.push(callback);

    return () => {
      const index = this._listeners.indexOf(callback);
      if (index > -1) {
        this._listeners.splice(index, 1);
      }
    };
  }

  /**
   * Check if a route requires authentication
   * @param {string} path - Route path
   * @returns {boolean}
   */
  isProtectedRoute(path) {
    const route = this._routes.get(path);
    if (route) {
      return route.options.requiresAuth;
    }
    // Default to protected for unknown routes
    return !PUBLIC_ROUTES.includes(path);
  }

  /**
   * Destroy the router (cleanup)
   */
  destroy() {
    window.removeEventListener("hashchange", this._onHashChange);
    this._routes.clear();
    this._listeners = [];
  }

  // =====================================================
  // Private methods
  // =====================================================

  /**
   * Handle hash change event
   * @private
   */
  _onHashChange() {
    const { path, query } = this._parseHash(window.location.hash);

    console.log(`[Router] Hash changed: ${path}`, query);

    const oldRoute = this._currentRoute;

    // Find matching route
    let route = this._routes.get(path);
    let routePath = path;

    // If no exact match, check for default route
    if (!route) {
      // Redirect to default if no match
      if (path === "" || path === "/") {
        routePath = this._defaultRoute;
        route = this._routes.get(routePath);
      }
    }

    // Still no route found
    if (!route) {
      console.log(
        `[Router] No route found for: ${path}, redirecting to default`,
      );
      this.navigate(this._defaultRoute);
      return;
    }

    // Check authentication guard
    if (route.options.requiresAuth && this._authGuard) {
      if (!this._authGuard()) {
        console.log("[Router] Auth guard blocked access, redirecting to login");
        this.navigate(CLIENT_ROUTES.LOGIN);
        return;
      }
    }

    // Check if trying to access auth pages while logged in
    if (!route.options.requiresAuth && this._authGuard && this._authGuard()) {
      if (path === CLIENT_ROUTES.LOGIN || path === CLIENT_ROUTES.REGISTER) {
        console.log("[Router] Already authenticated, redirecting to dashboard");
        this.navigate(CLIENT_ROUTES.DASHBOARD);
        return;
      }
    }

    // Update current route info
    this._currentRoute = {
      path: routePath,
      query: query,
      options: route.options,
    };

    // Update state
    state.set("ui.currentRoute", routePath);

    // Update page title
    document.title = route.options.title;

    // Call handler to render the view
    try {
      route.handler(this._currentRoute, this._viewContainer);
    } catch (error) {
      console.error("[Router] Error rendering route:", error);
      this._viewContainer.innerHTML = `
                <div class="error-page">
                    <h1>Error</h1>
                    <p>Something went wrong while loading this page.</p>
                </div>
            `;
    }

    // Notify listeners
    this._notifyListeners(this._currentRoute, oldRoute);
  }

  /**
   * Parse the hash string to get path and query params
   * @param {string} hash - Hash string
   * @returns {Object} { path, query }
   * @private
   */
  _parseHash(hash) {
    // Remove leading # and /
    let cleanHash = hash.replace(/^#\/?/, "/");
    if (!cleanHash || cleanHash === "") {
      cleanHash = "/";
    }

    // Split path and query string
    const [pathPart, queryPart] = cleanHash.split("?");
    const path = pathPart || "/";
    const query = {};

    if (queryPart) {
      queryPart.split("&").forEach((param) => {
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
   * Notify route change listeners
   * @param {Object} newRoute - New route info
   * @param {Object} oldRoute - Previous route info
   * @private
   */
  _notifyListeners(newRoute, oldRoute) {
    this._listeners.forEach((callback) => {
      try {
        callback(newRoute, oldRoute);
      } catch (e) {
        console.error("[Router] Listener error:", e);
      }
    });
  }
}

// Create and export singleton instance
const router = new Router();
export default router;

// Also export the class
export { Router };
