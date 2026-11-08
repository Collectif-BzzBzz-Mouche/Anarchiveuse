/* Annonce d'expo, une seule fois par visiteur.
   Pour la prochaine date, changer KEY et le texte. */
(function () {
  var KEY = 'anarchiveuse-expo-60adada-2026-11';

  try {
    if (localStorage.getItem(KEY)) return;
    localStorage.setItem(KEY, '1');
  } catch (e) {}

  var style = document.createElement('style');
  style.textContent = [
    "@font-face {",
    "  font-family: 'BianzhidaiPearl';",
    "  src: url('fonts/bianzhidai_noBG-Pearl.woff') format('woff');",
    "  font-weight: normal;",
    "  font-style: normal;",
    "}",
    ".expo-pop {",
    "  position: fixed;",
    "  top: 0;",
    "  left: 0;",
    "  right: 0;",
    "  z-index: 100000;",
    "  display: flex;",
    "  flex-direction: column;",
    "  align-items: center;",
    "  gap: 0.02em;",
    "  margin: 0;",
    "  border: none;",
    "  background: #9583FF;",
    "  color: #ffffff;",
    "  font-family: 'BianzhidaiPearl', sans-serif;",
    "  font-size: clamp(11px, 2.2vw, 18px);",
    "  line-height: 1.15;",
    "  text-align: center;",
    "  padding: 0.35em 0.8em 0.4em;",
    "  animation: expo-pop-in 0.45s ease forwards;",
    "}",
    ".expo-pop.is-out {",
    "  animation: expo-pop-out 0.4s ease forwards;",
    "}",
    "@keyframes expo-pop-in {",
    "  from { transform: translateY(-100%); }",
    "  to { transform: translateY(0); }",
    "}",
    "@keyframes expo-pop-out {",
    "  from { transform: translateY(0); }",
    "  to { transform: translateY(-100%); }",
    "}",
    "@media (prefers-reduced-motion: reduce) {",
    "  .expo-pop, .expo-pop.is-out { animation: none; }",
    "}"
  ].join('\n');
  document.head.appendChild(style);

  var bar = document.createElement('button');
  bar.type = 'button';
  bar.className = 'expo-pop';
  bar.setAttribute('aria-label', "Exposée au 60ADADA, Saint-Denis, du 16 au 26 novembre 2026");
  bar.innerHTML = '<span>Exposée au 60ADADA, Saint-Denis</span><span>du 16 au 26 novembre 2026</span>';
  document.body.appendChild(bar);

  var removed = false;
  function remove() {
    if (removed) return;
    removed = true;
    bar.remove();
  }

  function hide() {
    if (bar.classList.contains('is-out')) return;
    bar.classList.add('is-out');
    bar.addEventListener('animationend', remove);
    setTimeout(remove, 500);
  }

  bar.addEventListener('click', hide);
  setTimeout(hide, 8000);
})();

/* Les liens hors du site s'ouvrent dans un nouvel onglet. */
(function () {
  function externe(a) {
    if (!a.href || a.hasAttribute('download')) return false;
    try {
      var url = new URL(a.href, location.href);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
      return url.origin !== location.origin;
    } catch (e) {
      return false;
    }
  }

  function marquer(a) {
    if (!externe(a)) return;
    a.target = '_blank';
    var rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
    if (rel.indexOf('noopener') === -1) rel.push('noopener');
    if (rel.indexOf('noreferrer') === -1) rel.push('noreferrer');
    a.setAttribute('rel', rel.join(' '));
  }

  function parcourir() {
    var liens = document.querySelectorAll('a[href]');
    for (var i = 0; i < liens.length; i++) marquer(liens[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', parcourir);
  } else {
    parcourir();
  }
})();
