// Animación promocional: una línea de tiempo de GSAP dirige siete escenas.
// Todo lo que se dibuja en canvas es función del tiempo de la línea de tiempo,
// así la animación se puede pausar, adelantar (?t=12) o grabar sin diferencias.
import * as THREE from 'three';
import { build } from './viewer3d.js';

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

/* ---------- Gráfico de la escena 5 (modelo logarítmico de GeoGebra) ---------- */
(function plot5() {
  const sx = (v) => 200 + v * 68.18, sy = (p) => 900 - (p - 0.30) * 1163.6;
  const NS = 'http://www.w3.org/2000/svg', svg = $('#plot5');
  const el = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text) e.textContent = text; svg.appendChild(e); return e; };
  el('line', { class: 'ax ax5', x1: sx(0), y1: sy(0.30), x2: sx(22.5), y2: sy(0.30) });
  el('line', { class: 'ax ax5', x1: sx(0), y1: sy(0.30), x2: sx(0), y2: sy(0.86) });
  [0, 5, 10, 15, 20].forEach((v) => el('text', { class: 'small t5', x: sx(v), y: 940, 'text-anchor': 'middle' }, `${v} cm`));
  [0.4, 0.6, 0.8].forEach((p) => el('text', { class: 'small t5', x: sx(0) - 18, y: sy(p) + 7, 'text-anchor': 'end' }, `${Math.round(p * 100)} %`));
  el('text', { class: 'lbl t5', x: sx(22.5), y: 985, 'text-anchor': 'end' }, 'DIÁMETRO DEL SOMBRERO');
  R.modelo2.forEach(([x, p], i) => el('circle', { class: 'pt5', cx: sx(x), cy: sy(p), r: 4 + Math.sqrt(R.modelo2n[i]) / 9, fill: 'rgba(238,236,230,.38)' }));
  const pts = []; for (let x = 0.42; x <= 22; x += 0.1) pts.push(`${sx(x).toFixed(1)},${sy(0.7395 - 0.1087 * Math.log(x)).toFixed(1)}`);
  el('polyline', { class: 'curve', id: 'curve5', points: pts.join(' ') });
  [[3, '62 %'], [15, '45 %']].forEach(([x, t]) => {
    const p = 0.7395 - 0.1087 * Math.log(x);
    el('circle', { class: 'mk5', cx: sx(x), cy: sy(p), r: 13, fill: 'var(--tox)', stroke: '#0f0f0e', 'stroke-width': 4 });
    el('text', { class: 'mk mk5', x: sx(x) + 26, y: sy(p) + (x === 3 ? -24 : 64) }, `p(${x}) ≈ ${t}`);
  });
})();

/* ---------- QR ---------- */
const qr = qrcode(0, 'M'); qr.addData('https://rodrigomartinvg.github.io/informatica2/'); qr.make();
$('#qr').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });

/* ---------- Línea de tiempo ---------- */
await document.fonts.ready;
await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));

const split = (sel, type = 'chars,words') => new SplitText(sel, { type, mask: type.includes('lines') ? 'lines' : undefined });
const t1 = split('#t1'), t2 = split('#t2', 'words'), t4 = split('#t4', 'words'), t5 = split('#t5', 'words'), t6 = split('#t6', 'words'), t7 = split('#t7', 'lines');

const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'power3.out' }, paused: true });
const FT = { immediateRender: false };
const show = (sel, at) => tl.set(sel, { visibility: 'visible', opacity: 1 }, at);
const hide = (sel, at, dur = 0.5) => tl.to(sel, { opacity: 0, duration: dur, ease: 'power2.in' }, at).set(sel, { visibility: 'hidden' });

// 1 · La pregunta (0–4,6 s)
tl.set(S, { mycA: 1, myc: 0 }, 0);
tl.fromTo(S, { spores: 0 }, { spores: 1, duration: 1.4, ease: 'none' }, 0);
tl.fromTo(S, { myc: 0 }, { myc: 1, duration: 4.6, ease: 'power1.inOut' }, 0);
show('#s1', 0);
tl.from('#s1 .kicker', { opacity: 0, y: 20, duration: 0.8 }, 0.5);
tl.from(t1.chars, { opacity: 0, yPercent: 70, rotateX: -80, transformOrigin: '50% 100%', stagger: 0.04, duration: 0.9 }, 0.9);
tl.to(t1.chars, { opacity: 0, yPercent: -40, stagger: 0.012, duration: 0.4, ease: 'power2.in' }, 4.0);
hide('#s1', 4.3, 0.3);
tl.to(S, { mycA: 0.22, duration: 1 }, 4.0);

