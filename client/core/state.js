/**
 * Global State & Session Persistence
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

  function saveState() {
    sessionStorage.setItem(
      "tm_state",
      JSON.stringify({ user: state.user, token: state.token }),
    );
  }

  window.state = state;
  window.saveState = saveState;
})();
