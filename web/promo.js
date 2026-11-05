// Animación promocional: una línea de tiempo de GSAP dirige once escenas, y también la música y los sonidos.
// Todo lo que se dibuja en canvas es función del tiempo de la línea de tiempo,
// así la animación se puede pausar, adelantar (?t=12) o grabar sin diferencias.
import * as THREE from 'three';
import { build } from './viewer3d.js';
import * as A from './promo-audio.js';

const { gsap, SplitText, DrawSVGPlugin } = window;
gsap.registerPlugin(SplitText, DrawSVGPlugin);
const R = window.RESEARCH;
const W = 1920, H = 1080;
const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
if (params.has('shot')) document.documentElement.classList.add('shot');

/* ---------- Escala del lienzo ---------- */
const fit = () => $('#stage').style.setProperty('--s', Math.min(innerWidth / W, innerHeight / H));
addEventListener('resize', fit); fit();

/* ---------- Azar con semilla: misma animación en cada carga ---------- */
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (p) => 1 - (1 - p) ** 3;
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- Estado que anima GSAP y lee el canvas ---------- */
const S = { spores: 0, myc: 0, mycA: 0, rainT: 0, rainA: 0, sweep: 0, cam: 0, gl: 0 };

/* ---------- Canvas 2D: esporas, micelio y lluvia de datos ---------- */
const cv = $('#bg'), g = cv.getContext('2d');

const spores = (() => { const r = rng(5); return Array.from({ length: 260 }, () => ({
  x: r() * W, y: r() * H, vy: 6 + r() * 22, amp: 8 + r() * 30, f: 0.2 + r() * 0.6, ph: r() * 6.28, rad: 0.8 + r() * 2.6, a: 0.12 + r() * 0.45 })); })();

// Micelio: caminatas al azar que se ramifican desde el borde inferior
const hyphae = (() => {
  const r = rng(21), segs = [];
  const grow = (x, y, ang, len, depth, t0) => {
    let t = t0;
    for (let i = 0; i < len; i++) {
      ang += (r() - 0.5) * 0.5;
      const nx = x + Math.cos(ang) * 9, ny = y + Math.sin(ang) * 9;
      segs.push({ x, y, nx, ny, t, w: Math.max(0.6, 2.4 - depth * 0.55) });
      x = nx; y = ny; t += 1;
      if (depth < 4 && r() < 0.07) grow(x, y, ang + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.7), Math.floor(len * (0.4 + r() * 0.4)), depth + 1, t);
      if (x < -40 || x > W + 40 || y < -40) break;
    }
  };
  const seeds = [[0.12, -1.25], [0.3, -1.6], [0.5, -1.5], [0.7, -1.7], [0.88, -1.9]];
  seeds.forEach(([fx, a]) => grow(W * fx, H + 10, a, 80, 0, 0));
  [[0, 0.75, -0.3], [W, 0.6, Math.PI + 0.3]].forEach(([x, fy, a]) => grow(x, H * fy, a, 60, 1, 10));
  const tmax = Math.max(...segs.map((s) => s.t));
  segs.forEach((s) => (s.t /= tmax));
  return segs;
})();

// Lluvia: 3.053 puntos (≈ 61.069 / 20), 55,5 % a la pila de venenosos
const rain = (() => {
  const r = rng(9), N = 3053, nTox = Math.round(N * 0.555), cols = 48, gap = 9, dots = [];
  for (let i = 0; i < N; i++) {
    const tox = i < nTox, k = tox ? i : i - nTox;
    const col = k % cols, row = Math.floor(k / cols);
    const x0 = tox ? 486 : 1004;
    dots.push({ tox, tx: x0 + col * gap, ty: 905 - row * gap, sx: r() * W, sy: -40 - r() * 500,
      d: (row / 38) * 2.6 + r() * 1.4 });
  }
  return dots.sort((a, b) => a.d - b.d);
})();