// 2 · A o B (4,6–9,6 s)
show('#s2', 4.6);
tl.fromTo('#fa', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.out', ...FT }, 4.6);
tl.fromTo('#fb', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.out', ...FT }, 4.8);
tl.fromTo('#s2 img', { scale: 1.25 }, { scale: 1, duration: 5, ease: 'power1.out', ...FT }, 4.6);
tl.from('#s2 .l', { opacity: 0, x: -30, stagger: 0.2, duration: 0.7 }, 5.3);
tl.from(t2.words, { opacity: 0, y: 50, stagger: 0.12, duration: 0.8 }, 5.6);
tl.from('#tag2', { opacity: 0, scale: 0.6, duration: 0.5, ease: 'back.out(2)' }, 7.0);
tl.from('#s2 .credit', { opacity: 0, duration: 0.6 }, 6.0);
hide('#s2', 9.1);

// 3 · Los datos (9,6–16 s)
show('#s3', 9.6);
tl.fromTo(S, { rainA: 0, rainT: 0 }, { rainA: 1, duration: 0.3, ...FT }, 9.6);
tl.fromTo(S, { rainT: 0 }, { rainT: 5.2, duration: 5.2, ease: 'none', ...FT }, 9.6);
const N = { v: 0 };
tl.fromTo(N, { v: 0 }, { v: 61069, duration: 3.6, ease: 'power2.out', ...FT,
}, 9.7);
tl.from('#sub3', { opacity: 0, y: 20, duration: 0.7 }, 10.4);
tl.from('#s3 .note', { opacity: 0, duration: 0.6 }, 11);
tl.from('#s3 .pile', { opacity: 0, y: 30, stagger: 0.25, duration: 0.7 }, 13.6);
tl.to(S, { rainA: 0, duration: 0.5, ease: 'power2.in' }, 15.5);
hide('#s3', 15.5);

// 4 · El mito del anillo (16–21 s)
show('#s4', 16);
tl.from(t4.words, { opacity: 0, y: 50, stagger: 0.1, duration: 0.8 }, 16);
tl.from('#s4 .ax', { drawSVG: 0, duration: 0.6 }, 16.4);
tl.from('#bar-con, #bar-sin', { scaleY: 0, transformOrigin: '50% 100%', stagger: 0.18, duration: 1, ease: 'power4.out' }, 16.7);
tl.from('#s4 .v4, #s4 .lbl', { opacity: 0, y: 20, stagger: 0.08, duration: 0.5 }, 17.3);
tl.from('#base4', { scaleX: 0, transformOrigin: '0% 50%', duration: 0.8, ease: 'power2.inOut' }, 17.9);
tl.from('#base4t', { opacity: 0, x: -20, duration: 0.5 }, 18.5);
tl.from('#stamp', { opacity: 0, scale: 3, rotate: 8, duration: 0.45, ease: 'power4.in' }, 19.0);
tl.to('#s4 .plot', { x: -6, duration: 0.05, yoyo: true, repeat: 3, ease: 'none' }, 19.45);
hide('#s4', 20.7);

// 5 · GeoGebra (21,2–26,6 s)
show('#s5', 21.2);
tl.from(t5.words, { opacity: 0, y: 50, stagger: 0.08, duration: 0.8 }, 21.2);
tl.from('#s5 .ax5', { drawSVG: 0, duration: 0.6 }, 21.6);
tl.from('#s5 .t5', { opacity: 0, duration: 0.5, stagger: 0.03 }, 21.8);
tl.from('#s5 .pt5', { opacity: 0, scale: 0, transformOrigin: '50% 50%', stagger: 0.04, duration: 0.4, ease: 'back.out(2)' }, 22);
tl.from('#curve5', { drawSVG: 0, duration: 1.8, ease: 'power2.inOut' }, 22.8);
tl.from('#formula', { opacity: 0, y: 20, duration: 0.6 }, 23.6);
tl.from('#s5 .mk5', { opacity: 0, scale: 0.4, transformOrigin: '50% 50%', stagger: 0.15, duration: 0.5, ease: 'back.out(2)' }, 24.5);
hide('#s5', 26.1);

// 6 · 3D (26,6–32,8 s)
show('#s6', 26.6);
tl.fromTo(S, { gl: 0 }, { gl: 1, duration: 0.6, ...FT }, 26.6);
tl.fromTo(S, { sweep: 0 }, { sweep: 1, duration: 4, ease: 'none', ...FT }, 26.7);
tl.fromTo(S, { cam: 0 }, { cam: 1, duration: 6, ease: 'sine.inOut', ...FT }, 26.6);
tl.from(t6.words, { opacity: 0, y: 40, stagger: 0.08, duration: 0.8 }, 26.9);
tl.from('#names6', { opacity: 0, letterSpacing: '0.5em', duration: 1 }, 29.8);
tl.to(S, { gl: 0, duration: 0.5, ease: 'power2.in' }, 32.3);
hide('#s6', 32.3);

// 7 · Cierre (32,8–40 s)
show('#s7', 32.8);
tl.fromTo(S, { myc: 0 }, { myc: 1, duration: 5, ease: 'power1.inOut', ...FT }, 32.8);
tl.to(S, { mycA: 0.5, duration: 1 }, 32.8);
tl.from(t7.lines, { opacity: 0, yPercent: 100, stagger: 0.25, duration: 1 }, 33.0);
tl.from('#cta7', { opacity: 0, y: 40, duration: 0.9 }, 34.6);
tl.from('#qr', { opacity: 0, scale: 0.85, duration: 0.6, ease: 'back.out(2)' }, 35.0);
tl.from('#warn7', { opacity: 0, duration: 0.8 }, 35.6);
tl.to(S, { spores: 0, mycA: 0, duration: 1, ease: 'power2.in' }, 39.0);
hide('#s7', 39.0, 1);
tl.set({}, {}, 40.2);

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
const toggle = () => { tl.paused(!tl.paused()); playBtn.textContent = tl.paused() ? 'Reproducir (espacio)' : 'Pausa (espacio)'; };
playBtn.onclick = toggle;
$('#b-restart').onclick = () => tl.restart();
const fs = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
$('#b-fs').onclick = fs;
addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  if (e.key === 'f' || e.key === 'F') fs();
  if (e.key === 'ArrowRight') tl.time(Math.min(tl.duration(), tl.time() + 2));
  if (e.key === 'ArrowLeft') tl.time(Math.max(0, tl.time() - 2));
});

/* ---------- Grabar un loop completo como video (WebM) ---------- */
const hint = $('#hint');
$('#b-rec').onclick = async () => {
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' });
  } catch { hint.textContent = 'Grabación cancelada.'; hint.style.display = 'block'; setTimeout(() => (hint.style.display = 'none'), 2500); return; }
  document.documentElement.classList.add('rec');
  const type = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
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
