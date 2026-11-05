// «Bajo el sombrero»: arranque, cámara, controles, hambre y veneno, narración y el primer mito.
import * as THREE from 'three/webgpu';
import { pass, mrt, output, normalView, uniform, screenUV, smoothstep, vec3, vec4, float, mix } from 'three/tsl';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { buildWorld, sporeTrail, environment, obstacles } from './world.js';
import { createBeetle } from './beetle.js';
import { buildFlora, vision } from './flora.js';
import { walkHeight } from './surfaces.js';
import { height, SPAWN, RING, SLEEPING } from './config.js';
import * as S from './audio.js';
import * as V from './narrator.js';

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
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.05, 1600);

// Postprocesado: profundidad de campo + bloom contenido + efectos de veneno y daño
const post = new THREE.PostProcessing(renderer);
const scenePass = pass(scene, camera);
let colorTex = scenePass.getTextureNode('output');
// Oclusión ambiental (GTAO): sombras de contacto donde las cosas se tocan
let aoPass = null;
if (quality === 'alta') {
  scenePass.setMRT(mrt({ output, normal: normalView }));
  aoPass = ao(scenePass.getTextureNode('depth'), scenePass.getTextureNode('normal'), camera);
  aoPass.resolutionScale = 0.5; aoPass.radius.value = 0.6; aoPass.distanceExponent.value = 1.2; aoPass.scale.value = 1.2; aoPass.thickness.value = 1.5;
  colorTex = aoPass.getTextureNode().mul(colorTex);
}
const focus = uniform(6), focal = uniform(7), bokeh = uniform(2.2);
const poisonU = uniform(0), hurtU = uniform(0), lowU = uniform(0);
const base = quality === 'alta' ? dof(colorTex, scenePass.getViewZNode(), focus, focal, bokeh) : colorTex;
const lit = base.add(bloom(base, 0.32, 0.4, 0.92));
let out = lit.rgb;
const vig = smoothstep(0.25, 0.85, screenUV.sub(0.5).length());
const gray = out.dot(vec3(0.299, 0.587, 0.114));
out = mix(out, vec3(gray.mul(0.6), gray.mul(1.1), gray.mul(0.5)).mul(0.8).add(out.mul(0.2)), poisonU.mul(0.85)); // el veneno vuelve el mundo verdoso
out = out.mul(float(1).sub(vig.mul(poisonU.mul(0.9).add(lowU.mul(0.55)))));                                   // viñeta (veneno o poca energía)
out = out.add(vec3(1, 0.1, 0.05).mul(vig.mul(hurtU).mul(0.9)));                                                // destello rojo al perder una vida
post.outputNode = vec4(out, lit.a);

/* ---------- Mundo ---------- */
const world = buildWorld(scene, { quality });
environment(renderer, scene, scene.userData.sunDir);
const flora = buildFlora(scene);
const trail = sporeTrail(scene);
const beetle = createBeetle(scene);
beetle.setMushrooms(flora.all);
beetle.place(SPAWN.x, SPAWN.z, Math.PI);

$('#tech').textContent = `three.js r180 · ${backend} · TSL · Tone.js · calidad ${quality}`;
const go = $('#go'); go.disabled = false; go.textContent = 'Entrar al bosque';

/* ---------- Estado del juego ---------- */
const state = { phase: 'title', near: null, busy: false, insight: false, slept: new Set(), stepDist: 0, inRing: false, idle: 0 };
const game = { lives: 3, energy: 80, poison: 0, starving: 0, faints: 0, eats: [], sniffs: 0, beat: 0 };
const say = V.say;
const objective = (txt) => { const el = $('#objective'); el.textContent = txt; gsap.fromTo(el, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.6 }); };

/* ---------- Cámara: órbita libre + brazo con resorte ---------- */
const cam = { yaw: 0, pitch: 0.36, dist: 5.6, arm: 5.6, mode: 'title' };
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), want = new THREE.Vector3(), wantLook = new THREE.Vector3();
const shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
const H = new THREE.Vector3(), tv = new THREE.Vector3();

