// Tráiler v2 de «Bajo el sombrero», versión liviana: sin el juego corriendo de fondo.
// Fotos reales de las especies e imágenes fijas del bosque 3D del juego, con movimientos de cámara
// (Ken Burns), gráficos de la investigación, tipografía animada, música (Tone.js) y voz en off.
// Una sola línea de tiempo de GSAP manda todo, y los tiempos salen de la duración real de cada frase.
// ?formato=vertical arma la versión 9:16 (1080×1920) para redes.
import { FILAS } from './juego/filas.js';
import * as A from './promo-audio.js';

const $ = (s) => document.querySelector(s);
const gsap = window.gsap;
const params = new URLSearchParams(location.search);
const V = params.get('formato') === 'vertical';
document.documentElement.classList.toggle('v', V);
const W = V ? 1080 : 1920, H = V ? 1920 : 1080;
const load = (v) => ($('#load').style.width = `${Math.round(v * 100)}%`);

const stage = $('#stage');
const fit = () => stage.style.setProperty('--s', Math.min(innerWidth / W, innerHeight / H));
addEventListener('resize', fit); fit();
$('#b-fmt').textContent = V ? 'Ver horizontal' : 'Ver vertical 9:16';
$('#b-fmt').onclick = () => { location.search = V ? '' : '?formato=vertical'; };

const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const lerp = (a, b, t) => a + (b - a) * t;
const pct = (v) => `${Math.round(v * 100)} %`;
const FOTO = (id) => `img/fotos/${id}.jpg`, JUEGO = (n) => `promo2/img/${n}.jpg`;
const NAME = {
  phalloides: 'Amanita phalloides', muscaria: 'Amanita muscaria', galerina: 'Galerina marginata', procera: 'Macrolepiota procera',
  russula: 'Russula emetica', pulverulentus: 'Boletus pulverulentus', campestris: 'Agaricus campestris', cantharellus: 'Cantharellus cibarius',
  edulis: 'Boletus edulis', mycena: 'Mycena galericulata'
};
const TOX = { phalloides: 1, muscaria: 1, galerina: 1, russula: 1, mycena: 1 };

/* ---------- Guion y voz: los tiempos salen de cuánto dura cada frase ---------- */
const guion = await fetch('promo2/guion.json').then((r) => r.json());
const DUR = await fetch('promo2/voz/duraciones.json').then((r) => r.json()).catch(() => ({}));
const VOZ = (id) => `promo2/voz/${id}.m4a`;
const SCRIPT = [
  { id: 's1', lines: ['s1a', 's1b'], lead: 1, min: 10 },
  { id: 's2', lines: ['s2'], lead: 1.2, min: 8 },
  { id: 's3', lines: ['s3a', 's3b'], lead: 0.8, min: 13 },
  { id: 'm1', lines: ['m1'], lead: 1, min: 11 },
  { id: 'm2', lines: ['m2'], lead: 1, min: 9 },
  { id: 'm3', lines: ['m3'], lead: 1, min: 10.5 },
  { id: 'm4', lines: ['m4'], lead: 1, min: 9.5 },
  { id: 'm5', lines: ['m5'], lead: 1, min: 9 },
  { id: 'g', lines: ['g1', 'g2', 'g3'], lead: 1, min: 14 },
  { id: 'j', lines: ['j1', 'j2'], lead: 1, min: 13 },
  { id: 'c9', lines: ['c1', 'c2'], lead: 1, min: 12, tail: 4 }
];
const LINES = []; let T = 0;
for (const s of SCRIPT) {
  s.t0 = T; let at = T + s.lead; s.at = {};
  for (const id of s.lines) { s.at[id] = at; LINES.push([id, at]); at += (DUR[id] || 4) + 0.7; }
  s.t1 = Math.max(T + s.min, at + (s.tail || 1.6)); T = s.t1;
}
const TOTAL = T;
const S = Object.fromEntries(SCRIPT.map((s) => [s.id, s]));

