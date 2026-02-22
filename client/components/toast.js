/**
 * =====================================================
 * TOAST NOTIFICATION COMPONENT
 * =====================================================
 *
 * A reusable toast notification system for displaying
 * success, error, warning, and info messages.
 */

import {
  TOAST_TYPES,
  TOAST_DURATION,
  generateId,
} from "../../shared/constants.js";

// Active toasts map
const activeToasts = new Map();

// Maximum number of visible toasts
const MAX_TOASTS = 5;

/**
 * Get the toast container element
 * @returns {HTMLElement}
 */
function getToastContainer() {
  let container = document.getElementById("toast-container");

  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  return container;
}

/**
 * Get icon for toast type
 * @param {string} type - Toast type
 * @returns {string} Icon character
 */
function getToastIcon(type) {
  const icons = {
    [TOAST_TYPES.SUCCESS]: "✓",
    [TOAST_TYPES.ERROR]: "✕",
    [TOAST_TYPES.WARNING]: "⚠",
    [TOAST_TYPES.INFO]: "ℹ",
  };
  return icons[type] || icons[TOAST_TYPES.INFO];
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type (success, error, warning, info)
 * @param {number} duration - Duration in ms (0 for persistent)
 * @returns {string} Toast ID
 */
export function showToast(
  message,
  type = TOAST_TYPES.INFO,
  duration = TOAST_DURATION,
) {
  const container = getToastContainer();
  const template = document.getElementById("template-toast");

  // Remove oldest toast if at max
  if (activeToasts.size >= MAX_TOASTS) {
    const oldestId = activeToasts.keys().next().value;
    removeToast(oldestId);
  }

  // Create toast element
  let toastElement;

  if (template) {
    const clone = template.content.cloneNode(true);
    toastElement = clone.querySelector(".toast");
  } else {
    // Fallback if template not found
    toastElement = document.createElement("div");
    toastElement.className = "toast";
    toastElement.innerHTML = `
            <div class="toast-icon"></div>
            <div class="toast-content">
                <p class="toast-message"></p>
            </div>
            <button class="toast-close">×</button>
            <div class="toast-progress"></div>
        `;
  }

  // Generate unique ID
  const toastId = generateId();
  toastElement.setAttribute("data-toast-id", toastId);

  // Set type class
  toastElement.classList.add(`toast-${type}`);

  // Set content
  const iconEl = toastElement.querySelector(".toast-icon");
  const messageEl = toastElement.querySelector(".toast-message");

  if (iconEl) iconEl.textContent = getToastIcon(type);
  if (messageEl) messageEl.textContent = message;

  // Setup close button
  const closeBtn = toastElement.querySelector(".toast-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => removeToast(toastId));
  }

  // Add to container
  container.appendChild(toastElement);

  // Trigger entrance animation
  requestAnimationFrame(() => {
    toastElement.classList.add("toast-enter");
  });

  // Setup progress bar and auto-dismiss
  let timeoutId = null;

  if (duration > 0) {
    const progressBar = toastElement.querySelector(".toast-progress");
    if (progressBar) {
      progressBar.style.animationDuration = `${duration}ms`;
      progressBar.classList.add("toast-progress-animate");
    }

    timeoutId = setTimeout(() => {
      removeToast(toastId);
    }, duration);
  }

  // Store toast reference
  activeToasts.set(toastId, {
    element: toastElement,
    timeoutId,
  });

  return toastId;
}

/**
 * Remove a toast notification
 * @param {string} toastId - Toast ID to remove
 */
export function removeToast(toastId) {
  const toast = activeToasts.get(toastId);

  if (!toast) return;

  // Clear timeout if exists
  if (toast.timeoutId) {
    clearTimeout(toast.timeoutId);
  }

  // Add exit animation class
  toast.element.classList.remove("toast-enter");
  toast.element.classList.add("toast-exit");

  // Remove after animation
  setTimeout(() => {
    toast.element.remove();
    activeToasts.delete(toastId);
  }, 300); // Match CSS animation duration
}

/**
 * Remove all toast notifications
 */
export function clearAllToasts() {
  activeToasts.forEach((toast, id) => {
    removeToast(id);
  });
}

/**
 * Show a success toast
 * @param {string} message - Message
 * @param {number} duration - Duration
 * @returns {string} Toast ID
 */
export function showSuccess(message, duration = TOAST_DURATION) {
  return showToast(message, TOAST_TYPES.SUCCESS, duration);
}

/**
 * Show an error toast
 * @param {string} message - Message
 * @param {number} duration - Duration
 * @returns {string} Toast ID
 */
export function showError(message, duration = TOAST_DURATION) {
  return showToast(message, TOAST_TYPES.ERROR, duration);
}

/**
 * Show a warning toast
 * @param {string} message - Message
 * @param {number} duration - Duration
 * @returns {string} Toast ID
 */
export function showWarning(message, duration = TOAST_DURATION) {
  return showToast(message, TOAST_TYPES.WARNING, duration);
}

/**
 * Show an info toast
 * @param {string} message - Message
 * @param {number} duration - Duration
 * @returns {string} Toast ID
 */
export function showInfo(message, duration = TOAST_DURATION) {
  return showToast(message, TOAST_TYPES.INFO, duration);
}

// Export default as an object with all methods
export default {
  show: showToast,
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  remove: removeToast,
  clearAll: clearAllToasts,
};
