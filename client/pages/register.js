/**
 * =====================================================
 * REGISTER PAGE
 * =====================================================
 *
 * Handles user registration with form validation,
 * password strength indicator, and account creation.
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
 * Render the register page
 * @param {HTMLElement} container - Container element
 */
export function renderRegisterPage(container) {
  const template = document.getElementById("template-register");

  if (template) {
    const clone = template.content.cloneNode(true);
    container.innerHTML = "";
    container.appendChild(clone);
  } else {
    container.innerHTML =
      '<div class="auth-container"><p>Register template not found</p></div>';
  }
}

/**
 * Initialize register page functionality
 */
export function initRegisterPage() {
  const form = document.getElementById("register-form");
  const nameInput = document.getElementById("register-name");
  const emailInput = document.getElementById("register-email");
  const passwordInput = document.getElementById("register-password");
  const confirmInput = document.getElementById("register-confirm");

  if (!form) return;

  // Setup password visibility toggle
  setupPasswordToggle();

  // Setup password strength indicator
  passwordInput?.addEventListener("input", updatePasswordStrength);

  // Setup form validation on blur
  nameInput?.addEventListener("blur", () => validateName(nameInput));
  emailInput?.addEventListener("blur", () => validateEmail(emailInput));
  passwordInput?.addEventListener("blur", () =>
    validatePassword(passwordInput),
  );
  confirmInput?.addEventListener("blur", () =>
    validateConfirmPassword(passwordInput, confirmInput),
  );

  // Clear errors on focus
  nameInput?.addEventListener("focus", () => clearError("register-name-error"));
  emailInput?.addEventListener("focus", () =>
    clearError("register-email-error"),
  );
  passwordInput?.addEventListener("focus", () =>
    clearError("register-password-error"),
  );
  confirmInput?.addEventListener("focus", () =>
    clearError("register-confirm-error"),
  );

  // Form submission
  form.addEventListener("submit", handleRegisterSubmit);
}

/**
 * Handle register form submission
 * @param {Event} event - Submit event
 */
async function handleRegisterSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const nameInput = document.getElementById("register-name");
  const emailInput = document.getElementById("register-email");
  const passwordInput = document.getElementById("register-password");
  const confirmInput = document.getElementById("register-confirm");
  const submitBtn = form.querySelector('button[type="submit"]');

  // Validate all fields
  const isNameValid = validateName(nameInput);
  const isEmailValid = validateEmail(emailInput);
  const isPasswordValid = validatePassword(passwordInput);
  const isConfirmValid = validateConfirmPassword(passwordInput, confirmInput);

  if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmValid) {
    return;
  }

  // Show loading state
  setButtonLoading(submitBtn, true);

  try {
    // Make registration request
    const response = await api.post(API_ROUTES.AUTH.REGISTER, {
      name: nameInput.value.trim(),
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
      showToast(SUCCESS_MESSAGES.REGISTER_SUCCESS, TOAST_TYPES.SUCCESS);

      // Navigate to dashboard
      router.navigate(CLIENT_ROUTES.DASHBOARD);
    } else {
      throw new Error(response.data?.error?.message || "Registration failed");
    }
  } catch (error) {
    console.error("[Register] Error:", error);

    const message =
      error.data?.error?.message ||
      error.message ||
      ERROR_MESSAGES.UNKNOWN_ERROR;

    showToast(message, TOAST_TYPES.ERROR);

    // If email exists error, focus email field
    if (message.includes("email")) {
      emailInput?.focus();
    }
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

/**
 * Validate name input
 * @param {HTMLInputElement} input - Name input element
 * @returns {boolean} Is valid
 */
function validateName(input) {
  const value = input?.value?.trim();
  const errorEl = document.getElementById("register-name-error");

  if (!value) {
    showError(errorEl, ERROR_MESSAGES.NAME_REQUIRED);
    input?.classList.add("invalid");
    return false;
  }

  if (value.length < VALIDATION.NAME_MIN_LENGTH) {
    showError(
      errorEl,
      `Name must be at least ${VALIDATION.NAME_MIN_LENGTH} characters`,
    );
    input?.classList.add("invalid");
    return false;
  }

  if (value.length > VALIDATION.NAME_MAX_LENGTH) {
    showError(
      errorEl,
      `Name must be less than ${VALIDATION.NAME_MAX_LENGTH} characters`,
    );
    input?.classList.add("invalid");
    return false;
  }

  clearError("register-name-error");
  input?.classList.remove("invalid");
  return true;
}

/**
 * Validate email input
 * @param {HTMLInputElement} input - Email input element
 * @returns {boolean} Is valid
 */
function validateEmail(input) {
  const value = input?.value?.trim();
  const errorEl = document.getElementById("register-email-error");

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

  clearError("register-email-error");
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
  const errorEl = document.getElementById("register-password-error");

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

  clearError("register-password-error");
  input?.classList.remove("invalid");
  return true;
}

/**
 * Validate confirm password input
 * @param {HTMLInputElement} passwordInput - Password input
 * @param {HTMLInputElement} confirmInput - Confirm input
 * @returns {boolean} Is valid
 */
function validateConfirmPassword(passwordInput, confirmInput) {
  const password = passwordInput?.value;
  const confirm = confirmInput?.value;
  const errorEl = document.getElementById("register-confirm-error");

  if (!confirm) {
    showError(errorEl, "Please confirm your password");
    confirmInput?.classList.add("invalid");
    return false;
  }

  if (password !== confirm) {
    showError(errorEl, ERROR_MESSAGES.PASSWORD_MISMATCH);
    confirmInput?.classList.add("invalid");
    return false;
  }

  clearError("register-confirm-error");
  confirmInput?.classList.remove("invalid");
  return true;
}

/**
 * Update password strength indicator
 * @param {Event} event - Input event
 */
function updatePasswordStrength(event) {
  const password = event.target.value;
  const strengthFill = document.getElementById("password-strength-fill");
  const strengthText = document.getElementById("password-strength-text");

  if (!strengthFill || !strengthText) return;

  const strength = calculatePasswordStrength(password);

  // Update fill width and color
  strengthFill.style.width = `${strength.score}%`;
  strengthFill.className = `strength-fill strength-${strength.level}`;

  // Update text
  strengthText.textContent = strength.label;
  strengthText.className = `strength-text strength-${strength.level}`;
}

/**
 * Calculate password strength
 * @param {string} password - Password to analyze
 * @returns {Object} { score, level, label }
 */
function calculatePasswordStrength(password) {
  if (!password) {
    return { score: 0, level: "none", label: "Password strength" };
  }

  let score = 0;

  // Length checks
  if (password.length >= 6) score += 20;
  if (password.length >= 8) score += 15;
  if (password.length >= 12) score += 15;

  // Character variety checks
  if (/[a-z]/.test(password)) score += 10; // Lowercase
  if (/[A-Z]/.test(password)) score += 15; // Uppercase
  if (/[0-9]/.test(password)) score += 15; // Numbers
  if (/[^a-zA-Z0-9]/.test(password)) score += 20; // Special chars

  // Determine level and label
  let level, label;

  if (score < 30) {
    level = "weak";
    label = "Weak";
  } else if (score < 50) {
    level = "fair";
    label = "Fair";
  } else if (score < 70) {
    level = "good";
    label = "Good";
  } else {
    level = "strong";
    label = "Strong";
  }

  return { score: Math.min(score, 100), level, label };
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
  render: renderRegisterPage,
  init: initRegisterPage,
};