// ¿En qué fracción del segmento a→b choca con un hongo o un tronco? (1 = no choca)
function armHit(a, b) {
  let best = 1;
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const cyl = (cx, cz, r, y0, y1) => {
    const fx = a.x - cx, fz = a.z - cz, A = dx * dx + dz * dz, B = 2 * (fx * dx + fz * dz), C = fx * fx + fz * fz - r * r;
    if (A < 1e-6 || C < 0) return; const disc = B * B - 4 * A * C; if (disc < 0) return;
    const t = (-B - Math.sqrt(disc)) / (2 * A); if (t <= 0.02 || t >= best) return;
    const y = a.y + dy * t; if (y >= y0 && y <= y1) best = t;
  };
  const on = beetle.on;
  for (const m of flora.all) {
    if (m === on || Math.abs(m.x - a.x) > 16 || Math.abs(m.z - a.z) > 16) continue;
    cyl(m.x, m.z, m.stemR(0.5) + 0.1, m.base, m.base + m.climbTop);
    cyl(m.x, m.z, m.Rw, m.base + m.climbTop, m.base + m.top + 0.2);
  }
  for (const o of obstacles) if (Math.abs(o.x - a.x) < 70 && Math.abs(o.z - a.z) < 70) cyl(o.x, o.z, o.r * 0.8, -50, 900);
  return best;
}

function followTarget(dt = 1) {
  const p = beetle.pos, mode = beetle.mode;
  let az, el = cam.pitch;
  if (mode === 'stem') { const n = beetle.up; az = Math.atan2(n.x, n.z) + cam.yaw; el = cam.pitch - 0.15; }
  else { beetle.heading(H); az = Math.atan2(-H.x, -H.z) + cam.yaw; }
  wantLook.set(p.x, p.y + 0.45, p.z);
  tv.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  want.copy(wantLook).addScaledVector(tv, cam.dist);
  const hit = armHit(wantLook, want);
  const target = Math.max(1.1, cam.dist * hit - (hit < 1 ? 0.35 : 0));
  cam.arm += (target - cam.arm) * Math.min(1, dt * (target < cam.arm ? 14 : 2.5)); // se acerca rápido, se aleja lento
  want.copy(wantLook).addScaledVector(tv, cam.arm);
  want.y = Math.max(want.y, walkHeight(want.x, want.z) + 0.25);
}

function updateCamera(dt, t) {
  if (cam.mode === 'title') {
    const a = t * 0.05;
    camPos.set(SPAWN.x + Math.sin(a) * 26, 10 + Math.sin(t * 0.2) * 1.5, SPAWN.z - 30 + Math.cos(a) * 26);
    camLook.set(0, 3, RING.z * 0.4);
  } else if (cam.mode === 'shot') { camPos.copy(shot.pos); camLook.copy(shot.look); }
  else {
    followTarget(dt);
    camPos.lerp(want, 1 - Math.exp(-dt * 6)); camLook.lerp(wantLook, 1 - Math.exp(-dt * 10));
  }
  camera.position.copy(camPos); camera.lookAt(camLook);
  // Veneno: la cámara se balancea y "respira"
  if (game.poison > 0) { camera.rotateZ(Math.sin(t * 1.7) * 0.08 * game.poison); camera.fov = 52 + Math.sin(t * 2.3) * 5 * game.poison; camera.updateProjectionMatrix(); }
  else if (camera.fov !== 52) { camera.fov = 52; camera.updateProjectionMatrix(); }
  focus.value += (camera.position.distanceTo(cam.mode === 'follow' ? beetle.pos : camLook) - focus.value) * Math.min(1, dt * 5);
}