function draw2D(time) {
  g.clearRect(0, 0, W, H);
  // micelio
  if (S.mycA > 0.01) {
    g.lineCap = 'round';
    for (const s of hyphae) {
      if (s.t > S.myc) continue;
      const fresh = clamp((S.myc - s.t) * 12);
      g.strokeStyle = `rgba(214,206,186,${S.mycA * (0.12 + 0.28 * fresh)})`;
      g.lineWidth = s.w; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.nx, s.ny); g.stroke();
    }
    // puntas que brillan
    for (const s of hyphae) {
      const d = S.myc - s.t; if (d < 0 || d > 0.012) continue;
      g.fillStyle = `rgba(255,240,210,${S.mycA * 0.8})`; g.beginPath(); g.arc(s.nx, s.ny, 2.4, 0, 7); g.fill();
    }
  }
  // esporas
  if (S.spores > 0.01) {
    for (const p of spores) {
      const x = (p.x + Math.sin(time * p.f + p.ph) * p.amp + W) % W;
      const y = ((p.y - time * p.vy) % H + H) % H;
      g.fillStyle = `rgba(240,226,196,${p.a * S.spores})`;
      g.beginPath(); g.arc(x, y, p.rad, 0, 7); g.fill();
    }
  }
  // lluvia de datos
  if (S.rainA > 0.01) {
    for (const d of rain) {
      const p = clamp((S.rainT - d.d) / 0.9); if (p <= 0) continue;
      const e = easeOut(p);
      const x = lerp(d.sx, d.tx, e), y = lerp(d.sy, d.ty, p * p * (3 - 2 * p));
      g.fillStyle = p < 1 ? `rgba(200,195,184,${0.7 * S.rainA})` : (d.tox ? `rgba(240,122,69,${S.rainA})` : `rgba(74,149,238,${S.rainA})`);
      g.fillRect(x - 3.5, y - 3.5, 7, 7);
    }
  }
}

/* ---------- Escena 3D: los seis hongos se "tornean" desde su perfil ---------- */
const gl = (() => {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  $('#gl').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fff6e8', '#2a2620', 1.1));
  const key = new THREE.DirectionalLight('#ffe9cc', 2.8); key.position.set(-220, 320, 260); scene.add(key);
  const rim = new THREE.DirectionalLight('#9fc8ff', 1.6); rim.position.set(260, 160, -260); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(28, W / H, 1, 6000);

  const group = new THREE.Group(), meshes = [], gap = 34;
  const list = R.arquetipos;
  const widths = list.map((a) => Math.max(a.cap * 10, a.grosor * 2));
  const total = widths.reduce((s, w) => s + w, 0) + gap * (list.length - 1);
  let x = -total / 2;
  list.forEach((a, i) => {
    const m = build(a, 96); m.position.x = x + widths[i] / 2; x += widths[i] + gap;
    m.traverse((o) => { if (o.isMesh) meshes.push({ mesh: o, i, p: o.geometry.parameters }); });
    group.add(m);
  });
  scene.add(group);
  const bb = new THREE.Box3().setFromObject(group), c = bb.getCenter(new THREE.Vector3());
  const lastPhi = new Map();

  function render(time) {
    for (const m of meshes) {
      const p = clamp((S.sweep * (list.length + 2) - m.i) / 3);
      const phi = Math.max(0.0001, easeOut(p) * Math.PI * 2);
      if (Math.abs((lastPhi.get(m) ?? -1) - phi) < 1e-4) continue;
      lastPhi.set(m, phi);
      m.mesh.geometry.dispose();
      m.mesh.geometry = new THREE.LatheGeometry(m.p.points, m.p.segments, -Math.PI / 2, phi);
      m.mesh.visible = p > 0;
    }
    group.rotation.y = -0.22 + S.cam * 0.3;
    const d = lerp(720, 630, S.cam);
    camera.position.set(c.x + lerp(-80, 50, S.cam), c.y + lerp(150, 90, S.cam), d);
    camera.lookAt(c.x, c.y - 4, 0);
    renderer.render(scene, camera);
  }
  return { render };
})();

