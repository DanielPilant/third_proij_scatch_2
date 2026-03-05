/**
 * App Server - Handles task CRUD. All routes require authentication.
 * Returns { status, body } response objects.
 */
var appServer = (function () {
  function uid() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  function authenticate(headers) {
    var authH = (headers || {})["Authorization"] || "";
    var token = authH.indexOf("Bearer ") === 0 ? authH.substring(7) : authH;
    if (!token) return null;
    var sessions = db.getSessions();
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].token === token) return sessions[i].userId;
    }
    return null;
  }

  function handleRequest(req) {
    var method = req.method;
    var url = req.url;
    var body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    var headers = req.headers || {};

    var userId = authenticate(headers);
    if (!userId) {
      return {
        status: 401,
        body: { success: false, error: { message: "Unauthorized" } },
      };
    }

    /* ---------- GET /api/tasks ---------- */
    if (url === "/api/tasks" && method === "GET") {
      var all = db.getTasks();
      var mine = [];
      for (var i = 0; i < all.length; i++) {
        if (all[i].userId === userId) mine.push(all[i]);
      }
      return { status: 200, body: { success: true, data: { tasks: mine } } };
    }

    /* ---------- POST /api/tasks ---------- */
    if (url === "/api/tasks" && method === "POST") {
      if (!body.title || !body.title.trim()) {
        return {
          status: 400,
          body: { success: false, error: { message: "Title is required" } },
        };
      }
      var task = {
        id: uid(),
        userId: userId,
        title: body.title.trim(),
        description: (body.description || "").trim(),
        status: body.status || "todo",
        createdAt: new Date().toISOString(),
      };
      var tasks = db.getTasks();
      tasks.push(task);
      db.saveTasks(tasks);
      return { status: 201, body: { success: true, data: { task: task } } };
    }

    /* ---------- GET /api/tasks/:id ---------- */
    var getOneMatch = url.match(/^\/api\/tasks\/(.+)$/);
    if (getOneMatch && method === "GET") {
      var taskId = getOneMatch[1];
      var all = db.getTasks();
      for (var j = 0; j < all.length; j++) {
        if (all[j].id === taskId && all[j].userId === userId) {
          return {
            status: 200,
            body: { success: true, data: { task: all[j] } },
          };
        }
      }
      return {
        status: 404,
        body: { success: false, error: { message: "Task not found" } },
      };
    }

    /* ---------- PUT /api/tasks/:id ---------- */
    var putMatch = url.match(/^\/api\/tasks\/(.+)$/);
    if (putMatch && method === "PUT") {
      var taskId = putMatch[1];
      var tasks = db.getTasks();
      for (var i = 0; i < tasks.length; i++) {
        if (tasks[i].id === taskId && tasks[i].userId === userId) {
          if (body.title !== undefined) tasks[i].title = body.title;
          if (body.description !== undefined)
            tasks[i].description = body.description;
          if (body.status !== undefined) tasks[i].status = body.status;
          db.saveTasks(tasks);
          return {
            status: 200,
            body: { success: true, data: { task: tasks[i] } },
          };
        }
      }
      return {
        status: 404,
        body: { success: false, error: { message: "Task not found" } },
      };
    }

    /* ---------- DELETE /api/tasks/:id ---------- */
    var delMatch = url.match(/^\/api\/tasks\/(.+)$/);
    if (delMatch && method === "DELETE") {
      var taskId = delMatch[1];
      var tasks = db.getTasks();
      var found = false;
      var kept = [];
      for (var i = 0; i < tasks.length; i++) {
        if (tasks[i].id === taskId && tasks[i].userId === userId) {
          found = true;
        } else {
          kept.push(tasks[i]);
        }
      }
      if (!found)
        return {
          status: 404,
          body: { success: false, error: { message: "Task not found" } },
        };
      db.saveTasks(kept);
      return { status: 200, body: { success: true } };
    }

    return null; // not handled
  }

  return { handleRequest: handleRequest };
})();
