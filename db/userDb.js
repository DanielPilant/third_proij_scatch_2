/**
 * User Database API - Handles Users and Sessions data.
 * Requirement: Separate database for user-related information.
 */
var userDbApi = (function () {
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
      }
    };
  })();