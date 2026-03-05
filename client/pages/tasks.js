/**
 * Tasks Page: CRUD, view, toggle, edit, delete
 */
(function () {
  var taskCache = [];
  var editingId = null;

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

  function renderTasks() {
    var html = "";
    if (taskCache.length === 0) {
      html =
        '<p class="text-center" style="color:#888">No tasks yet — add one above!</p>';
    } else {
      for (var i = 0; i < taskCache.length; i++) {
        var t = taskCache[i];
        var doneClass = t.status === "done" ? " done" : "";

        var btnTodo =
          t.status !== "todo"
            ? '<button class="btn btn-sm btn-success" onclick="app.setStatus(\'' +
              t.id +
              "', 'todo')\">To Do</button> "
            : "";
        var btnProg =
          t.status !== "in-progress"
            ? '<button class="btn btn-sm btn-success" onclick="app.setStatus(\'' +
              t.id +
              "', 'in-progress')\">In progress</button> "
            : "";
        var btnDone =
          t.status !== "done"
            ? '<button class="btn btn-sm btn-success" onclick="app.setStatus(\'' +
              t.id +
              "', 'done')\">Done</button> "
            : "";
        html +=
          '<div class="task-item' +
          doneClass +
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
          '<button class="btn btn-sm" onclick="app.viewTask(\'' +
          t.id +
          "')\">View</button> " +
          btnTodo +
          btnProg +
          btnDone +
          '<button class="btn btn-sm btn-warning" onclick="app.editTask(\'' +
          t.id +
          "')\">Edit</button> " +
          '<button class="btn btn-sm btn-danger" onclick="app.deleteTask(\'' +
          t.id +
          "')\">Del</button>" +
          "</div></div>";
      }
    }
    $("task-list").innerHTML = html;
  }

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

  function resetForm() {
    $("task-title").value = "";
    $("task-desc").value = "";
    $("task-submit").textContent = "Add Task";
    $("task-msg").textContent = "";
    editingId = null;
  }

  function viewTask(id) {
    fajax.get(
      "/api/tasks/" + id,
      function (res) {
        var t = res.data.data.task;
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

  function editTask(id) {
    for (var i = 0; i < taskCache.length; i++) {
      if (taskCache[i].id === id) {
        $("task-title").value = taskCache[i].title;
        $("task-desc").value = taskCache[i].description || "";
        $("task-submit").textContent = "Update Task";
        editingId = id;
        $("task-title").focus();
        break;
      }
    }
  }

  function deleteTask(id) {
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

  function setStatus(id, newStatus) {
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
