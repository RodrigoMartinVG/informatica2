// Música y sonidos del bosque, generados en el momento con Tone.js (sin archivos de audio).
// Música: acordes lentos en re dórico y una melodía pentatónica que aparece de vez en cuando.
// Ambiente: viento muy suave, pájaros y grillos sintetizados. Efectos: pasos, olfateo, descubrimientos.
const Tone = window.Tone;
let ready = false, on = false;
let master, music, musicF, sfx, amb, pad, lead, bell, pluck, chirp, cricket, thump, windGain, windFilt, step;

function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

function setup() {
  Tone.setContext(new Tone.Context({ latencyHint: 'playback', lookAhead: 0.15 }));
  master = new Tone.Volume(-10);
  master.chain(new Tone.Compressor({ threshold: -20, ratio: 3 }), new Tone.Limiter(-3), Tone.getDestination());
  const reverb = new Tone.Reverb({ decay: 4, wet: 0.35 }).connect(master);
  musicF = new Tone.Filter(18000, 'lowpass').connect(reverb);
  music = new Tone.Volume(-4).connect(musicF);
  sfx = new Tone.Volume(-2).connect(reverb);
  amb = new Tone.Volume(-8).connect(master);

  const padF = new Tone.Filter(1100, 'lowpass').connect(music);
  pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fattriangle', count: 2, spread: 16 }, envelope: { attack: 3, decay: 1, sustain: 0.7, release: 4 }, volume: -20 }).connect(padF);
  pad.maxPolyphony = 12;
  new Tone.LFO({ frequency: 0.05, min: 600, max: 1600 }).connect(padF.frequency).start();
  lead = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.02, decay: 1.4, sustain: 0, release: 1.5 }, volume: -19 })
    .connect(new Tone.FeedbackDelay({ delayTime: '4n.', feedback: 0.3, wet: 0.3 }).connect(music));
  lead.maxPolyphony = 8;

  bell = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.004, decay: 1.1, sustain: 0, release: 1 }, volume: -14 }).connect(sfx);
  bell.maxPolyphony = 12;
  pluck = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.004, decay: 0.18, sustain: 0, release: 0.2 }, volume: -20 }).connect(sfx);
  pluck.maxPolyphony = 10;
  thump = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 3, envelope: { attack: 0.003, decay: 0.6, sustain: 0, release: 0.4 }, volume: -12 }).connect(sfx);
  step = new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 2, envelope: { attack: 0.001, decay: 0.05, sustain: 0 }, volume: -34 }).connect(sfx);

  // Pájaros: tonos que suben y bajan rápido
  chirp = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.08, sustain: 0.2, release: 0.05 }, portamento: 0.03, volume: -30 }).connect(amb);
  // Grillos: pulsos agudos y cortitos
  cricket = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.002, decay: 0.03, sustain: 0, release: 0.02 }, volume: -40 }).connect(amb);
  // Viento: ruido rosa muy filtrado y bajo (apenas una respiración del bosque)
  windFilt = new Tone.Filter(320, 'lowpass').connect(amb);
  windGain = new Tone.Gain(0.0).connect(windFilt);
  new Tone.Noise('pink').connect(windGain).start();
  new Tone.LFO({ frequency: 0.08, min: 0.015, max: 0.06 }).connect(windGain.gain).start();
  new Tone.LFO({ frequency: 0.05, min: 200, max: 480 }).connect(windFilt.frequency).start();

  scheduleLoops();
  ready = true;
}

const DORIAN = ['D', 'E', 'F', 'G', 'A', 'B', 'C'], PENTA = ['D', 'F', 'G', 'A', 'C'];
const n5 = (i, o) => PENTA[((i % 5) + 5) % 5] + (o + Math.floor(i / 5));
const CHORDS = [['D2', 'A2', 'F3', 'C4', 'E4'], ['Bb1', 'F2', 'D3', 'A3', 'C4'], ['F2', 'C3', 'A3', 'E4'], ['C2', 'G2', 'E3', 'B3', 'D4']];
let mood = 'calm'; // calm | wonder | dark