/* ---------- Controles: teclado, mouse y táctil ---------- */
const keys = new Set();
const MOVE = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyV'];
addEventListener('keydown', (e) => {
  if (MOVE.includes(e.code) || e.code === 'Space') e.preventDefault();
  if (e.repeat && !MOVE.includes(e.code)) return;
  keys.add(e.code);
  if (state.phase === 'play') {
    if (e.code === 'KeyE') sniff();
    if (e.code === 'KeyF') eat();
  }
  if (state.phase === 'play' || state.phase === 'book') {
    if (e.code === 'KeyC') toggleBook();
    if (e.code === 'KeyM') sndToggle();
    if (e.code === 'Escape' && state.phase === 'book') toggleBook();
  }
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

// Mirar alrededor: arrastrar con el mouse (o con el dedo fuera de los controles)
let drag = null;
$('#c').addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw: cam.yaw, pitch: cam.pitch, id: e.pointerId }; });
addEventListener('pointerup', (e) => { if (drag && drag.id === e.pointerId) drag = null; });
addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  cam.yaw = drag.yaw - (e.clientX - drag.x) * 0.006;
  cam.pitch = Math.max(-0.35, Math.min(1.35, drag.pitch + (e.clientY - drag.y) * 0.005));
});
$('#c').addEventListener('wheel', (e) => { cam.dist = Math.min(16, Math.max(2.2, cam.dist * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: true });
$('#c').addEventListener('contextmenu', (e) => e.preventDefault());

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
  stick.addEventListener('pointerdown', (e) => { e.stopPropagation(); stick.setPointerCapture(e.pointerId); move(e); });
  stick.addEventListener('pointermove', (e) => e.buttons && move(e));
  stick.addEventListener('pointerup', () => { touch.x = touch.y = 0; knob.style.transform = ''; });
  $('#act').addEventListener('click', () => sniff());
  $('#act-eat').addEventListener('click', () => eat());
}

function input() {
  const k = (...c) => c.some((x) => keys.has(x));
  if (state.phase !== 'play' || state.busy) return { fwd: 0, turn: 0, run: false };
  return {
    fwd: (k('KeyW', 'ArrowUp') ? 1 : 0) - (k('KeyS', 'ArrowDown') ? 1 : 0) - touch.y,
    turn: (k('KeyD', 'ArrowRight') ? 1 : 0) - (k('KeyA', 'ArrowLeft') ? 1 : 0) + touch.x,
    run: (k('ShiftLeft', 'ShiftRight') || Math.hypot(touch.x, touch.y) > 0.95) && game.energy > 5
  };
}

/* ---------- Vidas y energía ---------- */
function drawStatus() {
  $('#hearts').innerHTML = [0, 1, 2].map((i) => `<i class="${i < game.lives ? '' : 'off'}">♥</i>`).join('');
  $('#energy').style.width = `${Math.max(0, game.energy)}%`;
  $('#energy').parentElement.classList.toggle('low', game.energy < 22);
}
drawStatus();

function startPlay() {
  if (state.phase !== 'title') return;
  followTarget(); camPos.copy(want); camLook.copy(wantLook); cam.mode = 'follow'; state.phase = 'play';
}
go.addEventListener('click', async () => {
  try { await S.enable(); } catch { /* sin audio, el juego sigue */ }
  sndLabel();
  $('#intro').style.pointerEvents = 'none';
  gsap.to('#intro', { opacity: 0, duration: 0.8, onComplete: () => ($('#intro').hidden = true) });
  cam.arm = cam.dist; followTarget();
  shot.pos.copy(camPos); shot.look.copy(camLook); cam.mode = 'shot';
  gsap.to(shot.pos, { x: want.x, y: want.y, z: want.z, duration: 3.2, ease: 'power2.inOut' });
  gsap.to(shot.look, { x: wantLook.x, y: wantLook.y, z: wantLook.z, duration: 3.2, ease: 'power2.inOut', onComplete: startPlay });
  setTimeout(startPlay, 3600); // por si la pestaña quedó en segundo plano
  $('#hud').hidden = false;
  objective('Seguí las esporas brillantes hasta el claro.');
  say('i1', 'Sos un escarabajo. Para vos, el bosque es un continente, y cada hongo, una torre.', { wait: 600 });
  say('i2', 'Hace días que no comés nada. El hambre empieza a apretar.');
  say('i3', 'Más adelante hay un claro lleno de hongos. Seguí las esporas que brillan.');
});

/* ---------- Olfatear: dice la verdad, pero cansa ---------- */
const anim = { v: 0 };
function sniff() {
  const m = state.near;
  if (state.phase !== 'play' || state.busy || !m) return;
  if (m.known) { say('known', m.toxic ? 'Ese ya lo conocés: es venenoso.' : 'Ese ya lo conocés: es comestible.', { repeat: true }); return; }
  state.busy = true; S.sniff(); game.energy -= 6; game.sniffs++; drawStatus();
  gsap.timeline({ onUpdate: () => beetle.setSniff(anim.v), onComplete: () => (state.busy = false) })
    .to(anim, { v: 1, duration: 0.35, ease: 'power2.out' })
    .add(() => {
      flora.reveal(m); S.found(m.toxic); tag(m, m.toxic ? 'Venenoso' : 'Comestible', m.toxic ? 'tox' : 'ed'); tally(); checkInsight();
      if (!say('s1', `${m.toxic ? 'Venenoso' : 'Comestible'}. Tus antenas no se equivocan… pero olfatear cansa.`) && game.sniffs === 4)
        say('s4', 'Cada olfateo te gasta energía. No vas a poder olfatearlos todos.');
    }, 0.75)
    .to(anim, { v: 0, duration: 0.5, ease: 'power2.inOut' }, 0.9);
}

/* ---------- Comer: alimenta… o envenena ---------- */
const chewA = { v: 0 };
function eat() {
  const m = state.near;
  if (state.phase !== 'play' || state.busy || !m) return;
  if (m.eaten) { say('eaten', 'De ese ya comiste. Buscá otro.', { repeat: true }); return; }
  state.busy = true; S.chew();
  const blind = !m.known;
  gsap.timeline({ onUpdate: () => beetle.setChew(chewA.v), onComplete: () => { state.busy = false; } })
    .to(chewA, { v: 1, duration: 0.25 })
    .to(chewA, { v: 0, duration: 0.3 }, 1.15)
    .add(() => {
      flora.eat(m); game.eats.push({ side: m.side, blind, toxic: m.toxic });
      tag(m, m.toxic ? 'Venenoso' : 'Comestible', m.toxic ? 'tox' : 'ed'); tally(); checkInsight();
      if (m.toxic) poisoned(blind); else fed();
    }, 1.2);
}
function fed() {
  game.energy = Math.min(100, game.energy + 35); drawStatus(); S.heal();
  if (!say('e1', 'Rico. Sentís cómo vuelve la energía.') && game.eats.length >= 4) say('e4', '¿Estás eligiendo por el anillo? Fijate cuántos te salieron bien.');
}
function poisoned(blind) {
  game.lives -= 1; game.poison = 1; drawStatus(); S.poison(true); S.hurt();
  gsap.fromTo(hurtU, { value: 1 }, { value: 0, duration: 1.2 });
  if (game.lives <= 0) { faint(); return; }
  if (!say('p1', 'Algo anda mal… el mundo da vueltas. Era venenoso.'))
    say('p' + game.lives, game.lives === 1 ? 'Cuidado. Una vez más y no la contás.' : 'Otra vez veneno. Tu cuerpo lo siente.', { repeat: true });
  if (blind && game.eats.filter((e) => e.blind && e.toxic).length === 2) say('p-blind', 'Comer a ciegas es como tirar una moneda.');
}
function faint() {
  if (state.phase === 'faint') return;
  state.phase = 'faint'; game.faints++; S.faint();
  say('f', 'Todo se apaga…', { repeat: true });
  gsap.to('#fade', { opacity: 1, duration: 1.6, delay: 0.6, onComplete: () => {
    const back = state.inRing || state.insight ? { x: RING.x, z: RING.z + 42 } : { x: SPAWN.x, z: SPAWN.z };
    beetle.place(back.x, back.z, Math.PI);
    Object.assign(game, { lives: 3, energy: 60, poison: 0, starving: 0 }); S.poison(false); drawStatus();
    cam.arm = cam.dist; followTarget(); camPos.copy(want); camLook.copy(wantLook);
    gsap.to('#fade', { opacity: 0, duration: 1.4, delay: 0.4, onComplete: () => { state.phase = 'play'; S.wake(); } });
    say('w', game.faints === 1 ? 'Despertaste al borde del claro. Lo aprendiste por las malas.' : 'Otra vez en pie. El bosque no perdona.', { repeat: true });
  } });
}

// Etiqueta flotante sobre el hongo
const tags = [];
function tag(m, text, cls) {
  const el = document.createElement('div');
  el.className = `tag ${cls}`; el.textContent = text;
  $('#tags').appendChild(el);
  tags.push({ el, p: new THREE.Vector3(m.x, m.base + m.top + 0.8, m.z), until: performance.now() + 2600 });
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

function counts(side) { const g = flora.specimens.filter((s) => s.side === side); return { n: g.length, k: g.filter((s) => s.known).length, t: g.filter((s) => s.known && s.toxic).length }; }
function tally() {
  if (!state.inRing && !state.insight) return;
  const c = counts('con'), s = counts('sin'), el = $('#tally');
  el.hidden = false;
  el.innerHTML = `<div>Con anillo · <b>${c.k}/${c.n}</b> conocidos · <b class="tox">${c.t}</b> venenosos</div>`
    + `<div>Sin anillo · <b>${s.k}/${s.n}</b> conocidos · <b class="tox">${s.t}</b> venenosos</div>`;
}

/* ---------- El descubrimiento: los datos del claro + tus propias decisiones ---------- */
function mine() {
  const line = (side, one, many) => {
    const e = game.eats.filter((x) => x.side === side && x.blind); if (!e.length) return '';
    const t = e.filter((x) => x.toxic).length;
    return `<p>Comiste <b>${e.length}</b> ${e.length === 1 ? one : many} sin olfatear: <b class="tox">${t}</b> ${t === 1 ? 'era venenoso' : 'eran venenosos'} (${Math.round((t / e.length) * 100)} %).</p>`;
  };
  return line('con', 'hongo con anillo', 'hongos con anillo') + line('sin', 'hongo sin anillo', 'hongos sin anillo');
}
function checkInsight() {
  if (state.insight || counts('con').k < 6 || counts('sin').k < 6) return;
  state.insight = true;
  say('ins0', 'Ya conocés bastantes hongos de los dos lados. Mirá lo que descubriste.');
  setTimeout(() => {
    if (state.phase === 'faint') { state.insight = false; return; }
    state.phase = 'insight'; S.setMood('wonder');
    flora.specimens.filter((s) => !s.known).forEach((s, i) => setTimeout(() => { flora.reveal(s); tally(); }, 300 + i * 140));
    shot.pos.copy(camera.position); shot.look.copy(camLook); cam.mode = 'shot';
    const y = height(RING.x, RING.z);
    gsap.to(shot.pos, { x: RING.x, y: y + 34, z: RING.z + 46, duration: 3.5, ease: 'power2.inOut' });
    gsap.to(shot.look, { x: RING.x, y: y + 2, z: RING.z, duration: 3.5, ease: 'power2.inOut' });
    setTimeout(() => S.insight(), 900);
    setTimeout(showInsight, 3600);
  }, 1500);
}
function showInsight() {
  const me = mine();
  $('#insight-mine').innerHTML = me ? `<p class="eyebrow">Tu partida</p>${me}` : '';
  const el = $('#insight'); el.hidden = false;
  gsap.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 });
  gsap.fromTo('#stamp', { opacity: 0, scale: 2.6, rotate: -6 }, { opacity: 1, scale: 1, rotate: 10, duration: 0.45, ease: 'power4.in', delay: 1.2, onComplete: S.stamp });
  pages.anillo = true; renderBook();
}
$('#insight-ok').addEventListener('click', () => {
  gsap.to('#insight', { opacity: 0, duration: 0.4, onComplete: () => ($('#insight').hidden = true) });
  cam.mode = 'follow'; state.phase = 'play'; S.setMood('calm');
  objective('Página nueva en el cuaderno (C). Hay otros claros dormidos: buscá la niebla azul.');
  say('ins1', 'El anillo no avisa nada: con anillo o sin anillo, el bosque se parece demasiado.');
  say('ins2', 'Hay otros claros en el bosque. Todavía duermen… pero ya van a despertar.');
  gsap.to(trail.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 1.5 });
});

