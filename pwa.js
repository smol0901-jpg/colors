/* PWA: регистрация сервис-воркера и кнопка «Установить приложение» (Android/ПК), подсказка для iOS. */
(function () {
  var base = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/pwa\.js.*$/, '') : './';
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register(base + 'sw.js').catch(function () {}); });
  }
  var ev = null, standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  function paint() {
    document.querySelectorAll('[data-install]').forEach(function (b) {
      b.hidden = standalone || !(ev || ios);
      if (!b.dataset.bound) {
        b.dataset.bound = 1;
        b.addEventListener('click', function () {
          if (ev) { ev.prompt(); ev.userChoice.finally(function () { ev = null; paint(); }); }
          else if (ios) alert('Чтобы установить: нажмите «Поделиться» в Safari и выберите «На экран Домой».');
        });
      }
    });
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); ev = e; paint(); });
  window.addEventListener('appinstalled', function () { standalone = true; ev = null; paint(); });
  document.addEventListener('DOMContentLoaded', paint);
  window.addEventListener('online', function () { document.documentElement.classList.remove('offline'); });
  window.addEventListener('offline', function () { document.documentElement.classList.add('offline'); });
})();
