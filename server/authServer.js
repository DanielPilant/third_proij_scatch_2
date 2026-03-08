/**
 * Auth Server - Handles registration, login, logout, and session validation.
 * Uses userDbApi for persistence.
 */
var authServer = (function () {
  
  /*Random ID number generator*/ 
  function uid() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * Standardizes server responses with a status code and body.
   * @param {number} status - HTTP status code.
   * @param {any} data - Data payload or error message.
   * @param {boolean} isError - Flag to format as an error response.
   * @returns {object} Formatted response object.
   */
  function createResponse(status, data, isError = false) {
    return {
      status: status,
      body: isError ? { success: false, error: { message: data } } : { success: true, data: data }
    };
  }

  /**
   * Main router and logic handler for the Auth Server.
   * Handles user registration, login, logout, and session validation.
   * @param {object} req - The incoming request object containing method, url, body, and headers.
   * @returns {object} A standardized response object with status and body.
   */
  function handleRequest(req) {
    var method = req.method;
    var url = req.url;
    var body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    var headers = req.headers || {};

    /* ---------- REGISTER ---------- */
    /**
     * Handles user registration: validates input, checks for duplicates,
     * saves new user, and creates an initial session token.
     */
    if (url === "/api/auth/register" && method === "POST") {
      if (!body.name || !body.email || !body.password) {
        return createResponse(400, "All fields are required", true);
      }
      
      var users = userDbApi.getUsers();
      for (var i = 0; i < users.length; i++) {
        if (users[i].email === body.email.toLowerCase()) {
          return createResponse(409, "Email already exists", true);
        }
      }

      var newUser = {
        id: uid(),
        name: body.name.trim(),
        email: body.email.toLowerCase().trim(),
        password: body.password,
      };

      users.push(newUser);
      userDbApi.saveUsers(users);

      var token = "tok_" + uid();
      var sessions = userDbApi.getSessions();
      sessions.push({ token: token, userId: newUser.id });
      userDbApi.saveSessions(sessions);

      return createResponse(201, {
        user: { id: newUser.id, name: newUser.name, email: newUser.email },
        token: token
      });
    }

    /* ---------- LOGIN ---------- */
    /**
     * Handles user login: validates credentials, generates a session token 
     * upon success, and saves the session to the user database.
     */
    if (url === "/api/auth/login" && method === "POST") {
      if (!body.email || !body.password) {
        return createResponse(400, "Email and password are required", true);
      }

      var users = userDbApi.getUsers();
      for (var i = 0; i < users.length; i++) {
        if (users[i].email === body.email.toLowerCase() && users[i].password === body.password) {
          var token = "tok_" + uid();
          var sessions = userDbApi.getSessions();
          sessions.push({ token: token, userId: users[i].id });
          userDbApi.saveSessions(sessions);
          
          return createResponse(200, {
            user: { id: users[i].id, name: users[i].name, email: users[i].email },
            token: token
          });
        }
      }
      return createResponse(401, "Invalid email or password", true);
    }

    /* ---------- LOGOUT ---------- */
    /**
     * Handles user logout: extracts the session token from headers 
     * and removes it from the active sessions in the user database.
     */
    if (url === "/api/auth/logout" && method === "POST") {
      var authH = headers["Authorization"] || "";
      var token = authH.indexOf("Bearer ") === 0 ? authH.substring(7) : authH;
      if (token) {
        var sessions = userDbApi.getSessions();
        var kept = sessions.filter(function(s) { return s.token !== token; });
        userDbApi.saveSessions(kept);
      }
      return createResponse(200, { success: true });
    }

    /* ---------- VALIDATE ---------- */
    /**
     * Validates the session token: checks if the token exists in the database
     * and returns the associated user data if valid.
     */
    if (url === "/api/auth/validate" && method === "GET") {
      var authH = headers["Authorization"] || "";
      var token = authH.indexOf("Bearer ") === 0 ? authH.substring(7) : authH;
      if (!token) return createResponse(401, { valid: false }, true);

      var sessions = userDbApi.getSessions();
      var session = sessions.find(function(s) { return s.token === token; });
      if (!session) return createResponse(401, { valid: false }, true);

      var users = userDbApi.getUsers();
      var user = users.find(function(u) { return u.id === session.userId; });
      if (!user) return createResponse(401, { valid: false }, true);

      return createResponse(200, {
        valid: true,
        user: { id: user.id, name: user.name, email: user.email }
      });
    }

    return createResponse(404, "Route not found", true);
  }

  /**
   * Public API: Exposes the handleRequest method to the outside world (Dispatcher).
   */
  return { handleRequest: handleRequest };
})();