/* ---------- Gráficos (SVG armado con los datos de la investigación) ---------- */
const NS = 'http://www.w3.org/2000/svg';
const mk = (svg, tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; svg.appendChild(e); return e; };
const pct = (v) => `${Math.round(v * 100)} %`;
const BASE = R.stats.toxicos;

// Barras verticales: proporción de venenosos por categoría, con la línea del 55,5 %
function vbars(sel, items, { x0 = 520, x1 = 1400, bottom = 880, h = 600, valClass = 'val' } = {}) {
  const svg = $(`${sel} svg`), slot = (x1 - x0) / items.length, w = Math.min(240, slot * 0.62);
  mk(svg, 'line', { class: 'ax', x1: x0, y1: bottom, x2: x1, y2: bottom });
  const by = bottom - BASE * h;
  mk(svg, 'line', { class: 'base', x1: x0 - 20, y1: by, x2: x1 + 20, y2: by });
  items.forEach(([lab, v], i) => {
    const cx = x0 + slot * (i + 0.5), bh = v * h;
    mk(svg, 'rect', { class: 'cbar', x: cx - w / 2, y: bottom - bh, width: w, height: bh, rx: 4, fill: 'var(--tox)' });
    mk(svg, 'text', { class: `${valClass} num`, x: cx, y: bottom - bh - 24, 'text-anchor': 'middle' }, pct(v));
    mk(svg, 'text', { class: 'lbl num', x: cx, y: bottom + 50, 'text-anchor': 'middle' }, lab.toUpperCase());
  });
  mk(svg, 'text', { class: 'small bt', x: x1 + 36, y: by + 8 }, '55,5 % · todos los hongos');
}

// Barras horizontales con muestra de color
function hbars(sel, items, { x0 = 560, y0 = 290, row = 82, w = 700 } = {}) {
  const svg = $(`${sel} svg`), bx = x0 + BASE * w;
  mk(svg, 'line', { class: 'base', x1: bx, y1: y0 - 30, x2: bx, y2: y0 + items.length * row });
  items.forEach(([lab, v, col], i) => {
    const y = y0 + i * row, bh = row * 0.58;
    mk(svg, 'circle', { class: 'num', cx: x0 - 34, cy: y + bh / 2, r: 15, fill: col, stroke: 'rgba(255,255,255,.35)', 'stroke-width': 2 });
    mk(svg, 'text', { class: 'clabel num', x: x0 - 66, y: y + bh / 2 + 9, 'text-anchor': 'end' }, lab);
    mk(svg, 'rect', { class: 'cbar', x: x0, y, width: v * w, height: bh, rx: 4, fill: 'var(--tox)' });
    mk(svg, 'text', { class: 'cval num', x: x0 + v * w + 18, y: y + bh / 2 + 12 }, pct(v));
  });
  mk(svg, 'text', { class: 'small bt', x: bx, y: y0 - 44, 'text-anchor': 'middle' }, '55,5 %');
}

// Ejes comunes de los dos modelos de GeoGebra
function axes(svg, sx, sy, xt, yt, ylab, xmax, ymin, ymax, fmt) {
  mk(svg, 'line', { class: 'ax', x1: sx(0), y1: sy(ymin), x2: sx(xmax), y2: sy(ymin) });
  mk(svg, 'line', { class: 'ax', x1: sx(0), y1: sy(ymin), x2: sx(0), y2: sy(ymax) });
  xt.forEach((v) => mk(svg, 'text', { class: 'small num', x: sx(v), y: sy(ymin) + 40, 'text-anchor': 'middle' }, `${v} cm`));
  yt.forEach((v) => mk(svg, 'text', { class: 'small num', x: sx(0) - 18, y: sy(v) + 7, 'text-anchor': 'end' }, fmt(v)));
  mk(svg, 'text', { class: 'lbl num', x: sx(xmax), y: sy(ymin) + 85, 'text-anchor': 'end' }, 'DIÁMETRO DEL SOMBRERO');
  mk(svg, 'text', { class: 'lbl num', x: sx(0), y: sy(ymax) - 24, 'text-anchor': 'start' }, ylab);
}

