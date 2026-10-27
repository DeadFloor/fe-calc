/* PWA glue: service worker registration, update toast, version label */
(function () {
  var v = self.APP_VERSION || "?";
  function setVer() { var el = document.getElementById("app-version"); if (el) el.textContent = "v" + v; }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setVer); else setVer();
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;

  function toast(reg) {
    if (document.getElementById("update-toast")) return;
    var b = document.createElement("button");
    b.id = "update-toast"; b.type = "button"; b.className = "update-toast";
    b.textContent = "Update available — tap to reload";
    b.addEventListener("click", function () { if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING"); else location.reload(); });
    document.body.appendChild(b);
  }
  var reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", function () { if (!reloading) { reloading = true; location.reload(); } });

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).then(function (reg) {
      if (reg.waiting && navigator.serviceWorker.controller) toast(reg);
      reg.addEventListener("updatefound", function () {
        var w = reg.installing; if (!w) return;
        w.addEventListener("statechange", function () { if (w.state === "installed" && navigator.serviceWorker.controller) toast(reg); });
      });
      // check for updates when the app comes back to the foreground
      document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") reg.update(); });
    }).catch(function (e) { console.warn("SW registration failed", e); });
  });
})();
