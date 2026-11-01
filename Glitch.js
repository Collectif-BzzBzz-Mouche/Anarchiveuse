// Fonds glitch animés, 3 effets différents selon la page.
// Couleur de fond au choix : ajouter data-bg="noir" (ou "blanc", "brun", "violet"...)
//   <div class="glitch-bg glitch-bg--scan" data-bg="noir"></div>
// Grain et flou (facultatifs) : data-grain="0.15" (0 à 1) et data-blur="2" (en px)
//   <div class="glitch-bg glitch-bg--scan" data-grain="0.15" data-blur="1.5"></div>
//   <div class="glitch-bg glitch-bg--bleu"></div>    -> Mouche   : taches "datamosh"
//   <div class="glitch-bg glitch-bg--scan"></div>    -> Machine  : écran cathodique / scanlines
//   <div class="glitch-bg glitch-bg--mosaic"></div>  -> Archives : mosaïque compressée
(() => {
  'use strict';

  /* ============================================================
     THÈMES : effet + couleurs + cadence (à modifier ici)
     Les couleurs sont les variables --g-xxx de Glitch.css
  ============================================================ */
  // Chaque thème accepte aussi, en option, grain: 0.12 et blur: 1.5 (valeurs par défaut du thème).
  // data-grain / data-blur sur le <div> ont priorité.
  const THEMES = {
    // --- effet "datamosh" (Mouche) : 4 variantes de palette ---
    bleu:   { effect: 'datamosh', fps: 8,  colors: { bg: 'blanc',  a: 'bleu',   dark: 'brun', blk: ['violet', 'bleu', 'blanc'] } },
    violet: { effect: 'datamosh', fps: 8,  colors: { bg: 'violet', a: 'bleu',   dark: 'brun', blk: ['blanc', 'vert', 'bleu']   } },
    vert:   { effect: 'datamosh', fps: 8,  colors: { bg: 'blanc',  a: 'vert',   dark: 'brun', blk: ['violet', 'vert', 'blanc'] } },
    sombre: { effect: 'datamosh', fps: 8,  colors: { bg: 'brun',   a: 'violet', dark: 'bleu', blk: ['vert', 'bleu', 'blanc']   } },

    // --- effet "scan" (Machine) : fond sombre, lignes de balayage, bruit et barre de suivi ---
    scan:   { effect: 'scan',     fps: 12, colors: { bg: 'brun', lines: ['vert', 'violet', 'bleu'], noise: ['blanc', 'bleu', 'vert'] } },

    // --- effet "mosaic" (Anarchives) : cases de pixels, déchirures, blocs figés ---
    mosaic: { effect: 'mosaic',   fps: 6,  colors: { bg: 'blanc', levels: ['bleu', 'violet', 'rose'], dark: 'brun', blocks: ['rose', 'vert', 'violet', 'bleu'] } }
  };

  const FALLBACK = { violet: '#7562C7', vert: '#B6F772', bleu: '#95D8EF', brun: '#463838', blanc: '#ffffff', rose: '#E967DB', noir: '#000000' };

  /* ============================================================
     OUTILS PARTAGÉS
  ============================================================ */

  // --- Bruit (texture de base, calculée une seule fois) ---
  const N = 256;
  const noise = new Float32Array(N * N);

  // <noise>
  function buildNoise(out, N) {
    const octaves = [[4, 0.6], [8, 0.8], [16, 0.7], [32, 0.5], [64, 0.35]];
    out.fill(0);
    for (const [g, amp] of octaves) {
      const grid = new Float32Array(g * g);
      for (let i = 0; i < grid.length; i++) grid[i] = Math.random();
      for (let y = 0; y < N; y++) {
        const gy = (y / N) * g, y0 = Math.floor(gy), fy = gy - y0;
        const sy = fy * fy * (3 - 2 * fy), y1 = (y0 + 1) % g;
        for (let x = 0; x < N; x++) {
          const gx = (x / N) * g, x0 = Math.floor(gx), fx = gx - x0;
          const sx = fx * fx * (3 - 2 * fx), x1 = (x0 + 1) % g;
          const a = grid[y0 * g + x0], b = grid[y0 * g + x1];
          const c = grid[y1 * g + x0], d = grid[y1 * g + x1];
          out[y * N + x] += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
        }
      }
    }
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < out.length; i++) { if (out[i] < min) min = out[i]; if (out[i] > max) max = out[i]; }
    const k = 1 / (max - min);
    for (let i = 0; i < out.length; i++) out[i] = (out[i] - min) * k;
  }
  // </noise>

  buildNoise(noise, N);
  const sorted = Float32Array.from(noise).sort();
  const pct = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

  // --- Aléatoire rapide ---
  let seed = 123456789;
  const rnd = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const pick = arr => arr[(rnd() * arr.length) | 0];

  // --- Couleurs : "bleu" -> [r, g, b], tableaux et objets résolus récursivement ---
  const css = getComputedStyle(document.documentElement);
  const color = name => {
    const h = (css.getPropertyValue('--g-' + name).trim() || FALLBACK[name]).replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const resolve = v =>
    typeof v === 'string' ? color(v)
    : Array.isArray(v) ? v.map(resolve)
    : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x)]));

  // --- Changer la couleur de fond d'un thème ---
  const lum = c => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const isColor = v => Array.isArray(v) && typeof v[0] === 'number';
  function withBackground(C, nb) {
    const old = C.bg;
    // une couleur du thème identique au nouveau fond deviendrait invisible : on la remplace par l'ancien fond
    const swap = v =>
      isColor(v) ? ((v[0] === nb[0] && v[1] === nb[1] && v[2] === nb[2]) ? old : v)
      : Array.isArray(v) ? v.map(swap)
      : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)]));
    const out = swap(C);
    out.bg = nb;
    // sur fond sombre, les points "sombres" deviennent clairs
    if (out.dark && lum(nb) < 60 && lum(out.dark) < 110) out.dark = color('blanc');
    return out;
  }

  // --- Grain : bruit clair/foncé ajouté à chaque pixel (amount de 0 à 1) ---
  function addGrain(s, amount) {
    const { W, H, d } = s;
    const a = amount * 255 * 2;
    for (let q = 0, n = W * H * 4; q < n; q += 4) {
      const g = (rnd() - 0.5) * a;
      d[q] += g; d[q + 1] += g; d[q + 2] += g;   // d est borné à 0-255 automatiquement
    }
  }

  // --- Dessin : rectangle plein, décalage horizontal d'une ligne ---
  function fillRect(s, x, y, w, h, c) {
    const { W, H, d } = s;
    const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0);
    const x1 = Math.min(W, (x + w) | 0), y1 = Math.min(H, (y + h) | 0);
    for (let yy = y0; yy < y1; yy++) {
      let q = (yy * W + x0) * 4;
      for (let xx = x0; xx < x1; xx++, q += 4) { d[q] = c[0]; d[q + 1] = c[1]; d[q + 2] = c[2]; d[q + 3] = 255; }
    }
  }
  function shiftRow(s, y, k) {
    const { W, d } = s;
    const rs = y * W * 4;
    if (k > 0 && k < W) d.copyWithin(rs + k * 4, rs, rs + (W - k) * 4);
    else if (k < 0 && -k < W) d.copyWithin(rs, rs - k * 4, rs + W * 4);
  }

  /* ============================================================
     EFFET 1 : DATAMOSH (Mouche)
     taches bleutées granuleuses, étirements horizontaux, blocs violets
  ============================================================ */
  const COVER = 0.22, DARK = 1.4, JITTER = 0.10, SPECK = 0.003;
  const TA = pct(1 - COVER), INV = 1 / (1 - TA);
  const BL1 = pct(0.35), BL2 = pct(0.65);

  function datamosh(s, C) {
    const cMid = C.a.map((v, i) => Math.round(v * 0.65 + C.dark[i] * 0.35));
    let ox = 0, oy = 0, blocks = [], first = true;
    let rowShift, run0, runLen;

    function spawnBlock(W, H) {
      const w = W * (0.25 + rnd() * 0.25), h = H * (0.15 + rnd() * 0.25);
      return {
        x: rnd() * (W - w), y: rnd() * (H - h), w, h,
        life: 4 + ((rnd() * 12) | 0),
        ox: (rnd() * N) | 0, oy: (rnd() * N) | 0,
        line: rnd() < 0.5 ? ((rnd() * w) | 0) : -1
      };
    }

    return function frame() {
      const { W, H, d } = s;
      if (!rowShift || rowShift.length !== H) {
        rowShift = new Int16Array(H); run0 = new Int16Array(H); runLen = new Int16Array(H);
      }

      ox += 1;
      if (rnd() < 0.15) { ox += ((rnd() - 0.5) * 60) | 0; oy += ((rnd() - 0.5) * 30) | 0; }

      rowShift.fill(0); runLen.fill(0);
      const bands = 6 + ((rnd() * 8) | 0);
      for (let i = 0; i < bands; i++) {
        const y0 = (rnd() * H) | 0;
        const h = 1 + ((rnd() * H * 0.025) | 0);
        const shift = ((rnd() - 0.5) * W * 0.12) | 0;
        const smear = rnd() < 0.7;
        const s0 = (rnd() * W) | 0;
        const sl = (W * 0.04 + rnd() * W * 0.3) | 0;
        for (let y = y0; y < Math.min(H, y0 + h); y++) {
          rowShift[y] = shift;
          if (smear) { run0[y] = s0; runLen[y] = sl; }
        }
      }

      let p = 0;
      for (let y = 0; y < H; y++) {
        const ny = ((y + oy) & 255) * N;
        const sh = rowShift[y], r0 = run0[y], rl = runLen[y];
        for (let x = 0; x < W; x++, p += 4) {
          const sx = (rl && x >= r0 && x < r0 + rl) ? r0 : x;
          const v = noise[ny + ((sx + ox + sh) & 255)] + (rnd() - 0.5) * JITTER;
          let c = C.bg;
          if (v > TA) {
            const t = (v - TA) * INV;
            if (rnd() < t * t * DARK) c = C.dark;
            else if (t > 0.35 && rnd() < 0.5) c = cMid;
            else c = C.a;
          } else if (rnd() < SPECK) c = C.dark;
          d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255;
        }
      }

      blocks = blocks.filter(b => --b.life > 0);
      if (blocks.length < 2 && (first || rnd() < 0.25)) blocks.push(spawnBlock(W, H));
      first = false;

      const [b0, b1, b2] = C.blk;
      for (const b of blocks) {
        const x0 = b.x | 0, y0 = b.y | 0;
        const x1 = Math.min(W, (b.x + b.w) | 0), y1 = Math.min(H, (b.y + b.h) | 0);
        for (let y = y0; y < y1; y++) {
          const ny = ((y * 5 + b.oy) & 255) * N;
          const smear = rnd() < 0.28;
          let x = x0;
          while (x < x1) {
            const run = smear ? 4 + ((rnd() * 30) | 0) : 1;
            const xe = Math.min(x1, x + run);
            const v = noise[ny + ((x * 5 + b.ox) & 255)] + (rnd() - 0.5) * 0.22;
            let c = v < BL1 ? b0 : v < BL2 ? b1 : b2;
            if (rnd() < 0.015) c = C.dark;
            for (let xx = x; xx < xe; xx++) {
              const q = (y * W + xx) * 4;
              d[q] = c[0]; d[q + 1] = c[1]; d[q + 2] = c[2];
            }
            x = xe;
          }
          if (b.line >= 0 && x0 + b.line + 1 < W) {
            for (let k = 0; k < 2; k++) {
              const q = (y * W + x0 + b.line + k) * 4;
              d[q] = b2[0]; d[q + 1] = b2[1]; d[q + 2] = b2[2];
            }
          }
        }
      }
    };
  }

  /* ============================================================
     EFFET 2 : SCAN (Machine)
     fond sombre, lignes de balayage, parasites, traits de couleur
     décalés et barre de suivi (tracking) qui descend
  ============================================================ */
  function scan(s, C) {
    let bar = 0;
    const darkBg = lum(C.bg) < 60;

    return function frame() {
      const { W, H, d } = s;
      const bh = Math.max(6, (H * 0.14) | 0);

      // 1. fond + lignes de balayage (une ligne sur trois plus sombre)
      for (let y = 0; y < H; y++) {
        // une ligne sur trois : plus sombre sur fond clair, plus claire sur fond noir
        const on = y % 3 === 0;
        const k = on && !darkBg ? 0.72 : 1, add = on && darkBg ? 22 : 0;
        const r = Math.min(255, (C.bg[0] * k + add) | 0), g = Math.min(255, (C.bg[1] * k + add) | 0), b = Math.min(255, (C.bg[2] * k + add) | 0);
        let q = y * W * 4;
        for (let x = 0; x < W; x++, q += 4) { d[q] = r; d[q + 1] = g; d[q + 2] = b; d[q + 3] = 255; }
      }

      // 2. parasites : petits traits clairs
      const n = (W * H * 0.012) | 0;
      for (let i = 0; i < n; i++) fillRect(s, rnd() * W, rnd() * H, 1 + ((rnd() * 8) | 0), 1, pick(C.noise));

      // 3. traits de couleur
      const nl = 3 + ((rnd() * 6) | 0);
      for (let i = 0; i < nl; i++) {
        fillRect(s, rnd() * W * 0.7, rnd() * H, W * (0.1 + rnd() * 0.6), 1 + ((rnd() * 3) | 0), pick(C.lines));
      }

      // 4. bandes qui se décalent (déchirure horizontale)
      const nb = 2 + ((rnd() * 3) | 0);
      for (let i = 0; i < nb; i++) {
        const y0 = (rnd() * H) | 0, h = 3 + ((rnd() * 10) | 0);
        const k = ((rnd() - 0.5) * W * 0.12) | 0;
        for (let y = y0; y < Math.min(H, y0 + h); y++) shiftRow(s, y, k);
      }

      // 5. barre de suivi : bruit dense qui descend l'écran
      bar += H * (0.02 + rnd() * 0.03);
      if (bar > H) bar = -bh;
      const yb0 = Math.max(0, bar | 0), yb1 = Math.min(H, (bar + bh) | 0);
      for (let y = yb0; y < yb1; y++) {
        shiftRow(s, y, ((rnd() - 0.5) * W * 0.08) | 0);
        let q = y * W * 4;
        for (let x = 0; x < W; x++, q += 4) {
          if (rnd() < 0.45) continue;
          const c = pick(C.noise);
          d[q] = c[0]; d[q + 1] = c[1]; d[q + 2] = c[2];
        }
      }
    };
  }

  /* ============================================================
     EFFET 3 : MOSAIC (Anarchives)
     image compressée en cases, déchirures horizontales et
     blocs de couleur "figés" qui apparaissent un instant
  ============================================================ */
  function mosaic(s, C) {
    const CELL = 6;
    const T1 = pct(0.66), T2 = pct(0.84), T3 = pct(0.94);
    let ox = 0, oy = 0, blocks = [];

    return function frame() {
      const { W, H, d } = s;

      // les cases glissent par sauts d'une case
      if (rnd() < 0.5) ox += (((rnd() * 3) | 0) - 1);
      if (rnd() < 0.25) oy += (((rnd() * 3) | 0) - 1);

      // 1. mosaïque : une couleur par case, selon le bruit
      const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
      for (let cy = 0; cy < rows; cy++) {
        const ny = (((cy * 3 + oy) & 255)) * N;
        for (let cx = 0; cx < cols; cx++) {
          const v = noise[ny + ((cx * 3 + ox) & 255)] + (rnd() - 0.5) * 0.12;
          let c = C.bg;
          if (v > T3) c = C.levels[2];
          else if (v > T2) c = C.levels[1];
          else if (v > T1) c = C.levels[0];
          else if (rnd() < 0.004) c = C.dark;
          fillRect(s, cx * CELL, cy * CELL, CELL, CELL, c);
        }
      }

      // 2. déchirures : un morceau de ligne copié depuis un autre endroit
      const nt = 4 + ((rnd() * 6) | 0);
      for (let i = 0; i < nt; i++) {
        const y0 = (rnd() * H) | 0, h = 2 + ((rnd() * 12) | 0);
        const x0 = (rnd() * W * 0.6) | 0;
        const w = Math.min(W - x0, (W * (0.2 + rnd() * 0.5)) | 0);
        const dx = ((rnd() - 0.5) * W * 0.4) | 0;
        const sx0 = Math.max(0, Math.min(W - w, x0 + dx));
        for (let y = y0; y < Math.min(H, y0 + h); y++) {
          d.copyWithin((y * W + x0) * 4, (y * W + sx0) * 4, (y * W + sx0 + w) * 4);
        }
      }

      // 3. blocs figés : rectangles de couleur alignés sur la grille
      blocks = blocks.filter(b => --b.life > 0);
      if (blocks.length < 3 && rnd() < 0.35) {
        blocks.push({
          x: CELL * ((rnd() * (cols - 4)) | 0), y: CELL * ((rnd() * (rows - 3)) | 0),
          w: CELL * (3 + ((rnd() * 10) | 0)), h: CELL * (2 + ((rnd() * 6) | 0)),
          life: 3 + ((rnd() * 8) | 0), c: pick(C.blocks)
        });
      }
      for (const b of blocks) fillRect(s, b.x, b.y, b.w, b.h, b.c);
    };
  }

  const EFFECTS = { datamosh, scan, mosaic };

  /* ============================================================
     UN FOND GLITCH : canvas + boucle d'animation
  ============================================================ */
  function init(bg) {
    const name = Object.keys(THEMES).find(n => bg.classList.contains('glitch-bg--' + n)) || 'bleu';
    const T = THEMES[name];
    let C = resolve(T.colors);
    if (bg.dataset.bg) C = withBackground(C, color(bg.dataset.bg));

    const canvas = document.createElement('canvas');
    bg.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const num = (v, fallback) => { const x = parseFloat(v); return isNaN(x) ? (fallback || 0) : x; };
    const grain = num(bg.dataset.grain, T.grain);   // 0 à 1
    const blur  = num(bg.dataset.blur,  T.blur);    // en px

    if (blur > 0) {
      // le flou rend les bords transparents : on agrandit le canvas pour les cacher
      const pad = Math.ceil(blur * 3);
      canvas.style.filter = 'blur(' + blur + 'px)';
      canvas.style.inset = '-' + pad + 'px';
      canvas.style.width = 'calc(100% + ' + (2 * pad) + 'px)';
      canvas.style.height = 'calc(100% + ' + (2 * pad) + 'px)';
    }

    const s = { W: 0, H: 0, d: null };
    const draw = EFFECTS[T.effect](s, C);
    let img;

    function resize() {
      const r = bg.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      const scale = Math.max(parseFloat(bg.dataset.scale) || 3, r.width / 640);
      s.W = Math.max(40, Math.round(r.width / scale));
      s.H = Math.max(20, Math.round(r.height / scale));
      canvas.width = s.W; canvas.height = s.H;
      img = ctx.createImageData(s.W, s.H);
      s.d = img.data;
      return true;
    }

    function frame() {
      if (!s.W) return;
      draw();
      if (grain > 0) addGrain(s, grain);
      ctx.putImageData(img, 0, 0);
    }

    const fps = parseFloat(bg.dataset.fps) || T.fps;
    let running = false, last = 0;
    function loop(t) {
      if (!running) return;
      if (t - last >= 1000 / fps) { last = t; frame(); }
      requestAnimationFrame(loop);
    }
    function setRunning(on) {
      if (still || on === running) return;
      running = on;
      if (on) requestAnimationFrame(loop);
    }

    new ResizeObserver(() => { if (resize()) frame(); }).observe(bg);
    new IntersectionObserver(entries => setRunning(entries[0].isIntersecting)).observe(bg);
  }

  function start() { document.querySelectorAll('.glitch-bg').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();