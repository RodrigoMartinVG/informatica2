// Tráiler v2 de «Bajo el sombrero»: la investigación y el juego en el mismo bosque 3D.
// El mundo, el escarabajo y los hongos son los del juego (juego/*.js), renderizados en vivo con WebGPU.
// Una sola línea de tiempo de GSAP manda todo: cámaras, textos, música (Tone.js) y la voz en off (Piper).
// ?formato=vertical arma la versión 9:16 (1080×1920) para redes; ?calidad=alta usa los gráficos completos.
import * as THREE from 'three/webgpu';
import { pass, uniform, screenUV, smoothstep, vec4, float } from 'three/tsl';
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { buildWorld, environment, logs, obstacles } from './juego/world.js';
import { buildFlora } from './juego/flora.js';
import { createBeetle } from './juego/beetle.js';
import { buildMushroom, pickRow, LOOKS } from './juego/hongos3d.js';
import { LEVELS, height, rng } from './juego/config.js';
import { FILAS } from './juego/filas.js';
import * as A from './promo-audio.js';

const $ = (s) => document.querySelector(s);
const gsap = window.gsap;
const params = new URLSearchParams(location.search);
const V = params.get('formato') === 'vertical';
document.documentElement.classList.toggle('v', V);
const W = V ? 1080 : 1920, H = V ? 1920 : 1080;
const HI = params.get('calidad') === 'alta';
const load = (v) => ($('#load').style.width = `${Math.round(v * 100)}%`);
const tick = () => new Promise((r) => setTimeout(r, 16));

/* ---------- Escenario escalado a la ventana ---------- */
const stage = $('#stage');
const fit = () => stage.style.setProperty('--s', Math.min(innerWidth / W, innerHeight / H));
addEventListener('resize', fit); fit();
$('#b-fmt').textContent = V ? 'Ver horizontal' : 'Ver vertical 9:16';
$('#b-fmt').onclick = () => { location.search = V ? '' : '?formato=vertical'; };

/* ---------- Render ---------- */
const renderer = new THREE.WebGPURenderer({ canvas: $('#c'), antialias: true, forceWebGL: params.has('gl') });
const RS = HI ? 1 : 0.72; // resolución interna (el escenario se escala igual)
renderer.setPixelRatio(1); renderer.setSize(W * RS, H * RS, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
await renderer.init(); load(0.15); await tick();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(V ? 62 : 42, W / H, 0.05, 1600);
const post = new THREE.PostProcessing(renderer);
const sp = pass(scene, camera);
const focus = uniform(10), focal = uniform(9), bokeh = uniform(2.6);
const col = dof(sp.getTextureNode('output'), sp.getViewZNode(), focus, focal, bokeh);
const lit = col.add(bloom(col, 0.28, 0.45, 0.9));
const vig = smoothstep(0.3, 0.95, screenUV.sub(0.5).length());
post.outputNode = vec4(lit.rgb.mul(float(1).sub(vig.mul(0.55))), 1);

/* ---------- El bosque del juego ---------- */
const world = buildWorld(scene, { quality: HI ? 'alta' : 'baja' }); load(0.4); await tick();
environment(renderer, scene, scene.userData.sunDir); load(0.5); await tick();
const flora = buildFlora(scene, { quality: HI ? 'alta' : 'baja' }); load(0.8); await tick();
const beetle = createBeetle(scene); beetle.setMushrooms(flora.all);
const LV = Object.fromEntries(LEVELS.map((L) => [L.id, L]));

// Los gemelos para la escena de la volva: el champiñón y la amanita mortal, idénticos arriba de la tierra
const GL = LV.gemelos, r = rng(77);
const twinRowEd = pickRow(r, LOOKS.gemelo, { tox: false, trait: 'twin', yes: false });
// buscar, alrededor del claro, una dirección libre de troncos caídos y árboles (para los gemelos y la cámara)
const clear = (x, z, pad) => !logs.some((l) => Math.abs((x - l.x) * l.az - (z - l.z) * l.ax) < l.rad + pad && Math.abs((x - l.x) * l.ax + (z - l.z) * l.az) < l.len / 2 + pad)
  && !obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + pad) && !flora.all.some((m) => Math.hypot(m.x - x, m.z - z) < m.Rw + 1.5);