function scheduleLoops() {
  const r = rng(11); let ci = 0;
  // Acorde nuevo cada 8 s
  new Tone.Loop((t) => { pad.triggerAttackRelease(CHORDS[ci++ % CHORDS.length], 9, t, mood === 'dark' ? 0.5 : 0.7); }, 8).start(0.1);
  // Melodía: frases cortas que aparecen y desaparecen
  new Tone.Loop((t) => {
    if (r() < 0.45) return;
    const start = Math.floor(r() * 6), len = 3 + Math.floor(r() * 4);
    for (let i = 0; i < len; i++) lead.triggerAttackRelease(n5(start + Math.floor(r() * 4) - 1 + i, 4), '8n', t + i * (0.5 + r() * 0.35), 0.35 + r() * 0.3);
  }, 6.5).start(3);
  // Pájaros
  new Tone.Loop((t) => {
    if (r() < 0.5) return;
    const base = 2200 + r() * 1800, k = 2 + Math.floor(r() * 4);
    for (let i = 0; i < k; i++) { const tt = t + i * 0.13; chirp.triggerAttack(base, tt); chirp.frequency.linearRampToValueAtTime(base * (1.2 + r() * 0.4), tt + 0.06); chirp.triggerRelease(tt + 0.09); }
  }, 3.7).start(1.5);
  // Grillos
  new Tone.Loop((t) => { for (let i = 0; i < 3; i++) cricket.triggerAttackRelease(4700, 0.02, t + i * 0.055); }, 0.9).start(0.4);
  Tone.getTransport().start();
}

export async function enable() {
  await Tone.start();
  if (!ready) setup();
  on = true; master.mute = false;
}
export function toggle() { if (!ready) return enable(); on = !on; master.mute = !on; return on; }
export const isOn = () => on;
export function setMood(m) { mood = m; }

const go = () => ready && on;
let last = 0;
const now = () => { const t = Math.max(Tone.now() + 0.03, last + 0.02); last = t; return t; };

// Pasos: pequeñísimos golpes graves, según la velocidad
export function footstep(speed) { if (go()) step.triggerAttackRelease(80 + Math.random() * 30, 0.03, now(), Math.min(1, speed / 8)); }
// Olfatear: tres notas suaves que suben
export function sniff() { if (!go()) return; const t = now(); [0, 2, 4].forEach((k, i) => pluck.triggerAttackRelease(n5(k, 5), '32n', t + i * 0.08, 0.5)); }
// Resultado: comestible (campanas claras) o venenoso (golpe grave y roce disonante)
export function found(toxic) {
  if (!go()) return; const t = now();
  if (toxic) { thump.triggerAttackRelease('D1', 0.6, t, 0.7); bell.triggerAttackRelease(['D4', 'Eb4'], 0.8, t + 0.02, 0.3); }
  else bell.triggerAttackRelease(['A4', 'D5', 'F5'], 0.9, t, 0.55);
}
// Descubrir el mito: acorde que se abre y arpegio ascendente
export function insight() {
  if (!go()) return; const t = now();
  pad.triggerAttackRelease(['D2', 'A2', 'E3', 'F#3', 'A3', 'D4'], 6, t, 0.9);
  for (let i = 0; i < 9; i++) bell.triggerAttackRelease(n5(i, 4), '8n', t + 0.4 + i * 0.12, 0.6);
}
// Sello de MITO
export function stamp() { if (go()) thump.triggerAttackRelease('G1', 0.4, now(), 1); }
// Abrir el cuaderno: dos notas
export function page() { if (!go()) return; const t = now(); pluck.triggerAttackRelease('A4', '16n', t, 0.6); pluck.triggerAttackRelease('D5', '16n', t + 0.07, 0.6); }
// Claro dormido
export function sleepy() { if (go()) bell.triggerAttackRelease(['F4', 'C5'], 1.5, now(), 0.3); }