/* ---------- Cuaderno de campo ---------- */
const pages = { anillo: false };
const PAGES = [
  { id: 'anillo', title: 'El anillo', body: 'En los dos grupos aparecen venenosos casi por igual: <b>61 %</b> con anillo y <b>54 %</b> sin anillo.', chart: [0.605, 0.538, 'Con anillo', 'Sin anillo'] },
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
  const me = mine();
  $('#book-pages').innerHTML = PAGES.map((p) => pages[p.id]
    ? `<article class="pg"><span class="st">MITO</span><h3>${p.title}</h3>${p.chart ? bars(p.chart) : ''}<p>${p.body}</p>${me ? `<div class="me"><b>En tu partida:</b>${me}</div>` : ''}</article>`
    : `<article class="pg locked"><div><h3>${p.title}</h3><p>Claro dormido · próximamente</p></div></article>`).join('');
  $('#pages').textContent = `${Object.values(pages).filter(Boolean).length}/${PAGES.length}`;
}
renderBook();
function toggleBook() {
  const b = $('#book');
  if (b.hidden) { renderBook(); b.hidden = false; state.phase = 'book'; S.page(); gsap.fromTo('.paper', { y: 30, opacity: 0, rotate: -1 }, { y: 0, opacity: 1, rotate: 0, duration: 0.45, ease: 'power3.out' }); }
  else { gsap.to('.paper', { y: 20, opacity: 0, duration: 0.25, onComplete: () => { b.hidden = true; state.phase = 'play'; } }); }
}
$('#b-book').addEventListener('click', toggleBook);
$('#book-close').addEventListener('click', toggleBook);
$('#book').addEventListener('click', (e) => { if (e.target.id === 'book') toggleBook(); });