let twinA = 0;
for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, ok = [GL.spread + 8, GL.spread + 16, GL.spread + 26, GL.spread + 34].every((d) => clear(GL.at.x + Math.sin(a) * d, GL.at.z + Math.cos(a) * d, 5)); if (ok) { twinA = a; break; } }
const tdx = Math.sin(twinA), tdz = Math.cos(twinA), tcx = GL.at.x + tdx * (GL.spread + 10), tcz = GL.at.z + tdz * (GL.spread + 10);
const twinPos = [[tcx - tdz * 3.6, tcz + tdx * 3.6], [tcx + tdz * 3.6, tcz - tdx * 3.6]];
const twins = [{ ...LOOKS.gemelo }, { ...LOOKS.gemelo, base: 'volva' }].map((look, i) => {
  const b = buildMushroom(look, twinRowEd, 900 + i, { perfect: true });
  const [x, z] = twinPos[i], y = height(x, z) - 1.4; // un poco enterrados: la volva queda bajo tierra
  b.group.position.set(x, y, z); scene.add(b.group);
  return { x, z, y, top: b.climb.top, b };
});
// Un foco sobre los gemelos (la escena es de noche)
const spot = new THREE.SpotLight('#fff1d6', 0, 80, 0.42, 0.6, 1.2);
spot.position.set(tcx + tdx * 14 + 6, height(tcx, tcz) + 34, tcz + tdz * 14);
spot.target.position.set(tcx, height(tcx, tcz) + 2, tcz);
spot.castShadow = true; scene.add(spot, spot.target);
load(0.9); await tick();

/* ---------- Ayudas ---------- */
const v3 = (a) => new THREE.Vector3(...a);
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const lerp = (a, b, t) => a + (b - a) * t;
const cap1 = (s) => s[0].toUpperCase() + s.slice(1);
const pct = (v) => `${Math.round(v * 100)} %`;
// Un par de hongos del claro para mostrar el mito: uno de cada grupo, sanos y cerca del centro
function pair(L) {
  const list = flora.specimens.filter((m) => m.level === L.id && !m.rot);
  const best = (yes) => list.filter((m) => m.yes === yes).sort((a, b) => Math.hypot(a.x - L.at.x, a.z - L.at.z) - Math.hypot(b.x - L.at.x, b.z - L.at.z))[0];
  return [best(true), best(false)];
}
// Cámara que orbita alrededor de un par de hongos
function orbit(ms, u, { a0 = 0.3, turn = 0.35, k = 1 } = {}) {
  const mx = (ms[0].x + ms[1].x) / 2, mz = (ms[0].z + ms[1].z) / 2;
  const top = Math.max(...ms.map((m) => m.base + m.top)), gap = Math.hypot(ms[0].x - ms[1].x, ms[0].z - ms[1].z);
  const d = (Math.max(gap * 1.6, top * 1.7, 16) + 6) * (V ? 1.45 : 1) * k, a = a0 + turn * u;
  const look = new THREE.Vector3(mx, top * 0.5, mz);
  return { pos: new THREE.Vector3(mx + Math.sin(a) * d, top * 1.05 + 3, mz + Math.cos(a) * d), look, focus: d };
}

/* ---------- Escenas (tiempos en segundos; la voz manda) ---------- */
const VOZ = (id) => `promo2/voz/${id}.m4a`;
const guion = await fetch('promo2/guion.json').then((x) => x.json());
const LINES = [['s1a', 1], ['s1b', 6.2], ['s2', 12.2], ['s3a', 20], ['s3b', 26.8], ['m1', 33], ['m2', 45], ['m3', 53.5], ['m4', 64], ['m5', 73],
  ['g1', 81.5], ['g2', 84.8], ['g3', 90.4], ['j1', 95], ['j2', 99], ['c1', 109], ['c2', 113.2]];
