/**
 * =====================================================
 * FAJAX - Fake AJAX Layer
 * =====================================================
 *
 * This module provides a custom FXMLHttpRequest class that mimics
 * the real XMLHttpRequest API, as well as a Promise-based API client
 * with automatic retry logic for handling network failures.
 *
 * CRITICAL: Real fetch() and XMLHttpRequest are NOT used.
 * All communication goes through the Network simulation layer.
 */

import network from "../../network/network.js";
import {
  FAJAX_READY_STATE,
  HTTP_STATUS,
  NETWORK_CONFIG,
  ERROR_MESSAGES,
} from "../../shared/constants.js";

// =====================================================
// FXMLHttpRequest - Fake XMLHttpRequest Implementation
// =====================================================

/**
 * FXMLHttpRequest - Mimics the browser's XMLHttpRequest API
 * but routes requests through our simulated network layer
 */
class FXMLHttpRequest {
  constructor() {
    // Ready state (mimics XMLHttpRequest.readyState)
    this.readyState = FAJAX_READY_STATE.UNSENT;

    // Response properties
    this.status = 0;
    this.statusText = "";
    this.response = null;
    this.responseText = "";
    this.responseType = "";

    // Request properties
    this._method = null;
    this._url = null;
    this._headers = {};
    this._async = true;

    // Event handlers (mimics XMLHttpRequest events)
    this.onreadystatechange = null;
    this.onload = null;
    this.onerror = null;
    this.ontimeout = null;
    this.onprogress = null;

    // Timeout in ms
    this.timeout = 0;
    this._timeoutId = null;

    // Abort flag
    this._aborted = false;
  }

  /**
   * Open a connection (mimics XMLHttpRequest.open)
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {boolean} async - Async mode (default true)
   */
  open(method, url, async = true) {
    this._method = method.toUpperCase();
    this._url = url;
    this._async = async;
    this._headers = {};

    this.readyState = FAJAX_READY_STATE.OPENED;
    this._notifyStateChange();

    console.log(`[FAJAX] Opened: ${this._method} ${this._url}`);
  }

  /**
   * Set a request header (mimics XMLHttpRequest.setRequestHeader)
   * @param {string} name - Header name
   * @param {string} value - Header value
   */
  setRequestHeader(name, value) {
    if (this.readyState !== FAJAX_READY_STATE.OPENED) {
      throw new Error("Request not opened");
    }
    this._headers[name] = value;
  }

  /**
   * Send the request (mimics XMLHttpRequest.send)
   * @param {*} body - Request body
   */
  send(body = null) {
    if (this.readyState !== FAJAX_READY_STATE.OPENED) {
      throw new Error("Request not opened");
    }

    if (this._aborted) {
      return;
    }

    console.log(`[FAJAX] Sending: ${this._method} ${this._url}`);

    // Build request object for network layer
    const request = {
      method: this._method,
      url: this._url,
      headers: this._headers,
      body: body,
    };

    // Set up timeout if configured
    if (this.timeout > 0) {
      this._timeoutId = setTimeout(() => {
        this._handleTimeout();
      }, this.timeout);
    }

    // Notify that we're loading
    this.readyState = FAJAX_READY_STATE.LOADING;
    this._notifyStateChange();

    // Send through network layer
    network
      .send(request)
      .then((response) => {
        if (this._aborted) return;
        this._handleResponse(response);
      })
      .catch((error) => {
        if (this._aborted) return;
        this._handleError(error);
      });
  }

  /**
   * Abort the request (mimics XMLHttpRequest.abort)
   */
  abort() {
    this._aborted = true;

    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
    }

