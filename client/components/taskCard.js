/**
 * =====================================================
 * TASK CARD COMPONENT
 * =====================================================
 *
 * Reusable task card component for displaying tasks
 * in both Kanban board and list views.
 */

import {
  TASK_STATUS,
  TASK_PRIORITY,
  STATUS_ORDER,
  formatDate,
  getDaysUntilDue,
} from "../../shared/constants.js";

/**
 * Get priority class for styling
 * @param {string} priority - Task priority
 * @returns {string} CSS class
 */
function getPriorityClass(priority) {
  const classes = {
    [TASK_PRIORITY.HIGH]: "priority-high",
    [TASK_PRIORITY.MEDIUM]: "priority-medium",
    [TASK_PRIORITY.LOW]: "priority-low",
  };
  return classes[priority] || classes[TASK_PRIORITY.MEDIUM];
}

/**
 * Get due date display info
 * @param {string} dueDate - Due date string
 * @param {string} status - Task status
 * @returns {Object} { text, class }
 */
function getDueDateInfo(dueDate, status) {
  if (!dueDate) {
    return { text: "No due date", class: "due-none" };
  }

  if (status === TASK_STATUS.DONE) {
    return { text: `Due ${formatDate(dueDate)}`, class: "due-completed" };
  }

  const daysUntil = getDaysUntilDue(dueDate);

  if (daysUntil < 0) {
    return {
      text: `Overdue by ${Math.abs(daysUntil)} day(s)`,
      class: "due-overdue",
    };
  } else if (daysUntil === 0) {
    return { text: "Due today", class: "due-today" };
  } else if (daysUntil <= 3) {
    return {
      text: `Due in ${daysUntil} day(s)`,
      class: "due-soon",
    };
  } else {
    return {
      text: `Due ${formatDate(dueDate)}`,
      class: "due-normal",
    };
  }
}

/**
 * Check if task can move to previous status
 * @param {string} currentStatus - Current task status
 * @returns {boolean}
 */
function canMovePrev(currentStatus) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  return currentIndex > 0;
}

/**
 * Check if task can move to next status
 * @param {string} currentStatus - Current task status
 * @returns {boolean}
 */
function canMoveNext(currentStatus) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  return currentIndex < STATUS_ORDER.length - 1;
}

/**
 * Get previous status
 * @param {string} currentStatus - Current task status
 * @returns {string|null}
 */
export function getPrevStatus(currentStatus) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  return currentIndex > 0 ? STATUS_ORDER[currentIndex - 1] : null;
}

/**
 * Get next status
 * @param {string} currentStatus - Current task status
 * @returns {string|null}
 */
export function getNextStatus(currentStatus) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  return currentIndex < STATUS_ORDER.length - 1
    ? STATUS_ORDER[currentIndex + 1]
    : null;
}

/**
 * Create a task card element
 * @param {Object} task - Task data
 * @param {Object} handlers - Event handlers { onEdit, onDelete, onStatusChange }
 * @returns {HTMLElement} Task card element
 */