vbars('#m1', [['Con anillo', R.rasgos.ring.datos['Con anillo']], ['Sin anillo', R.rasgos.ring.datos['Sin anillo']]]);
vbars('#m2', [['Se magulla', R.rasgos.bruise.datos['Se magulla']], ['No se magulla', R.rasgos.bruise.datos['No se magulla']]]);
const CC = R.rasgos.capColor.datos;
hbars('#m3', [['Verde', CC.Verde, '#5e8a3a'], ['Rojo', CC.Rojo, '#b8382c'], ['Naranja', CC.Naranja, '#df7a2a'],
  ['Blanco', CC.Blanco, '#efece4'], ['Marrón', CC.Marrón, '#8a6446'], ['Gris', CC.Gris, '#8f8f8f'], ['Crema', CC.Crema, '#e9dcb8']]);
const SE = R.rasgos.season.datos;
vbars('#m4', Object.entries(SE), { valClass: 'val val-s' });

// Modelo 2 (FitLog): proporción de venenosos según el diámetro
(() => {
  const svg = $('#g2 svg'), sx = (v) => 200 + v * 68.18, sy = (p) => 900 - (p - 0.30) * 1163.6;
  axes(svg, sx, sy, [0, 5, 10, 15, 20], [0.4, 0.6, 0.8], 'VENENOSOS', 22.5, 0.30, 0.86, (p) => `${Math.round(p * 100)} %`);
  R.modelo2.forEach(([x, p], i) => mk(svg, 'circle', { class: 'pt', cx: sx(x), cy: sy(p), r: 4 + Math.sqrt(R.modelo2n[i]) / 9, fill: 'rgba(238,236,230,.38)' }));
  const pts = []; for (let x = 0.42; x <= 22; x += 0.1) pts.push(`${sx(x).toFixed(1)},${sy(0.7395 - 0.1087 * Math.log(x)).toFixed(1)}`);
  mk(svg, 'polyline', { class: 'curve', points: pts.join(' ') });
  [[3, '62 %'], [15, '45 %']].forEach(([x, t]) => {
    const p = 0.7395 - 0.1087 * Math.log(x);
    mk(svg, 'circle', { class: 'mk-in', cx: sx(x), cy: sy(p), r: 13, fill: 'var(--tox)', stroke: '#0f0f0e', 'stroke-width': 4 });
    mk(svg, 'text', { class: 'mk mk-in', x: sx(x) + 26, y: sy(p) + (x === 3 ? -24 : 64) }, `p(${x}) ≈ ${t}`);
  });
})();

// Modelo 1 (FitLine): grosor del tallo según el diámetro, venenosos y comestibles
(() => {
  const svg = $('#g1 svg'), sx = (v) => 200 + v * 68.18, sy = (y) => 900 - y * 13.6;
  axes(svg, sx, sy, [0, 5, 10, 15, 20], [10, 20, 30, 40], 'GROSOR DEL TALLO', 22.5, 0, 44, (v) => `${v} mm`);
  const m = R.modelo1;
  m.comestibles.forEach(([x, y]) => mk(svg, 'circle', { class: 'pt', cx: sx(x), cy: sy(y), r: 9, fill: 'var(--ed)', opacity: 0.85 }));
  m.venenosos.forEach(([x, y]) => mk(svg, 'circle', { class: 'pt', cx: sx(x), cy: sy(y), r: 9, fill: 'var(--tox)', opacity: 0.85 }));
  [['var(--ed)', 1.786, 0.555], ['var(--tox)', 1.785, 0.163]].forEach(([c, a, b]) =>
    mk(svg, 'line', { class: 'curve', x1: sx(0), y1: sy(b), x2: sx(22), y2: sy(a * 22 + b), style: `stroke:${c}` }));
})();