const DUR = { c1: 3.08, c2: 2.42, g1: 2.64, g2: 5.14, g3: 3.25, j1: 3.33, j2: 5.65, m1: 9.62, m2: 5.97, m3: 8.12, m4: 5.7, m5: 5.15, s1a: 3.95, s1b: 2.33, s2: 4.01, s3a: 6.28, s3b: 4.88 };
const TOTAL = 121;

const PAIRS = { m1: pair(LV.anillo), m2: pair(LV.magulladura), m3: pair(LV.colores), m4: pair(LV.tamano), m5: pair(LV.proporciones), j: pair(LV.anillo) };
const MYTHS = [
  ['m1', LV.anillo, '¿El anillo avisa cuáles son venenosos?', 33, 44],
  ['m2', LV.magulladura, '¿Si se mancha al tocarlo, es venenoso?', 44, 52.5],
  ['m3', LV.colores, '¿Los colores llamativos avisan del peligro?', 52.5, 63],
  ['m4', LV.tamano, '¿Los chicos son los peligrosos?', 63, 72],
  ['m5', LV.proporciones, '¿La forma del hongo lo delata?', 72, 80.5]
];

const SCENES = [
  { id: 's1', t0: 0, t1: 11, time: 0.12,
    enter() { beetle.place(0, -64, Math.PI); },
    beetle: { fwd: 0.55 },
    cam(u) {
      const b = beetle.pos, k = ease((u - 0.45) / 0.55);
      const low = { pos: new THREE.Vector3(b.x + 2.4, b.y + 0.5, b.z + 1.6), look: new THREE.Vector3(b.x, b.y + 0.3, b.z) };
      const high = { pos: new THREE.Vector3(b.x + 6, 6, b.z + 10), look: new THREE.Vector3(0, 9, -95) };
      return { pos: low.pos.lerp(high.pos, k), look: low.look.lerp(high.look, k), focus: lerp(2.8, 30, k) };
    } },
  { id: 's2', t0: 11, t1: 19, time: 0.08, veil: 0.25,
    cam(u) { const a = 0.4 + u * 0.25; return { pos: new THREE.Vector3(Math.sin(a) * 62, 30 - u * 6, -95 + Math.cos(a) * 62), look: v3([0, 5, -95]), focus: 6 }; } },
  { id: 's3', t0: 19, t1: 32, time: 0.1, veil: 0.78,
    cam(u) { const a = 0.65 + u * 0.3; return { pos: new THREE.Vector3(Math.sin(a) * 70, 22, -95 + Math.cos(a) * 70), look: v3([0, 5, -95]), focus: 70 }; } },
  ...MYTHS.map(([id, L, , t0, t1], i) => ({ id, t0, t1, time: [0.02, 0.15, 0.3, 0.45, 0.6][i], veil: 0.08, pins: PAIRS[id], L,
    cam(u) { return orbit(PAIRS[id], u, { a0: [0.4, -0.5, 0.9, -0.2, 0.6][i], turn: 0.3, k: id === 'm4' || id === 'm5' ? 1.15 : 1 }); } })),
  { id: 'g', t0: 80.5, t1: 94, time: 1, twinPins: true,
    enter() { for (const w of twins) w.b.group.position.y = w.y; },
    cam(u, t) {
      const mx = (twins[0].x + twins[1].x) / 2, mz = (twins[0].z + twins[1].z) / 2, top = Math.max(twins[0].y + twins[0].top, twins[1].y + twins[1].top);
      // a partir de g3, los dos hongos "salen" de la tierra: se ve lo que estaba escondido (la volva de la amanita)
      const pull = ease((t - 90.6) / 1.8);
      for (const w of twins) w.b.group.position.y = w.y + pull * 1.7;
      const ground = height(mx, mz), d = (V ? 24 : 16) - u * 4 - pull * 3;
      // la cámara mira desde afuera del claro hacia los gemelos
      return { pos: new THREE.Vector3(mx + tdx * d, lerp(top * 0.6 + 1, ground + 2.2, pull), mz + tdz * d), look: new THREE.Vector3(mx, lerp(top * 0.45, ground + 1.4, pull), mz), focus: d };
    } },
  { id: 'j', t0: 94, t1: 108, time: 0.4, veil: 0.05,
    enter() { const [a] = PAIRS.j; beetle.place(a.x + 6, a.z + 12, Math.PI); for (const w of twins) w.b.group.position.y = w.y; },
    beetle: { fwd: 0 },
    cam() {
      const b = beetle.pos, h = beetle.heading(new THREE.Vector3());
      return { pos: new THREE.Vector3(b.x - h.x * 4.2 + 1.2, b.y + 1.8, b.z - h.z * 4.2), look: new THREE.Vector3(b.x, b.y + 0.4, b.z), focus: 4.5 };
    } },
  { id: 'c9', t0: 108, t1: TOTAL, time: 0.55, veil: 0.35,
    cam(u) { return { pos: new THREE.Vector3(Math.sin(1.2 + u * 0.3) * 48, 18 + u * 10, -95 + Math.cos(1.2 + u * 0.3) * 48), look: v3([0, 6, -95]), focus: 50 }; } }
];

