/**
 * Network Simulation Layer
 * Random 1-3 second delay + 20% packet drop rate.
 * Calls dispatcher.handleRequest on success, or onError on drop.
 */
var network = {
  send: function (request, onSuccess, onError) {
    var delay = Math.floor(Math.random() * 2000) + 1000; // 1000-3000 ms

    setTimeout(function () {
      // 20% chance of packet drop
      if (Math.random() < 0.2) {
        onError({ status: 0, message: "Network Error", dropped: true });
        return;
      }

      // Forward to dispatcher
      try {
        var response = dispatcher.handleRequest(request);
        onSuccess(response);
      } catch (err) {
        onError({ status: 500, message: err.message || "Server error" });
      }
    }, delay);
  },
};
