/**
 * =====================================================
 * APPLICATION ENTRY POINT
 * =====================================================
 *
 * Main initialization file that:
 * - Initializes the state management
 * - Sets up the router and routes
 * - Configures the API client
 * - Sets up the developer panel
 * - Handles global events
 */

// Import core modules
import state from "./state.js";
import router from "./router.js";
import api from "./api/fajax.js";
import network from "../network/network.js";

// Import shared constants
import { CLIENT_ROUTES, API_ROUTES, TOAST_TYPES } from "../shared/constants.js";

// Import UI components
import { showToast } from "./components/toast.js";
import { renderNavbar, hideNavbar } from "./components/navbar.js";

// Import page handlers
import { renderLoginPage, initLoginPage } from "./pages/login.js";
import { renderRegisterPage, initRegisterPage } from "./pages/register.js";
import { renderDashboardPage, initDashboardPage } from "./pages/dashboard.js";
import { renderTasksPage, initTasksPage } from "./pages/tasks.js";

/**
 * TaskMaster Pro Application
 */
class App {
  constructor() {
    this.name = "TaskMaster Pro";
    console.log(`[App] Initializing ${this.name}...`);
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      // 1. Setup API client with stored token
      this._setupApiClient();

      // 2. Validate existing session if any
      await this._validateSession();

      // 3. Setup router with routes
      this._setupRouter();

      // 4. Setup developer panel
      this._setupDevPanel();

      // 5. Setup global event listeners
      this._setupEventListeners();

      // 6. Initialize router (will navigate to current route)
      router.init("#view-container");

      console.log("[App] Initialization complete");
    } catch (error) {
      console.error("[App] Initialization failed:", error);
      showToast("Failed to initialize application", TOAST_TYPES.ERROR);
    }
  }

  /**
   * Setup the API client with stored token
   * @private
   */
  _setupApiClient() {
    const token = state.getToken();
    if (token) {
      api.setToken(token);
      console.log("[App] API client configured with stored token");
    }
  }

  /**
   * Validate existing session with the server
   * @private
   */
  async _validateSession() {
    if (!state.isAuthenticated()) {
      return;
    }

    console.log("[App] Validating existing session...");

    try {
      const response = await api.get(API_ROUTES.AUTH.VALIDATE);

      if (response.data?.valid) {
        console.log("[App] Session is valid");
        // Update user data if changed
        if (response.data?.data?.user) {
          state.set("auth.user", response.data.data.user);
        }
      } else {
        throw new Error("Invalid session");
      }
    } catch (error) {
      console.log("[App] Session invalid, clearing auth state");
      this._handleLogout(false);
    }
  }

  /**
   * Setup the router with all routes
   * @private
   */
  _setupRouter() {
    // Set auth guard
    router.setAuthGuard(() => state.isAuthenticated());

    // Register routes
    router.register(
      CLIENT_ROUTES.LOGIN,
      (route, container) => {
        hideNavbar();
        renderLoginPage(container);
        initLoginPage();
      },
      {
        title: "Login - TaskMaster Pro",
        requiresAuth: false,
      },
    );

    router.register(
      CLIENT_ROUTES.REGISTER,
      (route, container) => {
        hideNavbar();
        renderRegisterPage(container);
        initRegisterPage();
      },
      {
        title: "Register - TaskMaster Pro",
        requiresAuth: false,
      },
    );

    router.register(
      CLIENT_ROUTES.DASHBOARD,
      (route, container) => {
        renderNavbar();
        renderDashboardPage(container);
        initDashboardPage();
      },
      {
        title: "Dashboard - TaskMaster Pro",
        requiresAuth: true,
      },
    );

    router.register(
      CLIENT_ROUTES.TASKS,
      (route, container) => {
        renderNavbar();
        renderTasksPage(container);
        initTasksPage();
      },
      {
        title: "Tasks - TaskMaster Pro",
        requiresAuth: true,
      },
    );

    // Listen for route changes to update navbar
    router.onRouteChange((newRoute, oldRoute) => {
      console.log(
        `[App] Route changed: ${oldRoute?.path || "none"} -> ${newRoute.path}`,
      );
      this._updateNavbarActiveLink(newRoute.path);
    });
  }

  /**
   * Setup the developer panel for network testing
   * @private
   */
  _setupDevPanel() {
    const devPanel = document.getElementById("dev-panel");
    const devFab = document.getElementById("dev-panel-fab");
    const devToggle = document.getElementById("dev-panel-toggle");

    if (!devPanel || !devFab) return;

    // Toggle panel visibility
    const togglePanel = () => {
      devPanel.classList.toggle("hidden");
    };

    devFab.addEventListener("click", togglePanel);
    devToggle?.addEventListener("click", togglePanel);

    // Setup sliders
    const latencyMin = document.getElementById("latency-min");
    const latencyMax = document.getElementById("latency-max");
    const dropRate = document.getElementById("drop-rate");
    const maxRetries = document.getElementById("max-retries");

    // Update display values and config
    const updateLatencyMin = () => {
      const value = parseInt(latencyMin.value);
      document.getElementById("latency-min-value").textContent = `${value}ms`;
      network.updateConfig({ minLatency: value });
    };

    const updateLatencyMax = () => {
      const value = parseInt(latencyMax.value);
      document.getElementById("latency-max-value").textContent = `${value}ms`;
      network.updateConfig({ maxLatency: value });
    };

    const updateDropRate = () => {
      const value = parseInt(dropRate.value);
      document.getElementById("drop-rate-value").textContent = `${value}%`;
      network.updateConfig({ dropRate: value });
    };

    const updateMaxRetries = () => {
      const value = parseInt(maxRetries.value);
      api.setMaxRetries(value);
    };

    latencyMin?.addEventListener("input", updateLatencyMin);
    latencyMax?.addEventListener("input", updateLatencyMax);
    dropRate?.addEventListener("input", updateDropRate);
    maxRetries?.addEventListener("change", updateMaxRetries);

    // Subscribe to network stats updates
    network.onStatsUpdate((stats) => {
      this._updateDevPanelStats(stats);
    });

    // Initialize with current config
    const config = network.getConfig();
    if (latencyMin) latencyMin.value = config.minLatency;
    if (latencyMax) latencyMax.value = config.maxLatency;
    if (dropRate) dropRate.value = config.dropRate;

    updateLatencyMin?.();
    updateLatencyMax?.();
    updateDropRate?.();
  }

  /**
   * Update developer panel statistics
   * @param {Object} stats - Network stats
   * @private
   */
  _updateDevPanelStats(stats) {
    const elements = {
      requests: document.getElementById("stat-requests"),
      dropped: document.getElementById("stat-dropped"),
      success: document.getElementById("stat-success"),
      retries: document.getElementById("stat-retries"),
    };

    if (elements.requests) elements.requests.textContent = stats.totalRequests;
    if (elements.dropped) elements.dropped.textContent = stats.droppedPackets;
    if (elements.success)
      elements.success.textContent = stats.successfulRequests;
    if (elements.retries) elements.retries.textContent = stats.totalRetries;
  }

  /**
   * Setup global event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for API retry events
    window.addEventListener("api:retry", (event) => {
      const { attempt, maxAttempts } = event.detail;
      showToast(
        `Network error. Retrying... (${attempt}/${maxAttempts})`,
        TOAST_TYPES.WARNING,
        3000,
      );
    });

    // Listen for auth state changes
    state.watch("auth.isAuthenticated", (isAuth, wasAuth) => {
      if (wasAuth && !isAuth) {
        // User logged out
        showToast("You have been logged out", TOAST_TYPES.INFO);
        router.navigate(CLIENT_ROUTES.LOGIN);
      }
    });

    // Handle logout button clicks (delegated)
    document.addEventListener("click", (event) => {
      if (event.target.matches("#logout-btn, #logout-btn *")) {
        event.preventDefault();
        this._handleLogout(true);
      }
    });
  }

  /**
   * Handle user logout
   * @param {boolean} showMessage - Whether to show toast message
   * @private
   */
  async _handleLogout(showMessage = true) {
    try {
      // Call logout endpoint
      await api.post(API_ROUTES.AUTH.LOGOUT);
    } catch (error) {
      // Ignore errors - we'll clear state anyway
      console.log("[App] Logout request failed (may be expected)");
    }

    // Clear client state
    api.clearToken();
    state.clearAuth();
    state.reset("tasks");
    state.reset("stats");
    state.clearPersisted();

    if (showMessage) {
      showToast("Logged out successfully", TOAST_TYPES.SUCCESS);
    }

    // Navigate to login
    router.navigate(CLIENT_ROUTES.LOGIN);
  }

  /**
   * Update active link in navbar
   * @param {string} currentPath - Current route path
   * @private
   */
  _updateNavbarActiveLink(currentPath) {
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach((link) => {
      const route = link.getAttribute("data-route");
      if (route && currentPath.includes(route)) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }
}

// =====================================================
// Application Bootstrap
// =====================================================

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("=".repeat(50));
  console.log("TaskMaster Pro - Starting Application");
  console.log("=".repeat(50));

  // Create and initialize app
  const app = new App();
  app.init();

  // Expose app instance globally for debugging
  window.__TASKMASTER__ = {
    app,
    state,
    router,
    api,
    network,
  };
});

export { App };