    this.readyState = FAJAX_READY_STATE.UNSENT;
    console.log("[FAJAX] Request aborted");
  }

  /**
   * Get all response headers (mimics XMLHttpRequest.getAllResponseHeaders)
   * @returns {string} Headers string
   */
  getAllResponseHeaders() {
    if (this._responseHeaders) {
      return Object.entries(this._responseHeaders)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\r\n");
    }
    return "";
  }

  /**
   * Get a specific response header
   * @param {string} name - Header name
   * @returns {string|null} Header value
   */
  getResponseHeader(name) {
    if (this._responseHeaders) {
      return this._responseHeaders[name] || null;
    }
    return null;
  }

  /**
   * Handle successful response
   * @param {Object} response - Server response
   * @private
   */
  _handleResponse(response) {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
    }

    this.status = response.status;
    this.statusText = this._getStatusText(response.status);
    this._responseHeaders = response.headers || {};

    // Handle response body
    if (response.body) {
      if (typeof response.body === "object") {
        this.responseText = JSON.stringify(response.body);
        this.response = response.body;
      } else {
        this.responseText = response.body;
        this.response = response.body;
      }
    }

    // Update ready state
    this.readyState = FAJAX_READY_STATE.DONE;
    this._notifyStateChange();

    // Fire load event
    if (this.onload) {
      this.onload({ target: this });
    }

    console.log(`[FAJAX] Response received: ${this.status}`);
  }

  /**
   * Handle error (including network drops)
   * @param {Object} error - Error object
   * @private
   */
  _handleError(error) {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
    }

    this.status = error.status || HTTP_STATUS.NETWORK_ERROR;
    this.statusText = error.message || "Network Error";

    this.readyState = FAJAX_READY_STATE.DONE;
    this._notifyStateChange();

    // Fire error event
    if (this.onerror) {
      this.onerror({ target: this, error: error });
    }

    console.log(`[FAJAX] Request error: ${error.message}`);
  }

  /**
   * Handle timeout
   * @private
   */
  _handleTimeout() {
    this._aborted = true;
    this.status = HTTP_STATUS.TIMEOUT;
    this.statusText = "Timeout";

    this.readyState = FAJAX_READY_STATE.DONE;
    this._notifyStateChange();

    if (this.ontimeout) {
      this.ontimeout({ target: this });
    }

    console.log("[FAJAX] Request timeout");
  }

  /**
   * Notify state change
   * @private
   */
  _notifyStateChange() {
    if (this.onreadystatechange) {
      this.onreadystatechange({ target: this });
    }
  }

  /**
   * Get status text for a status code
   * @param {number} status - HTTP status code
   * @returns {string} Status text
   * @private
   */
  _getStatusText(status) {
    const statusTexts = {
      200: "OK",
      201: "Created",
      204: "No Content",
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      409: "Conflict",
      422: "Unprocessable Entity",
      500: "Internal Server Error",
      503: "Service Unavailable",
    };
    return statusTexts[status] || "Unknown";
  }
}

// =====================================================
// API Client - Promise-based wrapper with retry logic
// =====================================================

/**
 * ApiClient - High-level API client with retry logic
 */
class ApiClient {
  constructor() {
    // Retry configuration
    this.maxRetries = NETWORK_CONFIG.DEFAULT_MAX_RETRIES;
    this.retryDelayBase = NETWORK_CONFIG.RETRY_DELAY_BASE;

    // Default request timeout
    this.timeout = NETWORK_CONFIG.DEFAULT_TIMEOUT;

    // Stored auth token
    this._token = null;
  }

  /**
   * Set the authentication token
   * @param {string} token - Auth token
   */
  setToken(token) {
    this._token = token;
    console.log("[ApiClient] Token set");
  }

  /**
   * Clear the authentication token
   */
  clearToken() {
    this._token = null;
    console.log("[ApiClient] Token cleared");
  }

  /**
   * Get current token
   * @returns {string|null} Current token
   */
  getToken() {
    return this._token;
  }

  /**
   * Update max retries setting
   * @param {number} maxRetries - New max retries value
   */
  setMaxRetries(maxRetries) {
    this.maxRetries = Math.max(1, Math.min(10, maxRetries));
  }

