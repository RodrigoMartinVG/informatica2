// Narración en off: subtítulos que cuentan la historia y orientan al jugador,
// con voz rioplatense pregenerada (Piper, voz es_AR «daniela») en voz/*.m4a.
// Usa la cola única de voz (speech.js), compartida con la accesibilidad.
import * as S from './audio.js';
import * as Speech from './speech.js';

const el = document.getElementById('narr');
const queue = [], said = new Set();
let busy = false, voiceOn = true;

export function setVoice(on) { voiceOn = on; if (!on) Speech.stopAll(); return voiceOn; }
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

// La historia va por la cola única de voz (no se pisa con la accesibilidad)
function speak(text) {
  if (!voiceOn) return Promise.resolve();
  return Speech.say([text], { prio: 'story' });
}

function show(text) {
  if (!voiceOn || !Speech.has(text)) S.whisper();
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
