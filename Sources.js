// Chaque vignette ne contient que le lien.
// L'image mise en avant, le nom et l'année sont lus sur la page.
(function () {
  function phrase(texte) {
    const petits = { de: 1, du: 1, des: 1, d: 1, l: 1, à: 1, a: 1, au: 1, aux: 1, et: 1, le: 1, la: 1, les: 1, un: 1, une: 1, en: 1, sur: 1, sous: 1, par: 1, pour: 1, janvier: 1, février: 1, fevrier: 1, mars: 1, avril: 1, mai: 1, juin: 1, juillet: 1, août: 1, aout: 1, septembre: 1, octobre: 1, novembre: 1, décembre: 1, decembre: 1 };
    let i = 0;
    return String(texte).toLowerCase().replace(/[0-9a-zàâäéèêëïîôùûüçœ]+(?:['’][0-9a-zàâäéèêëïîôùûüçœ]+)?/gi, function (mot) {
      const idx = i++;
      const coupe = mot.split(/(['’])/);
      if (coupe.length === 3) {
        const gauche = (idx > 0 && petits[coupe[0]]) ? coupe[0] : coupe[0].charAt(0).toUpperCase() + coupe[0].slice(1);
        const droite = coupe[2].charAt(0).toUpperCase() + coupe[2].slice(1);
        return gauche + coupe[1] + droite;
      }
      if (idx > 0 && petits[mot]) return mot;
      return mot.charAt(0).toUpperCase() + mot.slice(1);
    });
  }

  function anneeDe(titre) {
    const coupe = titre.match(/^(.+?)\s[-–—]\s.+?\s[-–—]\s(\d{4})\s[-–—]/);
    if (coupe) return { nom: coupe[1].trim(), annee: coupe[2] };
    const y = titre.match(/\b(?:18|19|20)\d{2}\b/);
    return {
      nom: titre.split('|')[0].trim(),
      annee: y ? y[0] : ''
    };
  }

  function imageDe(meta) {
    if (!meta) return '';
    const brut = meta['og:image'] || meta['twitter:image'] || '';
    const liste = (Array.isArray(brut) ? brut : String(brut).split(/\s+/))
      .map(function (u) { return u.trim(); })
      .filter(Boolean);
    const photo = liste.find(function (u) {
      return u.indexOf('Logo-Cinearchives') === -1;
    });
    return photo || liste[0] || '';
  }

  function charger(url) {
    const cle = 'source-jina:' + url;
    try {
      const garde = sessionStorage.getItem(cle);
      if (garde) return Promise.resolve(JSON.parse(garde));
    } catch (e) {}
    return fetch('https://r.jina.ai/' + url, { headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('source');
        return r.json();
      })
      .then(function (res) {
        const data = (res && res.data) || {};
        const titre = data.title || '';
        const partie = anneeDe(titre);
        const info = {
          nom: phrase(partie.nom),
          annee: partie.annee,
          image: imageDe(data.metadata)
        };
        try { sessionStorage.setItem(cle, JSON.stringify(info)); } catch (e) {}
        return info;
      });
  }

  document.querySelectorAll('.grille-videos .vignette > a[href]').forEach(function (lien) {
    const url = lien.getAttribute('href');
    if (!url || !/^https?:/i.test(url)) return;
    charger(url).then(function (info) {
      const img = lien.querySelector('img');
      const annee = lien.querySelector('.annee');
      const nom = lien.querySelector('.titre');
      if (img && info.image) {
        img.referrerPolicy = 'no-referrer';
        img.src = info.image;
        img.alt = info.nom || '';
      }
      if (annee && info.annee) annee.textContent = info.annee;
      if (nom && info.nom) nom.textContent = info.nom;
    }).catch(function () {});
  });
})();
