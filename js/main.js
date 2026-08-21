/* ============================================================
   字卡 · 玻璃信使 — 启动入口
   ============================================================ */
(function () {
  function boot() {
    Store.load();
    applyTheme();
    Router.boot();
    AI.start();
    window.addEventListener('beforeunload', function () { Store.save(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
