/**
 * =====================================================
 * TASKS PAGE - Kanban Board
 * =====================================================
 *
 * Main task management view with:
 * - Kanban board (columns for each status)
 * - List view alternative
 * - Task CRUD operations
 * - Filtering and sorting
 */

import api from "../api/fajax.js";
import state from "../state.js";
import { showToast, showSuccess, showError } from "../components/toast.js";
import {
  createTaskCard,
  createTaskRow,
  getNextStatus,
  getPrevStatus,
} from "../components/taskCard.js";
import {
  API_ROUTES,
  TOAST_TYPES,
  TASK_STATUS,
  TASK_PRIORITY,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
} from "../../shared/constants.js";

// Current view mode
let currentView = "board";

// Current filter/sort settings
let filterPriority = "";
let sortBy = "created";
let searchQuery = "";

// Task being edited (null for create)
let editingTaskId = null;

/**
 * Render the tasks page
 * @param {HTMLElement} container - Container element
 */
export function renderTasksPage(container) {
  const template = document.getElementById("template-tasks");

  if (template) {
    const clone = template.content.cloneNode(true);
    container.innerHTML = "";
    container.appendChild(clone);
  } else {
    container.innerHTML =
      '<div class="tasks-container"><p>Tasks template not found</p></div>';
  }
}

/**
 * Initialize tasks page functionality
 */
export function initTasksPage() {
  // Reset filter/search state for clean page load
  filterPriority = "";
  sortBy = "created";
  searchQuery = "";

  // Load tasks
  loadTasks();

  // Setup view toggle
  setupViewToggle();

  // Setup filter dropdown
  setupFilters();

  // Setup search
  setupSearch();

  // Setup add task button
  setupAddTaskButton();

  // Setup column quick-add buttons
  setupColumnAddButtons();

  // Setup modal
  setupTaskModal();

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();
}

/**
 * Setup search input
 */
function setupSearch() {
  const searchInput = document.getElementById("task-search");
  if (!searchInput) return;

  let debounceTimer;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderTasks(state.getTasks());
    }, 200);
  });

  // Clear search on Escape
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      searchInput.value = "";
      searchQuery = "";
      renderTasks(state.getTasks());
    }
  });
}

/**
 * Setup keyboard shortcuts for the tasks page
 */
function setupKeyboardShortcuts() {
  const handler = (e) => {
    // Don't trigger if typing in an input
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.tagName === "SELECT"
    ) {
      return;
    }

    // N - New task
    if (e.key === "n" || e.key === "N") {
      e.preventDefault();
      openTaskModal();
    }

    // / - Focus search
    if (e.key === "/") {
      e.preventDefault();
      const searchInput = document.getElementById("task-search");
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }

    // Escape - Close any open modal
    if (e.key === "Escape") {
      closeTaskModal();
      closeConfirmModal();
      // Also close keyboard shortcuts hint
      const hint = document.getElementById("shortcuts-hint");
      if (hint) hint.classList.add("hidden");
    }

    // ? - Toggle keyboard shortcuts hint
    if (e.key === "?") {
      const hint = document.getElementById("shortcuts-hint");
      if (hint) {
        hint.classList.toggle("hidden");
        const closeBtn = document.getElementById("shortcuts-close");
        closeBtn?.addEventListener("click", () => hint.classList.add("hidden"));
      }
    }
  };

  document.addEventListener("keydown", handler);

  // Store handler for cleanup (in case of SPA re-init, avoids stacking)
  if (window.__tasksKeyboardHandler) {
    document.removeEventListener("keydown", window.__tasksKeyboardHandler);
  }
  window.__tasksKeyboardHandler = handler;
}

/**
 * Load tasks from API
 */