/* ---------- QR ---------- */
const qr = qrcode(0, 'M'); qr.addData('https://rodrigomartinvg.github.io/informatica2/'); qr.make();
$('#qr').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });

/* ---------- Línea de tiempo ---------- */
// Espera fuentes e imágenes, pero nunca más de 3 s (en pestañas en segundo plano decode() puede no terminar)
const wait = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
await wait(document.fonts.ready, 3000);
await wait(Promise.all([...document.images].map((i) => i.decode().catch(() => {}))), 3000);

const words = (sel) => new SplitText(sel, { type: 'words' }).words;
const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'power3.out' }, paused: true });
const FT = { immediateRender: false };
const N = { v: 0 };
const cue = (fn, at) => tl.call(fn, null, at); // sonido sincronizado con un momento de la animación

// Cada escena aparece en T, se sostiene `dur` segundos y se va con un fundido; la siguiente empieza 0,4 s después.
let T = 0;
function scene(sel, dur, build) {
  const at = T;
  tl.set(sel, { visibility: 'visible', opacity: 1 }, at);
  build(at);
  tl.to(sel, { opacity: 0, duration: 0.7, ease: 'power2.in' }, at + dur - 0.7).set(sel, { visibility: 'hidden' }, at + dur);
  T = at + dur + 0.4;
}

// Entrada común de las escenas con gráfico
function chartIn(sel, at, { stamp = true, strong = true, chord, values = [] } = {}) {
  cue(() => A.chord(chord, 10.5), at);
  cue(() => A.bars(values), at + 1.4);
  tl.from(`${sel} .k-top`, { opacity: 0, x: -20, duration: 0.8 }, at);
  tl.from(words(`${sel} h2`), { opacity: 0, y: 50, stagger: 0.12, duration: 1 }, at + 0.2);
  tl.from(`${sel} .ax`, { drawSVG: 0, duration: 0.8 }, at + 1.0);
  tl.from(`${sel} .cbar`, { scale: 0, transformOrigin: sel === '#m3' ? '0% 50%' : '50% 100%', stagger: 0.15, duration: 1.3, ease: 'power4.out' }, at + 1.4);
  tl.from(`${sel} .num`, { opacity: 0, y: 14, stagger: 0.04, duration: 0.6 }, at + 2.2);
  tl.from(`${sel} .base`, { scale: 0, transformOrigin: sel === '#m3' ? '50% 0%' : '0% 50%', duration: 1, ease: 'power2.inOut' }, at + 3.0);
  tl.from(`${sel} .bt`, { opacity: 0, duration: 0.6 }, at + 3.7);
  if (stamp) {
    tl.from(`${sel} .stamp`, { opacity: 0, scale: 3, rotate: 8, duration: 0.5, ease: 'power4.in' }, at + 4.5);
    tl.to(`${sel} .plot`, { x: -6, duration: 0.05, yoyo: true, repeat: 3, ease: 'none' }, at + 5.0);
    cue(() => A.stamp(strong), at + 4.95);
  }
  tl.from(`${sel} .aside`, { opacity: 0, y: 20, duration: 0.8 }, at + 5.3);
}

// 1 · La pregunta
tl.set(S, { mycA: 1, myc: 0 }, 0);
tl.fromTo(S, { spores: 0 }, { spores: 1, duration: 1.8, ease: 'none' }, 0);
tl.fromTo(S, { myc: 0 }, { myc: 1, duration: 6.5, ease: 'power1.inOut' }, 0);
const t1 = new SplitText('#t1', { type: 'chars,words' });
scene('#s1', 7.5, (at) => {
  cue(() => A.chord('intro', 8), at);
  cue(() => A.bells(t1.chars.length, 0.05, 0, 5), at + 1.1);
  tl.from('#s1 .kicker', { opacity: 0, y: 20, duration: 1 }, at + 0.6);
  tl.from(t1.chars, { opacity: 0, yPercent: 70, rotateX: -80, transformOrigin: '50% 100%', stagger: 0.05, duration: 1.1 }, at + 1.1);
  tl.to(S, { mycA: 0.22, duration: 1.2 }, at + 6.6);
});

