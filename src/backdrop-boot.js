// Applies the visitor's saved 3D backdrop choice to <html data-backdrop> before first paint, so the page
// never flashes the wrong colour while the 3D engine loads. Light is the default; only an explicit saved
// 'dark' overrides it. Loaded as a classic render-blocking script in <head> (an inline script would be
// blocked by the CSP). The storage key must match BACKDROP_STORAGE_KEY in src/main.js.
(function () {
  var backdrop = 'light';
  try {
    if (window.localStorage.getItem('dinoverse-backdrop') === 'dark') backdrop = 'dark';
  } catch (err) {
    // Storage unavailable (privacy mode / disabled cookies): keep the light default.
  }
  document.documentElement.setAttribute('data-backdrop', backdrop);
})();
