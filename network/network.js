/**
 * =====================================================
 * NETWORK SIMULATION LAYER
 * =====================================================
 *
 * This module simulates real-world network conditions:
 * - Random latency between configurable min/max values
 * - Random packet loss (drop rate)
 * - Network statistics tracking
 *
 * It acts as middleware between the FAJAX layer and the Server.
 * Requests pass through here to experience simulated network conditions.
 */

import serverDispatcher from "../server/dispatcher.js";
import { NETWORK_CONFIG, HTTP_STATUS } from "../shared/constants.js";

/**
 * Network class - Simulates network conditions
 */
class Network {
  constructor() {
    this.name = "Network";

    // Network configuration (can be adjusted via Developer Panel)
    this.config = {
      minLatency: NETWORK_CONFIG.DEFAULT_MIN_LATENCY,
      maxLatency: NETWORK_CONFIG.DEFAULT_MAX_LATENCY,
      dropRate: NETWORK_CONFIG.DEFAULT_DROP_RATE, // Percentage (0-100)
    };

    // Network statistics for monitoring
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      droppedPackets: 0,
      totalRetries: 0,
      averageLatency: 0,
      _latencySum: 0,
    };

    // Listeners for stats updates
    this._statsListeners = [];

    console.log(`[${this.name}] Initialized with config:`, this.config);
  }

  /**
   * Send a request through the simulated network
   * @param {Object} request - The request to send
   * @returns {Promise<Object>} Response or error
   */
  send(request) {
    return new Promise((resolve, reject) => {
      this.stats.totalRequests++;
      this._notifyStatsListeners();

      console.log(
        `[${this.name}] Processing request #${this.stats.totalRequests}: ${request.method} ${request.url}`,
      );

      // Calculate random latency
      const latency = this._calculateLatency();
      console.log(`[${this.name}] Simulated latency: ${latency}ms`);

      // Update average latency
      this.stats._latencySum += latency;
      this.stats.averageLatency = Math.round(
        this.stats._latencySum / this.stats.totalRequests,
      );

      // Simulate network delay
      setTimeout(() => {
        // Check for packet drop
        if (this._shouldDropPacket()) {
          this.stats.droppedPackets++;
          this._notifyStatsListeners();

          console.log(
            `[${this.name}] PACKET DROPPED! (${this.stats.droppedPackets} total drops)`,
          );

          // Reject with network error
          reject({
            type: "NETWORK_ERROR",
            status: HTTP_STATUS.NETWORK_ERROR,
            message: "Network request failed (packet dropped)",
            dropped: true,
          });
          return;
        }

        // Packet made it through - dispatch to server
        try {
          console.log(`[${this.name}] Dispatching to server...`);
          const response = serverDispatcher.dispatch(request);

          this.stats.successfulRequests++;
          this._notifyStatsListeners();

          console.log(
            `[${this.name}] Request successful, status: ${response.status}`,
          );
          resolve(response);
        } catch (error) {
          console.error(`[${this.name}] Server error:`, error);
          reject({
            type: "SERVER_ERROR",
            status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
            message: error.message || "Server error",
          });
        }
      }, latency);
    });
  }

  /**
   * Calculate random latency within configured range
   * @returns {number} Latency in milliseconds
   * @private
   */
  _calculateLatency() {
    const min = this.config.minLatency;
    const max = this.config.maxLatency;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Determine if a packet should be dropped based on drop rate
   * @returns {boolean} True if packet should be dropped
   * @private
   */
  _shouldDropPacket() {
    const dropChance = this.config.dropRate / 100;
    return Math.random() < dropChance;
  }

  /**
   * Update network configuration
   * @param {Object} newConfig - New configuration values
   */
  updateConfig(newConfig) {
    if (newConfig.minLatency !== undefined) {
      this.config.minLatency = Math.max(0, newConfig.minLatency);
    }
    if (newConfig.maxLatency !== undefined) {
      this.config.maxLatency = Math.max(
        this.config.minLatency,
        newConfig.maxLatency,
      );
    }
    if (newConfig.dropRate !== undefined) {
      this.config.dropRate = Math.max(0, Math.min(100, newConfig.dropRate));
    }

    console.log(`[${this.name}] Config updated:`, this.config);
    this._notifyStatsListeners();
  }

  /**
   * Get current network configuration
   * @returns {Object} Current config
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Get current network statistics
   * @returns {Object} Network stats
   */
  getStats() {
    return {
      totalRequests: this.stats.totalRequests,
      successfulRequests: this.stats.successfulRequests,
      droppedPackets: this.stats.droppedPackets,
      totalRetries: this.stats.totalRetries,
      averageLatency: this.stats.averageLatency,
      successRate:
        this.stats.totalRequests > 0
          ? Math.round(
              (this.stats.successfulRequests / this.stats.totalRequests) * 100,
            )
          : 100,
    };
  }

  /**
   * Record a retry attempt (called by FAJAX layer)
   */
  recordRetry() {
    this.stats.totalRetries++;
    this._notifyStatsListeners();
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      droppedPackets: 0,
      totalRetries: 0,
      averageLatency: 0,
      _latencySum: 0,
    };
    this._notifyStatsListeners();
    console.log(`[${this.name}] Stats reset`);
  }

  /**
   * Add a listener for stats updates
   * @param {Function} callback - Function to call when stats change
   * @returns {Function} Unsubscribe function
   */
  onStatsUpdate(callback) {
    this._statsListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this._statsListeners.indexOf(callback);
      if (index > -1) {
        this._statsListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all stats listeners
   * @private
   */
  _notifyStatsListeners() {
    const stats = this.getStats();
    this._statsListeners.forEach((callback) => {
      try {
        callback(stats);
      } catch (e) {
        console.error("[Network] Stats listener error:", e);
      }
    });
  }
}

// Create and export singleton instance
const network = new Network();
export default network;

// Also export the class
export { Network };
