// maddie.dog — lightbox viewer (progressive enhancement; grid works without JS)
(function () {
  var dialog = document.getElementById('lightbox');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  var links = Array.prototype.slice.call(document.querySelectorAll('.tile-link'));
  if (!links.length) return;

  var img = dialog.querySelector('.lb-img');
  var cap = dialog.querySelector('.lb-caption');
  var date = dialog.querySelector('.lb-date');
  var count = dialog.querySelector('.lb-count');
  var current = 0;

  function fmtDate(iso) {
    var d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function show(n) {
    current = (n + links.length) % links.length;
    var a = links[current];
    var thumb = a.querySelector('img');
    img.src = a.getAttribute('href');
    img.alt = thumb ? thumb.alt : '';
    cap.textContent = a.dataset.caption || '';
    date.textContent = a.dataset.date ? fmtDate(a.dataset.date) : '';
    count.textContent = (current + 1) + ' / ' + links.length;
  }

  links.forEach(function (a, n) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      show(n);
      dialog.showModal();
    });
  });

  dialog.querySelector('.lb-prev').addEventListener('click', function () { show(current - 1); });
  dialog.querySelector('.lb-next').addEventListener('click', function () { show(current + 1); });
  dialog.querySelector('.lb-close').addEventListener('click', function () { dialog.close(); });

  dialog.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });

  // Click on the backdrop closes the viewer
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });

  dialog.addEventListener('close', function () { img.removeAttribute('src'); });
})();
