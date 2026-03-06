/**
 * Application Database API - Handles Task data.
 * Requirement: Separate database for application-specific information.
 */
var appDbApi = (function () {
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
      getTasks: function () {
        return read("tm_tasks");
      },
      saveTasks: function (arr) {
        write("tm_tasks", arr);
      }
    };
  })();