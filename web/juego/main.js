// «Bajo el sombrero»: arranque, cámara, controles, hambre y veneno, vuelo, narración y los niveles (claros).
import * as THREE from 'three/webgpu';
import { pass, mrt, output, normalView, uniform, screenUV, smoothstep, vec3, vec4, float, mix, uv, color, vec2 } from 'three/tsl';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { buildWorld, sporeTrail, environment, obstacles } from './world.js';
import { createBeetle } from './beetle.js';
import { buildFlora, vision } from './flora.js';
import { walkHeight, shelfAt } from './surfaces.js';
import { height, SPAWN, RING, SLEEPING, LEVELS, TRAIL } from './config.js';
import * as S from './audio.js';
import * as V from './narrator.js';
import * as A from './access.js';
import * as SV from './speechvocab.js';
import { SPECIES, photo, credit } from './species.js';

const $ = (s) => document.querySelector(s);
const gsap = window.gsap;
const params = new URLSearchParams(location.search);
// Calidad: arranca en "livianos" para que funcione en cualquier máquina; se puede pasar a "altos"
let saved = null; try { saved = localStorage.getItem('bajo-el-sombrero:calidad'); } catch { /* sin almacenamiento */ }
const quality = (params.get('q') || saved) === 'alta' ? 'alta' : 'baja';
function setQuality(q) {
  try { localStorage.setItem('bajo-el-sombrero:calidad', q); } catch { /* nada */ }
  const u = new URL(location.href); u.searchParams.set('q', q); location.href = u.toString();
}

/* ---------- Render: WebGPU (o WebGL 2 si el navegador no lo tiene) ---------- */
const renderer = new THREE.WebGPURenderer({ canvas: $('#c'), antialias: true, forceWebGL: params.has('gl') });
renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'alta' ? 1.75 : 1));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = quality === 'alta' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
await renderer.init();
const step = (v) => { window.__load?.set(v); return new Promise((r) => setTimeout(r, 16)); }; // deja dibujar la barra de carga
await step(0.3);
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
const poisonU = uniform(0), hurtU = uniform(0), lowU = uniform(0), healU = uniform(0);
const base = quality === 'alta' ? dof(colorTex, scenePass.getViewZNode(), focus, focal, bokeh) : colorTex;
const lit = quality === 'alta' ? base.add(bloom(base, 0.32, 0.4, 0.92)) : base;
let out = lit.rgb;
const vig = smoothstep(0.25, 0.85, screenUV.sub(0.5).length());
const gray = out.dot(vec3(0.299, 0.587, 0.114));
out = mix(out, vec3(gray.mul(0.6), gray.mul(1.1), gray.mul(0.5)).mul(0.8).add(out.mul(0.2)), poisonU.mul(0.85)); // el veneno vuelve el mundo verdoso
out = out.mul(float(1).sub(vig.mul(poisonU.mul(0.9).add(lowU.mul(0.55)))));                                   // viñeta (veneno o poca energía)
out = out.add(vec3(1, 0.1, 0.05).mul(vig.mul(hurtU).mul(0.9)));
out = out.add(vec3(0.35, 1, 0.45).mul(vig.mul(healU).mul(0.55)));                                             // destello verde al comer algo bueno                                                // destello rojo al perder una vida
post.outputNode = vec4(out, lit.a);

/* ---------- Mundo ---------- */
await step(0.4);
const world = buildWorld(scene, { quality });
const clock24 = { k: 0 }; // hora del día del bosque (0 tarde · 1 noche)
await step(0.6);
environment(renderer, scene, scene.userData.sunDir);
const flora = buildFlora(scene, { quality });
await step(0.8);
let trail = sporeTrail(scene, TRAIL);
const beetle = createBeetle(scene);
await step(0.9);
beetle.setMushrooms(flora.all);

// Pedacitos que saltan al morder (un pequeño sistema de partículas en la CPU)
const bits = (() => {
  const N = 80, mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), N);
  mesh.frustumCulled = false; mesh.castShadow = true; scene.add(mesh);
  const ps = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, s: 0.05 }));
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), c = new THREE.Color();
  let i0 = 0;
  for (let i = 0; i < N; i++) { mx.makeScale(0, 0, 0); mesh.setMatrixAt(i, mx); mesh.setColorAt(i, c.set('#fff')); }
  return {
    emit(at, colors, n = 18, up = 1) {
      for (let k = 0; k < n; k++) {
        const i = (i0++) % N, p = ps[i];
        p.p.copy(at); p.v.set((Math.random() - 0.5) * 4, (1.5 + Math.random() * 3) * up, (Math.random() - 0.5) * 4);
        p.life = 0.9 + Math.random() * 0.6; p.s = 0.04 + Math.random() * 0.07;
        mesh.setColorAt(i, c.set(colors[k % colors.length]));
      }
      mesh.instanceColor.needsUpdate = true;
    },
    update(dt) {
      for (let i = 0; i < N; i++) {
        const p = ps[i]; if (p.life <= 0) continue;
        p.life -= dt; p.v.y -= 9 * dt; p.p.addScaledVector(p.v, dt);
        const k = Math.max(0, Math.min(1, p.life * 2));
        q.setFromEuler(new THREE.Euler(p.life * 7, p.life * 5, 0)); sc.setScalar(p.s * k);
        mx.compose(p.p, q, sc); mesh.setMatrixAt(i, mx);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
})();

// El pájaro: una sombra que cruza el bosque. Hay que esconderse debajo de un sombrero.
const birdShadow = (() => {
  const k = uniform(0), mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  const d = uv().sub(0.5).mul(vec2(1, 1.6)).length().mul(2);
  mat.colorNode = color('#000000'); mat.opacityNode = float(1).sub(d).clamp(0, 1).pow(0.8).mul(k).mul(0.6);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(46, 30), mat); mesh.rotation.x = -Math.PI / 2; mesh.visible = false; mesh.renderOrder = 5;
  scene.add(mesh);
  return { mesh, k };
})();
const bird = { next: 75, t: -1, dur: 8, cross: 5, from: new THREE.Vector3(), dir: new THREE.Vector3(), checked: false };
function birdStart() {
  const a = Math.random() * Math.PI * 2; bird.dir.set(Math.cos(a), 0, Math.sin(a));
  const speed = 26; bird.from.copy(beetle.pos).addScaledVector(bird.dir, -speed * bird.cross); bird.speed = speed;
  bird.t = 0; bird.checked = false; birdShadow.mesh.visible = true; S.bird();
  tip('bird' + Date.now(), '¡Un pájaro! Escondete debajo de un sombrero o trepá un tallo.', { repeat: true });
  const near = flora.nearest(beetle.pos, null, 40) || unexploredNear()[0];
  if (near) A.speak([SV.MISC.bird, ...whereParts(near)], { interrupt: true });
}
// ¿Está a salvo? Debajo de un sombrero (en el suelo, cerca del tallo) o trepado al tallo
function hidden() {
  if (beetle.mode === 'stem') return true;
  if (beetle.mode !== 'ground') return false;
  const p = beetle.pos;
  return flora.all.some((m) => Math.hypot(p.x - m.x, p.z - m.z) < m.Rw * 0.9 && m.climbTop > 1.2);
}
function birdUpdate(dt) {
  if (bird.t < 0) {
    if (state.phase === 'play' && state.entered.size > 0) { bird.next -= dt; if (bird.next <= 0) { bird.next = 60 + Math.random() * 50; birdStart(); } }
    return;
  }
  bird.t += dt;
  const p = bird.from.clone().addScaledVector(bird.dir, bird.speed * bird.t);
  birdShadow.mesh.position.set(p.x, walkHeight(p.x, p.z) + 1.2, p.z);
  birdShadow.mesh.rotation.z = -Math.atan2(bird.dir.z, bird.dir.x);
  birdShadow.k.value = Math.min(1, bird.t / 1.2, (bird.dur - bird.t) / 1.2);
  if (!bird.checked && bird.t >= bird.cross) {
    bird.checked = true;
    if (state.phase !== 'play') return;
    if (hidden()) { tip('birdok' + Date.now(), '¡A salvo bajo el sombrero!', { repeat: true }); S.heal(); A.speak(SV.MISC.safe, { interrupt: true }); }
    else {
      game.energy = Math.max(0, game.energy - 25); drawStatus(); S.hurt(); floatText('−25 energía', 'loss');
      gsap.fromTo(hurtU, { value: 0.8 }, { value: 0, duration: 1 }); A.speak(SV.MISC.hit, { interrupt: true });
      tip('birdhit' + Date.now(), 'El pájaro te picoteó: perdiste energía. Para la próxima, escondete debajo de un sombrero.', { repeat: true });
    }
  }
  if (bird.t >= bird.dur) { bird.t = -1; birdShadow.mesh.visible = false; }
}

