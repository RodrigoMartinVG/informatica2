// Accesibilidad: jugar sin ver la pantalla.
// - Modo audio: una voz describe lo que pasa (hongos cercanos, resultados, vidas, energía).
// - Sonidos espaciales: cada hongo sin explorar cercano emite un "pip" ubicado en 3D (izquierda/derecha, cerca/lejos).
// - Teclas para describir el entorno y el estado; teclas reasignables; texto grande.
// La configuración se guarda en el navegador.
const Tone = window.Tone;
import * as Speech from './speech.js';
import { MISC } from './speechvocab.js';
const KEY = 'bajo-el-sombrero:acceso';

export const ACTIONS = {
  sniff: { label: 'Olfatear', def: 'KeyE' }, eat: { label: 'Comer', def: 'KeyF' },
  jump: { label: 'Saltar · mantener para volar y subir', def: 'Space' }, down: { label: 'Bajar volando', def: 'KeyX' },
  autofly: { label: 'Volar al próximo hongo sin explorar', def: 'KeyG' },
  info: { label: 'Ficha del hongo (abrir o cerrar)', def: 'KeyI' },
  describe: { label: 'Describir alrededor', def: 'KeyQ' }, status: { label: 'Decir vidas y energía', def: 'KeyR' },
  book: { label: 'Cuaderno', def: 'KeyC' }, hat: { label: 'Cambiar de sombrero', def: 'KeyH' }, music: { label: 'Cambiar la música', def: 'KeyN' }, vision: { label: 'Visión de antenas (mantener)', def: 'KeyV' }, sound: { label: 'Sonido', def: 'KeyM' }
};

const cfg = { audio: false, big: false, rate: 1, keys: Object.fromEntries(Object.entries(ACTIONS).map(([k, a]) => [k, a.def])) };
try {
  Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || '{}'));
  // solo las acciones que existen (versiones viejas tenían "fly" en Espacio); si una tecla quedó repetida, vuelve a la de fábrica
  const saved = Object.fromEntries(Object.entries(cfg.keys || {}).filter(([k]) => ACTIONS[k]));
  cfg.keys = Object.fromEntries(Object.entries(ACTIONS).map(([k, a]) => [k, a.def]));
  for (const [k, code] of Object.entries(saved)) if (!Object.entries(cfg.keys).some(([o, c]) => o !== k && c === code)) cfg.keys[k] = code;
} catch { /* sin almacenamiento */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* nada */ } };

export const settings = cfg;
export const keyFor = (action) => cfg.keys[action];
export const actionFor = (code) => Object.keys(cfg.keys).find((k) => cfg.keys[k] === code) || null;
export const keyName = (code) => ({ Space: 'Espacio', Enter: 'Enter', Tab: 'Tab', Escape: 'Esc', ShiftLeft: 'Shift', ShiftRight: 'Shift', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }[code] || code.replace(/^Key|^Digit/, ''));

/* ---------- Voz: la misma voz de la narración, por la misma cola ---------- */
const live = () => document.getElementById('sr-live');
// Decir algo: lo recibe siempre el lector de pantalla; en modo audio (o si force) lo dice la voz.
// parts: texto o lista de fragmentos pregenerados (ver speechvocab.js). interrupt: es urgente y corta lo que suena.
// Solo para el lector de pantalla (sin voz): avisos secundarios
export function announce(text) { const el = live(); if (el) { el.textContent = ''; setTimeout(() => (el.textContent = text), 30); } }
export function speak(parts, { interrupt = false, force = false } = {}) {
  const list = (Array.isArray(parts) ? parts : [parts]).filter(Boolean);
  const el = live(); if (el) { el.textContent = ''; setTimeout(() => (el.textContent = list.join(' ')), 30); }
  if (!(cfg.audio || force)) return;
  Speech.say(list, { prio: interrupt ? 'urgent' : 'info' });
}

/* ---------- Direcciones relativas al escarabajo ---------- */
export function direction(from, heading, to) {
  const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz);
  // ángulo respecto del frente (positivo = derecha)
  const ang = Math.atan2(heading.x * dz - heading.z * dx, heading.x * dx + heading.z * dz);
  const a = Math.abs(ang), side = ang > 0 ? 'a la derecha' : 'a la izquierda'; // mirando hacia +z, la derecha de la pantalla es −x
  const where = a < 0.35 ? 'adelante' : a < 1.2 ? `adelante ${side}` : a < 1.95 ? side : a < 2.8 ? `atrás ${side}` : 'atrás';
  return { d, where, ang };
}
export const cm = (d) => `${Math.max(1, Math.round(d))} centímetro${Math.round(d) === 1 ? '' : 's'}`;