/* ---------- Mitos: datos de la investigación y un par de ejemplos reales que lo contradicen ---------- */
const MYTHS = [
  { id: 'm1', title: 'El anillo', q: '¿El anillo avisa cuáles son venenosos?', yes: 'con anillo', no: 'sin anillo', r: [0.605, 0.538], stamp: 'MITO', a: 'procera', b: 'russula' },
  { id: 'm2', title: 'La magulladura', q: '¿Si se mancha al tocarlo, es venenoso?', yes: 'se mancha', no: 'no se mancha', r: [0.533, 0.559], stamp: 'MITO', a: 'pulverulentus', b: 'phalloides' },
  { id: 'm3', title: 'Los colores', q: '¿Los colores llamativos avisan del peligro?', yes: 'llamativos', no: 'comunes', r: [0.683, 0.482], stamp: 'A MEDIAS', a: 'muscaria', b: 'phalloides' },
  { id: 'm4', title: 'El tamaño', q: '¿Los chicos son los peligrosos?', yes: 'chicos', no: 'grandes', r: [0.696, 0.431], stamp: 'TENDENCIA', a: 'galerina', b: 'muscaria', chart: 'size' },
  { id: 'm5', title: 'Las proporciones', q: '¿La forma del hongo lo delata?', yes: 'tallo grueso', no: 'tallo fino', r: [0.49, 0.605], stamp: 'PISTA DÉBIL', a: 'muscaria', b: 'procera', chart: 'stem' }
];
const cap1 = (s) => s[0].toUpperCase() + s.slice(1);
const tag = (id, label) => `<figcaption><b>${cap1(label)}</b><span><i>${NAME[id]}</i> · <em class="${TOX[id] ? 'tox' : 'ed'}">${TOX[id] ? 'venenoso' : 'comestible'}</em></span></figcaption>`;
for (const m of MYTHS) {
  const [y, n] = m.r;
  $('#' + m.id).innerHTML = `
    <div class="split"><figure class="half"><img src="${FOTO(m.a)}" alt="${NAME[m.a]}">${tag(m.a, m.yes)}</figure><figure class="half"><img src="${FOTO(m.b)}" alt="${NAME[m.b]}">${tag(m.b, m.no)}</figure></div>
    <div class="card shadowed"><p class="kicker">Mito · ${m.title}</p><h2>${m.q}</h2></div>
    ${m.chart ? `<div class="plot">${m.chart === 'size' ? sizePlot() : stemPlot()}</div>` : `<div class="nums">
      <div class="num"><b class="${y >= n ? 'tox' : ''}">${pct(y)}</b><span>venenosos · ${m.yes}</span><i data-p="${y * 100}%"></i></div>
      <div class="num"><b class="${n > y ? 'tox' : ''}">${pct(n)}</b><span>venenosos · ${m.no}</span><i data-p="${n * 100}%"></i></div></div>
      <p class="base">la línea blanca: 55,5 % de venenosos en total</p>`}
    <div class="stamp${m.stamp.length > 8 ? ' long' : ''}">${m.stamp}</div>`;
}
// GeoGebra: p(x) = 0,740 − 0,109·ln(x), la proporción de venenosos según el diámetro del sombrero
function sizePlot() {
  const X = (x) => 60 + ((x - 1) / 24) * 600, Y = (p) => 380 - ((p - 0.3) / 0.5) * 340;
  let d = ''; for (let x = 1; x <= 25; x += 0.5) d += `${d ? 'L' : 'M'}${X(x).toFixed(1)},${Y(0.74 - 0.109 * Math.log(x)).toFixed(1)}`;
  return `<svg viewBox="0 0 700 430"><path class="ax" d="M60 40V380H670"/><path class="ax" d="M60 ${Y(0.555)}H670" stroke-dasharray="8 8"/>
    <path class="curve" d="${d}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
    <text x="60" y="412">1 cm</text><text x="600" y="412">25 cm</text><text x="8" y="${Y(0.555) - 8}">55,5 %</text>
    <text class="eq" x="280" y="80">p(x) = 0,740 − 0,109·ln(x)</text><text x="280" y="112">venenosos según el tamaño del sombrero</text></svg>`;
}
// GeoGebra: el ancho del tallo crece casi igual en venenosos (1,83 mm por cm) y en comestibles (1,79)
function stemPlot() {
  const X = (x) => 60 + (x / 20) * 600, Y = (w) => 380 - (w / 40) * 340;
  const line = (k, cls) => `<path class="${cls}" d="M${X(0)},${Y(0)}L${X(20)},${Y(20 * k)}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`;
  return `<svg viewBox="0 0 700 430"><path class="ax" d="M60 40V380H670"/>${line(1.83, 'curve')}${line(1.79, 'curve2')}
    <text x="60" y="412">0</text><text x="500" y="412">sombrero (cm)</text><text x="70" y="52">tallo (mm)</text>
    <text class="eq" x="290" y="300" fill="#ff7a3d">venenosos: 1,83 mm por cm</text><text class="eq" x="290" y="336">comestibles: 1,79 mm por cm</text></svg>`;
}

