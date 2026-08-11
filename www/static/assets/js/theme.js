// maddie.dog — light/dark toggle. Dark is the default.
// The pre-paint snippet in <head> sets data-theme before first render.
(function () {
  var btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  var root = document.documentElement;

  function label() {
    var dark = root.dataset.theme !== 'light';
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  btn.addEventListener('click', function () {
    var next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try { localStorage.setItem('maddie-theme', next); } catch (e) {}
    label();
  });

  label();
})();
