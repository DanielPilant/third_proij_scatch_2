/**
 * Auth Pages: Login, Register, Logout
 */
(function () {
  /* ======== LOGIN ======== */
  function initLogin() {
    $("login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = $("login-btn");
      btn.disabled = true;
      $("login-msg").textContent = "";
      $("login-msg").className = "msg";

      fajax.post(
        "/api/auth/login",
        {
          email: $("login-email").value.trim(),
          password: $("login-password").value,
        },
        function (res) {
          state.user = res.data.data.user;
          state.token = res.data.data.token;
          fajax.setToken(state.token);
          saveState();
          btn.disabled = false;
          location.hash = "#tasks";
        },
        function (err) {
          $("login-msg").textContent = err.message || "Login failed";
          $("login-msg").className = "msg msg-error";
          btn.disabled = false;
        },
      );
    });
  }

  /* ======== REGISTER ======== */
  function initRegister() {
    $("register-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = $("register-btn");
      btn.disabled = true;
      $("register-msg").textContent = "";
      $("register-msg").className = "msg";

      var pw = $("register-password").value;
      if (pw.length < 6) {
        $("register-msg").textContent =
          "Password must be at least 6 characters";
        $("register-msg").className = "msg msg-error";
        btn.disabled = false;
        return;
      }

      fajax.post(
        "/api/auth/register",
        {
          name: $("register-name").value.trim(),
          email: $("register-email").value.trim(),
          password: pw,
        },
        function (res) {
          state.user = res.data.data.user;
          state.token = res.data.data.token;
          fajax.setToken(state.token);
          saveState();
          btn.disabled = false;
          location.hash = "#tasks";
        },
        function (err) {
          $("register-msg").textContent = err.message || "Registration failed";
          $("register-msg").className = "msg msg-error";
          btn.disabled = false;
        },
      );
    });
  }

  /* ======== LOGOUT ======== */
  function initLogout() {
    $("logout-btn").addEventListener("click", function () {
      fajax.post(
        "/api/auth/logout",
        null,
        function () {},
        function () {},
      );
      state.user = null;
      state.token = null;
      fajax.clearToken();
      sessionStorage.removeItem("tm_state");
      location.hash = "#login";
    });
  }

  window.initLogin = initLogin;
  window.initRegister = initRegister;
  window.initLogout = initLogout;
})();