/* ---------- Gemelos: las dos fotos y, después, el corte bajo tierra (ilustración) ---------- */
$('#g').innerHTML = `
  <div class="split"><figure class="half"><img src="${FOTO('campestris')}" alt="Agaricus campestris">${tag('campestris', 'champiñón')}</figure>
  <figure class="half"><img src="${FOTO('phalloides')}" alt="Amanita phalloides">${tag('phalloides', 'amanita')}</figure></div>
  <p class="t shadowed" id="gt">A simple vista, iguales.</p>
  <div class="cut" id="cut">${cutaway()}</div>`;
function cutaway() {
  // dos siluetas iguales arriba de la tierra; abajo, la amanita tiene la volva (la "bolsa" de la base)
  const shroom = (x, volva) => `<g transform="translate(${x} 0)">
    <path class="cap" d="M-150 300 C-150 170 150 170 150 300 Z"/><path class="gill" d="M-140 300 H140"/>
    <rect class="stem" x="-26" y="300" width="52" height="290" rx="20"/><path class="ring" d="M-30 380 L-62 420 L62 420 L30 380 Z"/>
    <ellipse class="bulb" cx="0" cy="${volva ? 610 : 600}" rx="${volva ? 46 : 34}" ry="${volva ? 36 : 22}"/>
    ${volva ? '<path class="volva" d="M-70 560 C-80 650 80 650 70 560 C60 600 -60 600 -70 560 Z"/>' : ''}</g>`;
  return `<svg viewBox="0 0 1200 760"><rect class="soil" x="0" y="520" width="1200" height="240"/>
    ${shroom(330, false)}${shroom(870, true)}<path class="gl" d="M0 520 H1200"/>
    <text class="lab" x="330" y="745" text-anchor="middle">champiñón: sin volva</text><text class="lab hot" x="870" y="745" text-anchor="middle">amanita: con volva</text></svg>`;
}

/* ---------- Fondos: imágenes con movimiento de cámara lento ---------- */
const BG = [
  { s: 's1', img: JUEGO('bosque_ras'), from: { scale: 1.08, xPercent: -2 }, to: { scale: 1.2, xPercent: 2 }, t: [0, 0.55] },
  { s: 's1', img: JUEGO('torres'), from: { scale: 1.15, yPercent: 3 }, to: { scale: 1.05, yPercent: -3 }, t: [0.5, 1] },
  { s: 's2', img: JUEGO('claro'), from: { scale: 1.12 }, to: { scale: 1.02 }, t: [0, 1], cls: 'soft' },
  { s: 's3', img: JUEGO('claro_tarde'), from: { scale: 1.05 }, to: { scale: 1.12 }, t: [0, 1], cls: 'dark' },
  { s: 'j', img: JUEGO('escarabajo'), from: { scale: 1.06 }, to: { scale: 1.18, xPercent: -3 }, t: [0, 0.4] },
  { s: 'j', img: JUEGO('colores'), from: { scale: 1.15, xPercent: 3 }, to: { scale: 1.04 }, t: [0.36, 0.72] },
  { s: 'j', img: JUEGO('gemelos_noche'), from: { scale: 1.04 }, to: { scale: 1.14 }, t: [0.68, 1] },
  { s: 'c9', img: JUEGO('claro_tarde'), from: { scale: 1.15 }, to: { scale: 1.05 }, t: [0, 1], cls: 'dark soft' }
];
const bgEl = $('#bg');
for (const b of BG) { const f = document.createElement('div'); f.className = `bgi ${b.cls || ''}`; f.innerHTML = `<img src="${b.img}" alt="">`; bgEl.appendChild(f); b.el = f; }