export function createTaskCard(task, handlers = {}) {
  const template = document.getElementById("template-task-card");
  let cardElement;

  if (template) {
    const clone = template.content.cloneNode(true);
    cardElement = clone.querySelector(".task-card");
  } else {
    cardElement = document.createElement("div");
    cardElement.className = "task-card";
    cardElement.innerHTML = `
            <div class="task-card-header">
                <div class="task-card-header-left">
                    <span class="priority-indicator"></span>
                    <span class="task-priority-label"></span>
                </div>
                <div class="task-card-actions">
                    <button class="task-action-btn edit-btn" title="Edit" aria-label="Edit task">✏️</button>
                    <button class="task-action-btn delete-btn delete" title="Delete" aria-label="Delete task">🗑️</button>
                </div>
            </div>
            <div class="task-card-body">
                <h4 class="task-card-title"></h4>
                <p class="task-card-description"></p>
            </div>
            <div class="task-card-footer">
                <div class="task-card-meta">
                    <span class="task-due-date"></span>
                </div>
                <div class="task-navigation">
                    <button class="nav-btn prev" title="Move to previous status" aria-label="Move to previous status">←</button>
                    <button class="nav-btn next" title="Move to next status" aria-label="Move to next status">→</button>
                </div>
            </div>
        `;
  }

  // Set task ID
  cardElement.setAttribute("data-task-id", task.id);

  // Set priority class
  const priorityClass = getPriorityClass(task.priority);
  cardElement.classList.add(priorityClass);

  // Set completed class if done
  if (task.status === TASK_STATUS.DONE) {
    cardElement.classList.add("task-completed");
  }

  // Set priority indicator
  const priorityIndicator = cardElement.querySelector(".priority-indicator");
  if (priorityIndicator) {
    priorityIndicator.classList.add(priorityClass);
    priorityIndicator.setAttribute("title", `${task.priority} priority`);
  }

  // Set priority label badge
  const priorityLabelEl = cardElement.querySelector(".task-priority-label");
  if (priorityLabelEl) {
    priorityLabelEl.textContent = task.priority;
    priorityLabelEl.className = `task-priority-label priority-badge ${priorityClass}`;
  }

  // Set title
  const titleEl = cardElement.querySelector(".task-card-title");
  if (titleEl) {
    titleEl.textContent = task.title;
  }

  // Set description
  const descEl = cardElement.querySelector(".task-card-description");
  if (descEl) {
    if (task.description) {
      descEl.textContent = task.description;
    } else {
      descEl.classList.add("empty");
      descEl.style.display = "none";
    }
  }

  // Set due date
  const dueDateEl = cardElement.querySelector(".task-due-date");
  if (dueDateEl) {
    const dueInfo = getDueDateInfo(task.dueDate, task.status);
    dueDateEl.textContent = dueInfo.text;
    dueDateEl.classList.add(dueInfo.class);
  }

  // Setup status movement buttons
  const prevBtn = cardElement.querySelector(".nav-btn.prev");
  const nextBtn = cardElement.querySelector(".nav-btn.next");

  if (prevBtn) {
    if (canMovePrev(task.status)) {
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const newStatus = getPrevStatus(task.status);
        if (newStatus && handlers.onStatusChange) {
          handlers.onStatusChange(task.id, newStatus);
        }
      });
    } else {
      prevBtn.disabled = true;
      prevBtn.classList.add("disabled");
    }
  }

  if (nextBtn) {
    if (canMoveNext(task.status)) {
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const newStatus = getNextStatus(task.status);
        if (newStatus && handlers.onStatusChange) {
          handlers.onStatusChange(task.id, newStatus);
        }
      });
    } else {
      nextBtn.disabled = true;
      nextBtn.classList.add("disabled");
    }
  }

  // Setup edit button
  const editBtn = cardElement.querySelector(".edit-btn");
  if (editBtn && handlers.onEdit) {
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      handlers.onEdit(task);
    });
  }

  // Setup delete button
  const deleteBtn = cardElement.querySelector(".delete-btn");
  if (deleteBtn && handlers.onDelete) {
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      handlers.onDelete(task);
    });
  }

  // Add click handler for card (optional - e.g., to view details)
  if (handlers.onClick) {
    cardElement.addEventListener("click", () => {
      handlers.onClick(task);
    });
    cardElement.classList.add("clickable");
  }

  return cardElement;
}

/**
 * Create a task row for list view
 * @param {Object} task - Task data
 * @param {Object} handlers - Event handlers
 * @returns {HTMLElement} Table row element
 */
export function createTaskRow(task, handlers = {}) {
  const row = document.createElement("tr");
  row.setAttribute("data-task-id", task.id);

  const priorityClass = getPriorityClass(task.priority);
  const dueInfo = getDueDateInfo(task.dueDate, task.status);

  // Status indicator
  const statusIndicators = {
    [TASK_STATUS.TODO]: "⚪",
    [TASK_STATUS.IN_PROGRESS]: "🔵",
    [TASK_STATUS.DONE]: "✅",
  };

  row.innerHTML = `
        <td class="status-cell">
            <span class="status-indicator">${statusIndicators[task.status] || "⚪"}</span>
        </td>
        <td class="title-cell">
            <span class="task-title ${task.status === TASK_STATUS.DONE ? "completed" : ""}">${escapeHtml(task.title)}</span>
            ${task.description ? `<span class="task-desc-preview">${escapeHtml(task.description.substring(0, 50))}${task.description.length > 50 ? "..." : ""}</span>` : ""}
        </td>
        <td class="priority-cell">
            <span class="priority-badge ${priorityClass}">${task.priority}</span>
        </td>
        <td class="due-date-cell">
            <span class="due-date ${dueInfo.class}">${dueInfo.text}</span>
        </td>
        <td class="actions-cell">
            <button class="task-action-btn edit-btn" title="Edit">✏️</button>
            <button class="task-action-btn delete-btn" title="Delete">🗑️</button>
        </td>
    `;

  // Setup event handlers
  const editBtn = row.querySelector(".edit-btn");
  const deleteBtn = row.querySelector(".delete-btn");

  if (editBtn && handlers.onEdit) {
    editBtn.addEventListener("click", () => handlers.onEdit(task));
  }

  if (deleteBtn && handlers.onDelete) {
    deleteBtn.addEventListener("click", () => handlers.onDelete(task));
  }

  return row;
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
  createCard: createTaskCard,
  createRow: createTaskRow,
  getPrevStatus,
  getNextStatus,
};