/* ---------- Sonido y voz ---------- */
const sndLabel = () => ($('#b-snd').textContent = `Sonido: ${S.isOn() ? 'sí' : 'no'}`);
async function sndToggle() { await S.toggle(); sndLabel(); }
$('#b-snd').addEventListener('click', sndToggle);
$('#b-voz').addEventListener('click', () => { const on = V.setVoice(!V.hasVoice()); $('#b-voz').textContent = `Voz: ${on ? 'sí' : 'no'}`; });

/* ---------- Cada cuadro ---------- */
const clock = new THREE.Clock();
const prev = new THREE.Vector3();
function frame() {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  prev.copy(beetle.pos);
  const inp = input();
  const ev = beetle.update(dt, inp);
  flora.update(dt, t);
  world.follow(beetle.pos);
  vision.value += ((keys.has('KeyV') ? 1 : 0) - vision.value) * Math.min(1, dt * 8);

  if (state.phase === 'play') {
    const moved = prev.distanceTo(beetle.pos);
    // Hambre: baja de a poco; más rápido si caminás o corrés
    game.energy -= dt * (0.35 + (moved > 0.001 ? 0.45 : 0) + (inp.run ? 1 : 0));
    if (game.energy <= 0) {
      game.energy = 0; game.starving += dt;
      say('starve', 'Sin energía, cada paso cuesta. Si no comés, no vas a aguantar.');
      if (game.starving > 7) { game.starving = 0; game.lives -= 1; drawStatus(); S.hurt(); gsap.fromTo(hurtU, { value: 1 }, { value: 0, duration: 1.2 }); if (game.lives <= 0) faint(); }
    }
    if (game.energy < 50) say('hungry', 'El hambre aprieta. Los hongos son comida… pero no todos.');
    if (game.energy < 22) { game.beat -= dt; if (game.beat <= 0) { game.beat = 1.4; S.heartbeat(); } }
    lowU.value += ((game.energy < 22 ? 1 : 0) - lowU.value) * Math.min(1, dt * 2);
    drawStatus();

    // Pasos
    state.stepDist += moved;
    if (state.stepDist > 1.1) { state.stepDist = 0; S.footstep(Math.abs(beetle.state.speed)); }
    state.idle = moved > 0.001 ? 0 : state.idle + dt;
    if (state.idle > 10) say('move', 'Usá W A S D o las flechas para caminar. Arrastrá el mouse para mirar alrededor.');

    // Eventos del escarabajo
    if (ev === 'trepa') { S.climb(); say('c1', 'Los tallos se trepan. Seguí subiendo hasta el sombrero.'); }
    if (ev === 'arriba') S.climb();
    if (ev === 'llegó:cap') say('c2', 'Desde acá arriba se ve todo el claro. Arrastrá el mouse hacia abajo para mirar el bosque desde lo alto.');
    if (ev === 'saltó') { S.jump(); say('c3', 'Del borde del sombrero se salta al suelo.'); }
    if (beetle.mode === 'ground' && walkHeight(beetle.pos.x, beetle.pos.z) > height(beetle.pos.x, beetle.pos.z) + 0.6) say('twig', 'Las ramas no son paredes: para un escarabajo, son puentes.');

    // ¿Hay un hongo al alcance?
    beetle.heading(H);
    const head = beetle.pos.clone().addScaledVector(H, 0.7);
    if (!state.busy) state.near = flora.nearest(head, beetle.mode === 'ground' ? null : beetle.on);
    const pr = $('#prompt'), m = state.near;
    if (m && !state.busy) {
      const what = m.side === 'con' ? ' · tiene anillo' : m.side === 'sin' ? ' · sin anillo' : '';
      const sn = m.known ? (m.toxic ? '<span class="tox">venenoso</span>' : '<span class="ed">comestible</span>') : '<kbd>E</kbd> Olfatear';
      pr.innerHTML = `${sn} · ${m.eaten ? 'ya comido' : '<kbd>F</kbd> Comer'}${what}`;
      pr.hidden = false;
      if (beetle.mode === 'ground') say('near1', 'Un hongo. Podés olfatearlo para saber si es venenoso, o comerlo y arriesgarte. Si empujás contra el tallo, lo trepás.');
    } else pr.hidden = true;

    // Zonas
    if (!state.inRing && Math.hypot(beetle.pos.x - RING.x, beetle.pos.z - RING.z) < RING.r) {
      state.inRing = true; tally();
      objective('El claro del anillo: comé para sobrevivir y averiguá si el anillo sirve para elegir.');
      say('r1', 'El claro. A la izquierda, hongos con anillo; a la derecha, sin anillo.');
      say('r2', 'Dicen que el anillo sirve para saber cuáles son venenosos. ¿Será cierto? Comé… y averigualo.');
    }
    for (const s of SLEEPING) {
      if (!state.slept.has(s.name) && Math.hypot(beetle.pos.x - s.x, beetle.pos.z - s.z) < s.r) {
        state.slept.add(s.name); S.sleepy();
        say('sl' + s.name, `Este claro todavía duerme. Pronto: ${s.name}.`);
      }
    }
  }
  // El veneno se va pasando
  if (game.poison > 0) { game.poison = Math.max(0, game.poison - dt / 9); if (game.poison === 0) S.poison(false); }
  poisonU.value = game.poison; beetle.setWobble(game.poison);

  updateCamera(dt, t);
  drawTags();
  post.render();
}
renderer.setAnimationLoop(frame);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
window.game = { beetle, flora, camera, state, game, renderer, backend, frame, keys, sniff, eat, cam };

