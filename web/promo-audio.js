// Música y sonidos de la animación, generados en el momento con Tone.js.
// No hay archivos de audio: cada sonido lo dispara la misma línea de tiempo de GSAP
// que mueve las imágenes, así quedan siempre sincronizados.
const Tone = window.Tone;

let ready = false, on = false;
let pad, bell, pluck, glide, glide2, thump, click, noise, noiseFilt, noiseEnv, master;

function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

/* ---------- Instrumentos ---------- */
function setup() {
  master = new Tone.Volume(-6);
  const limiter = new Tone.Limiter(-1);
  master.chain(limiter, Tone.getDestination());
  const reverb = new Tone.Reverb({ decay: 7, wet: 0.4 }).connect(master);
  const delay = new Tone.FeedbackDelay({ delayTime: '8n.', feedback: 0.3, wet: 0.22 }).connect(reverb);

  // Colchón ambiental: acordes lentos, filtrados y oscuros
  const padFilter = new Tone.Filter(900, 'lowpass').connect(reverb);
  pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'fattriangle', count: 3, spread: 24 },
    envelope: { attack: 2.2, decay: 1, sustain: 0.8, release: 3.5 }, volume: -20
  }).connect(padFilter);
  new Tone.LFO({ frequency: 0.07, min: 500, max: 1400 }).connect(padFilter.frequency).start();

  // Campanitas: letras, marcadores, QR
  bell = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 3.01, modulationIndex: 6,
    envelope: { attack: 0.002, decay: 1.2, sustain: 0, release: 1.2 },
    modulationEnvelope: { attack: 0.002, decay: 0.4, sustain: 0, release: 0.4 }, volume: -22
  }).connect(delay);

  // Notas cortas: lluvia de datos, barras, puntos
  pluck = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' }, envelope: { attack: 0.003, decay: 0.25, sustain: 0, release: 0.3 }, volume: -20
  }).connect(reverb);
  pluck.maxPolyphony = 64;

  // Tonos que se deslizan: curvas de GeoGebra
  const mkGlide = (detune) => new Tone.MonoSynth({
    oscillator: { type: 'sine' }, detune, filter: { Q: 1, type: 'lowpass', rolloff: -12 },
    envelope: { attack: 0.3, decay: 0.2, sustain: 0.9, release: 1.2 },
    filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 1, baseFrequency: 1200, octaves: 0 }, volume: -18
  }).connect(delay);
  glide = mkGlide(0); glide2 = mkGlide(9);

  // Golpe grave del sello
  thump = new Tone.MembraneSynth({ pitchDecay: 0.06, octaves: 5, envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.4 }, volume: -6 }).connect(master);
  click = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.001, decay: 0.12, sustain: 0 }, volume: -14 }).connect(master);

  // Ráfaga de aire para las fotos que se revelan
  noiseFilt = new Tone.Filter(400, 'bandpass').connect(reverb);
  noiseEnv = new Tone.AmplitudeEnvelope({ attack: 0.4, decay: 0.3, sustain: 0.4, release: 0.8 }).connect(noiseFilt);
  noise = new Tone.Noise('pink').connect(noiseEnv);
  noise.volume.value = -18;
  ready = true;
}

/* ---------- Encendido ---------- */
export async function enable() {
  await Tone.start();
  if (!ready) setup();
  if (noise.state !== 'started') noise.start();
  on = true; master.mute = false;
}
export function mute(m) { if (ready) master.mute = m || !on; }
export function off() { on = false; if (ready) { master.mute = true; pad.releaseAll(); } }
export const isOn = () => on;
// Salida de audio para grabar el video con sonido
export function stream() { if (!ready) return null; const d = Tone.getContext().createMediaStreamDestination(); master.connect(d); return d.stream; }

const go = () => on && ready && !master.mute;
const now = () => Tone.now() + 0.02;

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
  if (!go()) return; const t = now();
  noiseFilt.frequency.cancelScheduledValues(t); noiseFilt.frequency.setValueAtTime(300, t);
  noiseFilt.frequency.exponentialRampToValueAtTime(2600, t + dur);
  noiseEnv.triggerAttackRelease(dur * 0.6, t);
}

// "Mortal": golpe grave y un roce disonante
export function dread() {
  if (!go()) return; const t = now();
  thump.triggerAttackRelease('D1', '2n', t, 0.9);
  bell.triggerAttackRelease(['D4', 'Eb4'], '2n', t + 0.02, 0.5);
}

// Lluvia de datos: muchas notas que se van espaciando
export function rain(dur = 6, n = 90) {
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
  thump.triggerAttackRelease(strong ? 'G1' : 'D2', '8n', t, strong ? 1 : 0.55);
  click.triggerAttackRelease('16n', t, strong ? 1 : 0.5);
}

// Puntos de un gráfico que aparecen uno por uno
export function pops(values, gap = 0.05) {
  if (!go()) return; const t = now();
  values.forEach((v, i) => pluck.triggerAttackRelease(pitch(v, 4, 10), '32n', t + i * gap, 0.35));
}

// Un tono que sigue la forma de una curva: values entre 0 y 1
export function trace(values, dur, voice = 0) {
  if (!go()) return; const s = voice ? glide2 : glide, t = now();
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
