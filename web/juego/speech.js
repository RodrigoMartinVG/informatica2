// Una sola voz para todo el juego (la narración y la accesibilidad), con una sola cola:
// nunca hablan dos cosas a la vez. Cada pedido es una lista de frases pregeneradas (voz/*.m4a)
// que se encadenan. Prioridades: 'urgent' corta lo que suena · 'story' (la historia) · 'info' (descripciones).
// Las descripciones viejas se descartan para no hablar de algo que ya pasó.
import * as S from './audio.js';

const files = new Map();
export const loaded = fetch('voz/frases.json').then((r) => r.json())
  .then((m) => { for (const [k, t] of Object.entries(m)) files.set(t, `voz/${k}.m4a`); }).catch(() => {});
export const has = (text) => files.has(text);

let queue = [], current = null, rate = 1;
export const setRate = (r) => (rate = r);

// Decir una o más frases. Devuelve una promesa que termina cuando se dijeron (o se descartaron).
export function say(parts, { prio = 'info', stale = 7000 } = {}) {
  parts = (Array.isArray(parts) ? parts : [parts]).filter(Boolean);
  if (!parts.length || !S.isOn()) return Promise.resolve();
  return new Promise((resolve) => {
    const item = { parts, prio, t: performance.now(), stale, resolve, cancelled: false };
    if (prio === 'urgent') {
      // lo urgente corta lo que se está diciendo (salvo la historia, que espera) y descarta las descripciones pendientes
      queue = queue.filter((q) => { if (q.prio === 'info') { q.resolve(); return false; } return true; });
      if (current && current.prio !== 'story') { current.cancelled = true; S.stopVoice(); speechSynthesis?.cancel(); }
      queue.unshift(item);
    } else queue.push(item);
    pump();
  });
}
export function stopAll() {
  queue.forEach((q) => q.resolve()); queue = [];
  if (current) { current.cancelled = true; S.stopVoice(); speechSynthesis?.cancel(); }
}

async function pump() {
  if (current) return;
  const order = { urgent: 0, story: 1, info: 2 };
  queue.sort((a, b) => order[a.prio] - order[b.prio] || a.t - b.t);
  let item = queue.shift();
  while (item && item.prio === 'info' && performance.now() - item.t > item.stale) { item.resolve(); item = queue.shift(); }
  if (!item) return;
  current = item;
  S.duck(true);
  for (const p of item.parts) {
    if (item.cancelled) break;
    await sayOne(p);
    if (!item.cancelled) await new Promise((r) => setTimeout(r, 300)); // respiro entre fragmentos
  }
  S.duck(false);
  current = null; item.resolve();
  pump();
}

// Una frase: el audio pregenerado si existe; si no, la voz del navegador como último recurso
function sayOne(text) {
  const src = files.get(text);
  const limit = (p) => Promise.race([p, new Promise((r) => setTimeout(r, 20000))]);
  if (src) return limit(S.playVoice(src, rate).catch(() => {}));
  if (!('speechSynthesis' in window)) return Promise.resolve();
  return limit(new Promise((done) => {
    const vs = speechSynthesis.getVoices(), v = vs.find((x) => /es[-_](AR|UY)/i.test(x.lang)) || vs.find((x) => /^es/i.test(x.lang));
    const u = new SpeechSynthesisUtterance(text); u.lang = v?.lang || 'es-AR'; if (v) u.voice = v; u.rate = rate;
    u.onend = u.onerror = done; speechSynthesis.speak(u);
  }));
}
