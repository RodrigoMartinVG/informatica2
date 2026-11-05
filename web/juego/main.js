// «Bajo el sombrero»: arranque, cámara, controles y la lógica del primer mito.
import * as THREE from 'three/webgpu';
import { pass, uniform } from 'three/tsl';
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { buildWorld, sporeTrail, environment } from './world.js';
import { createBeetle } from './beetle.js';
import { buildFlora } from './flora.js';
import * as S from './audio.js';
import { SPAWN, RING, SLEEPING, height } from './config.js';

const $ = (s) => document.querySelector(s);
const gsap = window.gsap;
const params = new URLSearchParams(location.search);
const quality = params.get('q') === 'baja' ? 'baja' : 'alta';

/* ---------- Render: WebGPU (o WebGL 2 si el navegador no lo tiene) ---------- */
const renderer = new THREE.WebGPURenderer({ canvas: $('#c'), antialias: true, forceWebGL: params.has('gl') });
renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'alta' ? 1.75 : 1));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
await renderer.init();
const backend = renderer.backend?.isWebGPUBackend ? 'WebGPU' : 'WebGL 2';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 1600);

// Postprocesado: profundidad de campo (lente macro) + brillo (bloom)
const post = new THREE.PostProcessing(renderer);
const scenePass = pass(scene, camera);
const colorTex = scenePass.getTextureNode('output');
const focus = uniform(6), focal = uniform(7), bokeh = uniform(2.4);
const base = quality === 'alta' ? dof(colorTex, scenePass.getViewZNode(), focus, focal, bokeh) : colorTex;
post.outputNode = base.add(bloom(base, 0.5, 0.5, 0.8));

/* ---------- Mundo ---------- */
const world = buildWorld(scene, { quality });
environment(renderer, scene, scene.userData.sunDir);
const flora = buildFlora(scene);
const trail = sporeTrail(scene);
const beetle = createBeetle(scene);
beetle.place(SPAWN.x, SPAWN.z, Math.PI);

$('#tech').textContent = `three.js r180 · ${backend} · TSL · Tone.js · calidad ${quality}`;
const go = $('#go'); go.disabled = false; go.textContent = 'Entrar al bosque';

/* ---------- Cámara ---------- */
const cam = { yaw: 0, dist: 5.6, h: 2.1, mode: 'title', t: 0 };
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), want = new THREE.Vector3(), wantLook = new THREE.Vector3();
const shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() }; // para tomas cinematográficas
const fwd = new THREE.Vector3();

function followTarget() {
  beetle.forward(fwd);
  const a = Math.atan2(fwd.x, fwd.z) + cam.yaw, p = beetle.pos;
  want.set(p.x - Math.sin(a) * cam.dist, 0, p.z - Math.cos(a) * cam.dist);
  want.y = Math.max(height(want.x, want.z) + 0.6, p.y + cam.h);
  wantLook.set(p.x + fwd.x * 1.4, p.y + 0.55, p.z + fwd.z * 1.4);
}

function updateCamera(dt, t) {
  if (cam.mode === 'title') { // vuelo lento sobre el inicio, detrás del título
    const a = t * 0.05;
    camPos.set(SPAWN.x + Math.sin(a) * 26, 10 + Math.sin(t * 0.2) * 1.5, SPAWN.z - 30 + Math.cos(a) * 26);
    camLook.set(0, 3, RING.z * 0.4);
  } else if (cam.mode === 'shot') { camPos.copy(shot.pos); camLook.copy(shot.look); }
  else {
    followTarget();
    const k = 1 - Math.exp(-dt * 4.5);
    camPos.lerp(want, k); camLook.lerp(wantLook, 1 - Math.exp(-dt * 8));
  }
  camera.position.copy(camPos); camera.lookAt(camLook);
  focus.value += (camera.position.distanceTo(cam.mode === 'follow' ? beetle.pos : camLook) - focus.value) * Math.min(1, dt * 5);
}

/* ---------- Controles: teclado, mouse y táctil ---------- */
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.repeat && !['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) return;
  keys.add(e.code);
  if (state.phase !== 'play' && state.phase !== 'book') return;
  if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); act(); }
  if (e.code === 'KeyC') toggleBook();
  if (e.code === 'KeyM') sndToggle();
  if (e.code === 'Escape' && state.phase === 'book') toggleBook();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