/* ---------- Sonidos espaciales: los hongos sin explorar "llaman" ---------- */
let beacons = null;
function makeBeacons() {
  const out = new Tone.Volume(-8).toDestination();
  return [0].map((i) => { // un solo pip: el del hongo sin explorar más cercano
    const pan = new Tone.Panner3D({ panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 4, rolloffFactor: 1.1, maxDistance: 200 }).connect(out);
    const syn = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.12, sustain: 0, release: 0.08 }, volume: -6 - i * 4 }).connect(pan);
    return { pan, syn, next: 0, target: null };
  });
}
// candidates: hongos sin explorar ordenados por distancia; pos/heading del escarabajo
export function updateBeacons(dt, pos, heading, candidates, active) {
  if (!cfg.audio || !active || !Tone || Tone.getContext().state !== 'running') return;
  if (!beacons) beacons = makeBeacons();
  const L = Tone.getContext().listener;
  L.positionX.value = pos.x; L.positionY.value = pos.y; L.positionZ.value = pos.z;
  L.forwardX.value = heading.x; L.forwardY.value = 0; L.forwardZ.value = heading.z;
  L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
  const now = Tone.now();
  beacons.forEach((b, i) => {
    const m = candidates[i]; b.target = m || null; if (!m) return;
    b.pan.positionX.value = m.x; b.pan.positionY.value = m.base + 2; b.pan.positionZ.value = m.z;
    b.next -= dt;
    if (b.next <= 0) {
      const d = Math.hypot(m.x - pos.x, m.z - pos.z);
      b.next = Math.min(1.8, 0.25 + d / 25) + i * 0.13;                // más cerca, más seguido
      const f = 520 + Math.max(0, 700 - d * 12) + (m.level ? 0 : -140); // más cerca, más agudo; los del claro, más agudos
      b.syn.triggerAttackRelease(f, 0.09, now + 0.01, 0.8);
    }
  });
}

/* ---------- Panel de accesibilidad ---------- */
export function setupPanel({ onChange } = {}) {
  const panel = document.getElementById('access');
  const apply = () => {
    document.documentElement.classList.toggle('big-text', cfg.big);
    for (const b of document.querySelectorAll('.b-acc')) b.textContent = b.classList.contains('q-intro') ? (cfg.audio ? 'Accesibilidad · modo audio: sí' : 'Accesibilidad') : (cfg.audio ? '♿ Audio: sí' : '♿ Accesibilidad');
    onChange?.(cfg);
  };
  const render = () => {
    panel.querySelector('#acc-audio').checked = cfg.audio;
    panel.querySelector('#acc-big').checked = cfg.big;
    panel.querySelector('#acc-rate').value = cfg.rate;
    panel.querySelector('#acc-keys').innerHTML = Object.entries(ACTIONS).map(([k, a]) =>
      `<li><span>${a.label}</span><button type="button" data-k="${k}" aria-label="${a.label}: tecla ${keyName(cfg.keys[k])}. Tocá para cambiarla">${keyName(cfg.keys[k])}</button></li>`).join('');
    for (const b of panel.querySelectorAll('[data-k]')) b.addEventListener('click', () => capture(b));
  };
  function capture(btn) {
    btn.textContent = 'Apretá una tecla…'; speak(MISC.pressKey, { interrupt: true, force: true });
    const once = (e) => {
      e.preventDefault(); e.stopPropagation(); removeEventListener('keydown', once, true);
      if (e.code !== 'Escape' && !/^(Key[WASD]|Arrow)/.test(e.code)) {
        const other = actionFor(e.code); if (other) cfg.keys[other] = cfg.keys[btn.dataset.k]; // intercambiar si ya estaba usada
        cfg.keys[btn.dataset.k] = e.code; save();
        speak(MISC.keyChanged, { interrupt: true, force: true });
      }
      render(); apply();
    };
    addEventListener('keydown', once, true);
  }
  panel.querySelector('#acc-audio').addEventListener('change', async (e) => { await window.__enableAudio?.(); cfg.audio = e.target.checked; save(); apply(); speak(cfg.audio ? MISC.audioOn : MISC.audioOff, { interrupt: true, force: true }); });
  panel.querySelector('#acc-big').addEventListener('change', (e) => { cfg.big = e.target.checked; save(); apply(); });
  panel.querySelector('#acc-rate').addEventListener('input', (e) => { cfg.rate = +e.target.value; Speech.setRate(cfg.rate); save(); });
  panel.querySelector('#acc-test').addEventListener('click', async () => { await window.__enableAudio?.(); speak(MISC.test, { interrupt: true, force: true }); });
  panel.querySelector('#acc-close').addEventListener('click', () => toggle(false));
  panel.addEventListener('click', (e) => { if (e.target === panel) toggle(false); });
  function toggle(open = panel.hidden) { panel.hidden = !open; if (open) { render(); panel.querySelector('#acc-audio').focus(); } }
  for (const b of document.querySelectorAll('.b-acc')) b.addEventListener('click', () => toggle(true));
  Speech.setRate(cfg.rate); render(); apply();
  return {
    toggle,
    get open() { return !panel.hidden; },
    setAudio(on) { cfg.audio = on; save(); apply(); }
  };
}