// 2 · A o B
scene('#s2', 9, (at) => {
  cue(() => A.chord('ab', 9.5), at);
  cue(() => A.whoosh(1.4), at);
  cue(() => A.dread(), at + 1.75);
  cue(() => A.chime(3, 5), at + 3.6);
  tl.fromTo('#fa', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out', ...FT }, at);
  tl.fromTo('#fb', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out', ...FT }, at + 0.3);
  tl.fromTo('#s2 img', { scale: 1.25 }, { scale: 1, duration: 9, ease: 'power1.out', ...FT }, at);
  tl.from('#s2 .l', { opacity: 0, x: -30, stagger: 0.25, duration: 0.8 }, at + 0.9);
  tl.from(words('#t2'), { opacity: 0, y: 50, stagger: 0.15, duration: 1 }, at + 1.4);
  tl.from('#s2 .credit', { opacity: 0, duration: 0.8 }, at + 2.2);
  tl.from('#tag2', { opacity: 0, scale: 0.6, duration: 0.6, ease: 'back.out(2)' }, at + 3.6);
});

// 3 · Los datos
scene('#s3', 10, (at) => {
  cue(() => A.chord('datos', 10.5), at);
  cue(() => A.rain(6), at);
  cue(() => A.chime(0, 4), at + 5.2);
  cue(() => A.chime(2, 5), at + 5.5);
  tl.fromTo(S, { rainA: 0 }, { rainA: 1, duration: 0.4, ...FT }, at);
  tl.fromTo(S, { rainT: 0 }, { rainT: 5.2, duration: 6, ease: 'none', ...FT }, at);
  tl.fromTo(N, { v: 0 }, { v: 61069, duration: 4.5, ease: 'power2.out', ...FT }, at + 0.1);
  tl.from('#sub3', { opacity: 0, y: 20, duration: 0.8 }, at + 1);
  tl.from('#s3 .note', { opacity: 0, duration: 0.8 }, at + 1.6);
  tl.from('#s3 .pile', { opacity: 0, y: 30, stagger: 0.3, duration: 0.9 }, at + 5.2);
  tl.to(S, { rainA: 0, duration: 0.7, ease: 'power2.in' }, at + 9.3);
});

// 4–7 · Los mitos
const RS = R.rasgos;
scene('#m1', 10, (at) => chartIn('#m1', at, { chord: 'm1', values: Object.values(RS.ring.datos) }));
scene('#m2', 10, (at) => chartIn('#m2', at, { chord: 'm2', values: Object.values(RS.bruise.datos) }));
scene('#m3', 11, (at) => chartIn('#m3', at, { chord: 'm3', strong: false, values: ['Verde', 'Rojo', 'Naranja', 'Blanco', 'Marrón', 'Gris', 'Crema'].map((c) => RS.capColor.datos[c]) }));
scene('#m4', 10, (at) => chartIn('#m4', at, { chord: 'm4', strong: false, values: Object.values(RS.season.datos) }));

// 8 · GeoGebra, modelo logarítmico
scene('#g2', 11, (at) => {
  const logp = (x) => 0.7395 - 0.1087 * Math.log(x), norm = (p) => (p - 0.3) / 0.55;
  cue(() => A.chord('g2', 11.5), at);
  cue(() => A.pops(R.modelo2.map(([, p]) => norm(p))), at + 1.3);
  cue(() => A.trace(Array.from({ length: 24 }, (_, i) => norm(logp(0.42 + (21.58 * i) / 23))), 2.4), at + 2.6);
  cue(() => A.chime(4, 5), at + 5.2);
  cue(() => A.chime(1, 5), at + 5.45);
  tl.from('#g2 .k-top', { opacity: 0, x: -20, duration: 0.8 }, at);
  tl.from(words('#g2 h2'), { opacity: 0, y: 50, stagger: 0.1, duration: 1 }, at + 0.2);
  tl.from('#g2 .ax', { drawSVG: 0, duration: 0.8 }, at + 0.8);
  tl.from('#g2 .num', { opacity: 0, duration: 0.6, stagger: 0.03 }, at + 1.0);
  tl.from('#g2 .pt', { opacity: 0, scale: 0, transformOrigin: '50% 50%', stagger: 0.05, duration: 0.5, ease: 'back.out(2)' }, at + 1.3);
  tl.from('#g2 .curve', { drawSVG: 0, duration: 2.4, ease: 'power2.inOut' }, at + 2.6);
  tl.from('#g2 .formula', { opacity: 0, y: 20, duration: 0.8 }, at + 3.8);
  tl.from('#g2 .mk-in', { opacity: 0, scale: 0.4, transformOrigin: '50% 50%', stagger: 0.25, duration: 0.6, ease: 'back.out(2)' }, at + 5.2);
});

// 9 · GeoGebra, recta de mínimos cuadrados
scene('#g1', 11, (at) => {
  cue(() => A.chord('g1', 11.5), at);
  cue(() => A.pops([...R.modelo1.comestibles, ...R.modelo1.venenosos].map(([, y]) => y / 44), 0.03), at + 1.4);
  const line = Array.from({ length: 12 }, (_, i) => 0.05 + (0.85 * i) / 11);
  cue(() => A.trace(line, 1.8, 0), at + 3.0);
  cue(() => A.trace(line, 1.8, 1), at + 3.5);
  tl.from('#g1 .k-top', { opacity: 0, x: -20, duration: 0.8 }, at);
  tl.from(words('#g1 h2'), { opacity: 0, y: 50, stagger: 0.12, duration: 1 }, at + 0.2);
  tl.from('#g1 .ax', { drawSVG: 0, duration: 0.8 }, at + 0.8);
  tl.from('#g1 .num', { opacity: 0, duration: 0.6, stagger: 0.03 }, at + 1.0);
  tl.from('#g1 .pt', { opacity: 0, scale: 0, transformOrigin: '50% 50%', stagger: 0.03, duration: 0.4, ease: 'back.out(2)' }, at + 1.4);
  tl.from('#g1 .curve', { drawSVG: 0, stagger: 0.5, duration: 1.8, ease: 'power2.inOut' }, at + 3.0);
  tl.from('#g1 .formula', { opacity: 0, y: 20, duration: 0.8 }, at + 4.4);
  tl.from('#g1 .aside', { opacity: 0, y: 20, duration: 0.8 }, at + 5.4);
});

// 10 · 3D
scene('#s6', 10, (at) => {
  cue(() => A.chord('tres', 10.5), at);
  R.arquetipos.forEach((_, i) => cue(() => A.arp(i, 4), at + 0.2 + (5.5 * i) / (R.arquetipos.length + 2)));
  tl.fromTo(S, { gl: 0 }, { gl: 1, duration: 0.8, ...FT }, at);
  tl.fromTo(S, { sweep: 0 }, { sweep: 1, duration: 5.5, ease: 'none', ...FT }, at + 0.2);
  tl.fromTo(S, { cam: 0 }, { cam: 1, duration: 10, ease: 'sine.inOut', ...FT }, at);
  tl.from(words('#t6'), { opacity: 0, y: 40, stagger: 0.1, duration: 1 }, at + 0.4);
  tl.from('#names6', { opacity: 0, letterSpacing: '0.5em', duration: 1.4 }, at + 4.2);
  tl.to(S, { gl: 0, duration: 0.7, ease: 'power2.in' }, at + 9.3);
});

// 11 · Cierre
const t7 = new SplitText('#t7', { type: 'lines', mask: 'lines' });
scene('#s7', 11, (at) => {
  cue(() => A.chord('cierre', 3), at);
  cue(() => A.bells(4, 0.12, 2, 4), at + 0.3);
  cue(() => A.chord('final', 7.5), at + 2.2);
  cue(() => A.chime(0, 6), at + 2.7);
  tl.fromTo(S, { myc: 0 }, { myc: 1, duration: 6, ease: 'power1.inOut', ...FT }, at);
  tl.to(S, { mycA: 0.5, duration: 1.2 }, at);
  tl.from(t7.lines, { opacity: 0, yPercent: 100, stagger: 0.35, duration: 1.2 }, at + 0.3);
  tl.from('#cta7', { opacity: 0, y: 40, duration: 1 }, at + 2.2);
  tl.from('#qr', { opacity: 0, scale: 0.85, duration: 0.7, ease: 'back.out(2)' }, at + 2.7);
  tl.from('#warn7', { opacity: 0, duration: 1 }, at + 3.5);
  tl.to(S, { spores: 0, mycA: 0, duration: 1, ease: 'power2.in' }, at + 10);
});
tl.set({}, {}, T);

/* ---------- Dibujo por cuadro ---------- */
const nEl = $('#n'), glEl = $('#gl');
function frame() {
  const t = tl.time();
  draw2D(t);
  nEl.textContent = Math.round(N.v).toLocaleString('es-AR');
  glEl.style.opacity = S.gl;
  if (S.gl > 0.01) gl.render(t);
}
gsap.ticker.add(frame);

if (params.has('t')) { tl.seek(parseFloat(params.get('t'))); tl.pause(); frame(); }
else tl.play(0);
window.promo = { tl, frame };

/* ---------- Controles ---------- */
const playBtn = $('#b-play');
const toggle = () => { tl.paused(!tl.paused()); A.mute(tl.paused()); playBtn.textContent = tl.paused() ? 'Reproducir (espacio)' : 'Pausa (espacio)'; };
playBtn.onclick = toggle;
$('#b-restart').onclick = () => tl.restart();
const fs = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
$('#b-fs').onclick = fs;
addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  if (e.key === 'f' || e.key === 'F') fs();
  if (e.key === 'ArrowRight') tl.time(Math.min(tl.duration(), tl.time() + 2), true);
  if (e.key === 'ArrowLeft') tl.time(Math.max(0, tl.time() - 2), true);
  if (e.key === 'm' || e.key === 'M') soundToggle();
});

