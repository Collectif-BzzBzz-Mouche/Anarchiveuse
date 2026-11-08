// Le seul réglage est l'attribut data-youtube du template.
// Ce script en déduit la vidéo, son titre, et la miniature sur Anarchives.
(function () {
  function idYoutube(url) {
    if (!url) return '';
    const texte = url.trim();
    if (/^[\w-]{11}$/.test(texte)) return texte;
    try {
      const u = new URL(texte);
      const hote = u.hostname.replace(/^www\./, '');
      if (hote === 'youtu.be') {
        return (u.pathname.split('/').filter(Boolean)[0] || '');
      }
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const m = u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{11})/);
      return m ? m[1] : '';
    } catch (e) {
      return '';
    }
  }

  function miniature(id) {
    return 'https://i.ytimg.com/vi/' + id + '/sddefault.jpg';
  }

  const titres = new Map();
  function titre(id) {
    if (!titres.has(id)) {
      const watch = 'https://www.youtube.com/watch?v=' + id;
      titres.set(id, fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(watch))
        .then(function (r) {
          if (!r.ok) throw new Error('oembed');
          return r.json();
        })
        .then(function (data) { return data.title || ''; }));
    }
    return titres.get(id);
  }

  function poserMiniature(img, id) {
    img.onerror = function () {
      img.onerror = null;
      img.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
    };
    img.src = miniature(id);
  }

  const bloc = document.querySelector('.video-wrapper[data-youtube]');
  if (bloc) {
    const id = idYoutube(bloc.getAttribute('data-youtube'));
    const frame = bloc.querySelector('iframe');
    if (id && frame) {
      frame.src = 'https://www.youtube.com/embed/' + id
        + '?autoplay=1&loop=1&playlist=' + id + '&rel=0';
    }
    const cible = document.querySelector('.titre-anarchive, [data-titre-video]');
    if (id && frame) {
      titre(id).then(function (nom) {
        if (!nom) return;
        if (cible && !cible.textContent.trim()) cible.textContent = nom;
        frame.title = nom;
      }).catch(function () {});
    }
  }

  const pages = new Map();
  function lirePage(href) {
    if (!pages.has(href)) {
      pages.set(href, fetch(href).then(function (r) {
        if (!r.ok) throw new Error('page');
        return r.text();
      }).then(function (html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const lieu = doc.querySelector('[data-lieu]');
        const video = doc.querySelector('[data-youtube]');
        const titrePage = doc.querySelector('[data-titre-video]');
        return {
          lieu: lieu ? lieu.textContent.trim() : '',
          youtube: video ? (video.getAttribute('data-youtube') || '') : '',
          titre: titrePage ? titrePage.textContent.trim() : ''
        };
      }).catch(function () {
        return { lieu: '', youtube: '', titre: '' };
      }));
    }
    return pages.get(href);
  }

  function appliquer(lien, info) {
    const url = (info && info.youtube) || '';
    const id = idYoutube(url);
    const img = lien.querySelector('img');

    function poser(balise, texte) {
      if (!texte) return null;
      let overlay = lien.querySelector('.overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'overlay';
        lien.appendChild(overlay);
      }
      let el = overlay.querySelector(balise);
      if (!el) {
        el = document.createElement(balise);
        const lieu = overlay.querySelector('p');
        if (balise === 'h3' && lieu) overlay.insertBefore(el, lieu);
        else overlay.appendChild(el);
      }
      el.textContent = texte;
      return el;
    }

    if (info && info.lieu) poser('p', info.lieu);

    function poserNom(nom) {
      if (!nom) return;
      poser('h3', nom);
      if (img) img.alt = nom;
    }

    if (info && info.titre) poserNom(info.titre);
    if (!id) return;
    if (img) poserMiniature(img, id);
    if (info && info.titre) return;
    titre(id).then(poserNom).catch(function () {});
  }

  document.querySelectorAll('.grille > a').forEach(function (lien) {
    const href = lien.getAttribute('href') || '';
    const locale = href && !/^https?:/i.test(href) && !/youtu\.?be/.test(href);
    if (locale) lirePage(href).then(function (info) { appliquer(lien, info); });
    else appliquer(lien, null);
  });
})();
