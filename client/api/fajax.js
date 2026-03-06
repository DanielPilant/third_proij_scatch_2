/**
 * FAJAX - Fake AJAX layer using FXMLHttpRequest
 * Every request creates a new FXMLHttpRequest instance.
 * Supports automatic retry (max 3) on network drops.
 * Callbacks only — no Promises.
 */

var MAX_RETRIES = 3;

/**
 * FXMLHttpRequest - Mimics XMLHttpRequest for our simulated network.
 * Usage: var xhr = new FXMLHttpRequest();
 *        xhr.open(method, url);
 *        xhr.setRequestHeader(name, value);
 *        xhr.onload = function() { ... };
 *        xhr.onerror = function() { ... };
 *        xhr.send(body);
 */
function FXMLHttpRequest() {
  this.method = null;
  this.url = null;
  this.headers = {};
  this.status = 0;
  this.response = null;
  this.onload = null;
  this.onerror = null;
}

FXMLHttpRequest.prototype.open = function (method, url) {
  this.method = method;
  this.url = url;
};

FXMLHttpRequest.prototype.setRequestHeader = function (name, value) {
  this.headers[name] = value;
};

FXMLHttpRequest.prototype.send = function (body) {
  var self = this; // to capture "this" context for callbacks
  var req = {
    method: this.method, // "GET", "POST", etc.
    url: this.url, // "/api/tasks", "/api/auth/login", etc.
    headers: this.headers, // { "Authorization": "Bearer abc123", ... }
    body: body, // string or object (if object, will be JSON.stringified by network.send)
  };

  // Simulate network request using the provided network.send function
  network.send(
    req,
    function (response) {
      self.status = response.status;
      self.response = response.body;
      if (self.onload) self.onload();
    },
    function (err) {
      self.status = err.status || 0;
      self.response = err;
      if (self.onerror) self.onerror(err);
    },
  );
};

/**
 * fajax - High-level API client that uses FXMLHttpRequest internally.
 */
var fajax = (function () {
  var _token = null;

  function setToken(t) {
    _token = t;
  }
  function clearToken() {
    _token = null;
  }

  function request(method, url, body, onSuccess, onError, attempt) {
    attempt = attempt || 0;

    var xhr = new FXMLHttpRequest();
    xhr.open(method, url);
    if (_token) xhr.setRequestHeader("Authorization", "Bearer " + _token);

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        onSuccess({ status: xhr.status, data: xhr.response }); // onSuccess of auth.js
      } else if (xhr.status >= 500 && attempt < MAX_RETRIES) {
        request(method, url, body, onSuccess, onError, attempt + 1);
      } else {
        var msg =
          (xhr.response && xhr.response.error && xhr.response.error.message) ||
          "Request failed";
        onError({ status: xhr.status, data: xhr.response, message: msg }); // onError of auth.js
      }
    };

    xhr.onerror = function () {
      if (attempt < MAX_RETRIES) {
        request(method, url, body, onSuccess, onError, attempt + 1);
      } else {
        onError({
          status: 0,
          message: "Network error after " + MAX_RETRIES + " retries",
        });
      }
    };

    xhr.send(body ? JSON.stringify(body) : null);
  }

  return {
    setToken: setToken,
    clearToken: clearToken,
    get: function (url, onSuccess, onError) {
      request("GET", url, null, onSuccess, onError);
    },
    post: function (url, body, onSuccess, onError) {
      request("POST", url, body, onSuccess, onError);
    },
    put: function (url, body, onSuccess, onError) {
      request("PUT", url, body, onSuccess, onError);
    },
    del: function (url, onSuccess, onError) {
      request("DELETE", url, null, onSuccess, onError);
    },
  };
})();