/* ---------- Textos de los mitos ---------- */
for (const [id, L, q] of MYTHS) {
  const [y, n] = L.research, chart = id === 'm4' || id === 'm5';
  const plot = id === 'm4' ? sizePlot() : id === 'm5' ? stemPlot() : '';
  $('#' + id).innerHTML = `
    <div class="card shadowed"><p class="kicker">Mito · ${L.title}</p><h2>${q}</h2></div>
    ${chart ? `<div class="plot">${plot}</div>` : `<div class="nums">
      <div class="num"><b class="${y >= n ? 'tox' : ''}">${pct(y)}</b><span>${cap1(L.yes)}</span><i data-p="${y * 100}%"></i></div>
      <div class="num"><b class="${n > y ? 'tox' : ''}">${pct(n)}</b><span>${cap1(L.no)}</span><i data-p="${n * 100}%"></i></div></div>
      <p class="base">la línea blanca: 55,5 % de venenosos en total</p>`}
    <div class="stamp${L.stamp.length > 8 ? ' long' : ''}">${L.stamp}</div>`;
}
// GeoGebra: p(x) = 0,740 − 0,109·ln(x), la proporción de venenosos según el diámetro del sombrero
function sizePlot() {
  const X = (x) => 60 + ((x - 1) / 24) * 600, Y = (p) => 380 - ((p - 0.3) / 0.5) * 340;
  let d = ''; for (let x = 1; x <= 25; x += 0.5) d += `${d ? 'L' : 'M'}${X(x).toFixed(1)},${Y(0.74 - 0.109 * Math.log(x)).toFixed(1)}`;
  return `<svg viewBox="0 0 700 430"><path class="ax" d="M60 40V380H670"/><path class="ax" d="M60 ${Y(0.555)}H670" stroke-dasharray="8 8"/>
    <path class="curve" d="${d}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
    <text x="60" y="412">1 cm</text><text x="600" y="412">25 cm</text><text x="8" y="${Y(0.555) - 8}">55,5 %</text>
    <text class="eq" x="300" y="80">p(x) = 0,740 − 0,109·ln(x)</text><text x="300" y="112">venenosos según el tamaño del sombrero</text></svg>`;
}
// GeoGebra: el ancho del tallo crece casi igual en venenosos (1,83 mm por cm) y en comestibles (1,79)
function stemPlot() {
  const X = (x) => 60 + ((x - 0) / 20) * 600, Y = (w) => 380 - (w / 40) * 340;
  const line = (k, cls) => `<path class="${cls}" d="M${X(0)},${Y(0)}L${X(20)},${Y(20 * k)}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`;
  return `<svg viewBox="0 0 700 430"><path class="ax" d="M60 40V380H670"/>${line(1.83, 'curve')}${line(1.79, 'curve2')}
    <text x="60" y="412">0</text><text x="520" y="412">sombrero (cm)</text><text x="70" y="52">tallo (mm)</text>
    <text class="eq" x="300" y="300" fill="#ff7a3d">venenosos: 1,83 mm por cm</text><text class="eq" x="300" y="336">comestibles: 1,79 mm por cm</text></svg>`;
}