// Texto flotante (por ejemplo «+35 energía») sobre el escarabajo
function floatText(text, cls) {
  const el = document.createElement('div'); el.className = `float ${cls}`; el.textContent = text; $('#tags').appendChild(el);
  const p = beetle.pos.clone().add(new THREE.Vector3(0, 1.2, 0)).project(camera);
  el.style.left = `${(p.x * 0.5 + 0.5) * innerWidth}px`; el.style.top = `${(-p.y * 0.5 + 0.5) * innerHeight}px`;
  gsap.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: -30, duration: 0.6, ease: 'power2.out' });
  gsap.to(el, { opacity: 0, y: -60, duration: 0.7, delay: 1.1, onComplete: () => el.remove() });
}
beetle.place(SPAWN.x, SPAWN.z, Math.PI);

$('#tech').textContent = `three.js r180 · ${backend} · TSL · Tone.js`;
const qLabel = quality === 'alta' ? 'Gráficos: altos' : 'Gráficos: livianos';
for (const b of document.querySelectorAll('.b-q')) {
  b.textContent = !b.classList.contains('q-intro') ? qLabel : quality === 'alta' ? `${qLabel} · pasar a livianos` : `${qLabel} · pasar a altos`;
  b.addEventListener('click', () => setQuality(quality === 'alta' ? 'baja' : 'alta'));
}
const go = $('#go'); go.disabled = false; go.textContent = 'Entrar al bosque'; go.focus();
window.__load?.done();

/* ---------- Estado del juego ---------- */
const state = { phase: 'title', near: null, busy: false, slept: new Set(), stepDist: 0, idle: 0, cur: null, entered: new Set(), done: new Set(), awake: new Set(['anillo']), insighting: false, flights: 0 };
const levelOf = (m) => LEVELS.find((L) => L.id === m.level);
const game = { lives: 3, energy: 80, poison: 0, starving: 0, faints: 0, eats: [], sniffs: 0, beat: 0 };
const say = V.say;   // historia: con voz y subtítulo
const acc = A.setupPanel();
// avisos cortos del momento: sin voz de la narradora (en modo audio los lee la voz de accesibilidad)
const tip = (id, text, opts) => { const shown = V.tip(id, text, opts); if (shown) A.announce(text); return shown; }; // la voz dice solo lo esencial (modo audio simplificado)
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
  want.y = Math.max(want.y, walkHeight(want.x, want.z, Math.max(want.y, p.y) + 3) + 0.25);
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
const HELD = ['jump', 'down', 'vision']; // acciones que se mantienen apretadas
addEventListener('keydown', (e) => {
  if (acc.open) return; // el panel de accesibilidad maneja sus propias teclas
  const act = A.actionFor(e.code);
  if (MOVE.includes(e.code) || act) e.preventDefault();
  if (e.repeat && !MOVE.includes(e.code) && !HELD.includes(act)) return;
  keys.add(e.code);
  // En la pantalla de inicio: A activa el modo audio, Enter entra al bosque
  if (state.phase === 'title') {
    if (e.code === 'KeyA') toggleAudioMode();
    if (e.code === 'Enter' && !go.disabled) go.click();
    return;
  }
  if (state.phase === 'play') {
    if (act === 'sniff') sniff();
    if (act === 'eat') eat();
    if (act === 'jump' && !e.repeat) state.jumpQ = true;
    if (act === 'autofly') fly();
    if (act === 'describe') describe();
    if (act === 'status') status();
  }
  if (state.phase === 'play' || state.phase === 'book') {
    if (act === 'book') toggleBook();
    if (act === 'sound') sndToggle();
    if (e.code === 'Escape' && state.phase === 'book') toggleBook();
  }
  if (state.phase === 'insight' && e.code === 'Enter') $('#insight-ok').click();
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

const touch = { x: 0, y: 0, up: false, down: false };
const coarse = matchMedia('(pointer: coarse)').matches;
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
  $('#act-fly').addEventListener('click', () => fly());
  // Saltar (un toque) o volar (mantener) · bajar volando
  const hold = (el, on, off) => { el.addEventListener('pointerdown', (e) => { e.stopPropagation(); el.setPointerCapture(e.pointerId); on(); }); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); };
  hold($('#act-jump'), () => { state.jumpQ = true; touch.up = true; }, () => (touch.up = false));
  hold($('#act-down'), () => (touch.down = true), () => (touch.down = false));
}