/* ---------- Códigos QR ---------- */
const qrSvg = (url) => { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 6, margin: 0, scalable: true }); };
$('#qr-web').innerHTML = qrSvg('https://rodrigomartinvg.github.io/informatica2/');
$('#qr-game').innerHTML = qrSvg('https://rodrigomartinvg.github.io/informatica2/juego/');

/* ---------- Carga: fuentes e imágenes (nunca más de 4 s) ---------- */
load(0.3);
const wait = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
await wait(document.fonts.ready, 3000); load(0.6);
await wait(Promise.all([...document.images].map((i) => i.decode().catch(() => {}))), 4000); load(0.9);
LINES.forEach(([id]) => A.loadVoice(VOZ(id)));

/* ---------- Línea de tiempo ---------- */
const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1.5, defaults: { ease: 'power3.out' } });
const FT = { immediateRender: false };
const cue = (fn, at) => tl.call(fn, null, at);
for (const s of SCRIPT) {
  const el = $('#' + s.id);
  tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7, ...FT }, s.t0 + 0.1);
  tl.to(el, { autoAlpha: 0, duration: 0.6 }, s.t1 - 0.6);
}
for (const b of BG) {
  const s = S[b.s], a = lerp(s.t0, s.t1, b.t[0]), z = lerp(s.t0, s.t1, b.t[1]);
  tl.fromTo(b.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, ease: 'none', ...FT }, a);
  tl.fromTo(b.el.firstChild, { ...b.from }, { ...b.to, duration: z - a + 0.9, ease: 'none', ...FT }, a);
  tl.to(b.el, { autoAlpha: 0, duration: 0.9, ease: 'none' }, z - 0.4);
}
// 1 · Apertura
tl.fromTo('#s1t', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.2, ...FT }, S.s1.t0 + 1.2);
cue(() => A.chord('intro', 10), S.s1.t0 + 0.1); cue(() => A.bells(3, 0.4, 0, 4), S.s1.at.s1b);
// 2 · Título
tl.fromTo('#s2 h1', { opacity: 0, scale: 1.12, filter: 'blur(14px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.6, ...FT }, S.s2.t0 + 0.3);
tl.fromTo('#s2 p', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, ...FT }, S.s2.t0 + 1.6);
cue(() => { A.whoosh(1.6); A.chord('ab', 8); }, S.s2.t0); cue(() => A.chime(2), S.s2.t0 + 0.6);
// 3 · Datos
tl.fromTo('#s3 .pct', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ...FT }, S.s3.at.s3b + 0.2);
cue(() => { A.chord('datos', 12); A.rain(6, 46); }, S.s3.t0 + 0.2); cue(() => A.stamp(false), S.s3.at.s3b + 0.3);
// Mitos
for (const m of MYTHS) {
  const s = S[m.id], el = $('#' + m.id), t0 = s.t0, t1 = s.t1;
  const halves = el.querySelectorAll('.half');
  tl.fromTo(halves, { opacity: 0, [V ? 'y' : 'x']: (i) => (i ? 80 : -80) }, { opacity: 1, [V ? 'y' : 'x']: 0, duration: 1, stagger: 0.15, ...FT }, t0 + 0.1);
  tl.fromTo(el.querySelectorAll('.half img'), { scale: 1.16 }, { scale: 1.02, duration: t1 - t0, ease: 'none', ...FT }, t0);
  tl.fromTo(el.querySelectorAll('figcaption'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.3, ...FT }, t0 + 1.2);
  tl.fromTo(el.querySelector('.card'), { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.9, ...FT }, t0 + 0.5);
  const nums = el.querySelectorAll('.num');
  if (nums.length) {
    tl.fromTo(nums, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.6, ...FT }, t0 + 2.3);
    tl.fromTo(el.querySelectorAll('.num i'), { '--p': '0%' }, { '--p': (k, e) => e.dataset.p, duration: 1.2, stagger: 0.6, ...FT }, t0 + 2.4);
    tl.fromTo(el.querySelector('.base'), { opacity: 0 }, { opacity: 1, duration: 0.6, ...FT }, t0 + 3.6);
    cue(() => A.bars(m.r), t0 + 2.3);
  } else {
    tl.fromTo(el.querySelector('.plot'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ...FT }, t0 + 1.4);
    tl.fromTo(el.querySelectorAll('.curve, .curve2'), { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 3.2, ease: 'power1.inOut', stagger: 0.4, ...FT }, t0 + 2);
    cue(() => A.trace(m.chart === 'size' ? [0.9, 0.7, 0.55, 0.45, 0.4, 0.37] : [0.2, 0.4, 0.6, 0.8], 3), t0 + 2);
  }
  tl.fromTo(el.querySelector('.stamp'), { opacity: 0, scale: 2.4, rotate: -24 }, { opacity: 1, scale: 1, rotate: -10, duration: 0.42, ease: 'power4.in', ...FT }, t1 - 3.4);
  cue(() => A.stamp(m.stamp === 'MITO'), t1 - 3.0);
  cue(() => { A.whoosh(1.2); A.chord(m.id, t1 - t0); }, t0);
}
// Gemelos: las fotos; después se oscurecen y aparece el corte bajo tierra
{
  const s = S.g, el = $('#g');
  tl.fromTo(el.querySelectorAll('.half'), { opacity: 0, [V ? 'y' : 'x']: (i) => (i ? 80 : -80) }, { opacity: 1, [V ? 'y' : 'x']: 0, duration: 1, stagger: 0.15, ...FT }, s.t0 + 0.1);
  tl.fromTo(el.querySelectorAll('.half img'), { scale: 1.14 }, { scale: 1.02, duration: s.at.g3 - s.t0, ease: 'none', ...FT }, s.t0);
  tl.fromTo('#gt', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, ...FT }, s.t0 + 0.7);
  tl.fromTo(el.querySelectorAll('figcaption'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.3, ...FT }, s.at.g2);
  tl.to(['#gt', '#g .split'], { opacity: 0.12, duration: 0.8 }, s.at.g3 - 0.3);
  tl.fromTo('#cut', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 1, ...FT }, s.at.g3 - 0.1);
  tl.fromTo('#cut .soil', { opacity: 1 }, { opacity: 0.35, duration: 1.4, ...FT }, s.at.g3 + 1);
  tl.fromTo('#cut .volva', { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(2)', ...FT }, s.at.g3 + 1.4);
  tl.fromTo('#cut .lab', { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.3, ...FT }, s.at.g3 + 1.8);
  cue(() => { A.chord('noche', s.t1 - s.t0); A.dread(); }, s.t0); cue(() => A.bells(4, 0.25, 0, 3), s.at.g3 + 1.4);
}
// Juego
tl.fromTo('#feats span', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.6, stagger: 1.2, ...FT }, S.j.at.j2);
cue(() => { A.chord('juego', S.j.t1 - S.j.t0); A.whoosh(1.4); }, S.j.t0);
// Cierre
tl.fromTo('#c9 h2', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.2, ...FT }, S.c9.t0 + 0.6);
tl.fromTo('#c9 .qr', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.25, ...FT }, S.c9.at.c2);
tl.fromTo('#c9 .url', { opacity: 0 }, { opacity: 1, duration: 0.8, ...FT }, S.c9.at.c2 + 0.8);
cue(() => { A.chord('cierre', 7); A.whoosh(1.6); }, S.c9.t0); cue(() => A.chord('final', 7), S.c9.at.c2); cue(() => A.bells(5, 0.12, 0, 5), S.c9.at.c2);
// Voz en off
for (const [id, at] of LINES) cue(() => A.voice(VOZ(id)), at);
tl.to({}, { duration: 0.01 }, TOTAL);