  /**
   * Make an HTTP request with automatic retry logic
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async request(method, url, options = {}) {
    const { body, headers = {}, retries = 0 } = options;

    // Add auth header if token is set
    const requestHeaders = { ...headers };
    if (this._token) {
      requestHeaders["Authorization"] = `Bearer ${this._token}`;
    }

    // Add content type for requests with body
    if (body && !requestHeaders["Content-Type"]) {
      requestHeaders["Content-Type"] = "application/json";
    }

    return new Promise((resolve, reject) => {
      const xhr = new FXMLHttpRequest();
      xhr.timeout = this.timeout;

      xhr.onload = () => {
        // Parse response
        let data;
        try {
          data =
            typeof xhr.response === "string"
              ? JSON.parse(xhr.response)
              : xhr.response;
        } catch (e) {
          data = xhr.responseText;
        }

        // Check for HTTP errors
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            status: xhr.status,
            data: data,
          });
        } else {
          // HTTP error - don't retry for client errors (4xx)
          if (xhr.status >= 400 && xhr.status < 500) {
            reject({
              status: xhr.status,
              data: data,
              message: data?.error?.message || "Request failed",
            });
          } else {
            // Server error - may retry
            this._handleFailure(
              method,
              url,
              options,
              retries,
              resolve,
              reject,
              {
                status: xhr.status,
                message: data?.error?.message || "Server error",
              },
            );
          }
        }
      };

      xhr.onerror = (event) => {
        // Network error - retry
        this._handleFailure(method, url, options, retries, resolve, reject, {
          status: 0,
          message: ERROR_MESSAGES.NETWORK_ERROR,
          dropped: event.error?.dropped,
        });
      };

      xhr.ontimeout = () => {
        // Timeout - retry
        this._handleFailure(method, url, options, retries, resolve, reject, {
          status: HTTP_STATUS.TIMEOUT,
          message: ERROR_MESSAGES.REQUEST_TIMEOUT,
        });
      };

      // Open and send request
      xhr.open(method, url);

      // Set headers
      Object.entries(requestHeaders).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      // Send with body if provided
      xhr.send(body ? JSON.stringify(body) : null);
    });
  }

  /**
   * Handle request failure with retry logic
   * @private
   */
  _handleFailure(method, url, options, currentRetries, resolve, reject, error) {
    if (currentRetries < this.maxRetries) {
      // Record retry in network stats
      network.recordRetry();

      const delay = this._calculateRetryDelay(currentRetries);
      console.log(
        `[ApiClient] Retrying request (${currentRetries + 1}/${this.maxRetries}) in ${delay}ms`,
      );

      // Dispatch retry event for UI notification
      this._dispatchRetryEvent(currentRetries + 1, this.maxRetries);

      setTimeout(() => {
        this.request(method, url, {
          ...options,
          retries: currentRetries + 1,
        })
          .then(resolve)
          .catch(reject);
      }, delay);
    } else {
      console.log("[ApiClient] Max retries exceeded");
      reject({
        ...error,
        message: ERROR_MESSAGES.MAX_RETRIES_EXCEEDED,
        retriesExhausted: true,
      });
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param {number} retryCount - Current retry count
   * @returns {number} Delay in milliseconds
   * @private
   */
  _calculateRetryDelay(retryCount) {
    // Exponential backoff: delay = base * 2^retryCount + random jitter
    const exponentialDelay = this.retryDelayBase * Math.pow(2, retryCount);
    const jitter = Math.random() * 200; // Add random jitter to prevent thundering herd
    return Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds
  }

  /**
   * Dispatch a custom event for retry notifications
   * @param {number} attempt - Current attempt number
   * @param {number} maxAttempts - Maximum attempts
   * @private
   */
  _dispatchRetryEvent(attempt, maxAttempts) {
    const event = new CustomEvent("api:retry", {
      detail: { attempt, maxAttempts },
    });
    window.dispatchEvent(event);
  }

  // =====================================================
  // Convenience methods for HTTP verbs
  // =====================================================

  /**
   * Make a GET request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response
   */
  get(url, options = {}) {
    return this.request("GET", url, options);
  }

  /**
   * Make a POST request
   * @param {string} url - Request URL
   * @param {Object} body - Request body
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response
   */
  post(url, body, options = {}) {
    return this.request("POST", url, { ...options, body });
  }

  /**
   * Make a PUT request
   * @param {string} url - Request URL
   * @param {Object} body - Request body
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response
   */
  put(url, body, options = {}) {
    return this.request("PUT", url, { ...options, body });
  }

  /**
   * Make a DELETE request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response
   */
  delete(url, options = {}) {
    return this.request("DELETE", url, options);
  }

  /**
   * Make a PATCH request
   * @param {string} url - Request URL
   * @param {Object} body - Request body
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response
   */
  patch(url, body, options = {}) {
    return this.request("PATCH", url, { ...options, body });
  }
}

// Create singleton API client instance
const api = new ApiClient();

// Export both the class and singleton
export { FXMLHttpRequest, ApiClient };
export default api;