function input() {
  const k = (...c) => c.some((x) => keys.has(x));
  const jump = state.jumpQ; state.jumpQ = false;
  const canFly = game.energy > 1;
  if (state.phase !== 'play' || state.busy) return { fwd: 0, turn: 0, run: false, jump: false, up: false, down: false, canFly };
  return {
    fwd: (k('KeyW', 'ArrowUp') ? 1 : 0) - (k('KeyS', 'ArrowDown') ? 1 : 0) - touch.y,
    turn: (k('KeyD', 'ArrowRight') ? 1 : 0) - (k('KeyA', 'ArrowLeft') ? 1 : 0) + touch.x,
    run: (k('ShiftLeft', 'ShiftRight') || Math.hypot(touch.x, touch.y) > 0.95) && game.energy > 5,
    jump, up: keys.has(A.keyFor('jump')) || !!touch.up, down: keys.has(A.keyFor('down')) || !!touch.down, canFly
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

// Tocar un hongo de la magulladura: se ve si se mancha
function touchCheck(m) {
  if (!m.level || m.traitKnown || !flora.touch(m)) return;
  tag(m, m.yes ? 'Se mancha' : 'No se mancha', m.yes ? 'bru' : 'neutral');
  S.sniff();
  tip('bru1', m.yes ? 'El tallo se pone azul donde lo tocaste. Se mancha.' : 'Lo tocaste y no pasó nada: este no se mancha.');
  tally(); checkInsight(levelOf(m));
}

/* ---------- Ficha: la foto real de un hongo parecido ---------- */
let fichaT = 0;
function showPhoto(m) {
  // los hongos del taller no tienen foto: la ficha muestra el nombre que les pusiste
  const sp = SPECIES[m.species] || (m.design && { name: m.design, tag: m.toxic ? 'venenoso' : 'comestible', tox: m.toxic, note: 'Un hongo que diseñaste en el taller.' }); if (!sp) return;
  $('#ficha-img').hidden = !SPECIES[m.species];
  if (SPECIES[m.species]) { $('#ficha-img').src = photo(m.species); $('#ficha-img').alt = sp.name; $('#ficha-img').dataset.sp = m.species; }
  $('#ficha-n').textContent = sp.name;
  const t = $('#ficha-t'); t.textContent = sp.tag; t.className = `ficha-t ${sp.tox ? 'tox' : m.species === 'trametes' ? '' : 'ed'}`;
  $('#ficha-d').innerHTML = sp.note + (m.row ? `<small class="ficha-x">Fila real del Excel: sombrero de ${String(m.row.d).replace('.', ',')} cm · tallo de ${String(m.row.h).replace('.', ',')} cm de alto y ${String(m.row.w).replace('.', ',')} mm de ancho.</small>` : ''); $('#ficha-c').textContent = SPECIES[m.species] ? credit(m.species) : 'Diseño del taller de hongos';
  // Lo que investiga el nivel, destacado
  const L = m.level ? levelOf(m) : null, r = $('#ficha-r');
  const trait = !L ? '' : {
    ring: m.yes ? 'Tiene anillo' : 'No tiene anillo',
    bruise: !m.traitKnown ? '' : m.yes ? 'Se mancha al tocarlo' : 'No se mancha al tocarlo',
    color: m.yes ? 'Color llamativo' : 'Color común',
    size: m.yes ? 'Chico: hasta 4 cm de sombrero' : 'Grande: 10 cm o más de sombrero',
    stem: m.yes ? 'Tallo grueso para su sombrero' : 'Tallo fino para su sombrero',
    twin: m.yes ? 'Era una Amanita' : 'Era un champiñón'
  }[L.trait];
  r.hidden = !trait; r.innerHTML = trait ? `<span>${L.title}</span>${trait} · <b class="${m.toxic ? 'tox' : 'ed'}">${m.toxic ? 'venenoso' : 'comestible'}</b>` : '';
  const el = $('#ficha'); el.hidden = false; gsap.fromTo(el, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 });
  clearTimeout(fichaT); fichaT = setTimeout(() => gsap.to(el, { opacity: 0, duration: 0.5, onComplete: () => (el.hidden = true) }), 7000);
  tip('ficha1', 'Abajo a la izquierda ves cómo es un hongo así en la vida real.');
  A.announce(SV.speciesPhrase(sp));
}

/* ---------- Foto en grande ---------- */
function openPhoto(id) {
  const sp = SPECIES[id]; if (!sp) return;
  $('#lb-img').src = photo(id); $('#lb-img').alt = sp.name;
  const t = $('#lb-tag'); t.textContent = sp.tag; t.className = sp.tox ? 'tox' : 'ed';
  $('#lb-name').textContent = sp.name; $('#lb-note').textContent = sp.note; $('#lb-credit').textContent = credit(id);
  const lb = $('#lightbox'); lb.hidden = false; gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: 0.25 });
  clearTimeout(fichaT); // mientras mirás la foto, la ficha no se va
}
const closePhoto = () => { const lb = $('#lightbox'); if (!lb.hidden) gsap.to(lb, { opacity: 0, duration: 0.2, onComplete: () => (lb.hidden = true) }); };
document.addEventListener('click', (e) => { const img = e.target.closest?.('img[data-sp]'); if (img) { e.stopPropagation(); openPhoto(img.dataset.sp); } }, true);
$('#lightbox').addEventListener('click', closePhoto);
addEventListener('keydown', (e) => { if (e.code === 'Escape') closePhoto(); });

// Activar o desactivar el modo audio desde la pantalla de inicio (tecla A). La tecla cuenta como interacción,
// así que en ese momento se puede habilitar el audio del navegador y la voz confirma.
window.__enableAudio = async () => { try { await S.enable(); sndLabel(); } catch { /* sin audio */ } };
async function toggleAudioMode() {
  await window.__enableAudio();
  acc.setAudio(!A.settings.audio);
  const on = A.settings.audio, tipEl = $('.sr-tip');
  tipEl.innerHTML = on ? '<b>🔊 Modo audio activado.</b> G: volar a un hongo · Espacio: saltar · E: olfatear · F: comer · Q: qué hay cerca · R: tus vidas. Apretá <b>Enter</b> para entrar.' : 'Modo audio desactivado. Para activarlo, apretá la tecla A.';
  tipEl.classList.toggle('on', on);
  A.speak(on ? SV.MISC.audioOnIntro : SV.MISC.audioOff, { interrupt: true, force: true });
}

