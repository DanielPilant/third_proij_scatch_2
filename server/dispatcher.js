/**
 * Dispatcher - Routes incoming requests to the specific server.
 * Routes starting with /api/auth go to authServer.
 * Routes starting with /api/tasks go to appServer.
 */
var dispatcher = {
  handleRequest: function (req) {
    var url = req.url || "";

    if (url.indexOf("/api/auth") === 0) {
      return authServer.handleRequest(req);
    }

    if (url.indexOf("/api/tasks") === 0) {
      return appServer.handleRequest(req);
    }

    return {
      status: 404,
      body: { success: false, error: { message: "Dispatcher: Endpoint not found" } },
    };
  },
};