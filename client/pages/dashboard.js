/**
 * =====================================================
 * DASHBOARD PAGE
 * =====================================================
 *
 * Main dashboard view showing:
 * - Task statistics
 * - Productivity charts
 * - Upcoming deadlines
 * - Recent activity
 */

import api from "../api/fajax.js";
import state from "../state.js";
import router from "../router.js";
import { showToast } from "../components/toast.js";
import {
  API_ROUTES,
  CLIENT_ROUTES,
  TOAST_TYPES,
  TASK_STATUS,
  formatDate,
  formatRelativeDate,
  getDaysUntilDue,
} from "../../shared/constants.js";

/**
 * Render the dashboard page
 * @param {HTMLElement} container - Container element
 */
export function renderDashboardPage(container) {
  const template = document.getElementById("template-dashboard");

  if (template) {
    const clone = template.content.cloneNode(true);
    container.innerHTML = "";
    container.appendChild(clone);
  } else {
    container.innerHTML =
      '<div class="dashboard-container"><p>Dashboard template not found</p></div>';
  }
}

/**
 * Initialize dashboard page functionality
 */
export function initDashboardPage() {
  // Update greeting
  updateGreeting();

  // Load statistics
  loadDashboardData();

  // Setup quick add button
  const quickAddBtn = document.getElementById("quick-add-task");
  if (quickAddBtn) {
    quickAddBtn.addEventListener("click", () => {
      router.navigate(CLIENT_ROUTES.TASKS);
      // Small delay to allow navigation, then trigger add modal
      setTimeout(() => {
        const addBtn = document.getElementById("add-task-btn");
        addBtn?.click();
      }, 100);
    });
  }
}

/**
 * Update greeting message with user name and date context
 */
function updateGreeting() {
  const greetingEl = document.getElementById("dashboard-greeting");
  const user = state.getUser();

  if (greetingEl && user?.name) {
    const now = new Date();
    const hour = now.getHours();
    let greeting;

    if (hour < 12) {
      greeting = "Good morning";
    } else if (hour < 17) {
      greeting = "Good afternoon";
    } else {
      greeting = "Good evening";
    }

    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const dateStr = now.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });

    greetingEl.innerHTML = `${greeting}, <strong>${user.name}</strong>! Today is ${dayName}, ${dateStr}.`;
  }
}

/**
 * Load dashboard statistics and data
 */
async function loadDashboardData() {
  state.set("stats.loading", true);

  try {
    const response = await api.get(API_ROUTES.TASKS.STATS);

    if (response.data?.success) {
      const { stats, upcomingDeadlines } = response.data.data;

      // Store in state
      state.set("stats.data", stats);

      // Update UI
      updateStatCards(stats);
      updateDonutChart(stats);
      updatePriorityBars(stats);
      updateDeadlinesList(upcomingDeadlines);
      updateRecentActivity(stats.recentlyCompleted);
    }
  } catch (error) {
    console.error("[Dashboard] Error loading stats:", error);
    showToast("Failed to load dashboard data", TOAST_TYPES.ERROR);
  } finally {
    state.set("stats.loading", false);
  }
}

/**
 * Animate a number counter from 0 to target value
 * @param {HTMLElement} el - Element to animate
 * @param {number|string} target - Target value
 * @param {string} suffix - Optional suffix (e.g., '%')
 */