/* ---------- Descripciones habladas (accesibilidad) ---------- */
// Cómo se describe un hongo con palabras (fragmentos pregenerados: rasgo + estado)
function mushParts(m) {
  const L = m.level ? levelOf(m) : null, M = SV.MUSH;
  const trait = !L ? M.decor : L.trait === 'ring' ? (m.yes ? M.ringYes : M.ringNo) : L.trait === 'bruise' ? (!m.traitKnown ? M.bruiseUnknown : m.yes ? M.bruiseYes : M.bruiseNo)
    : L.trait === 'color' ? (m.yes ? M.colorYes : M.colorNo) : L.trait === 'size' ? (m.yes ? M.sizeYes : M.sizeNo)
    : L.trait === 'stem' ? (m.yes ? M.stemYes : M.stemNo) : M.twin;
  return [trait, m.known ? (m.toxic ? SV.STATE.tox : SV.STATE.ed) : SV.STATE.unknown, m.eaten ? SV.STATE.eaten : null];
}
// Dirección y distancia como fragmentos («adelante a la izquierda,» «a 14 centímetros.»)
function whereParts(to) { beetle.heading(H); const r = A.direction(beetle.pos, H, to); return [`${r.where},`, SV.distPhrase(SV.distStep(r.d))]; }
const unexploredNear = () => {
  const p = beetle.pos;
  const pool = flora.all.filter((s) => (s.level ? state.awake.has(s.level) && !state.done.has(s.level) && !(s.known && s.traitKnown) : !s.known) && s !== beetle.on);
  return pool.map((s) => [s, Math.hypot(s.x - p.x, s.z - p.z)]).filter(([, d]) => d < 90).sort((a, b) => a[1] - b[1]).map(([s]) => s);
};
// Q: cuántos hongos quedan sin explorar y cuál es el más cercano (corto y siempre igual)
function describe() {
  const near = unexploredNear(), parts = [];
  if (state.cur) parts.push(SV.remainPhrase(Math.min(40, flora.specimens.filter((s) => s.level === state.cur.id && !(s.known && s.traitKnown)).length)));
  if (near.length) parts.push(SV.MISC.nearest, ...mushParts(near[0]), ...whereParts(near[0]));
  else {
    const next = LEVELS.find((L) => state.awake.has(L.id) && !state.done.has(L.id));
    if (next && next !== state.cur) parts.push(SV.placeDir(next), ...whereParts(next.at)); else parts.push(SV.MISC.noneNear);
  }
  A.speak(parts, { interrupt: true, force: true });
}
function status() {
  A.speak([SV.livesPhrase(game.lives), SV.energyPhrase(SV.ENERGY_STEPS.reduce((b, s) => (Math.abs(s - game.energy) < Math.abs(b - game.energy) ? s : b), 0)),
    SV.donePhrase(state.done.size, LEVELS.length), game.poison > 0 ? SV.MISC.poisoned : null], { interrupt: true, force: true });
}

/* ---------- Azar equilibrado ---------- */
// Cada hongo se "decide" cuando lo olfateás o lo comés. Si los dos anteriores salieron del mismo tipo,
// el tercero sale del otro: se intercambia la toxicidad con otro hongo sin explorar del mismo grupo,
// así las proporciones del claro (las de los datos) no cambian. Solo en grupos cercanos al 50 %.
const streak = {};
function decide(m) {
  if (m.decided) return;
  m.decided = true;
  const h = (streak[m.level || 'bosque'] ||= []);
  const want = h.length >= 2 && h[h.length - 1] === h[h.length - 2] ? !h[h.length - 1] : null;
  if (want !== null && m.toxic !== want) {
    if (m.level) {
      const L = levelOf(m), p = (m.yes ? L.toxYes / L.nYes : L.toxNo / L.nNo);
      if (p >= 0.3 && p <= 0.7) {
        // solo con otro que se vea igual (misma especie en 3D): si no, cambiaría el aspecto delante tuyo
        const other = flora.specimens.find((s) => s.level === m.level && s.yes === m.yes && !s.decided && !s.known && s.toxic === want && s.look === m.look);
        if (other) { [m.toxic, other.toxic] = [other.toxic, m.toxic]; [m.species, other.species] = [other.species, m.species]; }
      }
    }
  }
  h.push(m.toxic);
}

/* ---------- Olfatear: dice la verdad, pero cansa ---------- */
const anim = { v: 0 };
// Hongos repisa de los árboles (Trametes versicolor, «cola de pavo»): no son venenosos, pero son duros como la madera
function onShelf() { return beetle.mode === 'ground' && !beetle.airborne ? shelfAt(beetle.pos.x, beetle.pos.z, beetle.state.fy) : null; }
function shelfAct(kind) {
  state.busy = true;
  const a = { v: 0 }, set = kind === 'sniff' ? (v) => beetle.setSniff(v) : (v) => beetle.setChew(v);
  if (kind === 'sniff') { S.sniff(); game.energy -= 3; } else S.chew();
  drawStatus();
  gsap.timeline({ onUpdate: () => set(a.v), onComplete: () => (state.busy = false) }).to(a, { v: 1, duration: 0.35 }).to(a, { v: 1, duration: kind === 'sniff' ? 0.6 : 0.9 }).to(a, { v: 0, duration: 0.3 });
  const text = kind === 'sniff' ? SV.MISC.shelfSniff : SV.MISC.shelfEat;
  tip('shelf-' + kind + Date.now(), text, { repeat: true }); A.speak(text);
  if (kind === 'sniff') showPhoto({ species: 'trametes' });
}

function sniff() {
  if (state.phase === 'play' && !state.busy && onShelf()) return shelfAct('sniff');
  const m = state.near;
  if (state.phase !== 'play' || state.busy || !m) return;
  if (m.known) { tip('known', m.toxic ? 'Ese ya lo conocés: es venenoso.' : 'Ese ya lo conocés: es comestible.', { repeat: true }); return; }
  decide(m);
  touchCheck(m); // para olfatearlo hay que tocarlo
  state.busy = true; S.sniff(); game.energy -= 6; game.sniffs++; drawStatus();
  gsap.timeline({ onUpdate: () => beetle.setSniff(anim.v), onComplete: () => (state.busy = false) })
    .to(anim, { v: 1, duration: 0.35, ease: 'power2.out' })
    .add(() => {
      flora.reveal(m); S.found(m.toxic); showPhoto(m); A.speak(m.toxic ? SV.MISC.tox : SV.MISC.ed); tag(m, m.toxic ? 'Venenoso' : 'Comestible', m.toxic ? 'tox' : 'ed'); tally(); checkInsight(levelOf(m));
      if (!tip('s1', `${m.toxic ? 'Venenoso' : 'Comestible'}. Tus antenas no se equivocan… pero olfatear cansa.`) && game.sniffs === 4)
        tip('s4', 'Cada olfateo te gasta energía. No vas a poder olfatearlos todos.');
    }, 0.75)
    .to(anim, { v: 0, duration: 0.5, ease: 'power2.inOut' }, 0.9);
}

