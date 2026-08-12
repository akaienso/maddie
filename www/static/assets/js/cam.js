// maddie.dog — cam modal. Opens cam.maddie.dog in a dialog; plain link without JS.
(function () {
  var CAM_URL = 'https://cam.maddie.dog/';
  var TIMEOUT_MS = 10000;
  var MESSAGES = [
    'Oops. Maddie wandered off.',
    'Maddie is chasing a squirrel.',
    'Maddie is running with Oscar.',
    'Maddie is at the dog park.',
    'Maddie is mid-nap. Do not disturb.',
    'Maddie is out for a walk.',
    'Belly rub intermission. Back soon.',
    'Maddie is supervising snack preparation.'
  ];

  var dialog = document.getElementById('cam-modal');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  var frame = dialog.querySelector('.cam-frame');
  var iframe = dialog.querySelector('.cam-stream');
  var offline = dialog.querySelector('.cam-offline');
  var offlineMsg = dialog.querySelector('.cam-offline-msg');
  var timer = null;

  function startStream() {
    offline.hidden = true;
    iframe.hidden = false;
    iframe.src = CAM_URL + '?t=' + Date.now();
    clearTimeout(timer);
    timer = setTimeout(showOffline, TIMEOUT_MS);
  }

  function showOffline() {
    clearTimeout(timer);
    iframe.removeAttribute('src');
    iframe.hidden = true;
    offline.hidden = false;
    offlineMsg.textContent = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  }

  iframe.addEventListener('load', function () { clearTimeout(timer); });

  document.querySelectorAll('a[href*="cam.maddie.dog"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      dialog.showModal();
      startStream();
    });
  });

  dialog.querySelector('.cam-retry').addEventListener('click', startStream);
  dialog.querySelector('.cam-close').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', function () {
    clearTimeout(timer);
    iframe.removeAttribute('src');
    if (document.fullscreenElement) document.exitFullscreen();
  });

  dialog.querySelector('.cam-expand').addEventListener('click', function () {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    if (frame.requestFullscreen) {
      frame.requestFullscreen().then(function () {
        // Nudge phones into landscape where the browser allows it
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(function () {});
        }
      }).catch(function () {});
    }
  });
})();