async function loadTasks() {
  state.setTasksLoading(true);

  try {
    const response = await api.get(API_ROUTES.TASKS.BASE);

    if (response.data?.success) {
      const tasks = response.data.data.tasks;
      state.setTasks(tasks);
      renderTasks(tasks);
    }
  } catch (error) {
    console.error("[Tasks] Error loading tasks:", error);
    showError("Failed to load tasks");
  } finally {
    state.setTasksLoading(false);
  }
}

/**
 * Render tasks based on current view mode
 * @param {Array} tasks - Tasks to render
 */
function renderTasks(tasks) {
  // Apply filters
  let filteredTasks = [...tasks];

  if (filterPriority) {
    filteredTasks = filteredTasks.filter((t) => t.priority === filterPriority);
  }

  if (searchQuery) {
    filteredTasks = filteredTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(searchQuery) ||
        (t.description || "").toLowerCase().includes(searchQuery),
    );
  }

  // Apply sorting
  filteredTasks = sortTasks(filteredTasks, sortBy);

  // Check for empty state
  const emptyState = document.getElementById("empty-tasks");
  const boardEl = document.getElementById("kanban-board");
  const listEl = document.getElementById("tasks-list");

  // Truly empty (no tasks at all)
  if (tasks.length === 0) {
    emptyState?.classList.remove("hidden");
    boardEl?.classList.add("hidden");
    listEl?.classList.add("hidden");

    // Setup empty state button
    const emptyAddBtn = document.getElementById("empty-add-task");
    emptyAddBtn?.addEventListener("click", () => openTaskModal());
    return;
  }

  emptyState?.classList.add("hidden");

  // Filter / search yielded no results
  if (filteredTasks.length === 0) {
    const noResultsId = "no-filter-results";
    let noResults = document.getElementById(noResultsId);
    if (!noResults) {
      noResults = document.createElement("div");
      noResults.id = noResultsId;
      noResults.className = "empty-state-large";
      noResults.innerHTML = `
        <div class="empty-illustration"><div class="empty-icon-wrapper"><span>🔍</span></div></div>
        <h2>No matching tasks</h2>
        <p>Try adjusting your search or filter criteria.</p>
      `;
      boardEl?.parentNode?.insertBefore(noResults, boardEl);
    }
    noResults.classList.remove("hidden");
    boardEl?.classList.add("hidden");
    listEl?.classList.add("hidden");
    return;
  }

  // Hide no-results if visible
  document.getElementById("no-filter-results")?.classList.add("hidden");

  if (currentView === "board") {
    boardEl?.classList.remove("hidden");
    listEl?.classList.add("hidden");
    renderKanbanBoard(filteredTasks);
  } else {
    boardEl?.classList.add("hidden");
    listEl?.classList.remove("hidden");
    renderTasksList(filteredTasks);
  }
}

/**
 * Render Kanban board view
 * @param {Array} tasks - Filtered tasks
 */
function renderKanbanBoard(tasks) {
  // Group tasks by status
  const tasksByStatus = {
    [TASK_STATUS.TODO]: tasks.filter((t) => t.status === TASK_STATUS.TODO),
    [TASK_STATUS.IN_PROGRESS]: tasks.filter(
      (t) => t.status === TASK_STATUS.IN_PROGRESS,
    ),
    [TASK_STATUS.DONE]: tasks.filter((t) => t.status === TASK_STATUS.DONE),
  };

  // Render each column
  Object.entries(tasksByStatus).forEach(([status, statusTasks]) => {
    const columnId =
      status === TASK_STATUS.IN_PROGRESS
        ? "column-in-progress"
        : `column-${status}`;
    const column = document.getElementById(columnId);
    const countEl = document.getElementById(
      `count-${status === TASK_STATUS.IN_PROGRESS ? "in-progress" : status}`,
    );

    if (column) {
      column.innerHTML = "";

      if (statusTasks.length === 0) {
        const emptyIcons = {
          [TASK_STATUS.TODO]: "📝",
          [TASK_STATUS.IN_PROGRESS]: "⏳",
          [TASK_STATUS.DONE]: "🎉",
        };
        const emptyTexts = {
          [TASK_STATUS.TODO]: "No tasks to do",
          [TASK_STATUS.IN_PROGRESS]: "Nothing in progress",
          [TASK_STATUS.DONE]: "No completed tasks yet",
        };
        column.innerHTML = `
                    <div class="column-empty">
                        <div>
                            <span style="font-size: 1.5rem; display: block; margin-bottom: 4px;">${emptyIcons[status] || "📋"}</span>
                            <p>${emptyTexts[status] || "No tasks"}</p>
                        </div>
                    </div>
                `;
      } else {
        statusTasks.forEach((task) => {
          const card = createTaskCard(task, {
            onEdit: handleEditTask,
            onDelete: handleDeleteTask,
            onStatusChange: handleStatusChange,
          });
          column.appendChild(card);
        });
      }
    }

    if (countEl) {
      countEl.textContent = statusTasks.length;
    }
  });
}