/* ---------- Códigos QR ---------- */
const qrSvg = (url) => { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 6, margin: 0, scalable: true }); };
$('#qr-web').innerHTML = qrSvg('https://rodrigomartinvg.github.io/informatica2/');
$('#qr-game').innerHTML = qrSvg('https://rodrigomartinvg.github.io/informatica2/juego/');

/* ---------- Línea de tiempo ---------- */
await Promise.race([document.fonts.ready, new Promise((x) => setTimeout(x, 3000))]);
const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1.5, defaults: { ease: 'power3.out' } });
const FT = { immediateRender: false };
const cue = (fn, at) => tl.call(fn, null, at);
for (const s of SCENES) {
  const el = $('#' + s.id);
  tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ...FT }, s.t0 + 0.2);
  tl.to(el, { autoAlpha: 0, duration: 0.5 }, s.t1 - 0.5);
}
// 1 · Apertura
tl.fromTo('#s1t', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.2, ...FT }, 1.2);
cue(() => A.chord('intro', 10), 0.1); cue(() => A.bells(3, 0.4, 0, 4), 6.2);
// 2 · Título
tl.fromTo('#s2 h1', { opacity: 0, scale: 1.12, filter: 'blur(14px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.6, ...FT }, 11.3);
tl.fromTo('#s2 p', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, ...FT }, 12.6);
cue(() => { A.whoosh(1.6); A.chord('ab', 8); }, 11); cue(() => A.chime(2), 11.6);
// 3 · Datos: la cuenta y la lluvia de puntos (cada punto, ~61 hongos)

tl.fromTo('#s3 .pct', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ...FT }, 27.2);
cue(() => { A.chord('datos', 12); A.rain(6, 46); }, 19.2); cue(() => A.stamp(false), 27.3);
// Mitos
MYTHS.forEach(([id, , , t0, t1]) => {
  const el = $('#' + id);
  tl.fromTo(el.querySelector('.card'), { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.9, ...FT }, t0 + 0.4);
  const nums = el.querySelectorAll('.num');
  if (nums.length) {
    tl.fromTo(nums, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.6, ...FT }, t0 + 2.2);
    tl.fromTo(el.querySelectorAll('.num i'), { '--p': '0%' }, { '--p': (k, e) => e.dataset.p, duration: 1.2, stagger: 0.6, ...FT }, t0 + 2.3);
    tl.fromTo(el.querySelector('.base'), { opacity: 0 }, { opacity: 1, duration: 0.6, ...FT }, t0 + 3.6);
    cue(() => A.bars(MYTHS.find((m) => m[0] === id)[1].research), t0 + 2.2);
  } else {
    tl.fromTo(el.querySelector('.plot'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ...FT }, t0 + 1.2);
    tl.fromTo(el.querySelectorAll('.curve, .curve2'), { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 3.2, ease: 'power1.inOut', stagger: 0.4, ...FT }, t0 + 1.8);
    cue(() => A.trace(id === 'm4' ? [0.9, 0.7, 0.55, 0.45, 0.4, 0.37] : [0.2, 0.4, 0.6, 0.8], 3), t0 + 1.8);
  }
  tl.fromTo(el.querySelector('.stamp'), { opacity: 0, scale: 2.4, rotate: -24 }, { opacity: 1, scale: 1, rotate: -10, duration: 0.42, ease: 'power4.in', ...FT }, t1 - 3.4);
  cue(() => A.stamp(id === 'm1' || id === 'm2'), t1 - 3.0);
  cue(() => { A.whoosh(1.2); A.chord(id, t1 - t0); }, t0);
});
// Gemelos
tl.fromTo('#gt', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, ...FT }, 81.2);
tl.to('#gt', { opacity: 0, duration: 0.6 }, 89.6);
tl.fromTo('#gu', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ...FT }, 91.4);
cue(() => { A.chord('noche', 14); A.dread(); }, 80.5); cue(() => A.bells(4, 0.25, 0, 3), 90.6);
// Juego: el escarabajo vuela de sombrero en sombrero, olfatea y vuelve a volar
tl.fromTo('#feats span', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.6, stagger: 1.4, ...FT }, 99.2);
cue(() => { A.chord('juego', 14); A.whoosh(1.4); }, 94);
cue(() => beetle.flyTo(PAIRS.j[0]), 96.2);
cue(() => gsap.fromTo(snf, { v: 0 }, { v: 1, duration: 0.4, yoyo: true, repeat: 3, onUpdate: () => beetle.setSniff(snf.v) }), 99.4);
cue(() => beetle.flyTo(PAIRS.j[1]), 102);
cue(() => beetle.flyTo(flora.specimens.filter((m) => m.level === 'anillo' && m !== PAIRS.j[1]).sort((a, b) => Math.hypot(a.x - PAIRS.j[1].x, a.z - PAIRS.j[1].z) - Math.hypot(b.x - PAIRS.j[1].x, b.z - PAIRS.j[1].z))[0]), 105);
const snf = { v: 0 };
// Cierre
tl.fromTo('#c9 h2', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.2, ...FT }, 108.6);
tl.fromTo('#c9 .qr', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.25, ...FT }, 112.4);
tl.fromTo('#c9 .url', { opacity: 0 }, { opacity: 1, duration: 0.8, ...FT }, 113.4);
cue(() => { A.chord('cierre', 7); A.whoosh(1.6); }, 108); cue(() => A.chord('final', 7), 115); cue(() => A.bells(5, 0.12, 0, 5), 112.4);
// Voz en off
for (const [id, at] of LINES) cue(() => A.voice(VOZ(id)), at);
tl.to({}, { duration: 0.01 }, TOTAL); // largo total
// precargar la voz
LINES.forEach(([id]) => A.loadVoice(VOZ(id)));