let drag = null;
$('#c').addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') drag = { x: e.clientX, yaw: cam.yaw }; });
addEventListener('pointerup', () => (drag = null));
addEventListener('pointermove', (e) => { if (drag) cam.yaw = drag.yaw - (e.clientX - drag.x) * 0.006; });
$('#c').addEventListener('wheel', (e) => { cam.dist = Math.min(14, Math.max(3, cam.dist * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: true });

// Joystick táctil
const touch = { x: 0, y: 0 };
if (matchMedia('(pointer: coarse)').matches) {
  $('#touch').hidden = false;
  const stick = $('#stick'), knob = stick.querySelector('span');
  const move = (e) => {
    const r = stick.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.min(1, Math.hypot(dx, dy) / (r.width / 2)), a = Math.atan2(dy, dx);
    touch.x = Math.cos(a) * d; touch.y = Math.sin(a) * d;
    knob.style.transform = `translate(${touch.x * 40}px, ${touch.y * 40}px)`;
  };
  stick.addEventListener('pointerdown', (e) => { stick.setPointerCapture(e.pointerId); move(e); });
  stick.addEventListener('pointermove', (e) => e.buttons && move(e));
  stick.addEventListener('pointerup', () => { touch.x = touch.y = 0; knob.style.transform = ''; });
  $('#act').addEventListener('click', act);
}

function input() {
  const k = (...c) => c.some((x) => keys.has(x));
  if (state.phase !== 'play') return { fwd: 0, turn: 0, run: false };
  return {
    fwd: (k('KeyW', 'ArrowUp') ? 1 : 0) - (k('KeyS', 'ArrowDown') ? 1 : 0) - touch.y,
    turn: (k('KeyD', 'ArrowRight') ? 1 : 0) - (k('KeyA', 'ArrowLeft') ? 1 : 0) + touch.x,
    run: k('ShiftLeft', 'ShiftRight') || Math.hypot(touch.x, touch.y) > 0.95
  };
}

/* ---------- Estado del juego ---------- */
const state = { phase: 'title', near: null, sniffing: false, insight: false, slept: new Set(), stepDist: 0 };
const objective = (txt) => { const el = $('#objective'); gsap.fromTo(el, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.6 }); el.textContent = txt; };

function startPlay() {
  if (state.phase !== 'title') return;
  followTarget(); camPos.copy(want); camLook.copy(wantLook); cam.mode = 'follow'; state.phase = 'play';
}
go.addEventListener('click', async () => {
  try { await S.enable(); } catch { /* sin audio, el juego sigue */ }
  sndLabel();
  $('#intro').style.pointerEvents = 'none';
  gsap.to('#intro', { opacity: 0, duration: 0.8, onComplete: () => ($('#intro').hidden = true) });
  // Toma de entrada: la cámara baja desde el aire hasta el escarabajo
  followTarget();
  shot.pos.copy(camPos); shot.look.copy(camLook); cam.mode = 'shot';
  gsap.to(shot.pos, { x: want.x, y: want.y, z: want.z, duration: 3.2, ease: 'power2.inOut' });
  gsap.to(shot.look, { x: wantLook.x, y: wantLook.y, z: wantLook.z, duration: 3.2, ease: 'power2.inOut',
    onComplete: startPlay });
  setTimeout(startPlay, 3600); // por si la pestaña quedó en segundo plano y la animación no terminó
  $('#hud').hidden = false;
  objective('Seguí las esporas brillantes hasta el primer claro.');
});

/* ---------- Olfatear un hongo ---------- */
const sniffObj = { v: 0 };
function act() {
  if (state.phase !== 'play' || state.sniffing || !state.near) return;
  const s = state.near; state.sniffing = true; S.sniff();
  gsap.timeline({ onUpdate: () => beetle.setSniff(sniffObj.v), onComplete: () => (state.sniffing = false) })
    .to(sniffObj, { v: 1, duration: 0.35, ease: 'power2.out' })
    .add(() => { flora.reveal(s); S.found(s.toxic); tag(s); tally(); checkInsight(); }, 0.75)
    .to(sniffObj, { v: 0, duration: 0.5, ease: 'power2.inOut' }, 0.9);
}

// Etiqueta flotante sobre el hongo investigado
const tags = [];
function tag(s) {
  const el = document.createElement('div');
  el.className = `tag ${s.toxic ? 'tox' : 'ed'}`; el.textContent = s.toxic ? 'Venenoso' : 'Comestible';
  $('#tags').appendChild(el);
  const p = new THREE.Vector3(s.x, height(s.x, s.z) + s.top + 0.8, s.z);
  tags.push({ el, p, until: performance.now() + 2600 });
  gsap.fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 });
}
const v3 = new THREE.Vector3();
function drawTags() {
  const now = performance.now();
  for (let i = tags.length - 1; i >= 0; i--) {
    const t = tags[i];
    if (now > t.until) { t.el.remove(); tags.splice(i, 1); continue; }
    v3.copy(t.p).project(camera);
    t.el.style.display = v3.z < 1 ? '' : 'none';
    t.el.style.left = `${(v3.x * 0.5 + 0.5) * innerWidth}px`; t.el.style.top = `${(-v3.y * 0.5 + 0.5) * innerHeight}px`;
    t.el.style.opacity = Math.min(1, (t.until - now) / 400);
  }
}

