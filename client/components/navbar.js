/**
 * =====================================================
 * NAVBAR COMPONENT
 * =====================================================
 *
 * Navigation bar component that displays:
 * - Brand logo
 * - Navigation links with active indicator
 * - User info and logout button
 * - Mobile hamburger menu
 * - Scroll shadow effect
 */

import state from "../state.js";

/**
 * Get navbar container element
 * @returns {HTMLElement}
 */
function getNavbarContainer() {
  return document.getElementById("navbar-container");
}

// Track scroll handler for cleanup
let _scrollHandler = null;

/**
 * Render the navbar component
 */
export function renderNavbar() {
  const container = getNavbarContainer();
  if (!container) return;

  const template = document.getElementById("template-navbar");

  if (template) {
    const clone = template.content.cloneNode(true);
    container.innerHTML = "";
    container.appendChild(clone);
  } else {
    // Fallback HTML
    container.innerHTML = `
            <div class="navbar">
                <div class="navbar-brand">
                    <a href="#/dashboard" class="brand-link">
                        <span class="brand-icon">✓</span>
                        <span class="brand-text">TaskMaster</span>
                    </a>
                </div>
                <button class="mobile-menu-toggle" id="mobile-menu-toggle" aria-label="Toggle navigation menu">
                    <span class="hamburger-line"></span>
                    <span class="hamburger-line"></span>
                    <span class="hamburger-line"></span>
                </button>
                <nav class="navbar-menu" id="navbar-menu">
                    <a href="#/dashboard" class="nav-link" data-route="dashboard">
                        <span class="nav-icon">📊</span>
                        <span>Dashboard</span>
                    </a>
                    <a href="#/tasks" class="nav-link" data-route="tasks">
                        <span class="nav-icon">📋</span>
                        <span>Tasks</span>
                    </a>
                </nav>
                <div class="navbar-user">
                    <div class="user-info">
                        <span class="user-avatar" id="user-avatar">U</span>
                        <span class="user-name" id="user-name">User</span>
                    </div>
                    <button class="btn btn-ghost logout-btn" id="logout-btn" aria-label="Log out">
                        <span class="logout-icon">←</span>
                        <span class="logout-text">Logout</span>
                    </button>
                </div>
            </div>
        `;
  }

  // Update user info
  updateUserInfo();

  // Mark active link
  updateActiveLink();

  // Setup mobile menu
  setupMobileMenu();

  // Setup scroll shadow
  setupScrollShadow();

  // Show navbar
  container.classList.remove("hidden");
}

/**
 * Hide the navbar
 */
export function hideNavbar() {
  const container = getNavbarContainer();
  if (container) {
    container.innerHTML = "";
    container.classList.add("hidden");
  }
  // Cleanup scroll handler
  if (_scrollHandler) {
    window.removeEventListener("scroll", _scrollHandler);
    _scrollHandler = null;
  }
}

/**
 * Update user information in navbar
 */
export function updateUserInfo() {
  const user = state.getUser();

  if (!user) return;

  const avatarEl = document.getElementById("user-avatar");
  const nameEl = document.getElementById("user-name");

  if (avatarEl && user.name) {
    // Generate initials from name
    const initials = user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    avatarEl.textContent = initials;
    avatarEl.title = user.name;
  } else if (avatarEl && user.avatar) {
    avatarEl.textContent = user.avatar;
  }

  if (nameEl && user.name) {
    nameEl.textContent = user.name;
  }
}

/**
 * Update active navigation link
 */
export function updateActiveLink() {
  const currentRoute = state.get("ui.currentRoute");
  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach((link) => {
    const route = link.getAttribute("data-route");

    if (route && currentRoute?.includes(route)) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

/**
 * Setup mobile hamburger menu
 */
function setupMobileMenu() {
  const toggleBtn = document.getElementById("mobile-menu-toggle");
  const menu = document.getElementById("navbar-menu");

  if (!toggleBtn || !menu) return;

  toggleBtn.addEventListener("click", () => {
    toggleBtn.classList.toggle("active");
    menu.classList.toggle("mobile-open");
  });

  // Close mobile menu when a nav link is clicked
  menu.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      toggleBtn.classList.remove("active");
      menu.classList.remove("mobile-open");
    });
  });

  // Close mobile menu on outside click
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".navbar")) {
      toggleBtn.classList.remove("active");
      menu.classList.remove("mobile-open");
    }
  });
}

/**
 * Setup scroll shadow effect on navbar
 */
function setupScrollShadow() {
  const navbar = document.querySelector(".navbar");
  if (!navbar) return;

  // Remove old handler
  if (_scrollHandler) {
    window.removeEventListener("scroll", _scrollHandler);
  }

  _scrollHandler = () => {
    if (window.scrollY > 10) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  };

  window.addEventListener("scroll", _scrollHandler, { passive: true });

  // Check initial state
  _scrollHandler();
}

// Subscribe to user changes
state.watch("auth.user", () => {
  updateUserInfo();
});

// Subscribe to route changes
state.watch("ui.currentRoute", () => {
  updateActiveLink();
});

export default {
  render: renderNavbar,
  hide: hideNavbar,
  updateUserInfo,
  updateActiveLink,
};