/* ---------- Cada cuadro: subtítulos, esporas y lluvia de datos (calculados con el tiempo: se puede adelantar) ---------- */
const sub = $('#sub'), sp = $('#spores'), sg = sp.getContext('2d'); sp.width = W; sp.height = H;
const SPORES = Array.from({ length: 70 }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.6, v: 6 + Math.random() * 14, ph: Math.random() * 6 }));
function frame() {
  const t = tl.time();
  const s = SCRIPT.find((x) => t >= x.t0 && t < x.t1) || SCRIPT[SCRIPT.length - 1], lt = t - s.t0;
  // subtítulos
  const line = LINES.find(([id, at]) => t >= at - 0.1 && t < at + (DUR[id] || 4) + 0.5);
  if (line) { if (sub.dataset.id !== line[0]) { sub.dataset.id = line[0]; sub.textContent = guion[line[0]]; } sub.style.opacity = Math.min(1, (t - line[1] + 0.1) / 0.3); }
  else sub.style.opacity = 0;
  // esporas que flotan con luz
  sg.clearRect(0, 0, W, H);
  for (const p of SPORES) {
    const y = (p.y - t * p.v) % H, yy = y < 0 ? y + H : y, x = p.x + Math.sin(t * 0.4 + p.ph) * 20;
    sg.fillStyle = `rgba(255,236,190,${0.12 + 0.18 * (0.5 + 0.5 * Math.sin(t * 1.3 + p.ph))})`;
    sg.beginPath(); sg.arc(x, yy, p.r, 0, 7); sg.fill();
  }
  if (s.id === 's3') drawDots(lt);
  if (!seeking) $('#seek').value = Math.round((t / TOTAL) * 1000);
  $('#tm').textContent = `${fmt(t)} / ${fmt(TOTAL)}`;
  requestAnimationFrame(frame);
}
const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;

