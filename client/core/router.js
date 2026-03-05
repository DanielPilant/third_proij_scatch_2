/**
 * Helpers & Router
 */
(function () {
  function $(id) {
    return document.getElementById(id);
  }

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
      container.appendChild(tmpl.content.cloneNode(true));
    }
    $("navbar").style.display = name === "tasks" ? "flex" : "none";
  }

  function route() {
    var hash = location.hash.replace("#", "") || "login";

    if (hash === "tasks" && !state.token) {
      hash = "login";
    }
    if ((hash === "login" || hash === "register") && state.token) {
      hash = "tasks";
    }

    showPage(hash);

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
