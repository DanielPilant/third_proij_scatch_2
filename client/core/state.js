/**
 * Global State & Session Persistence - IIFE
 */
(function () {
  var state = { user: null, token: null };

  // Restore session from sessionStorage
  try {
    var saved = JSON.parse(sessionStorage.getItem("tm_state"));
    if (saved && saved.token) {
      state.user = saved.user;
      state.token = saved.token;
      fajax.setToken(saved.token);
    }
  } catch (e) {}

  // Save current state to sessionStorage
  function saveState() {
    sessionStorage.setItem(
      "tm_state",
      JSON.stringify({ user: state.user, token: state.token }), // only save necessary info
    );
  }

  window.state = state;
  window.saveState = saveState;
})();
