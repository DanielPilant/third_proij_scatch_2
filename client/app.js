/**
 * Boot - initializes the app after all modules are loaded
 */
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    initLogout();
    route();
  });
})();
