/**
 * =====================================================
 * LOGIN PAGE
 * =====================================================
 *
 * Handles user login with form validation and
 * authentication through the FAJAX layer.
 */

import api from "../api/fajax.js";
import state from "../state.js";
import router from "../router.js";
import { showToast } from "../components/toast.js";
import {
  API_ROUTES,
  CLIENT_ROUTES,
  TOAST_TYPES,
  VALIDATION,
  isValidEmail,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "../../shared/constants.js";

/**
 * Render the login page
 * @param {HTMLElement} container - Container element
 */
export function renderLoginPage(container) {
  const template = document.getElementById("template-login");

  if (template) {
    const clone = template.content.cloneNode(true);
    container.innerHTML = "";
    container.appendChild(clone);
  } else {
    container.innerHTML =
      '<div class="auth-container"><p>Login template not found</p></div>';
  }
}

/**
 * Initialize login page functionality
 */
export function initLoginPage() {
  const form = document.getElementById("login-form");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");

  if (!form) return;

  // Setup password visibility toggle
  setupPasswordToggle();

  // Setup form validation on input (real-time with debounce)
  emailInput?.addEventListener("blur", () => validateEmail(emailInput));
  passwordInput?.addEventListener("blur", () =>
    validatePassword(passwordInput),
  );

  // Clear errors on focus
  emailInput?.addEventListener("focus", () => clearError("login-email-error"));
  passwordInput?.addEventListener("focus", () =>
    clearError("login-password-error"),
  );

  // Auto-focus email field for quick entry
  setTimeout(() => emailInput?.focus(), 300);

  // Allow Enter key in password to submit
  passwordInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      form.requestSubmit();
    }
  });

  // Form submission
  form.addEventListener("submit", handleLoginSubmit);
}

/**
 * Handle login form submission
 * @param {Event} event - Submit event
 */
async function handleLoginSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const submitBtn = form.querySelector('button[type="submit"]');

  // Validate all fields
  const isEmailValid = validateEmail(emailInput);
  const isPasswordValid = validatePassword(passwordInput);

  if (!isEmailValid || !isPasswordValid) {
    return;
  }

  // Show loading state
  setButtonLoading(submitBtn, true);

  try {
    // Make login request
    const response = await api.post(API_ROUTES.AUTH.LOGIN, {
      email: emailInput.value.trim(),
      password: passwordInput.value,
    });

    if (response.data?.success) {
      const { user, token, expiresAt } = response.data.data;

      // Update state
      state.setAuth({ user, token, expiresAt });

      // Set token in API client
      api.setToken(token);

      // Show success message
      showToast(SUCCESS_MESSAGES.LOGIN_SUCCESS, TOAST_TYPES.SUCCESS);

      // Navigate to dashboard
      router.navigate(CLIENT_ROUTES.DASHBOARD);
    } else {
      throw new Error(response.data?.error?.message || "Login failed");
    }
  } catch (error) {
    console.error("[Login] Error:", error);

    const message =
      error.data?.error?.message ||
      error.message ||
      ERROR_MESSAGES.INVALID_CREDENTIALS;

    showToast(message, TOAST_TYPES.ERROR);

    // Focus email field on error
    emailInput?.focus();
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

/**
 * Validate email input
 * @param {HTMLInputElement} input - Email input element
 * @returns {boolean} Is valid
 */
function validateEmail(input) {
  const value = input?.value?.trim();
  const errorEl = document.getElementById("login-email-error");

  if (!value) {
    showError(errorEl, "Email is required");
    input?.classList.add("invalid");
    return false;
  }

  if (!isValidEmail(value)) {
    showError(errorEl, ERROR_MESSAGES.INVALID_EMAIL);
    input?.classList.add("invalid");
    return false;
  }

  clearError("login-email-error");
  input?.classList.remove("invalid");
  return true;
}

/**
 * Validate password input
 * @param {HTMLInputElement} input - Password input element
 * @returns {boolean} Is valid
 */
function validatePassword(input) {
  const value = input?.value;
  const errorEl = document.getElementById("login-password-error");

  if (!value) {
    showError(errorEl, "Password is required");
    input?.classList.add("invalid");
    return false;
  }

  if (value.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    showError(errorEl, ERROR_MESSAGES.PASSWORD_TOO_SHORT);
    input?.classList.add("invalid");
    return false;
  }

  clearError("login-password-error");
  input?.classList.remove("invalid");
  return true;
}

/**
 * Setup password visibility toggle
 */
function setupPasswordToggle() {
  const toggleBtns = document.querySelectorAll(".password-toggle");

  toggleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);

      if (input) {
        if (input.type === "password") {
          input.type = "text";
          btn.textContent = "🙈";
        } else {
          input.type = "password";
          btn.textContent = "👁️";
        }
      }
    });
  });
}

/**
 * Show error message
 * @param {HTMLElement} errorEl - Error element
 * @param {string} message - Error message
 */
function showError(errorEl, message) {
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add("visible");
  }
}

/**
 * Clear error message
 * @param {string} errorElId - Error element ID
 */
function clearError(errorElId) {
  const errorEl = document.getElementById(errorElId);
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.classList.remove("visible");
  }
}

/**
 * Set button loading state
 * @param {HTMLButtonElement} button - Button element
 * @param {boolean} isLoading - Loading state
 */
function setButtonLoading(button, isLoading) {
  if (!button) return;

  const textEl = button.querySelector(".btn-text");
  const loaderEl = button.querySelector(".btn-loader");

  button.disabled = isLoading;

  if (textEl) {
    textEl.classList.toggle("hidden", isLoading);
  }
  if (loaderEl) {
    loaderEl.classList.toggle("hidden", !isLoading);
  }
}

export default {
  render: renderLoginPage,
  init: initLoginPage,
};
