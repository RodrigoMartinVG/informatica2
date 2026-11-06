// Música y sonidos de la animación, generados en el momento con Tone.js.
// No hay archivos de audio: cada sonido lo dispara la misma línea de tiempo de GSAP
// que mueve las imágenes, así quedan siempre sincronizados.
const Tone = window.Tone;

let ready = false, on = false;
let pad, bell, pluck, glide, glide2, thump, click, noise, noiseFilt, noiseEnv, master, voiceBus, limiterOut;

function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

/* ---------- Instrumentos ---------- */
function setup() {
  // Volumen general más bajo + compresor suave + limitador: evita la saturación cuando se juntan muchos sonidos
  master = new Tone.Volume(-12);
  const comp = new Tone.Compressor({ threshold: -20, ratio: 3, attack: 0.01, release: 0.25 });
  const limiter = new Tone.Limiter(-3); limiterOut = limiter;
  master.chain(comp, limiter, Tone.getDestination());
  // La voz (promo v2) va aparte, sin reverb, directo al limitador
  voiceBus = new Tone.Volume(-1).connect(limiter);
  // Reverb más corta: mucho menos trabajo para el procesador de audio
  const reverb = new Tone.Reverb({ decay: 3.5, wet: 0.3 }).connect(master);
  const delay = new Tone.FeedbackDelay({ delayTime: '8n.', feedback: 0.22, wet: 0.15 }).connect(reverb);

  // Colchón ambiental: acordes lentos, filtrados y oscuros
  const padFilter = new Tone.Filter(900, 'lowpass').connect(reverb);
  pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'fattriangle', count: 2, spread: 18 },
    envelope: { attack: 2.2, decay: 1, sustain: 0.7, release: 2.5 }, volume: -22
  }).connect(padFilter);
  pad.maxPolyphony = 12;
  new Tone.LFO({ frequency: 0.07, min: 500, max: 1400 }).connect(padFilter.frequency).start();

  // Campanitas: letras, marcadores, QR
  bell = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.9, sustain: 0, release: 0.8 }, volume: -18
  }).connect(delay);
  bell.maxPolyphony = 16;

  // Notas cortas: lluvia de datos, barras, puntos
  pluck = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' }, envelope: { attack: 0.006, decay: 0.22, sustain: 0, release: 0.25 }, volume: -20
  }).connect(reverb);
  pluck.maxPolyphony = 20;

  // Tonos que se deslizan: curvas de GeoGebra
  const mkGlide = (detune) => new Tone.MonoSynth({
    oscillator: { type: 'sine' }, detune, filter: { Q: 1, type: 'lowpass', rolloff: -12 },
    envelope: { attack: 0.3, decay: 0.2, sustain: 0.9, release: 1.2 },
    filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 1, baseFrequency: 1200, octaves: 0 }, volume: -18
  }).connect(delay);
  glide = mkGlide(0); glide2 = mkGlide(9);

  // Golpe grave del sello
  thump = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 4, envelope: { attack: 0.002, decay: 0.45, sustain: 0, release: 0.3 }, volume: -12 }).connect(master);
  click = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.002, decay: 0.06, sustain: 0 }, volume: -26 }).connect(master);

  // Ráfaga de aire para las fotos que se revelan
  noiseFilt = new Tone.Filter(400, 'bandpass').connect(reverb);
  noiseEnv = new Tone.AmplitudeEnvelope({ attack: 0.4, decay: 0.3, sustain: 0.4, release: 0.8 }).connect(noiseFilt);
  noise = new Tone.Noise('pink').connect(noiseEnv);
  noise.volume.value = -26;
  ready = true;
}

/* ---------- Encendido ---------- */
export async function enable() {
  if (!ready) Tone.setContext(new Tone.Context({ latencyHint: 'playback', lookAhead: 0.15 }));
  await Tone.start();
  if (!ready) setup();
  on = true; master.mute = false; voiceBus.mute = false;
}
export function mute(m) { if (ready) { master.mute = m || !on; voiceBus.mute = m || !on; } if (m) stopVoice(); }
export function off() { on = false; if (ready) { master.mute = true; voiceBus.mute = true; pad.releaseAll(); stopVoice(); } }
export const isOn = () => on;
// Salida de audio para grabar el video con sonido
export function stream() { if (!ready) return null; const d = Tone.getContext().createMediaStreamDestination(); limiterOut.connect(d); return d.stream; }

/* ---------- Voz en off (promo v2): audios pregenerados con Piper ---------- */
const voiceBuffers = new Map(); let voiceSrc = null;
export async function loadVoice(url) {
  if (voiceBuffers.has(url)) return voiceBuffers.get(url);
  const p = fetch(url).then((r) => r.arrayBuffer()).then((b) => Tone.getContext().rawContext.decodeAudioData(b)).catch(() => null);
  voiceBuffers.set(url, p); return p;
}
export async function voice(url) {
  if (!ready || !on || master.mute) return;
  const buf = await loadVoice(url); if (!buf) return;
  stopVoice();
  const ctx = Tone.getContext().rawContext, src = ctx.createBufferSource(); src.buffer = buf;
  Tone.connect(src, voiceBus); src.start(); voiceSrc = src;
  master.volume.rampTo(-19, 0.25); // la música baja mientras habla
  src.onended = () => { if (voiceSrc === src) { voiceSrc = null; master.volume.rampTo(-12, 1.2); } };
}
export function stopVoice() { if (voiceSrc) { try { voiceSrc.stop(); } catch { /* ya terminó */ } voiceSrc = null; if (ready) master.volume.rampTo(-12, 0.6); } }

