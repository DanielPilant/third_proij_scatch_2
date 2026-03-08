/**
 * Helpers & Router
 */
(function () {
  // Simple helper to get element by id
  function $(id) {
    return document.getElementById(id);
  }

  // Simple helper to.escape HTML special chars
  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  function showPage(name) {
    var container = $("view-container");
    container.innerHTML = "";
    var tmpl = document.getElementById("template-" + name);
    if (tmpl) {
      nodeTemplate = tmpl.content.cloneNode(true);
      container.appendChild(nodeTemplate);
    }
    $("navbar").style.display = name === "tasks" ? "flex" : "none";
  }

  function route() {
    var hash = location.hash.replace("#", "") || "login";

    // security: if user tries to access tasks page without token, redirect to login
    if (hash === "tasks" && !state.token) {
      hash = "login";
    }
    if ((hash === "login" || hash === "register") && state.token) {
      hash = "tasks";
    }

    // Show the page
    showPage(hash);

    // Call page-specific init if needed
    if (hash === "login") {
      window.initLogin();
    }
    if (hash === "register") {
      window.initRegister();
    }
    if (hash === "tasks") {
      window.initTaskForm();
      $("nav-user").textContent = state.user ? state.user.name : "";
      window.loadTasks();
    }
  }

  window.addEventListener("hashchange", route);

  window.$ = $;
  window.esc = esc;
  window.showPage = showPage;
  window.route = route;
})();