/* ---------- Sonido: el navegador exige un clic antes de reproducir audio ---------- */
const sndBtn = $('#b-snd'), startCard = $('#start');
const sndLabel = () => (sndBtn.textContent = A.isOn() ? 'Sonido: sí (M)' : 'Sonido: no (M)');
async function soundOn() { await A.enable(); A.mute(tl.paused()); startCard.hidden = true; sndLabel(); }
async function soundToggle() { if (A.isOn()) { A.off(); sndLabel(); } else await soundOn(); }
sndBtn.onclick = (e) => { e.stopPropagation(); soundToggle(); };
startCard.onclick = async () => { await soundOn(); tl.restart(); };

/* ---------- Grabar un loop completo como video (WebM) ---------- */
const hint = $('#hint');
$('#b-rec').onclick = async () => {
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' });
  } catch { hint.textContent = 'Grabación cancelada.'; hint.style.display = 'block'; setTimeout(() => (hint.style.display = 'none'), 2500); return; }
  document.documentElement.classList.add('rec');
  const type = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const audio = A.isOn() ? A.stream() : null;
  if (audio) audio.getAudioTracks().forEach((t) => stream.addTrack(t));
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 12e6 }), chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    document.documentElement.classList.remove('rec');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
    a.download = 'promo_hongos.webm'; a.click();
  };
  await new Promise((r) => setTimeout(r, 400));
  tl.restart(); rec.start();
  setTimeout(() => rec.stop(), tl.duration() * 1000 + 300);
};