const go = () => on && ready && !master.mute;
const now = () => Tone.now() + 0.02;
// Los instrumentos de una sola voz no aceptan dos golpes en el mismo instante
const last = new Map();
const slot = (inst, t) => { const v = Math.max(t, (last.get(inst) ?? 0) + 0.02); last.set(inst, v); return v; };

/* ---------- Escala: re menor pentatónica, para que todo combine ---------- */
const SCALE = ['D', 'F', 'G', 'A', 'C'];
const note = (i, oct) => SCALE[((i % 5) + 5) % 5] + (oct + Math.floor(i / 5));
// Valor entre 0 y 1 → nota de la escala (más alto, más agudo)
const pitch = (v, lo = 3, span = 12) => note(Math.round(v * span), lo);

/* ---------- Señales que usa la línea de tiempo ---------- */
const CHORDS = {
  intro: ['D2', 'A2', 'F3', 'C4', 'E4'],
  ab: ['Bb1', 'F2', 'D3', 'A3', 'C4'],
  datos: ['F2', 'C3', 'E3', 'G3', 'A3'],
  m1: ['D2', 'A2', 'C3', 'F3', 'A3'],
  m2: ['Bb1', 'F2', 'A2', 'D3', 'F3'],
  m3: ['G1', 'D2', 'Bb2', 'F3', 'A3'],
  m4: ['A1', 'E2', 'G2', 'D3', 'E3'],
  g2: ['F2', 'C3', 'E3', 'A3', 'C4'],
  g1: ['C2', 'G2', 'E3', 'A3', 'D4'],
  tres: ['Bb1', 'F2', 'C3', 'D3', 'A3'],
  cierre: ['D2', 'A2', 'E3', 'F3', 'A3'],
  noche: ['D2', 'A2', 'C3', 'E3', 'G3'], juego: ['F2', 'C3', 'G3', 'A3', 'D4'], m5: ['C2', 'G2', 'D3', 'E3', 'A3'],
  final: ['F2', 'C3', 'G3', 'A3', 'E4']
};
export function chord(name, dur) { if (go()) pad.triggerAttackRelease(CHORDS[name], dur, now()); }

// Una campanita por letra o palabra, subiendo por la escala
export function bells(n, gap = 0.05, start = 0, oct = 5) {
  if (!go()) return; const t = now();
  for (let i = 0; i < n; i++) bell.triggerAttackRelease(note(start + i, oct), '16n', t + i * gap, 0.5 + 0.5 * (i / n));
}
export function chime(i = 0, oct = 5) { if (go()) bell.triggerAttackRelease([note(i, oct), note(i + 2, oct)], '8n', now(), 0.8); }

// Fotos que se revelan: ráfaga de aire que sube
export function whoosh(dur = 1.4) {
  if (!go()) return; const t = slot(noise, now());
  noiseFilt.frequency.cancelScheduledValues(t); noiseFilt.frequency.setValueAtTime(300, t);
  noiseFilt.frequency.exponentialRampToValueAtTime(2600, t + dur);
  noise.start(t); noiseEnv.triggerAttackRelease(dur * 0.6, t); noise.stop(t + dur + 1);
}

// "Mortal": golpe grave y un roce disonante
export function dread() {
  if (!go()) return; const t = now();
  thump.triggerAttackRelease('D1', '2n', slot(thump, t), 0.8);
  bell.triggerAttackRelease(['D4', 'Eb4'], '2n', t + 0.02, 0.3);
}

// Lluvia de datos: muchas notas que se van espaciando
export function rain(dur = 6, n = 42) {
  if (!go()) return; const t = now(), r = rng(3);
  for (let i = 0; i < n; i++) {
    const x = Math.pow(i / n, 1.6) * dur; // más densa al principio
    pluck.triggerAttackRelease(note(Math.floor(r() * 10), 4), '32n', t + x, 0.25 + r() * 0.35);
  }
}

// Barras que suben: cada una con una nota de altura proporcional a su valor
export function bars(values, gap = 0.15) {
  if (!go()) return; const t = now();
  values.forEach((v, i) => {
    const t0 = t + i * gap;
    pluck.triggerAttackRelease(pitch(v * 0.6, 3), '16n', t0, 0.7);
    pluck.triggerAttackRelease(pitch(v, 4), '8n', t0 + 0.12, 0.8);
  });
}

// Sello: fuerte para MITO, más suave para los veredictos intermedios
export function stamp(strong = true) {
  if (!go()) return; const t = now();
  thump.triggerAttackRelease(strong ? 'G1' : 'D2', '8n', slot(thump, t), strong ? 1 : 0.55);
  click.triggerAttackRelease('16n', slot(click, t), strong ? 1 : 0.5);
}

// Puntos de un gráfico que aparecen uno por uno
export function pops(values, gap = 0.05) {
  if (!go()) return; const t = now();
  values.forEach((v, i) => { if (i % 2 === 0 || values.length < 25) pluck.triggerAttackRelease(pitch(v, 4, 10), '32n', t + i * gap, 0.35); });
}

// Un tono que sigue la forma de una curva: values entre 0 y 1
export function trace(values, dur, voice = 0) {
  if (!go()) return; const s = voice ? glide2 : glide, t = slot(s, now());
  const freqs = values.map((v) => Tone.Frequency(pitch(v, 3, 14)).toFrequency());
  s.triggerAttack(freqs[0], t, 0.7);
  freqs.forEach((f, i) => s.frequency.linearRampToValueAtTime(f, t + (i / (freqs.length - 1)) * dur));
  s.triggerRelease(t + dur + 0.1);
}

// Arpegio que "gira" cuando cada hongo 3D empieza a tornearse
export function arp(i, oct = 4) {
  if (!go()) return; const t = now();
  [0, 2, 4, 7].forEach((k, j) => bell.triggerAttackRelease(note(i + k, oct), '16n', t + j * 0.09, 0.5));
}