/* ---------- Cada cuadro ---------- */
const clock = new THREE.Clock(); let cur = null;
const pinsEl = $('#pins'), sub = $('#sub'), veil = $('#veil');
const tmpV = new THREE.Vector3();
function setPins(s) {
  pinsEl.innerHTML = '';
  if (s.twinPins) {
    twins.forEach((w, i) => {
      const el = document.createElement('div'); el.className = 'pin';
      el.innerHTML = i ? 'Amanita phalloides · <span class="tox">mortal</span>' : 'Champiñón · <span class="ed">comestible</span>';
      el.m = { x: w.x, z: w.z, get base() { return w.b.group.position.y; }, top: w.top, twin: true }; pinsEl.appendChild(el);
    });
    return;
  }
  if (!s.pins) return;
  s.pins.forEach((m, i) => {
    const el = document.createElement('div'); el.className = 'pin';
    const tox = m.toxic ? '<span class="tox">venenoso</span>' : '<span class="ed">comestible</span>';
    el.innerHTML = `${cap1(i === 0 ? s.L.yes : s.L.no)} · ${tox}`; el.m = m; pinsEl.appendChild(el);
  });
}
function frame() {
  const dt = Math.min(0.05, clock.getDelta()), t = tl.time();
  const s = SCENES.find((x) => t >= x.t0 && t < x.t1) || SCENES[SCENES.length - 1];
  if (s !== cur) { cur = s; s.enter?.(); setPins(s); }
  const lt = t - s.t0, u = lt / (s.t1 - s.t0);
  // hora del día: pasa de la escena anterior a esta en 2 s
  const prev = SCENES[Math.max(0, SCENES.indexOf(s) - 1)];
  world.setTime(lerp(prev.time, s.time, ease(lt / 2)));
  veil.style.opacity = lerp(prev.veil || 0, s.veil || 0, ease(lt / 0.8));
  // escarabajo
  const inp = { fwd: 0, turn: 0, run: false, jump: false, up: false, down: false, canFly: true, ...(s.beetle || {}) };
  beetle.update(dt, inp);
  flora.update(dt, clock.elapsedTime);
  // cámara
  const c = s.cam(u, t);
  // la cámara nunca queda adentro de un hongo: si cae dentro de un sombrero o un tallo, sube por encima
  for (const m of flora.all) {
    if (Math.abs(m.x - c.pos.x) > 12 || Math.abs(m.z - c.pos.z) > 12) continue;
    const d = Math.hypot(m.x - c.pos.x, m.z - c.pos.z), top = m.base + m.top;
    if (d < m.Rw + 0.6 && c.pos.y > m.base - 0.5 && c.pos.y < top + 1) c.pos.y = top + 1.5;
  }
  camera.position.copy(c.pos); camera.lookAt(c.look);
  spot.intensity = s.id === 'g' ? 900 * ease(lt / 1.5) : 0;
  focus.value += (c.focus - focus.value) * Math.min(1, dt * 4);
  world.follow(c.look);
  // etiquetas sobre los hongos del mito
  for (const el of pinsEl.children) {
    const m = el.m; tmpV.set(m.x, m.base + m.top + 1, m.z).project(camera);
    el.style.left = `${(tmpV.x * 0.5 + 0.5) * W}px`; el.style.top = `${(-tmpV.y * 0.5 + 0.5) * H - 46}px`;
    const from = m.twin ? 84.8 - s.t0 : 1.2;
    el.style.opacity = tmpV.z < 1 ? Math.min(1, Math.max(0, (lt - from) / 0.6)) * Math.min(1, Math.max(0, (s.t1 - t - 0.5) / 0.5)) : 0;
  }
  // subtítulos
  const line = LINES.find(([id, at]) => t >= at - 0.1 && t < at + DUR[id] + 0.5);
  if (line) { if (sub.dataset.id !== line[0]) { sub.dataset.id = line[0]; sub.textContent = guion[line[0]]; } sub.style.opacity = Math.min(1, (t - line[1] + 0.1) / 0.3); }
  else sub.style.opacity = 0;
  if (s.id === 's3') drawDots(lt);
  post.render();
  // controles
  if (!seeking) $('#seek').value = Math.round((t / TOTAL) * 1000);
  $('#tm').textContent = `${fmt(t)} / ${fmt(TOTAL)}`;
}
const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;

