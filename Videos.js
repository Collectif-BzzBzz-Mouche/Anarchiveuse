(function () {
  // GitHub Pages sert les fichiers Git LFS comme de petits pointeurs texte.
  // Les vrais mp4 sont sur media.githubusercontent.com, branche publiée.
  var DEPOT = 'https://media.githubusercontent.com/media/Collectif-BzzBzz-Mouche/Anarchiveuse/Remake/';

  function adresse(src) {
    if (!src || /^https?:/i.test(src)) return src;
    if (location.hostname.endsWith('github.io')) return DEPOT + src.replace(/^\.\//, '');
    return src;
  }

  window.brancherVideos = function (racine) {
    var zone = racine || document;
    zone.querySelectorAll('video source[data-src]').forEach(function (source) {
      if (source.getAttribute('data-branche') === '1') return;
      source.src = adresse(source.getAttribute('data-src'));
      source.setAttribute('data-branche', '1');
      var video = source.parentElement;
      if (!video || video.tagName !== 'VIDEO') return;
      video.load();
      if (video.autoplay) {
        var pending = video.play();
        if (pending && pending.catch) pending.catch(function () {});
      }
    });
  };
})();