// Comer: mordiscos cortitos
export function chew() { if (!go()) return; const t = now(); for (let i = 0; i < 5; i++) step.triggerAttackRelease(140 + (i % 2) * 40, 0.04, t + i * 0.16, 1); pluck.triggerAttackRelease('D4', '32n', t + 0.8, 0.3); }
// Comida buena: campanitas que suben
export function heal() { if (!go()) return; const t = now(); ['D5', 'F5', 'A5', 'D6'].forEach((n, i) => bell.triggerAttackRelease(n, '8n', t + i * 0.09, 0.5)); }
// Veneno: golpe grave, roce disonante y la música se apaga como bajo el agua
export function poison(on) {
  if (!ready) return; const t = Tone.now();
  musicF.frequency.cancelScheduledValues(t);
  musicF.frequency.rampTo(on ? 500 : 18000, on ? 0.6 : 3);
  if (on && go()) { thump.triggerAttackRelease('C1', 0.8, now(), 0.9); bell.triggerAttackRelease(['C#4', 'D4', 'G#4'], 1.6, Tone.now() + 0.1, 0.35); }
}
// Perder una vida
export function hurt() { if (!go()) return; const t = now(); thump.triggerAttackRelease('A1', 0.5, t, 1); bell.triggerAttackRelease(['A3', 'Bb3'], 1, t + 0.05, 0.4); }
// Desmayo y despertar
export function faint() { if (!go()) return; const t = now(); ['A4', 'F4', 'D4', 'A3'].forEach((n, i) => lead.triggerAttackRelease(n, '4n', t + i * 0.35, 0.5)); }
export function wake() { if (!go()) return; const t = now(); ['D4', 'A4', 'D5'].forEach((n, i) => bell.triggerAttackRelease(n, '8n', t + i * 0.2, 0.4)); }
// Latido cuando queda poca energía
export function heartbeat() { if (!go()) return; const t = now(); thump.triggerAttackRelease('E1', 0.2, t, 0.45); thump.triggerAttackRelease('E1', 0.2, t + 0.22, 0.3); }
// Trepar y saltar
export function climb() { if (!go()) return; const t = now(); [0, 1, 2].forEach((k) => pluck.triggerAttackRelease(n5(k, 4), '32n', t + k * 0.07, 0.35)); }
export function jump() { if (!go()) return; const t = now(); [3, 1, 0].forEach((k, i) => pluck.triggerAttackRelease(n5(k, 5), '32n', t + i * 0.08, 0.35)); }
// Aterrizar o caer: un golpecito grave y un rebote corto
export function land() { if (!go()) return; const t = now(); step.triggerAttackRelease(140, 0.03, t, 0.8); pluck.triggerAttackRelease(n5(0, 4), '32n', t + 0.05, 0.25); }
// Narración: una nota suave cuando aparece un mensaje
export function whisper() { if (go()) lead.triggerAttackRelease(n5(Math.floor(Math.random() * 5), 5), '8n', now(), 0.18); }
// Volar: zumbido de alas (notas rápidas) y un arpegio que sube
export function fly() { if (!go()) return; const t = now(); for (let i = 0; i < 10; i++) step.triggerAttackRelease(220 + (i % 2) * 30, 0.02, t + i * 0.05, 0.6); [0, 2, 4, 7].forEach((k, i) => pluck.triggerAttackRelease(n5(k, 5), '32n', t + 0.1 + i * 0.07, 0.4)); }
// Bajar la música mientras habla la narración
export function duck(on) { if (ready) music.volume.rampTo(on ? -14 : -4, on ? 0.3 : 1.2); }

// Voz de la narración: se reproduce por Web Audio (el mismo contexto ya habilitado con el clic de inicio),
// así el navegador no la bloquea como a un <audio> suelto. Va directo a la salida, sin reverb.
const voiceBuffers = new Map();
let voiceOut = null, voiceSrc = null;
export async function playVoice(url, rate = 1) {
  if (!go()) return;
  const ctx = Tone.getContext().rawContext;
  if (ctx.state !== 'running') { try { await ctx.resume(); } catch { return; } }
  if (!voiceOut) voiceOut = new Tone.Volume(-2).connect(Tone.getDestination());
  let buf = voiceBuffers.get(url);
  if (!buf) { const ab = await (await fetch(url)).arrayBuffer(); buf = await ctx.decodeAudioData(ab); voiceBuffers.set(url, buf); }
  return new Promise((done) => {
    try { voiceSrc?.stop(); } catch { /* ya terminó */ }
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate; voiceSrc = src;
    Tone.connect(src, voiceOut);
    src.onended = () => done();
    src.start();
  });
}
export function stopVoice() { try { voiceSrc?.stop(); } catch { /* nada */ } }
// Pájaro: un chillido que baja y un aleteo grave
export function bird() {
  if (!go()) return; const t = now();
  chirp.triggerAttack(3200, t); chirp.frequency.exponentialRampToValueAtTime(1400, t + 0.5); chirp.triggerRelease(t + 0.55);
  for (let i = 0; i < 6; i++) step.triggerAttackRelease(70, 0.06, t + 0.6 + i * 0.22, 0.9);
}