/* ---------- Lluvia de datos: 1.000 puntos (cada uno, ~61 hongos reales) que forman el 55,5 % ---------- */
const dots = $('#dots'), dg = dots.getContext('2d'); dots.width = W; dots.height = H;
const NC = V ? 25 : 40, NR = V ? 40 : 25, N = NC * NR, gapD = V ? 22 : 17, nTox = Math.round(N * 0.555);
const drops = Array.from({ length: N }, (_, i) => { const f = FILAS[(i * 7) % FILAS.length]; return { delay: (i % NC) * 0.012 + Math.floor(i / NC) * 0.09 + Math.random() * 0.4, x0: Math.random() * W, size: 4 + Math.min(8, f[1] * 0.6) }; });
function drawDots(lt) {
  dg.clearRect(0, 0, W, H);
  const gx = V ? (W - NC * gapD) / 2 : 300, gy = V ? 660 : 380;
  // la cuenta (calculada con el tiempo, así funciona también al adelantar)
  $('#count').textContent = Math.round(61069 * (1 - (1 - Math.min(1, Math.max(0, (lt - 0.6) / 5))) ** 3)).toLocaleString('es-AR');
  for (let i = 0; i < N; i++) {
    const d = drops[i], p = ease((lt - 1 - d.delay) / 1.1); if (p <= 0) continue;
    const col = i % NC, row = Math.floor(i / NC), tx = gx + col * gapD + gapD / 2, ty = gy + row * gapD + gapD / 2;
    const x = lerp(d.x0, tx, p), y = lerp(-40, ty, p);
    const tox = i < nTox, k = ease((lt - 8) / 1.2);
    dg.fillStyle = k > 0 ? (tox ? `rgba(255,122,61,${0.55 + 0.45 * k})` : `rgba(90,162,255,${0.55 + 0.45 * k})`) : 'rgba(242,237,227,.75)';
    dg.beginPath(); dg.arc(x, y, (gapD * 0.32) * (0.7 + 0.3 * p), 0, 7); dg.fill();
  }
}

