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

// Uses globals: api, state, showToast, showSuccess, showError, createTaskCard, createTaskRow, getNextStatus, getPrevStatus, API_ROUTES, TOAST_TYPES, TASK_STATUS, TASK_PRIORITY, SUCCESS_MESSAGES, ERROR_MESSAGES

(function () {
  // Task being edited (null for create)
  let editingTaskId = null;

  function renderTasksPage(container) {
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

  function initTasksPage() {
    // Load tasks
    loadTasks();

    // Setup add task button
    setupAddTaskButton();

    // Setup column quick-add buttons
    setupColumnAddButtons();

    // Setup modal
    setupTaskModal();
  }

  function loadTasks() {
    state.setTasksLoading(true);

    api.get(
      API_ROUTES.TASKS.BASE,
      function (response) {
        if (response.data?.success) {
          const tasks = response.data.data.tasks;
          state.setTasks(tasks);
          renderTasks(tasks);
        }
        state.setTasksLoading(false);
      },
      function (error) {
        console.error("[Tasks] Error loading tasks:", error);
        showError("Failed to load tasks");
        state.setTasksLoading(false);
      },
    );
  }

  function renderTasks(tasks) {
    const emptyState = document.getElementById("empty-tasks");
    const boardEl = document.getElementById("kanban-board");

    // Truly empty (no tasks at all)
    if (tasks.length === 0) {
      emptyState?.classList.remove("hidden");
      boardEl?.classList.add("hidden");

      // Setup empty state button
      const emptyAddBtn = document.getElementById("empty-add-task");
      emptyAddBtn?.addEventListener("click", () => openTaskModal());
      return;
    }

    // Tasks exist - show board
    emptyState?.classList.add("hidden");
    boardEl?.classList.remove("hidden");

    renderKanbanBoard(tasks);
  }

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

  function setupAddTaskButton() {
    const addBtn = document.getElementById("add-task-btn");
    addBtn?.addEventListener("click", () => openTaskModal());
  }

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
      document.getElementById("task-description").value =
        task.description || "";
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

  function closeTaskModal() {
    const modal = document.getElementById("task-modal");
    modal?.classList.remove("visible");
    editingTaskId = null;
  }

  function handleTaskFormSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById("modal-submit");
    const title = document.getElementById("task-title").value.trim();
    const description = document
      .getElementById("task-description")
      .value.trim();
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

    const onDone = function () {
      setButtonLoading(submitBtn, false);
    };

    if (editingTaskId) {
      // Update existing task
      api.put(
        API_ROUTES.TASKS.BY_ID(editingTaskId),
        taskData,
        function (response) {
          if (response.data?.success) {
            state.updateTask(editingTaskId, response.data.data.task);
            showSuccess(SUCCESS_MESSAGES.TASK_UPDATED);
          }
          closeTaskModal();
          renderTasks(state.getTasks());
          onDone();
        },
        function (error) {
          console.error("[Tasks] Error saving task:", error);
          showError(error.data?.error?.message || "Failed to save task");
          onDone();
        },
      );
    } else {
      // Create new task
      api.post(
        API_ROUTES.TASKS.BASE,
        taskData,
        function (response) {
          if (response.data?.success) {
            state.addTask(response.data.data.task);
            showSuccess(SUCCESS_MESSAGES.TASK_CREATED);
          }
          closeTaskModal();
          renderTasks(state.getTasks());
          onDone();
        },
        function (error) {
          console.error("[Tasks] Error saving task:", error);
          showError(error.data?.error?.message || "Failed to save task");
          onDone();
        },
      );
    }
  }

  function handleEditTask(task) {
    openTaskModal(task);
  }

  // Store task to delete
  let taskToDelete = null;

  function handleDeleteTask(task) {
    taskToDelete = task;
    openConfirmModal();
  }

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

  function closeConfirmModal() {
    const modal = document.getElementById("confirm-modal");
    modal?.classList.remove("visible");
    taskToDelete = null;
  }

  function executeDelete() {
    if (!taskToDelete) return;

    const deleteBtn = document.getElementById("confirm-delete");
    setButtonLoading(deleteBtn, true);

    api.delete(
      API_ROUTES.TASKS.BY_ID(taskToDelete.id),
      function (response) {
        if (response.data?.success) {
          state.removeTask(taskToDelete.id);
          showSuccess(SUCCESS_MESSAGES.TASK_DELETED);
          renderTasks(state.getTasks());
        }
        setButtonLoading(deleteBtn, false);
        closeConfirmModal();
      },
      function (error) {
        console.error("[Tasks] Error deleting task:", error);
        showError(
          error.data?.error?.message || ERROR_MESSAGES.TASK_DELETE_FAILED,
        );
        setButtonLoading(deleteBtn, false);
        closeConfirmModal();
      },
    );
  }

  function handleStatusChange(taskId, newStatus) {
    api.put(
      API_ROUTES.TASKS.BY_ID(taskId),
      {
        status: newStatus,
      },
      function (response) {
        if (response.data?.success) {
          state.updateTask(taskId, response.data.data.task);
          showSuccess(SUCCESS_MESSAGES.TASK_STATUS_UPDATED);
          renderTasks(state.getTasks());
        }
      },
      function (error) {
        console.error("[Tasks] Error updating status:", error);
        showError(
          error.data?.error?.message || ERROR_MESSAGES.TASK_UPDATE_FAILED,
        );
      },
    );
  }

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

  // Expose tasks page functions globally
  window.renderTasksPage = renderTasksPage;
  window.initTasksPage = initTasksPage;
})(); // End IIFE
