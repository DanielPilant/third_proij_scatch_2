/**
 * Database Layer - Simple localStorage wrapper
 * Provides get/save methods for users, sessions, and tasks tables.
 */
var db = (function () {
  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      return [];
    }
  }

  function write(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  return {
    getUsers: function () {
      return read("tm_users");
    },
    saveUsers: function (arr) {
      write("tm_users", arr);
    },

    getSessions: function () {
      return read("tm_sessions");
    },
    saveSessions: function (arr) {
      write("tm_sessions", arr);
    },

    getTasks: function () {
      return read("tm_tasks");
    },
    saveTasks: function (arr) {
      write("tm_tasks", arr);
    },
  };
})();