/* ---------- Controles ---------- */
let seeking = false;
const seek = $('#seek');
seek.addEventListener('input', () => { seeking = true; A.stopVoice(); tl.time((seek.value / 1000) * TOTAL, true); });
seek.addEventListener('change', () => (seeking = false));
const playBtn = $('#b-play');
const toggle = () => { tl.paused(!tl.paused()); A.mute(tl.paused()); playBtn.textContent = tl.paused() ? 'Reproducir (espacio)' : 'Pausa (espacio)'; };
playBtn.onclick = toggle;
const fs = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
$('#b-fs').onclick = fs;
const sndBtn = $('#b-snd'), sndLabel = () => (sndBtn.textContent = A.isOn() ? 'Sonido: sí (M)' : 'Sonido: no (M)');
async function soundToggle() { if (A.isOn()) A.off(); else { await A.enable(); A.mute(tl.paused()); } sndLabel(); }
sndBtn.onclick = soundToggle;
addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  if (e.key === 'f' || e.key === 'F') fs();
  if (e.key === 'm' || e.key === 'M') soundToggle();
  if (e.key === 'ArrowRight') { A.stopVoice(); tl.time(Math.min(TOTAL, tl.time() + 5), true); }
  if (e.key === 'ArrowLeft') { A.stopVoice(); tl.time(Math.max(0, tl.time() - 5), true); }
});
let idleT = 0; addEventListener('mousemove', () => { document.body.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => document.body.classList.add('idle'), 2500); });

// Grabar el tráiler completo como video (WebM), con la voz y la música
$('#b-rec').onclick = async () => {
  let stream;
  try { stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' }); } catch { return; }
  document.documentElement.classList.add('rec');
  if (!A.isOn()) await A.enable();
  const audio = A.stream(); if (audio) audio.getAudioTracks().forEach((x) => stream.addTrack(x));
  const type = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 14e6 }), chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    stream.getTracks().forEach((x) => x.stop()); document.documentElement.classList.remove('rec');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
    a.download = V ? 'bajo_el_sombrero_vertical.webm' : 'bajo_el_sombrero.webm'; a.click();
  };
  await new Promise((x) => setTimeout(x, 400));
  tl.restart(); tl.paused(false); A.mute(false); rec.start();
  setTimeout(() => rec.stop(), TOTAL * 1000 + 400);
};

/* ---------- Arranque ---------- */
renderer.setAnimationLoop(frame);
load(1);
const go = $('#go'); go.disabled = false; go.textContent = '▶ Ver el tráiler (con sonido)';
go.onclick = async () => { try { await A.enable(); } catch { /* sin audio */ } sndLabel(); $('#start').hidden = true; tl.restart(); tl.paused(false); playBtn.textContent = 'Pausa (espacio)'; };
// Herramienta de prueba: ?t=segundos muestra ese momento (sin sonido)
if (params.has('t')) { $('#start').hidden = true; tl.time(+params.get('t'), true); }
// ?limpio: solo la imagen 3D (para sacar fotos fijas del bosque)
if (params.has('limpio')) { for (const el of document.querySelectorAll('.sc, .sub, .ui, #pins, .veil')) el.style.display = 'none'; }
window.promo = { tl, beetle, flora, world, camera, SCENES };
