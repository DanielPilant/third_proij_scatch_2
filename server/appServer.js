/**
 * App Server - Handles task management (CRUD).
 * Uses userDbApi for authentication and appDbApi for data storage.
 */
var appServer = (function () {
  
  function uid() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  function createResponse(status, data, isError = false) {
    return {
      status: status,
      body: isError ? { success: false, error: { message: data } } : { success: true, data: data }
    };
  }

  function authenticate(headers) {
    var authH = (headers || {})["Authorization"] || "";
    var token = authH.indexOf("Bearer ") === 0 ? authH.substring(7) : authH;
    if (!token) return null;

    var sessions = userDbApi.getSessions(); // Validate against user sessions
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].token === token) return sessions[i].userId;
    }
    return null;
  }

  function handleRequest(req) {
    var method = req.method;
    var url = req.url;
    var body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    var headers = req.headers || {};

    var userId = authenticate(headers);
    if (!userId) return createResponse(401, "Unauthorized access", true);

    /* ---------- GET /api/tasks ---------- */
    if (url === "/api/tasks" && method === "GET") {
      var all = appDbApi.getTasks();
      var mine = all.filter(function(t) { return t.userId === userId; });
      return createResponse(200, { tasks: mine });
    }

    /* ---------- POST /api/tasks ---------- */
    if (url === "/api/tasks" && method === "POST") {
      if (!body.title || !body.title.trim()) {
        return createResponse(400, "Title is required", true);
      }
      var task = {
        id: uid(),
        userId: userId,
        title: body.title.trim(),
        description: (body.description || "").trim(),
        status: body.status || "todo",
        createdAt: new Date().toISOString(),
      };
      var tasks = appDbApi.getTasks();
      tasks.push(task);
      appDbApi.saveTasks(tasks);
      return createResponse(201, { task: task });
    }

    /* ---------- ITEM ROUTES (GET/PUT/DELETE) ---------- */
    var idMatch = url.match(/^\/api\/tasks\/(.+)$/);
    if (idMatch) {
      var taskId = idMatch[1];
      var tasks = appDbApi.getTasks();

      // GET one
      if (method === "GET") {
        var task = tasks.find(function(t) { return t.id === taskId && t.userId === userId; });
        return task ? createResponse(200, { task: task }) : createResponse(404, "Task not found", true);
      }

      // PUT update
      if (method === "PUT") {
        for (var i = 0; i < tasks.length; i++) {
          if (tasks[i].id === taskId && tasks[i].userId === userId) {
            if (body.title !== undefined) tasks[i].title = body.title;
            if (body.description !== undefined) tasks[i].description = body.description;
            if (body.status !== undefined) tasks[i].status = body.status;
            appDbApi.saveTasks(tasks);
            return createResponse(200, { task: tasks[i] });
          }
        }
        return createResponse(404, "Task not found", true);
      }

      // DELETE
      if (method === "DELETE") {
        var initialLength = tasks.length;
        var filtered = tasks.filter(function(t) { return !(t.id === taskId && t.userId === userId); });
        if (filtered.length === initialLength) return createResponse(404, "Task not found", true);
        
        appDbApi.saveTasks(filtered);
        return createResponse(200, { success: true });
      }
    }

    return createResponse(404, "Endpoint not found", true);
  }

  return { handleRequest: handleRequest };
})();