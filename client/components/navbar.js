/**
 * =====================================================
 * NAVBAR COMPONENT
 * =====================================================
 *
 * Navigation bar component that displays:
 * - Brand logo
 * - Navigation links
 * - User info and logout button
 */

import state from "../state.js";

/**
 * Get navbar container element
 * @returns {HTMLElement}
 */
function getNavbarContainer() {
  return document.getElementById("navbar-container");
}

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
                <nav class="navbar-menu">
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
                    <button class="btn btn-ghost logout-btn" id="logout-btn">
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        `;
  }

  // Update user info
  updateUserInfo();

  // Mark active link
  updateActiveLink();

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
}

/**
 * Update user information in navbar
 */
export function updateUserInfo() {
  const user = state.getUser();

  if (!user) return;

  const avatarEl = document.getElementById("user-avatar");
  const nameEl = document.getElementById("user-name");

  if (avatarEl && user.avatar) {
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