/* ---------- Lluvia de datos: 1.000 puntos (cada uno, ~61 hongos reales) que forman el 55,5 % ---------- */
const dots = $('#dots'), dg = dots.getContext('2d'); dots.width = W; dots.height = H;
const NC = V ? 25 : 40, NR = V ? 40 : 25, N = NC * NR, gapD = V ? 22 : 17, nTox = Math.round(N * 0.555);
const drops = Array.from({ length: N }, (_, i) => ({ delay: (i % NC) * 0.012 + Math.floor(i / NC) * 0.09 + Math.random() * 0.4, x0: Math.random() * W, f: FILAS[(i * 7) % FILAS.length] }));
function drawDots(lt) {
  dg.clearRect(0, 0, W, H);
  const gx = V ? (W - NC * gapD) / 2 : 300, gy = V ? 660 : 380;
  $('#count').textContent = Math.round(61069 * (1 - (1 - Math.min(1, Math.max(0, (lt - 0.6) / 5))) ** 3)).toLocaleString('es-AR');
  for (let i = 0; i < N; i++) {
    const d = drops[i], p = ease((lt - 1 - d.delay) / 1.1); if (p <= 0) continue;
    const col = i % NC, row = Math.floor(i / NC), tx = gx + col * gapD + gapD / 2, ty = gy + row * gapD + gapD / 2;
    const x = lerp(d.x0, tx, p), y = lerp(-40, ty, p), tox = i < nTox, k = ease((lt - (S.s3.at.s3b - S.s3.t0)) / 1.2);
    dg.fillStyle = k > 0 ? (tox ? `rgba(255,122,61,${0.55 + 0.45 * k})` : `rgba(90,162,255,${0.55 + 0.45 * k})`) : 'rgba(242,237,227,.75)';
    dg.beginPath(); dg.arc(x, y, gapD * 0.32 * (0.7 + 0.3 * p), 0, 7); dg.fill();
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
requestAnimationFrame(frame);
load(1);
const go = $('#go'); go.disabled = false; go.textContent = '▶ Ver el tráiler (con sonido)';
go.onclick = async () => { try { await A.enable(); } catch { /* sin audio */ } sndLabel(); $('#start').hidden = true; tl.restart(); tl.paused(false); playBtn.textContent = 'Pausa (espacio)'; };
if (params.has('t')) { $('#start').hidden = true; tl.time(+params.get('t'), true); }
window.promo = { tl, SCRIPT, TOTAL };