function animateCounter(el, target, suffix = "") {
  if (!el) return;

  const numTarget = parseInt(target) || 0;
  if (numTarget === 0) {
    el.textContent = `0${suffix}`;
    return;
  }

  const duration = 800;
  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * numTarget);

    el.textContent = `${current}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

/**
 * Update statistic cards with animated counters
 * @param {Object} stats - Statistics data
 */
function updateStatCards(stats) {
  // Total tasks
  const totalEl = document.getElementById("stat-total-tasks");
  animateCounter(totalEl, stats.total);

  // Completed tasks
  const completedEl = document.getElementById("stat-completed-tasks");
  animateCounter(completedEl, stats.done);

  // In progress tasks
  const inProgressEl = document.getElementById("stat-in-progress-tasks");
  animateCounter(inProgressEl, stats.inProgress);

  // Productivity score
  const productivityEl = document.getElementById("stat-productivity");
  animateCounter(productivityEl, stats.productivityScore, "%");
}

/**
 * Update donut chart visualization
 * @param {Object} stats - Statistics data
 */
function updateDonutChart(stats) {
  const total = stats.total || 1; // Prevent division by zero
  const circumference = 251.2; // 2 * π * 40 (radius)

  // Calculate percentages
  const todoPercent = (stats.todo / total) * 100;
  const progressPercent = (stats.inProgress / total) * 100;
  const donePercent = (stats.done / total) * 100;

  // Update donut segments (SVG circles)
  const todoSegment = document.querySelector(".donut-todo");
  const progressSegment = document.querySelector(".donut-progress");
  const doneSegment = document.querySelector(".donut-done");

  if (todoSegment) {
    const todoLength = (todoPercent / 100) * circumference;
    todoSegment.style.strokeDasharray = `${todoLength} ${circumference}`;
    todoSegment.style.strokeDashoffset = "0";
  }

  if (progressSegment) {
    const progressLength = (progressPercent / 100) * circumference;
    const todoOffset = (todoPercent / 100) * circumference;
    progressSegment.style.strokeDasharray = `${progressLength} ${circumference}`;
    progressSegment.style.strokeDashoffset = `-${todoOffset}`;
  }

  if (doneSegment) {
    const doneLength = (donePercent / 100) * circumference;
    const prevOffset = ((todoPercent + progressPercent) / 100) * circumference;
    doneSegment.style.strokeDasharray = `${doneLength} ${circumference}`;
    doneSegment.style.strokeDashoffset = `-${prevOffset}`;
  }

  // Update center total
  const totalEl = document.getElementById("donut-total");
  if (totalEl) totalEl.textContent = stats.total;

  // Update legend values
  const legendTodo = document.getElementById("legend-todo");
  const legendProgress = document.getElementById("legend-progress");
  const legendDone = document.getElementById("legend-done");

  if (legendTodo) legendTodo.textContent = stats.todo;
  if (legendProgress) legendProgress.textContent = stats.inProgress;
  if (legendDone) legendDone.textContent = stats.done;
}

/**
 * Update priority distribution bars
 * @param {Object} stats - Statistics data
 */
function updatePriorityBars(stats) {
  const { byPriority } = stats;
  const total = stats.total || 1;

  // High priority
  const highCount = document.getElementById("priority-high");
  const highBar = document.getElementById("priority-high-bar");
  if (highCount) highCount.textContent = byPriority.high;
  if (highBar) highBar.style.width = `${(byPriority.high / total) * 100}%`;

  // Medium priority
  const mediumCount = document.getElementById("priority-medium");
  const mediumBar = document.getElementById("priority-medium-bar");
  if (mediumCount) mediumCount.textContent = byPriority.medium;
  if (mediumBar)
    mediumBar.style.width = `${(byPriority.medium / total) * 100}%`;

  // Low priority
  const lowCount = document.getElementById("priority-low");
  const lowBar = document.getElementById("priority-low-bar");
  if (lowCount) lowCount.textContent = byPriority.low;
  if (lowBar) lowBar.style.width = `${(byPriority.low / total) * 100}%`;
}

/**
 * Update upcoming deadlines list
 * @param {Array} deadlines - Array of tasks with upcoming deadlines
 */
function updateDeadlinesList(deadlines) {
  const listEl = document.getElementById("deadlines-list");
  if (!listEl) return;

  if (!deadlines || deadlines.length === 0) {
    listEl.innerHTML = `
            <div class="empty-state">
                <p>No upcoming deadlines</p>
            </div>
        `;
    return;
  }

  listEl.innerHTML = deadlines
    .map((task) => {
      const daysUntil = getDaysUntilDue(task.dueDate);
      let urgencyClass = "due-normal";
      let urgencyText = formatDate(task.dueDate);

      if (daysUntil < 0) {
        urgencyClass = "due-overdue";
        urgencyText = `Overdue by ${Math.abs(daysUntil)}d`;
      } else if (daysUntil === 0) {
        urgencyClass = "due-today";
        urgencyText = "Due today";
      } else if (daysUntil === 1) {
        urgencyClass = "due-soon";
        urgencyText = "Due tomorrow";
      } else if (daysUntil <= 3) {
        urgencyClass = "due-soon";
        urgencyText = `Due in ${daysUntil} days`;
      }

      const statusClass =
        task.status === "done"
          ? "done"
          : task.status === "in-progress"
            ? "progress"
            : "todo";

      return `
            <div class="deadline-item">
                <span class="deadline-status ${statusClass}"></span>
                <div class="deadline-info">
                    <span class="deadline-title">${escapeHtml(task.title)}</span>
                    <span class="deadline-date ${urgencyClass}">${urgencyText}</span>
                </div>
                <span class="priority-badge ${task.priority}">${task.priority}</span>
            </div>
        `;
    })
    .join("");
}

/**
 * Update recent activity list
 * @param {Array} recentTasks - Recently completed tasks
 */
function updateRecentActivity(recentTasks) {
  const listEl = document.getElementById("activity-list");
  if (!listEl) return;

  if (!recentTasks || recentTasks.length === 0) {
    listEl.innerHTML = `
            <div class="empty-state">
                <p>No recent activity</p>
            </div>
        `;
    return;
  }

  listEl.innerHTML = recentTasks
    .map(
      (task) => `
        <div class="activity-item">
            <span class="activity-icon completed">✅</span>
            <div class="activity-content">
                <p class="activity-text">Completed <strong>${escapeHtml(task.title)}</strong></p>
                <span class="activity-time">${formatRelativeDate(task.completedAt)}</span>
            </div>
        </div>
    `,
    )
    .join("");
}

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export default {
  render: renderDashboardPage,
  init: initDashboardPage,
};
