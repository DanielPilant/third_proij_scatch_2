/**
 * Network Simulation Layer
 * Random 1-3 second delay + 20% packet drop rate.
 * Calls dispatcher.handleRequest on success, or onError on drop.
 */
var network = {
  send: function (request, onSuccess, onError) {
    console.log("⬆️ [Network Out] " + request.method + " " + request.url);

    var delay = Math.floor(Math.random() * 2000) + 1000; // 1000-3000 ms

    setTimeout(function () {
      // 20% chance of packet drop
      if (Math.random() < 0.2) {
        console.log(
          "%c❌ [Network Drop] Packet lost for " + request.url,
          "color: #dc2626; font-weight: bold;",
        );
        onError({ status: 0, message: "Network Error", dropped: true });
        return;
      }

      // Forward to dispatcher
      try {
        var response = dispatcher.handleRequest(request);
        console.log(
          "%c⬇️ [Network In] " + response.status + " " + request.url,
          "color: #1ba339; font-weight: bold;",
        );
        onSuccess(response);
      } catch (err) {
        console.log(
          "%c🚨 [Network Error] 500 Server Crash on " + request.url,
          "color: red; font-weight: bold;",
        );
        onError({ status: 500, message: err.message || "Server error" });
      }
    }, delay);
  },
};