/**
 * Render list view
 * @param {Array} tasks - Filtered tasks
 */
function renderTasksList(tasks) {
  const tbody = document.getElementById("tasks-table-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (tasks.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-cell">No tasks found</td>
            </tr>
        `;
    return;
  }

  tasks.forEach((task) => {
    const row = createTaskRow(task, {
      onEdit: handleEditTask,
      onDelete: handleDeleteTask,
    });
    tbody.appendChild(row);
  });
}

/**
 * Sort tasks array
 * @param {Array} tasks - Tasks to sort
 * @param {string} sortBy - Sort field
 * @returns {Array} Sorted tasks
 */
function sortTasks(tasks, sortBy) {
  const sorted = [...tasks];
  const priorityOrder = { high: 3, medium: 2, low: 1 };

  sorted.sort((a, b) => {
    switch (sortBy) {
      case "priority":
        return (
          (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
        );
      case "dueDate":
        const dateA = a.dueDate ? new Date(a.dueDate) : new Date("9999-12-31");
        const dateB = b.dueDate ? new Date(b.dueDate) : new Date("9999-12-31");
        return dateA - dateB;
      case "title":
        return a.title.localeCompare(b.title);
      case "created":
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return sorted;
}

/**
 * Setup view toggle buttons
 */
function setupViewToggle() {
  const viewBtns = document.querySelectorAll(".view-btn");

  viewBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.getAttribute("data-view");

      // Update active button
      viewBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Change view
      currentView = view;
      renderTasks(state.getTasks());
    });
  });
}

/**
 * Setup filter dropdown
 */
function setupFilters() {
  const filterBtn = document.querySelector(".filter-btn");
  const filterMenu = document.querySelector(".filter-menu");
  const prioritySelect = document.getElementById("filter-priority");
  const sortSelect = document.getElementById("sort-by");

  // Toggle dropdown
  filterBtn?.addEventListener("click", () => {
    filterMenu?.classList.toggle("hidden");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".filter-dropdown")) {
      filterMenu?.classList.add("hidden");
    }
  });

  // Priority filter
  prioritySelect?.addEventListener("change", (e) => {
    filterPriority = e.target.value;
    renderTasks(state.getTasks());
  });

  // Sort selection
  sortSelect?.addEventListener("change", (e) => {
    sortBy = e.target.value;
    renderTasks(state.getTasks());
  });
}

/**
 * Setup per-column add task buttons
 */
function setupColumnAddButtons() {
  const columnBtns = document.querySelectorAll(".column-add-btn");
  columnBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const status = btn.getAttribute("data-status");
      openTaskModal();
      // Pre-select the status for this column after modal opens
      setTimeout(() => {
        const statusSelect = document.getElementById("task-status");
        if (statusSelect && status) {
          statusSelect.value = status;
        }
      }, 50);
    });
  });
}

/**
 * Setup add task button
 */
function setupAddTaskButton() {
  const addBtn = document.getElementById("add-task-btn");
  addBtn?.addEventListener("click", () => openTaskModal());
}

/**
 * Setup task modal functionality
 */
function setupTaskModal() {
  const form = document.getElementById("task-form");
  const descInput = document.getElementById("task-description");
  const descCount = document.getElementById("desc-count");

  // Character counter for description
  descInput?.addEventListener("input", () => {
    if (descCount) {
      descCount.textContent = descInput.value.length;
    }
  });

  // Form submission
  form?.addEventListener("submit", handleTaskFormSubmit);

  // Modal close buttons
  document
    .getElementById("modal-close")
    ?.addEventListener("click", closeTaskModal);
  document
    .getElementById("modal-cancel")
    ?.addEventListener("click", closeTaskModal);

  // Close on overlay click
  document.getElementById("task-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "task-modal") {
      closeTaskModal();
    }
  });

  // Setup delete confirmation modal
  setupDeleteConfirmModal();
}

/**
 * Setup delete confirmation modal
 */
function setupDeleteConfirmModal() {
  document
    .getElementById("confirm-close")
    ?.addEventListener("click", closeConfirmModal);
  document
    .getElementById("confirm-cancel")
    ?.addEventListener("click", closeConfirmModal);

  document.getElementById("confirm-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "confirm-modal") {
      closeConfirmModal();
    }
  });
}

/**
 * Open task modal (for create or edit)
 * @param {Object} task - Task to edit (null for create)
 */
function openTaskModal(task = null) {
  const modal = document.getElementById("task-modal");
  const modalContainer = document.querySelector("#view-container");

  // Get or create modal from template
  let modalEl = document.getElementById("task-modal");

  if (!modalEl) {
    const template = document.getElementById("template-task-modal");
    if (template) {
      const clone = template.content.cloneNode(true);
      modalContainer?.appendChild(clone);
      modalEl = document.getElementById("task-modal");
      setupTaskModal();
    }
  }

  if (!modalEl) return;

  // Reset form
  const form = document.getElementById("task-form");
  form?.reset();

  // Set editing state
  editingTaskId = task?.id || null;

  // Update modal title
  const title = document.getElementById("modal-title");
  const submitBtn = document.getElementById("modal-submit");
  const submitText = submitBtn?.querySelector(".btn-text");

  if (title) {
    title.textContent = task ? "Edit Task" : "Create New Task";
  }
  if (submitText) {
    submitText.textContent = task ? "Save Changes" : "Create Task";
  }

  // Populate form if editing
  if (task) {
    document.getElementById("task-title").value = task.title;
    document.getElementById("task-description").value = task.description || "";
    document.getElementById("task-priority").value = task.priority;
    document.getElementById("task-status").value = task.status;
    document.getElementById("task-due-date").value =
      task.dueDate?.split("T")[0] || "";

    // Update character count
    const descCount = document.getElementById("desc-count");
    if (descCount) {
      descCount.textContent = (task.description || "").length;
    }
  }

  // Show modal
  modalEl.classList.add("visible");

  // Focus title input
  document.getElementById("task-title")?.focus();
}

/**
 * Close task modal
 */
function closeTaskModal() {
  const modal = document.getElementById("task-modal");
  modal?.classList.remove("visible");
  editingTaskId = null;
}

/**
 * Handle task form submission
 * @param {Event} event - Submit event
 */
async function handleTaskFormSubmit(event) {
  event.preventDefault();

  const submitBtn = document.getElementById("modal-submit");
  const title = document.getElementById("task-title").value.trim();
  const description = document.getElementById("task-description").value.trim();
  const priority = document.getElementById("task-priority").value;
  const status = document.getElementById("task-status").value;
  const dueDate = document.getElementById("task-due-date").value;

  // Validate
  if (!title) {
    showError("Task title is required");
    document.getElementById("task-title")?.focus();
    return;
  }

  // Show loading
  setButtonLoading(submitBtn, true);

  const taskData = {
    title,
    description,
    priority,
    status,
    dueDate: dueDate || null,
  };

  try {
    let response;

    if (editingTaskId) {
      // Update existing task
      response = await api.put(API_ROUTES.TASKS.BY_ID(editingTaskId), taskData);

      if (response.data?.success) {
        state.updateTask(editingTaskId, response.data.data.task);
        showSuccess(SUCCESS_MESSAGES.TASK_UPDATED);
      }
    } else {
      // Create new task
      response = await api.post(API_ROUTES.TASKS.BASE, taskData);

      if (response.data?.success) {
        state.addTask(response.data.data.task);
        showSuccess(SUCCESS_MESSAGES.TASK_CREATED);
      }
    }

    // Close modal and refresh
    closeTaskModal();
    renderTasks(state.getTasks());
  } catch (error) {
    console.error("[Tasks] Error saving task:", error);
    showError(error.data?.error?.message || "Failed to save task");
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

/**
 * Handle edit task action
 * @param {Object} task - Task to edit
 */
function handleEditTask(task) {
  openTaskModal(task);
}

// Store task to delete
let taskToDelete = null;

/**
 * Handle delete task action
 * @param {Object} task - Task to delete
 */
function handleDeleteTask(task) {
  taskToDelete = task;
  openConfirmModal();
}

/**
 * Open delete confirmation modal
 */
function openConfirmModal() {
  const modal = document.getElementById("confirm-modal");
  const container = document.querySelector("#view-container");

  // Get or create modal from template
  let modalEl = modal;

  if (!modalEl) {
    const template = document.getElementById("template-confirm-modal");
    if (template) {
      const clone = template.content.cloneNode(true);
      container?.appendChild(clone);
      modalEl = document.getElementById("confirm-modal");
      setupDeleteConfirmModal();
    }
  }

  if (!modalEl) return;

  // Setup delete button handler
  const deleteBtn = document.getElementById("confirm-delete");
  deleteBtn?.removeEventListener("click", executeDelete);
  deleteBtn?.addEventListener("click", executeDelete);

  modalEl.classList.add("visible");
}

/**
 * Close delete confirmation modal
 */
function closeConfirmModal() {
  const modal = document.getElementById("confirm-modal");
  modal?.classList.remove("visible");
  taskToDelete = null;
}

/**
 * Execute task deletion
 */
async function executeDelete() {
  if (!taskToDelete) return;

  const deleteBtn = document.getElementById("confirm-delete");
  setButtonLoading(deleteBtn, true);

  try {
    const response = await api.delete(API_ROUTES.TASKS.BY_ID(taskToDelete.id));

    if (response.data?.success) {
      state.removeTask(taskToDelete.id);
      showSuccess(SUCCESS_MESSAGES.TASK_DELETED);
      renderTasks(state.getTasks());
    }
  } catch (error) {
    console.error("[Tasks] Error deleting task:", error);
    showError(error.data?.error?.message || ERROR_MESSAGES.TASK_DELETE_FAILED);
  } finally {
    setButtonLoading(deleteBtn, false);
    closeConfirmModal();
  }
}

/**
 * Handle status change (from task card buttons)
 * @param {string} taskId - Task ID
 * @param {string} newStatus - New status
 */
async function handleStatusChange(taskId, newStatus) {
  try {
    const response = await api.put(API_ROUTES.TASKS.BY_ID(taskId), {
      status: newStatus,
    });

    if (response.data?.success) {
      state.updateTask(taskId, response.data.data.task);
      showSuccess(SUCCESS_MESSAGES.TASK_STATUS_UPDATED);
      renderTasks(state.getTasks());
    }
  } catch (error) {
    console.error("[Tasks] Error updating status:", error);
    showError(error.data?.error?.message || ERROR_MESSAGES.TASK_UPDATE_FAILED);
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
  render: renderTasksPage,
  init: initTasksPage,
};