function counts(side) { const g = flora.specimens.filter((s) => s.side === side); return { n: g.length, f: g.filter((s) => s.found).length, t: g.filter((s) => s.found && s.toxic).length }; }
function tally() {
  const c = counts('con'), s = counts('sin'), el = $('#tally');
  el.hidden = false;
  el.innerHTML = `<div>Con anillo · <b>${c.f}/${c.n}</b> olfateados · <b class="tox">${c.t}</b> venenosos</div>`
    + `<div>Sin anillo · <b>${s.f}/${s.n}</b> olfateados · <b class="tox">${s.t}</b> venenosos</div>`;
}

/* ---------- El descubrimiento del mito ---------- */
function checkInsight() {
  if (state.insight || counts('con').f < 6 || counts('sin').f < 6) return;
  state.insight = true;
  setTimeout(() => {
    state.phase = 'insight'; S.setMood('wonder');
    // Se revelan los que faltan, en cascada
    flora.specimens.filter((s) => !s.found).forEach((s, i) => setTimeout(() => { flora.reveal(s); tally(); }, 300 + i * 140));
    // La cámara sube y muestra los dos grupos encendidos
    shot.pos.copy(camera.position); shot.look.copy(camLook); cam.mode = 'shot';
    const y = height(RING.x, RING.z);
    gsap.to(shot.pos, { x: RING.x, y: y + 34, z: RING.z + 46, duration: 3.5, ease: 'power2.inOut' });
    gsap.to(shot.look, { x: RING.x, y: y + 2, z: RING.z, duration: 3.5, ease: 'power2.inOut' });
    setTimeout(() => S.insight(), 900);
    setTimeout(showInsight, 3600);
  }, 900);
}
function showInsight() {
  const el = $('#insight'); el.hidden = false;
  gsap.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 });
  gsap.fromTo('#stamp', { opacity: 0, scale: 2.6, rotate: -6 }, { opacity: 1, scale: 1, rotate: 10, duration: 0.45, ease: 'power4.in', delay: 1.2, onComplete: S.stamp });
  pages.anillo = true; renderBook();
}
$('#insight-ok').addEventListener('click', () => {
  gsap.to('#insight', { opacity: 0, duration: 0.4, onComplete: () => ($('#insight').hidden = true) });
  cam.mode = 'follow'; state.phase = 'play'; S.setMood('calm');
  objective('Página nueva en el cuaderno (C). Hay otros claros dormidos en el bosque: buscá la niebla azul.');
  gsap.to(trail.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 1.5 });
});

/* ---------- Cuaderno de campo ---------- */
const pages = { anillo: false };
const PAGES = [
  { id: 'anillo', title: 'El anillo', body: 'Olfateé hongos con anillo y sin anillo. En los dos grupos aparecen venenosos casi por igual: <b>61 %</b> con anillo y <b>54 %</b> sin anillo.', chart: [0.605, 0.538, 'Con anillo', 'Sin anillo'] },
  { id: 'magulladura', title: 'La magulladura' }, { id: 'colores', title: 'Los colores' }, { id: 'tamano', title: 'El tamaño' },
  { id: 'proporciones', title: 'Las proporciones' }, { id: 'gemelos', title: 'Los gemelos' }
];
function bars([a, b, la, lb]) {
  const y = (v) => 110 - v * 100, base = y(0.555);
  return `<svg viewBox="0 0 240 140" role="img" aria-label="${la} ${Math.round(a * 100)} %, ${lb} ${Math.round(b * 100)} %">
    <rect x="40" y="${y(a)}" width="60" height="${a * 100}" fill="#d9662c" rx="2"/><rect x="140" y="${y(b)}" width="60" height="${b * 100}" fill="#d9662c" rx="2"/>
    <line x1="20" x2="220" y1="${base}" y2="${base}" stroke="#2a2118" stroke-dasharray="5 4"/>
    <text x="70" y="${y(a) - 5}" text-anchor="middle" font-family="Source Serif 4" font-weight="700" font-size="14">${Math.round(a * 100)} %</text>
    <text x="170" y="${y(b) - 5}" text-anchor="middle" font-family="Source Serif 4" font-weight="700" font-size="14">${Math.round(b * 100)} %</text>
    <text x="70" y="128" text-anchor="middle" font-family="IBM Plex Sans" font-size="11">${la}</text><text x="170" y="128" text-anchor="middle" font-family="IBM Plex Sans" font-size="11">${lb}</text>
    <text x="222" y="${base - 4}" text-anchor="end" font-family="IBM Plex Sans" font-size="9" fill="#6b5a44">55,5 % todos</text></svg>`;
}
function renderBook() {
  $('#book-pages').innerHTML = PAGES.map((p) => pages[p.id]
    ? `<article class="pg"><span class="st">MITO</span><h3>${p.title}</h3>${p.chart ? bars(p.chart) : ''}<p>${p.body}</p></article>`
    : `<article class="pg locked"><div><h3>${p.title}</h3><p>Claro dormido · próximamente</p></div></article>`).join('');
  $('#pages').textContent = `${Object.values(pages).filter(Boolean).length}/${PAGES.length}`;
}
renderBook();
function toggleBook() {
  const b = $('#book');
  if (b.hidden) { b.hidden = false; state.phase = 'book'; S.page(); gsap.fromTo('.paper', { y: 30, opacity: 0, rotate: -1 }, { y: 0, opacity: 1, rotate: 0, duration: 0.45, ease: 'power3.out' }); }
  else { gsap.to('.paper', { y: 20, opacity: 0, duration: 0.25, onComplete: () => { b.hidden = true; state.phase = 'play'; } }); }
}
$('#b-book').addEventListener('click', toggleBook);
$('#book-close').addEventListener('click', toggleBook);
$('#book').addEventListener('click', (e) => { if (e.target.id === 'book') toggleBook(); });

