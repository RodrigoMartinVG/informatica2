// Narración en off: subtítulos que cuentan la historia y orientan al jugador,
// con voz rioplatense pregenerada (Piper, voz es_AR «daniela») en voz/*.m4a.
// Si una frase no tiene audio, se usa la voz del navegador (speechSynthesis) como respaldo.
import * as S from './audio.js';

const el = document.getElementById('narr');
const queue = [], said = new Set();
let busy = false, voiceOn = true, fallback = null;

// Índice texto → archivo de audio
const files = new Map();
fetch('voz/frases.json').then((r) => r.json()).then((m) => { for (const [k, t] of Object.entries(m)) files.set(t, `voz/${k}.m4a`); }).catch(() => {});

function pickFallback() {
  const vs = speechSynthesis?.getVoices?.() || [];
  fallback = vs.find((v) => /es[-_](AR|UY)/i.test(v.lang)) || vs.find((v) => /^es/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { pickFallback(); speechSynthesis.onvoiceschanged = pickFallback; }

export function setVoice(on) { voiceOn = on; if (!on) { S.stopVoice(); speechSynthesis?.cancel(); S.duck(false); } return voiceOn; }
export const hasVoice = () => voiceOn;

// Decir una línea (una sola vez por id, salvo que repeat sea true)
export function say(id, text, { repeat = false, wait = 0 } = {}) {
  if (!repeat && said.has(id)) return false;
  said.add(id);
  queue.push({ text, wait, t: performance.now() });
  if (!busy) next();
  return true;
}

// Avisos cortos (sin voz): lo que pasa en el momento. Se muestran arriba y se reemplazan entre sí.
const tipEl = document.getElementById('tip'), tipsSaid = new Set();
let tipTimer = 0;
export function tip(id, text, { repeat = false } = {}) {
  if (!repeat && tipsSaid.has(id)) return false;
  tipsSaid.add(id);
  tipEl.textContent = text; tipEl.hidden = false;
  tipEl.classList.remove('show'); void tipEl.offsetWidth; tipEl.classList.add('show');
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => { tipEl.classList.remove('show'); setTimeout(() => (tipEl.hidden = true), 400); }, Math.max(3200, text.length * 55));
  return true;
}
export const already = (id) => said.has(id);

const STALE = 14000; // una frase de la historia que esperó más que esto ya no tiene sentido: se descarta
function next() {
  let item = queue.shift();
  while (item && performance.now() - item.t > STALE) item = queue.shift();
  if (!item) { busy = false; return; }
  busy = true;
  setTimeout(() => show(item.text), item.wait);
}

// Reproducir la voz; devuelve una promesa que termina cuando termina el audio
function speak(text) {
  if (!voiceOn || !S.isOn()) return Promise.resolve();
  const src = files.get(text);
  const limit = (p) => Promise.race([p, new Promise((r) => setTimeout(r, 25000))]); // nunca trabar la cola
  if (src) {
    S.duck(true);
    return limit(S.playVoice(src).catch((e) => console.warn('voz:', e))).finally(() => S.duck(false));
  }
  if (!('speechSynthesis' in window)) return Promise.resolve();
  return limit(new Promise((done) => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = fallback?.lang || 'es-AR'; if (fallback) u.voice = fallback;
    u.onend = u.onerror = done; speechSynthesis.speak(u);
  }));
}

function show(text) {
  if (!voiceOn || !files.has(text)) S.whisper();
  el.innerHTML = ''; el.hidden = false;
  text.split(' ').forEach((w, i) => {
    const s = document.createElement('span'); s.textContent = w + ' ';
    s.style.animationDelay = `${i * 45}ms`; el.appendChild(s);
  });
  el.classList.remove('out'); void el.offsetWidth; el.classList.add('in');
  // El subtítulo queda lo que dure la voz (o el tiempo de lectura, lo que sea más largo)
  const reading = new Promise((r) => setTimeout(r, Math.max(4500, text.length * 85)));
  const voice = speak(text).then(() => new Promise((r) => setTimeout(r, 700)));
  Promise.all([reading, voice]).then(() => {
    el.classList.remove('in'); el.classList.add('out');
    setTimeout(() => { el.hidden = true; setTimeout(next, 450); }, 500);
  });
}
