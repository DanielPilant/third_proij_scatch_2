/**
 * Tasks Page: CRUD, view, toggle, edit, delete
 */
(function () {
  var taskCache = [];
  var editingId = null;

  // Load tasks from server and render
  function loadTasks() {
    $("task-list").innerHTML = '<p class="text-center">Loading tasks…</p>';

    fajax.get(
      "/api/tasks",
      function (res) {
        taskCache = res.data.data.tasks;
        renderTasks();
      },
      function (err) {
        $("task-list").innerHTML =
          '<p class="msg msg-error">Failed to load tasks. Try refreshing.</p>';
      },
    );
  }

  // render the tasks
  function renderTasks() {
    var html = "";
    if (taskCache.length === 0) {
      html =
        '<p class="text-center" style="color:#888">No tasks yet — add one above!</p>';
    } else {
      for (var i = 0; i < taskCache.length; i++) {
        var t = taskCache[i];
        var statusClass = t.status === "done" ? " done" : "";

        var btnTodo =
          t.status !== "todo"
            ? '<button class="btn btn-sm btn-success" id="btn-todo-' +
              t.id +
              '" onclick="app.setStatus(\'' +
              t.id +
              "', 'todo')\">To Do</button> "
            : "";
        var btnProg =
          t.status !== "in-progress"
            ? '<button class="btn btn-sm btn-success" id="btn-in-progress-' +
              t.id +
              '" onclick="app.setStatus(\'' +
              t.id +
              "', 'in-progress')\">In progress</button> "
            : "";
        var btnDone =
          t.status !== "done"
            ? '<button class="btn btn-sm btn-success" id="btn-done-' +
              t.id +
              '" onclick="app.setStatus(\'' +
              t.id +
              "', 'done')\">Done</button> "
            : "";
        html +=
          '<div class="task-item' +
          statusClass +
          '">' +
          '<div class="task-info">' +
          "<strong>" +
          esc(t.title) +
          "</strong>" +
          (t.description ? "<div>" + esc(t.description) + "</div>" : "") +
          "<small>Status: " +
          esc(t.status) +
          "</small>" +
          "</div>" +
          '<div class="task-actions">' +
          '<button class="btn btn-sm" id="btn-view-' +
          t.id +
          '" onclick="app.viewTask(\'' +
          t.id +
          "')\">View</button> " +
          btnTodo +
          btnProg +
          btnDone +
          '<button class="btn btn-sm btn-warning" id="btn-edit-' +
          t.id +
          '" onclick="app.editTask(\'' +
          t.id +
          "')\">Edit</button> " +
          '<button class="btn btn-sm btn-danger" id="btn-delete-' +
          t.id +
          '" onclick="app.deleteTask(\'' +
          t.id +
          "')\">Del</button>" +
          "</div></div>";
      }
    }
    $("task-list").innerHTML = html;
  }

  // sends the data to the server to create/update a task, then reloads the list
  function initTaskForm() {
    $("task-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = $("task-submit");
      btn.disabled = true;
      $("task-msg").textContent = "";

      var title = $("task-title").value.trim();
      var desc = $("task-desc").value.trim();

      if (!title) {
        $("task-msg").textContent = "Title is required";
        $("task-msg").className = "msg msg-error";
        btn.disabled = false;
        return;
      }

      if (editingId) {
        fajax.put(
          "/api/tasks/" + editingId,
          { title: title, description: desc },
          function () {
            resetForm();
            btn.disabled = false;
            loadTasks();
          },
          function (err) {
            $("task-msg").textContent = err.message;
            $("task-msg").className = "msg msg-error";
            btn.disabled = false;
          },
        );
      } else {
        fajax.post(
          "/api/tasks",
          { title: title, description: desc },
          function () {
            resetForm();
            btn.disabled = false;
            loadTasks();
          },
          function (err) {
            $("task-msg").textContent = err.message;
            $("task-msg").className = "msg msg-error";
            btn.disabled = false;
          },
        );
      }
    });
  }

  // reset the form to initial state after adding/editing a task
  function resetForm() {
    $("task-title").value = "";
    $("task-desc").value = "";
    $("task-submit").textContent = "Add Task";
    $("task-msg").textContent = "";
    editingId = null;
  }

  // view task details in an alert (could be a modal in a real app)
  function viewTask(id) {
    var btn = $("btn-view-" + id);
    if (btn) btn.disabled = true;
    fajax.get(
      "/api/tasks/" + id,
      function (res) {
        var t = res.data.data.task;
        btn.disabled = false;
        alert(
          "Title: " +
            t.title +
            "\nDescription: " +
            (t.description || "(none)") +
            "\nStatus: " +
            t.status +
            "\nCreated: " +
            t.createdAt,
        );
      },
      function (err) {
        alert("Error: " + (err.message || "Could not fetch task"));
      },
    );
  }

  // pre-fill the form with task data for editing
  function editTask(id) {
    for (var i = 0; i < taskCache.length; i++) {
      if (taskCache[i].id === id) {
        var btn = $("btn-edit-" + id);
        if (btn) btn.disabled = true;
        $("task-title").value = taskCache[i].title;
        $("task-desc").value = taskCache[i].description || "";
        $("task-submit").textContent = "Update Task";
        editingId = id;
        $("task-title").focus();
        break;
      }
    }
  }

  // send delete request to server, then reload list
  function deleteTask(id) {
    var btn = $("btn-delete-" + id);
    if (btn) btn.disabled = true;
    fajax.del(
      "/api/tasks/" + id,
      function () {
        loadTasks();
      },
      function (err) {
        $("task-msg").textContent = err.message;
        $("task-msg").className = "msg msg-error";
      },
    );
  }

  // send status update to server, then reload list
  function setStatus(id, newStatus) {
    var btn = $("btn-" + newStatus + "-" + id);
    if (btn) btn.disabled = true;
    fajax.put(
      "/api/tasks/" + id,
      { status: newStatus },
      function () {
        loadTasks();
      },
      function (err) {
        $("task-msg").textContent = err.message;
        $("task-msg").className = "msg msg-error";
      },
    );
  }

  window.initTaskForm = initTaskForm;
  window.loadTasks = loadTasks;

  window.app = {
    viewTask: viewTask,
    editTask: editTask,
    deleteTask: deleteTask,
    setStatus: setStatus,
  };
})();
