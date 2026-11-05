// Narración en off: subtítulos que cuentan la historia y orientan al jugador.
// Opcional: voz sintetizada del navegador (speechSynthesis), en castellano.
import * as S from './audio.js';

const el = document.getElementById('narr');
const queue = [], said = new Set();
let busy = false, voiceOn = false, voice = null;

function pickVoice() {
  const vs = speechSynthesis?.getVoices?.() || [];
  voice = vs.find((v) => /es[-_](AR|UY)/i.test(v.lang)) || vs.find((v) => /es[-_](MX|US|419)/i.test(v.lang)) || vs.find((v) => /^es/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

export function setVoice(on) { voiceOn = on && 'speechSynthesis' in window; if (!voiceOn) speechSynthesis?.cancel(); return voiceOn; }
export const hasVoice = () => voiceOn;

// Decir una línea (una sola vez por id, salvo que repeat sea true)
export function say(id, text, { repeat = false, wait = 0 } = {}) {
  if (!repeat && said.has(id)) return false;
  said.add(id);
  queue.push({ text, wait });
  if (!busy) next();
  return true;
}
export const already = (id) => said.has(id);

function next() {
  const item = queue.shift();
  if (!item) { busy = false; return; }
  busy = true;
  setTimeout(() => show(item.text), item.wait);
}

function show(text) {
  S.whisper();
  el.innerHTML = ''; el.hidden = false;
  const words = text.split(' ');
  words.forEach((w, i) => {
    const s = document.createElement('span'); s.textContent = w + ' ';
    s.style.animationDelay = `${i * 45}ms`; el.appendChild(s);
  });
  el.classList.remove('out'); void el.offsetWidth; el.classList.add('in');
  const ms = Math.max(4500, text.length * 85); // tiempo de sobra para leer
  if (voiceOn) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = voice?.lang || 'es-AR'; if (voice) u.voice = voice; u.rate = 0.98; u.pitch = 0.95;
    speechSynthesis.speak(u);
  }
  setTimeout(() => {
    el.classList.remove('in'); el.classList.add('out');
    setTimeout(() => { el.hidden = true; setTimeout(next, 450); }, 500);
  }, ms);
}