// Para pruebas y capturas: ?auto salta la intro; ?x=..&z=..&yaw=.. ubica al escarabajo
if (params.has('auto')) {
  if (params.has('x')) beetle.place(+params.get('x'), +params.get('z'), +(params.get('yaw') ?? Math.PI));
  $('#intro').hidden = true; $('#hud').hidden = false; cam.mode = 'follow'; state.phase = 'play';
  cam.arm = cam.dist; followTarget(); camPos.copy(want); camLook.copy(wantLook);
  objective('Seguí las esporas brillantes hasta el claro.');
}
// Capturas: ?sobre=N sube al sombrero del hongo N del claro; ?veneno simula estar envenenado; ?pitch=.. mira arriba/abajo
if (params.has('sobre')) { const m = flora.specimens[+params.get('sobre')]; Object.assign(beetle.state, { mode: 'cap', m, x: m.x + m.Rw * 0.3, z: m.z, yaw: Math.PI / 2 }); }
if (params.has('veneno')) setInterval(() => (game.poison = 0.9), 30);
if (params.has('pitch')) cam.pitch = +params.get('pitch');
if (params.has('sobre') || params.has('pitch')) { for (let i = 0; i < 40; i++) beetle.update(0.02, { fwd: 0, turn: 0, run: false }); cam.arm = cam.dist; followTarget(); camPos.copy(want); camLook.copy(wantLook); }
