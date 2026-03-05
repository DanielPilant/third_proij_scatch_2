/**
 * Auth Server - Handles registration, login, logout, and session validation.
 * Returns { status, body } response objects.
 */
var authServer = (function () {
  function uid() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  function handleRequest(req) {
    var method = req.method;
    var url = req.url;
    var body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    var headers = req.headers || {};

    /* ---------- REGISTER ---------- */
    if (url === "/api/auth/register" && method === "POST") {
      if (!body.name || !body.email || !body.password) {
        return {
          status: 400,
          body: {
            success: false,
            error: { message: "All fields are required" },
          },
        };
      }
      var users = db.getUsers();
      for (var i = 0; i < users.length; i++) {
        if (users[i].email === body.email.toLowerCase()) {
          return {
            status: 409,
            body: {
              success: false,
              error: { message: "Email already exists" },
            },
          };
        }
      }
      var newUser = {
        id: uid(),
        name: body.name.trim(),
        email: body.email.toLowerCase().trim(),
        password: body.password,
      };
      users.push(newUser);
      db.saveUsers(users);

      var token = "tok_" + uid();
      var sessions = db.getSessions();
      sessions.push({ token: token, userId: newUser.id });
      db.saveSessions(sessions);

      return {
        status: 201,
        body: {
          success: true,
          data: {
            user: { id: newUser.id, name: newUser.name, email: newUser.email },
            token: token,
          },
        },
      };
    }

    /* ---------- LOGIN ---------- */
    if (url === "/api/auth/login" && method === "POST") {
      if (!body.email || !body.password) {
        return {
          status: 400,
          body: {
            success: false,
            error: { message: "Email and password are required" },
          },
        };
      }
      var users = db.getUsers();
      for (var i = 0; i < users.length; i++) {
        if (
          users[i].email === body.email.toLowerCase() &&
          users[i].password === body.password
        ) {
          var token = "tok_" + uid();
          var sessions = db.getSessions();
          sessions.push({ token: token, userId: users[i].id });
          db.saveSessions(sessions);
          return {
            status: 200,
            body: {
              success: true,
              data: {
                user: {
                  id: users[i].id,
                  name: users[i].name,
                  email: users[i].email,
                },
                token: token,
              },
            },
          };
        }
      }
      return {
        status: 401,
        body: {
          success: false,
          error: { message: "Invalid email or password" },
        },
      };
    }

    /* ---------- LOGOUT ---------- */
    if (url === "/api/auth/logout" && method === "POST") {
      var authH = headers["Authorization"] || "";
      var token = authH.indexOf("Bearer ") === 0 ? authH.substring(7) : authH;
      if (token) {
        var sessions = db.getSessions();
        var kept = [];
        for (var i = 0; i < sessions.length; i++) {
          if (sessions[i].token !== token) kept.push(sessions[i]);
        }
        db.saveSessions(kept);
      }
      return { status: 200, body: { success: true } };
    }

    /* ---------- VALIDATE ---------- */
    if (url === "/api/auth/validate" && method === "GET") {
      var authH = headers["Authorization"] || "";
      var token = authH.indexOf("Bearer ") === 0 ? authH.substring(7) : authH;
      if (!token)
        return { status: 401, body: { success: false, valid: false } };
      var sessions = db.getSessions();
      var userId = null;
      for (var i = 0; i < sessions.length; i++) {
        if (sessions[i].token === token) {
          userId = sessions[i].userId;
          break;
        }
      }
      if (!userId)
        return { status: 401, body: { success: false, valid: false } };
      var users = db.getUsers();
      for (var i = 0; i < users.length; i++) {
        if (users[i].id === userId) {
          return {
            status: 200,
            body: {
              success: true,
              valid: true,
              data: {
                user: {
                  id: users[i].id,
                  name: users[i].name,
                  email: users[i].email,
                },
              },
            },
          };
        }
      }
      return { status: 401, body: { success: false, valid: false } };
    }

    return null; // not handled
  }

  return { handleRequest: handleRequest };
})();