/* ---------- Sonido ---------- */
const sndLabel = () => ($('#b-snd').textContent = `Sonido: ${S.isOn() ? 'sí' : 'no'}`);
async function sndToggle() { await S.toggle(); sndLabel(); }
$('#b-snd').addEventListener('click', sndToggle);

/* ---------- Cada cuadro ---------- */
const clock = new THREE.Clock();
let inRing = false;
function frame() {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  const prev = beetle.pos.clone();
  beetle.update(dt, input());
  flora.update(dt, t);
  world.follow(beetle.pos);
  updateCamera(dt, t);

  if (state.phase === 'play') {
    // Pasos
    state.stepDist += prev.distanceTo(beetle.pos);
    if (state.stepDist > 1.1) { state.stepDist = 0; S.footstep(Math.abs(beetle.state.speed)); }
    // ¿Hay un hongo para olfatear?
    beetle.forward(fwd);
    const head = beetle.pos.clone().addScaledVector(fwd, 0.7);
    state.near = state.sniffing ? state.near : flora.nearest(head);
    const pr = $('#prompt');
    if (state.near && !state.sniffing) { pr.hidden = false; pr.innerHTML = `<kbd>E</kbd> Olfatear este hongo${state.near.side === 'con' ? ' (tiene anillo)' : ' (sin anillo)'}`; }
    else pr.hidden = true;
    // Entrar al claro del anillo
    const dRing = Math.hypot(beetle.pos.x - RING.x, beetle.pos.z - RING.z);
    if (!inRing && dRing < RING.r && !state.insight) {
      inRing = true; tally();
      objective('El claro del anillo. Olfateá hongos de los dos grupos —con anillo a la izquierda, sin anillo a la derecha— y mirá cuáles son venenosos.');
    }
    // Claros dormidos
    for (const s of SLEEPING) {
      if (!state.slept.has(s.name) && Math.hypot(beetle.pos.x - s.x, beetle.pos.z - s.z) < s.r) {
        state.slept.add(s.name); S.sleepy();
        objective(`Un claro dormido: ${s.name}. Se va a despertar en la próxima etapa del juego.`);
      }
    }
  }
  drawTags();
  post.render();
}
renderer.setAnimationLoop(frame);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
window.game = { beetle, flora, camera, state, renderer, backend, frame, keys, act };

// Para pruebas y capturas: ?auto salta la intro; ?x=..&z=..&yaw=.. ubica al escarabajo; ?revelar muestra el descubrimiento
if (params.has('auto')) {
  if (params.has('x')) beetle.place(+params.get('x'), +params.get('z'), +(params.get('yaw') ?? Math.PI));
  $('#intro').hidden = true; $('#hud').hidden = false; cam.mode = 'follow'; state.phase = 'play';
  followTarget(); camPos.copy(want); camLook.copy(wantLook);
  objective('Seguí las esporas brillantes hasta el primer claro.');
}
if (params.has('revelar')) { flora.specimens.slice(0, 6).concat(flora.specimens.slice(13, 19)).forEach((s) => { flora.reveal(s); }); tally(); checkInsight(); }
