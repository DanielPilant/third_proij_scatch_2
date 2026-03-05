/**
 * Page Logic: Login, Register, Logout, Tasks + Boot
 */
(function () {
  /* ======== LOGIN ======== */
  function initLogin() {
    $("login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = $("login-btn");
      btn.disabled = true;
      $("login-msg").textContent = "";
      $("login-msg").className = "msg";

      fajax.post(
        "/api/auth/login",
        {
          email: $("login-email").value.trim(),
          password: $("login-password").value,
        },
        function (res) {
          state.user = res.data.data.user;
          state.token = res.data.data.token;
          fajax.setToken(state.token);
          saveState();
          btn.disabled = false;
          location.hash = "#tasks";
        },
        function (err) {
          $("login-msg").textContent = err.message || "Login failed";
          $("login-msg").className = "msg msg-error";
          btn.disabled = false;
        },
      );
    });
  }

  /* ======== REGISTER ======== */
  function initRegister() {
    $("register-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = $("register-btn");
      btn.disabled = true;
      $("register-msg").textContent = "";
      $("register-msg").className = "msg";

      var pw = $("register-password").value;
      if (pw.length < 6) {
        $("register-msg").textContent =
          "Password must be at least 6 characters";
        $("register-msg").className = "msg msg-error";
        btn.disabled = false;
        return;
      }

      fajax.post(
        "/api/auth/register",
        {
          name: $("register-name").value.trim(),
          email: $("register-email").value.trim(),
          password: pw,
        },
        function (res) {
          state.user = res.data.data.user;
          state.token = res.data.data.token;
          fajax.setToken(state.token);
          saveState();
          btn.disabled = false;
          location.hash = "#tasks";
        },
        function (err) {
          $("register-msg").textContent = err.message || "Registration failed";
          $("register-msg").className = "msg msg-error";
          btn.disabled = false;
        },
      );
    });
  }

  /* ======== LOGOUT ======== */
  function initLogout() {
    $("logout-btn").addEventListener("click", function () {
      fajax.post(
        "/api/auth/logout",
        null,
        function () {},
        function () {},
      );
      state.user = null;
      state.token = null;
      fajax.clearToken();
      sessionStorage.removeItem("tm_state");
      location.hash = "#login";
    });
  }

  /* ======== TASKS ======== */
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
          '<button class="btn btn-sm btn-success" onclick="app.toggleStatus(\'' +
          t.id +
          "')\">Toggle</button> " +
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

  /* ---- public actions (called from inline onclick) ---- */

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

  function toggleStatus(id) {
    for (var i = 0; i < taskCache.length; i++) {
      if (taskCache[i].id === id) {
        var next =
          taskCache[i].status === "done"
            ? "todo"
            : taskCache[i].status === "todo"
              ? "in-progress"
              : "done";
        fajax.put(
          "/api/tasks/" + id,
          { status: next },
          function () {
            loadTasks();
          },
          function (err) {
            $("task-msg").textContent = err.message;
            $("task-msg").className = "msg msg-error";
          },
        );
        break;
      }
    }
  }

  /* ======== BOOT ======== */
  document.addEventListener("DOMContentLoaded", function () {
    initLogout();
    route();
  });

  /* Expose functions to window for router.js calls */
  window.initLogin = initLogin;
  window.initRegister = initRegister;
  window.initTaskForm = initTaskForm;
  window.loadTasks = loadTasks;

  /* Expose task actions globally for inline onclick handlers */
  window.app = {
    viewTask: viewTask,
    editTask: editTask,
    deleteTask: deleteTask,
    toggleStatus: toggleStatus,
  };
})();