/* ---------- Comer: alimenta… o envenena ---------- */
const chewA = { v: 0 };
function eat() {
  if (state.phase === 'play' && !state.busy && onShelf()) return shelfAct('eat');
  const m = state.near;
  if (state.phase !== 'play' || state.busy || !m) return;
  if (m.eaten) { tip('eaten', 'De ese ya comiste. Buscá otro.', { repeat: true }); return; }
  decide(m);
  touchCheck(m);
  state.busy = true; S.chew();
  const blind = !m.known;
  gsap.timeline({ onUpdate: () => beetle.setChew(chewA.v), onComplete: () => { state.busy = false; } })
    .to(chewA, { v: 1, duration: 0.25 })
    .to(chewA, { v: 0, duration: 0.3 }, 1.15)
    .add(() => {
      const mouth = beetle.pos.clone().addScaledVector(beetle.forward(new THREE.Vector3()), 0.75);
      bits.emit(mouth, [m.look.cap[m.colorName]?.[1] || '#c8a070', m.look.cap[m.colorName]?.[0] || '#a07050', '#f3ead8'], 22);
      if (m.toxic) bits.emit(mouth, ['#9b5bd6', '#c58cff', '#6b3aa6'], 16, 0.6);
      flora.eat(m); showPhoto(m); game.eats.push({ level: m.level, yes: m.yes, trait: m.traitKnown, blind, toxic: m.toxic });
      tag(m, m.toxic ? 'Venenoso' : 'Comestible', m.toxic ? 'tox' : 'ed'); tally(); checkInsight(levelOf(m));
      if (m.toxic) poisoned(blind); else fed();
    }, 1.2);
}
function fed() {
  const before = game.energy; game.energy = Math.min(100, game.energy + 35); drawStatus(); S.heal();
  floatText(`+${Math.round(game.energy - before)} energía`, 'gain'); A.speak(SV.MISC.ateEd);
  gsap.fromTo(healU, { value: 1 }, { value: 0, duration: 1.4 });
  const bar = $('#energy').parentElement; bar.classList.remove('boost'); void bar.offsetWidth; bar.classList.add('boost');
  if (!tip('e1', 'Rico. Sentís cómo vuelve la energía.') && game.eats.length >= 4) tip('e4', '¿Estás eligiendo por el aspecto? Fijate cuántos te salieron bien.');
}
function poisoned(blind) {
  game.lives -= 1; game.poison = 1; drawStatus(); S.poison(true); S.hurt();
  floatText('−1 vida', 'loss'); A.speak(SV.MISC.ateTox);
  gsap.fromTo(hurtU, { value: 1 }, { value: 0, duration: 1.2 });
  if (game.lives <= 0) { faint(); return; }
  if (!tip('p1', 'Algo anda mal… el mundo da vueltas. Era venenoso.'))
    tip('p' + game.lives, game.lives === 1 ? 'Cuidado. Una vez más y no la contás.' : 'Otra vez veneno. Tu cuerpo lo siente.', { repeat: true });
  if (blind && game.eats.filter((e) => e.blind && e.toxic).length === 2) tip('p-blind', 'Comer a ciegas es como tirar una moneda.');
}
function faint() {
  if (state.phase === 'faint') return;
  state.phase = 'faint'; game.faints++; S.faint(); A.speak(SV.MISC.faint, { interrupt: true });
  tip('f', 'Todo se apaga…', { repeat: true });
  gsap.to('#fade', { opacity: 1, duration: 1.6, delay: 0.6, onComplete: () => {
    const back = state.cur ? { x: state.cur.at.x, z: state.cur.at.z + state.cur.spread + 10 } : { x: SPAWN.x, z: SPAWN.z };
    beetle.place(back.x, back.z, Math.PI);
    Object.assign(game, { lives: 3, energy: 60, poison: 0, starving: 0 }); S.poison(false); drawStatus();
    cam.arm = cam.dist; followTarget(); camPos.copy(want); camLook.copy(wantLook);
    gsap.to('#fade', { opacity: 0, duration: 1.4, delay: 0.4, onComplete: () => { state.phase = 'play'; S.wake(); A.speak(SV.MISC.wake); } });
    tip('w', game.faints === 1 ? 'Despertaste al borde del claro. Lo aprendiste por las malas.' : 'Otra vez en pie. El bosque no perdona.', { repeat: true });
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

function counts(L, yes) {
  const g = flora.specimens.filter((s) => s.level === L.id && s.yes === yes);
  return { n: g.length, k: g.filter((s) => s.known && s.traitKnown).length, t: g.filter((s) => s.known && s.traitKnown && s.toxic).length };
}
const cap1 = (s) => s[0].toUpperCase() + s.slice(1);
const toPlace = (p) => ('a ' + p).replace(/^a el /, 'al '); // «a el claro» → «al claro»
function tally() {
  const L = state.cur; if (!L) return;
  const a = counts(L, true), b = counts(L, false), el = $('#tally');
  el.hidden = false;
  el.innerHTML = `<div>${cap1(L.yes)} · <b>${a.k}</b> conocidos · <b class="tox">${a.t}</b> venenosos</div>`
    + `<div>${cap1(L.no)} · <b>${b.k}</b> conocidos · <b class="tox">${b.t}</b> venenosos</div>`;
}

/* ---------- El descubrimiento: los datos del claro + tus propias decisiones ---------- */
// Cómo se nombra cada grupo en plural («hongos con anillo», «hongos que se manchaban»…)
function plural(L, yes) {
  const g = yes ? L.yes : L.no;
  return { 'se mancha': 'que se manchaban', 'no se mancha': 'que no se manchaban', chico: 'chicos', grande: 'grandes', Amanita: 'que resultaron Amanita', 'champiñón': 'que resultaron champiñón' }[g] || g;
}
function mine(L) {
  const line = (yes) => {
    const e = game.eats.filter((x) => x.level === L.id && x.yes === yes && x.blind); if (!e.length) return '';
    const t = e.filter((x) => x.toxic).length;
    return `<p>Comiste <b>${e.length}</b> ${e.length === 1 ? 'hongo' : 'hongos'} ${plural(L, yes)} sin olfatear: <b class="tox">${t}</b> ${t === 1 ? 'era venenoso' : 'eran venenosos'} (${Math.round((t / e.length) * 100)} %).</p>`;
  };
  return line(true) + line(false);
}
// Dificultad: cuántos hongos conocidos de cada grupo hacen falta para descubrir el mito
let savedD = null; try { savedD = localStorage.getItem('bajo-el-sombrero:dificultad'); } catch { /* nada */ }
let difficulty = savedD === 'normal' ? 'normal' : 'facil';
const NEEDS = { facil: 2, normal: 4 };
function diffLabel() { for (const b of document.querySelectorAll('.b-d')) b.textContent = b.classList.contains('q-intro') ? (difficulty === 'facil' ? 'Dificultad: fácil (2 de cada grupo)' : 'Dificultad: normal (4 de cada grupo)') : (difficulty === 'facil' ? 'Fácil' : 'Normal'); }
for (const b of document.querySelectorAll('.b-d')) b.addEventListener('click', (e) => {
  e.currentTarget.blur();
  difficulty = difficulty === 'facil' ? 'normal' : 'facil';
  try { localStorage.setItem('bajo-el-sombrero:dificultad', difficulty); } catch { /* nada */ }
  diffLabel(); if (state.cur) checkInsight(state.cur);
});
diffLabel();
function checkInsight(L) {
  const NEED = NEEDS[difficulty];
  if (!L || state.done.has(L.id) || state.insighting || counts(L, true).k < NEED || counts(L, false).k < NEED) return;
  state.insighting = true;
  tip('ins0' + L.id, 'Ya conocés bastantes hongos de los dos grupos. Mirá lo que descubriste.');
  setTimeout(() => {
    if (state.phase === 'faint') { state.insighting = false; return; }
    state.phase = 'insight'; S.setMood('wonder');
    flora.specimens.filter((s) => s.level === L.id && !s.known).forEach((s, i) => setTimeout(() => { flora.reveal(s); if (L.trait === 'bruise') flora.touch(s); tally(); }, 300 + i * 120));
    shot.pos.copy(camera.position); shot.look.copy(camLook); cam.mode = 'shot';
    const y = height(L.at.x, L.at.z);
    gsap.to(shot.pos, { x: L.at.x, y: y + L.spread * 1.4, z: L.at.z + L.spread * 1.9, duration: 3.2, ease: 'power2.inOut' });
    gsap.to(shot.look, { x: L.at.x, y: y + 2, z: L.at.z, duration: 3.2, ease: 'power2.inOut' });
    setTimeout(() => S.insight(), 800);
    setTimeout(() => showInsight(L), 3300);
  }, 1200);
}
// Galería: las especies reales del claro, separadas según la diferencia del nivel
function gallery(L) {
  const col = (yes) => {
    const ids = [...new Set(flora.specimens.filter((s) => s.level === L.id && s.yes === yes).map((s) => s.species))];
    return `<div><h4>${cap1(L.trait === 'twin' ? (yes ? 'los mortales' : 'los comestibles') : L.yes === undefined ? '' : (yes ? L.yes : L.no))}</h4><div class="row">${ids.map((id) => {
      const sp = SPECIES[id];
      return `<figure><img src="${photo(id)}" alt="${sp.name}" data-sp="${id}" loading="lazy"><figcaption><b class="${sp.tox ? 'tox' : 'ed'}">${sp.tag}</b>${sp.name}</figcaption></figure>`;
    }).join('')}</div></div>`;
  };
  return col(true) + col(false);
}
// Informe de un nivel: lo mismo en el resumen al terminar el claro y en el cuaderno
function report(L) {
  const pct = (v) => `${Math.round(v * 100)} %`;
  const nums = L.nums || [[pct(L.research[0]), `venenosos<br>${L.yes}`], [pct(L.research[1]), `venenosos<br>${L.no}`]];
  const me = mine(L);
  return {
    main: `<div class="stamp${L.stamp.length > 6 ? ' long' : ''}">${L.stamp}</div>
      <p class="eyebrow rep-k">Claro ${LEVELS.indexOf(L) + 1} de ${LEVELS.length} · ${L.title}</p>
      <h2>${L.h2}</h2>
      <div class="nums">${nums.map(([v, l]) => `<div><b class="tox">${v}</b><span>${l}</span></div>`).join('')}</div>
      ${L.nums ? '' : `<div class="rep-chart">${bars([...L.research, cap1(L.yes), cap1(L.no)])}</div>`}
      <p class="small">${L.small}</p>
      ${me ? `<div class="mine"><p class="eyebrow">Tu partida</p>${me}</div>` : ''}`,
    side: `<p class="eyebrow">Así se ven en la vida real · tocá una foto para verla grande</p><div class="gallery">${gallery(L)}</div>`
  };
}
function showInsight(L) {
  const r = report(L);
  $('#ins-main').innerHTML = r.main; $('#ins-side').innerHTML = r.side;
  const next = LEVELS[LEVELS.indexOf(L) + 1];
  $('#insight-ok').textContent = next ? `Ir ${toPlace(next.place)}` : 'Seguir explorando';
  const el = $('#insight'); el.hidden = false; el.scrollTop = 0;
  gsap.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 });
  gsap.fromTo('#ins-main .stamp', { opacity: 0, scale: 2.6, rotate: -6 }, { opacity: 1, scale: 1, rotate: 10, duration: 0.45, ease: 'power4.in', delay: 1.2, onComplete: S.stamp });
  state.done.add(L.id); state.insighting = false; renderBook();
  A.speak(SV.insightText(L), { interrupt: true });
  setTimeout(() => $('#insight-ok').focus(), 900);
}
$('#insight-ok').addEventListener('click', () => {
  const L = state.cur; if (!L || !state.done.has(L.id) || state.phase !== 'insight') return;
  const next = LEVELS[LEVELS.indexOf(L) + 1];
  gsap.to('#insight', { opacity: 0, duration: 0.4, onComplete: () => ($('#insight').hidden = true) });
  cam.mode = 'follow'; state.phase = 'play'; S.setMood('calm'); $('#tally').hidden = true; state.cur = null;
  say('after' + L.id, L.after);
  gsap.to(trail.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 1.2 });
  if (next) {
    // Se despierta el claro siguiente y aparece un camino de esporas hasta él
    state.awake.add(next.id); world.wake(next.at.name);
    const a = L.at, b = next.at, mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    trail = sporeTrail(scene, [[a.x, a.z - 4], [mx + (b.z - a.z) * 0.12, mz - (b.x - a.x) * 0.12], [b.x, b.z]]);
    objective(`Volando ${toPlace(next.place)}…`);
    say('next' + next.id, `Abrís las alas y seguís las esporas ${toPlace(next.place)}. Otro claro, otra creencia para poner a prueba.`);
    // Vuelo de viaje: gratis, siguiendo las esporas, y aterriza al borde del claro mirando al centro
    const lx = b.x, lz = b.z + next.spread + 7, d = Math.hypot(lx - beetle.pos.x, lz - beetle.pos.z);
    state.phase = 'travel'; S.fly();
    // Durante el vuelo pasa el tiempo: cada claro es un poco más tarde que el anterior
    gsap.to(clock24, { k: next.time, duration: 7, ease: 'sine.inOut', onUpdate: () => world.setTime(clock24.k) });
    setTimeout(() => beetle.flyToGround(lx, lz, Math.atan2(b.x - lx, b.z - lz), Math.min(7, 2.5 + d / 40), Math.max(18, d * 0.3)), 500);
  } else {
    objective('Completaste el cuaderno de campo (C). Podés seguir explorando el bosque… o volver a la web con el botón de arriba a la derecha.');
    say('end1', 'Seis creencias puestas a prueba. Ninguna alcanza para saber si un hongo es comestible.');
    say('end2', 'Gracias por jugar. Ante la duda, no se come.');
  }
});

/* ---------- Cuaderno de campo: índice de los claros y, al tocar uno, el mismo informe del resumen ---------- */
function bars([a, b, la, lb]) {
  const y = (v) => 110 - v * 100, base = y(0.555);
  return `<svg viewBox="0 0 290 140" role="img" aria-label="${la}: ${Math.round(a * 100)} % venenosos; ${lb}: ${Math.round(b * 100)} %">
    <rect x="40" y="${y(a)}" width="60" height="${a * 100}" fill="#e2622a" rx="2"/><rect x="140" y="${y(b)}" width="60" height="${b * 100}" fill="#e2622a" rx="2"/>
    <line x1="20" x2="220" y1="${base}" y2="${base}" stroke="currentColor" stroke-dasharray="5 4" opacity=".7"/>
    <g fill="currentColor"><text x="70" y="${y(a) - 5}" text-anchor="middle" font-family="Source Serif 4" font-weight="700" font-size="14">${Math.round(a * 100)} %</text>
    <text x="170" y="${y(b) - 5}" text-anchor="middle" font-family="Source Serif 4" font-weight="700" font-size="14">${Math.round(b * 100)} %</text>
    <text x="70" y="128" text-anchor="middle" font-family="IBM Plex Sans" font-size="11">${la}</text><text x="170" y="128" text-anchor="middle" font-family="IBM Plex Sans" font-size="11">${lb}</text>
    <text x="226" y="${base + 3}" text-anchor="start" font-family="IBM Plex Sans" font-size="10" opacity=".75">55,5 % todos</text></g></svg>`;
}
let bookView = null; // null = índice; id = informe de ese claro
function renderBook() {
  const box = $('#book-pages');
  const L = bookView && LEVELS.find((x) => x.id === bookView);
  if (L && state.done.has(L.id)) {
    const r = report(L);
    box.className = 'pages rep-view';
    box.innerHTML = `<button class="back" id="book-back">← Todos los claros</button><div class="rep"><div class="rep-main">${r.main}</div><div class="rep-side">${r.side}</div></div>`;
    $('#book-back').addEventListener('click', () => { bookView = null; renderBook(); });
  } else {
    bookView = null; box.className = 'pages';
    box.innerHTML = LEVELS.map((L, i) => {
      if (!state.done.has(L.id)) return `<article class="pg locked"><div><span class="n">${i + 1}</span><h3>${L.title}</h3><p>${state.awake.has(L.id) ? 'Claro despierto · por descubrir' : 'Claro dormido'}</p></div></article>`;
      const nums = L.nums ? L.nums.map((n) => n[0]) : L.research.map((v) => `${Math.round(v * 100)} %`);
      const labels = L.nums ? ['en total', 'grupos puros'] : [L.yes, L.no];
      const pics = [...new Set(flora.specimens.filter((s) => s.level === L.id).map((s) => s.species))].slice(0, 4).map((id) => `<img src="${photo(id)}" alt="${SPECIES[id].name}">`).join('');
      return `<button class="pg open" data-lv="${L.id}"><span class="st">${L.stamp}</span><span class="n">${i + 1}</span><h3>${L.title}</h3>
        <p class="mini"><b>${nums[0]}</b> ${labels[0]} · <b>${nums[1]}</b> ${labels[1]}</p><div class="pics">${pics}</div><span class="more">Ver el informe →</span></button>`;
    }).join('');
    for (const b of box.querySelectorAll('[data-lv]')) b.addEventListener('click', () => { bookView = b.dataset.lv; renderBook(); $('.paper').scrollTop = 0; });
  }
  $('#pages').textContent = `${state.done.size}/${LEVELS.length}`;
}
renderBook();
function toggleBook() {
  const b = $('#book');
  if (b.hidden) { renderBook(); b.hidden = false; state.phase = 'book'; S.page(); gsap.fromTo('.paper', { y: 30, opacity: 0, rotate: -1 }, { y: 0, opacity: 1, rotate: 0, duration: 0.45, ease: 'power3.out' }); }
  else { gsap.to('.paper', { y: 20, opacity: 0, duration: 0.25, onComplete: () => { b.hidden = true; state.phase = 'play'; bookView = null; } }); }
}
$('#b-book').addEventListener('click', toggleBook);
$('#book-close').addEventListener('click', toggleBook);
$('#book').addEventListener('click', (e) => { if (e.target.id === 'book') toggleBook(); });

/* ---------- Volar al próximo hongo sin explorar ---------- */
const FLY_COST = 1.5;
const unexplored = (s) => !(s.known && s.traitKnown) && !(s.known && !s.level);
function flyTarget() {
  const p = beetle.pos, on = beetle.on;
  const nearestOf = (pool) => { let best = null, bd = Infinity; for (const s of pool) { if (s === on) continue; const d = Math.hypot(s.x - p.x, s.z - p.z); if (d > 1.5 && d < bd) { bd = d; best = s; } } return best; };
  // 1) el claro actual, 2) cualquier claro despierto sin descubrir, 3) el hongo sin explorar más cercano del bosque
  const L = state.cur && !state.done.has(state.cur.id) ? state.cur : null;
  return (L && nearestOf(flora.specimens.filter((s) => s.level === L.id && unexplored(s))))
    || nearestOf(flora.specimens.filter((s) => state.awake.has(s.level) && !state.done.has(s.level) && unexplored(s)))
    || nearestOf(flora.all.filter((s) => !s.known));
}
function fly() {
  if (state.phase !== 'play' || state.busy || beetle.state.mode === 'transit') return;
  if (game.energy < FLY_COST) { tip('flytired', 'Estás sin fuerzas para volar. Comé algo primero.', { repeat: true }); return; }
  const target = flyTarget();
  if (!target) { tip('flynone', 'Ya exploraste todos los hongos que hay cerca.', { repeat: true }); return; }
  game.energy -= FLY_COST; drawStatus(); state.flights++;
  beetle.flyTo(target); S.fly();
  tip('fly1', 'Los escarabajos también vuelan: abrís los élitros, desplegás las alas y aterrizás sobre un hongo que todavía no exploraste.');
}
$('#b-fly').addEventListener('click', (e) => { e.currentTarget.blur(); fly(); });

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
  bits.update(dt);
  birdUpdate(dt);
  world.follow(beetle.pos);
  vision.value += ((keys.has(A.keyFor('vision')) ? 1 : 0) - vision.value) * Math.min(1, dt * 8);

  if (state.phase === 'play') {
    const moved = prev.distanceTo(beetle.pos);
    // Hambre: baja de a poco; más rápido si caminás o corrés
    const freeFly = beetle.flying && beetle.state.mode === 'air'; // volar libre cansa (el vuelo automático casi no)
    game.energy -= dt * (0.35 + (moved > 0.001 && !freeFly ? 0.45 : 0) + (inp.run ? 1 : 0) + (freeFly ? 1.3 : 0));
    if (game.energy <= 0) {
      game.energy = 0; game.starving += dt;
      tip('starve', 'Sin energía, cada paso cuesta. Si no comés, no vas a aguantar.');
      if (game.starving > 7) { game.starving = 0; game.lives -= 1; drawStatus(); S.hurt(); gsap.fromTo(hurtU, { value: 1 }, { value: 0, duration: 1.2 }); if (game.lives <= 0) faint(); }
    }
    if (game.energy < 50) tip('hungry', 'El hambre aprieta. Los hongos son comida… pero no todos.');
    if (game.energy < 22) { game.beat -= dt; if (game.beat <= 0) { game.beat = 1.4; S.heartbeat(); } }
    lowU.value += ((game.energy < 22 ? 1 : 0) - lowU.value) * Math.min(1, dt * 2);
    drawStatus();

    // Pasos
    state.stepDist += moved;
    if (state.stepDist > 1.1) { state.stepDist = 0; S.footstep(Math.abs(beetle.state.speed)); }
    state.idle = moved > 0.001 ? 0 : state.idle + dt;
    if (state.idle > 10) tip('move', 'Usá W A S D o las flechas para caminar. Arrastrá el mouse para mirar alrededor.');

    // Eventos del escarabajo
    if (ev === 'trepa') { S.climb(); tip('c1', 'Los tallos se trepan. Seguí subiendo hasta el sombrero.'); }
    if (ev === 'arriba') S.climb();
    if (ev === 'llegó:cap') tip('c2', 'Desde acá arriba se ve todo el claro. Arrastrá el mouse hacia abajo para mirar el bosque desde lo alto.');
    if (ev === 'saltó') S.jump();
    if (ev === 'cae') tip('c3', 'Del borde se cae… sobre lo que haya abajo: el suelo, una rama u otro sombrero.');
    if (ev === 'cayó:cap' || ev === 'cayó:ground') S.land();
    if (ev === 'cayó:cap') { tip('fall1', 'Caíste sobre otro sombrero. Desde acá podés olfatearlo o comerlo.'); if (beetle.on) A.speak([SV.MISC.landed, ...mushParts(beetle.on)]); }
    if (ev === 'despegó') { S.fly(); tip('free1', 'Volando: mantené Espacio para subir, X para bajar, W A S D para ir. Sin tocar nada, planeás y bajás despacio. Volar libre cansa.'); }
    if (ev === 'sin-fuerzas') tip('flyweak', 'Sin energía no podés volar: comé algo.', { repeat: true });
    if (ev === 'agarró') { S.climb(); tip('grab1', 'Te agarraste. Para soltarte, saltá (Espacio).'); }
    if (ev === 'trepa-tronco') { S.climb(); tip('tree1', 'Un árbol entero para trepar. Las repisas de hongos son escalones: pasá por una y te subís.'); }
    if (ev === 'repisa') { S.land(); tip('shelf1', 'Un hongo repisa: crece en la madera de los árboles. Desde acá podés saltar a otra.'); }
    if (ev === 'aterrizó:ground') S.land();
    if (ev === 'aterrizó:cap') { S.jump(); tip('land1', 'Aterrizaste sobre el sombrero. Olfateá o comé desde acá arriba.'); if (beetle.on) A.speak(mushParts(beetle.on)); }

    // Magulladura: al tocar un tallo se descubre si se mancha
    if (beetle.touching) touchCheck(beetle.touching);
    if (beetle.mode === 'ground' && beetle.state.fy > height(beetle.pos.x, beetle.pos.z) + 0.6 && beetle.state.fy < height(beetle.pos.x, beetle.pos.z) + 4) tip('twig', 'Las ramas no son paredes: para un escarabajo, son puentes.');

    // ¿Hay un hongo al alcance?
    beetle.heading(H);
    const head = beetle.pos.clone().addScaledVector(H, 0.7);
    if (!state.busy) state.near = beetle.airborne || beetle.onTrunk ? null : flora.nearest(head, beetle.mode === 'ground' ? null : beetle.on);
    if (state.near !== state.lastNear) {
      state.lastNear = state.near;
    }
    const pr = $('#prompt'), m = state.near;
    if (m && !state.busy) {
      const L = m.level ? levelOf(m) : null;
      const what = !L ? '' : L.trait === 'ring' ? (m.yes ? ' · tiene anillo' : ' · sin anillo')
        : !m.traitKnown ? ' · empujalo para ver si se mancha' : (m.yes ? ' · se mancha' : ' · no se mancha');
      const sn = m.known ? (m.toxic ? '<span class="tox">venenoso</span>' : '<span class="ed">comestible</span>') : '<kbd>E</kbd> Olfatear';
      pr.innerHTML = `${sn} · ${m.eaten ? 'ya comido' : '<kbd>F</kbd> Comer'}${what}`;
      pr.hidden = false;
      if (beetle.mode === 'ground') tip('near1', 'Un hongo. Podés olfatearlo para saber si es venenoso, o comerlo y arriesgarte. Si empujás contra el tallo, lo trepás.');
    } else if (onShelf() && !state.busy) {
      pr.innerHTML = 'Hongo repisa · <kbd>E</kbd> Olfatear · <kbd>F</kbd> Morder';
      pr.hidden = false;
    } else if (beetle.state.mode !== 'transit') {
      pr.innerHTML = beetle.airborne ? '<kbd>Espacio</kbd> Subir · <kbd>X</kbd> Bajar · <kbd>G</kbd> Ir a un hongo sin explorar'
        : '<kbd>Espacio</kbd> Saltar (mantené para volar) · <kbd>G</kbd> Volar a un hongo sin explorar';
      pr.hidden = false;
    } else pr.hidden = true;

    // Zonas: entrar a un claro despierto y todavía sin descubrir
    for (const L of LEVELS) {
      if (!state.awake.has(L.id) || state.done.has(L.id) || state.cur === L) continue;
      if (Math.hypot(beetle.pos.x - L.at.x, beetle.pos.z - L.at.z) < L.spread + 16) {
        state.cur = L; tally(); objective(L.goal);
        if (L.night) S.setMood('dark');
        if (!state.entered.has(L.id)) { state.entered.add(L.id); L.enter.forEach((t, i) => say(`enter${L.id}${i}`, t)); tip('flyhint', 'Si no querés caminar, apretá G (o el botón Volar): vas volando al próximo hongo sin explorar.'); }
      }
    }
    for (const s of SLEEPING) {
      if (LEVELS.some((L) => L.at === s && state.awake.has(L.id))) continue;
      if (!state.slept.has(s.name) && Math.hypot(beetle.pos.x - s.x, beetle.pos.z - s.z) < s.r) {
        state.slept.add(s.name); S.sleepy();
        tip('sl' + s.name, `Este claro todavía duerme. Pronto: ${s.name}.`);
      }
    }
  }
  if (state.phase === 'travel' && ev === 'aterrizó:ground') { state.phase = 'play'; S.jump(); if (state.cur) objective(state.cur.goal); A.speak(SV.MISC.arrived); }
  $('#b-fly').hidden = state.phase !== 'play' || coarse;

  // El veneno se va pasando
  if (game.poison > 0) { game.poison = Math.max(0, game.poison - dt / 9); if (game.poison === 0) S.poison(false); }
  poisonU.value = game.poison; beetle.setWobble(game.poison);

  if (A.settings.audio) { beetle.heading(H); A.updateBeacons(dt, beetle.pos, H, unexploredNear(), state.phase === 'play'); }
  updateCamera(dt, t);
  drawTags();
  post.render();
}
renderer.setAnimationLoop(frame);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
// Herramientas de prueba (capturas, saltar la intro, ubicar al escarabajo…): solo con ?debug
if (params.has('debug')) {
  import('./debug.js').then((d) => d.run({
    params, THREE, gsap, $, beetle, flora, world, state, game, cam, LEVELS, renderer, backend, camera, keys, frame, sniff, eat, fly, quality,
    objective, showPhoto, showInsight, toggleBook, birdNow: () => (bird.next = 0.5), setBookView: (id) => (bookView = id),
    snapCamera: () => { cam.arm = cam.dist; followTarget(); camPos.copy(want); camLook.copy(wantLook); }
  }));
}
