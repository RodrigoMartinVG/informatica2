// Hongos 3D por especie. Cada hongo del juego combina dos cosas:
//  · una fila real del Excel (diámetro del sombrero, alto y ancho del tallo, forma y color), y
//  · el aspecto de la especie real que se muestra en la foto (verrugas, volva, escamas, poros, pliegues…).
// Las medidas del Excel están en centímetros (el ancho del tallo, en milímetros); el mundo del juego también mide en cm.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { profile } from '../profiles.js';
import { translucent } from './look.js';
import { rng } from './config.js';
import { FILAS, FORMAS, COLORES, SUPERFICIES, ESPACIADOS, ANILLOS, BASES, TEMPORADAS } from './filas.js';

// Colores con nombre del Excel (para teñir láminas y tallo según la fila)
const NAMED = { Blanco: '#f2eee4', Crema: '#e8dcc0', Marrón: '#8a6a48', Gris: '#9a9690', Negro: '#3a3430', Amarillo: '#e2c45a', Naranja: '#e08a40',
  Rojo: '#c0503a', Rosa: '#e8b0a8', Verde: '#9aaa6a', Púrpura: '#8a6a8a', Azul: '#7a8aa8' };
// Los dos colores con nombre más parecidos a un color (para elegir filas que le queden a la especie)
const nearNames = (hex) => { const c = new THREE.Color(hex); return Object.entries(NAMED).map(([n, h]) => [n, c.clone().sub(new THREE.Color(h)).toArray().reduce((a, v) => a + v * v, 0)]).sort((a, b) => a[1] - b[1]).slice(0, 2).map((x) => x[0]); };
// La superficie del sombrero del Excel, agrupada en lo que se ve: brillo, escamas, fibras, surcos o mate
const SURF = { Pegajosa: 'brillo', Brillante: 'brillo', Escamosa: 'escamas', Fibrosa: 'fibras', Sedosa: 'fibras', 'Con surcos': 'surcos', Arrugada: 'surcos', Coriácea: 'mate', Carnosa: 'mate', Lisa: null };

const SHAPE_ID = { 'Convexa': 'convexa', 'Plana': 'plana', 'Campana': 'campana', 'Cónica': 'conica', 'Esférica': 'esferica', 'Hundida': 'hundida', 'Otras': 'convexa' };
const VIVID = new Set(['Amarillo', 'Naranja', 'Rojo', 'Rosa', 'Verde', 'Púrpura', 'Azul']);

/* ---------- El aspecto de cada especie (según las fotos) ---------- */
// shapes/colors: con qué filas del Excel es compatible · d: rango típico del sombrero (cm)
// cap: colores del sombrero por color del Excel [centro, borde] · style: dibujo del sombrero · under: láminas, poros o pliegues
export const LOOKS = {
  muscaria: { shapes: ['Convexa', 'Plana', 'Esférica'], colors: ['Rojo', 'Naranja'], d: [7, 18], hr: 1,
    cap: { Rojo: ['#b3170f', '#e0452a'], Naranja: ['#c8461a', '#ec8a3a'], Amarillo: ['#d08a1a', '#efc04a'] }, style: 'smooth', gloss: 0.35,
    warts: '#f6f0e0', under: 'gills', gill: '#f4eee2', stem: '#f1ebdf', ring: 'skirt', ringAt: 0.82, base: 'scaly-bulb', bulb: 1.7 },
  phalloides: { shapes: ['Convexa', 'Plana'], colors: ['Verde', 'Amarillo', 'Blanco', 'Crema'], d: [5, 15], hr: 1.05,
    cap: { Verde: ['#6d7240', '#b8b882'], Amarillo: ['#8f8a46', '#cfc896'], Blanco: ['#a9ad86', '#e6e4cc'], Crema: ['#9a9a6a', '#ddd9b8'] }, style: 'fibrils', gloss: 0.45,
    under: 'gills', gill: '#f3f0e6', stem: '#eeeadc', stemStyle: 'zigzag', ring: 'skirt', ringAt: 0.8, base: 'volva', bulb: 1.3 },
  galerina: { shapes: ['Convexa', 'Campana'], colors: ['Marrón', 'Amarillo', 'Naranja'], d: [1.5, 5],
    cap: { Marrón: ['#8a4e1c', '#c48a4a'], Amarillo: ['#a8661e', '#d6a458'], Naranja: ['#a4521a', '#d8904a'] }, style: 'hygro', gloss: 0.4,
    under: 'gills', gill: '#b98448', stem: '#a07448', stemStyle: 'fibrous-dark', ring: 'thin', ringColor: '#7a5432', ringAt: 0.72, wood: true, wr: 1.4, hr: 1.4 },
  conica: { shapes: ['Cónica', 'Campana'], colors: ['Rojo', 'Naranja', 'Amarillo'], d: [1.5, 6],
    cap: { Rojo: ['#c4281a', '#ee6a2a'], Naranja: ['#d9541a', '#f4a03a'], Amarillo: ['#d98a1a', '#f6cf4a'] }, style: 'striate', gloss: 0.2,
    under: 'gills', gill: '#f2dc8a', stem: '#eebc4a', stemStyle: 'blackening', wr: 1.4, hr: 1.8 },
  mycena: { shapes: ['Campana', 'Cónica'], colors: ['Gris', 'Marrón', 'Crema', 'Blanco'], d: [1.2, 5],
    cap: { Gris: ['#6f665c', '#b2aa9e'], Marrón: ['#6a5442', '#b49c84'], Crema: ['#9c8c76', '#d8ccb8'], Blanco: ['#a8a196', '#e4ddd2'] }, style: 'striate', gloss: 0.45,
    under: 'gills', gill: '#efe2dc', stem: '#b4a898', stemStyle: 'smooth', wood: true, wr: 0.9, hr: 2.2 },
  campestris: { shapes: ['Convexa', 'Plana', 'Esférica'], colors: ['Blanco', 'Crema'], d: [4, 11],
    cap: { Blanco: ['#ece6da', '#f8f5ee'], Crema: ['#dccdb4', '#f1e9da'] }, style: 'silky', gloss: 0.55,
    under: 'gills', gill: '#c97a7c', stem: '#f1ece2', ring: 'thin', ringAt: 0.62 },
  procera: { shapes: ['Plana', 'Convexa'], colors: ['Marrón', 'Crema', 'Blanco', 'Gris'], d: [10, 18],
    cap: { Marrón: ['#5a3a22', '#e3d4bc'], Crema: ['#6a4a2c', '#ede2cc'], Blanco: ['#6a4a2c', '#f1e9da'], Gris: ['#5a4a3a', '#e2dace'] }, style: 'scales', gloss: 0.85, umbo: true,
    under: 'gills', gill: '#f3eee4', stem: '#d9c8ac', stemStyle: 'snakeskin', ring: 'collar', ringAt: 0.7, bulb: 1.5, wr: 1.1, hr: 1.25 },
  cantharellus: { shapes: ['Hundida', 'Plana', 'Convexa'], colors: ['Amarillo', 'Naranja'], d: [2.5, 8],
    cap: { Amarillo: ['#e0a21e', '#f2c44a'], Naranja: ['#e08a1e', '#f2b03e'] }, style: 'smooth', gloss: 0.6, wavy: true, funnel: true,
    under: 'ridges', gill: '#eeb23a', stem: '#eab03c', stemStyle: 'smooth', taper: 0.6 },
  edulis: { shapes: ['Convexa'], colors: ['Marrón', 'Crema'], d: [8, 18], thick: 1.5, wmin: 2.6,
    cap: { Marrón: ['#7a4a22', '#b07a44'], Rojo: ['#7a3a22', '#a8603a'], Crema: ['#9a7448', '#c8a06a'] }, style: 'bun', gloss: 0.5,
    under: 'pores', gill: '#e8dfa8', stem: '#e6d8b8', stemStyle: 'net', bulb: 1.9, club: true },
  pulverulentus: { shapes: ['Convexa'], colors: ['Marrón', 'Rojo'], d: [5, 12], thick: 1.35, wmin: 2.2,
    cap: { Marrón: ['#5a3a26', '#8a5e3e'], Rojo: ['#6a2e22', '#94523a'] }, style: 'bun', gloss: 0.6,
    under: 'pores', gill: '#d8b42a', stem: '#d8b43a', stemStyle: 'red-dots', bulb: 1.3 },
  gibba: { shapes: ['Hundida', 'Plana'], colors: ['Crema', 'Marrón', 'Blanco'], d: [3, 8],
    cap: { Crema: ['#c09a6a', '#e4caa0'], Marrón: ['#a07a50', '#d4b488'], Blanco: ['#cdb894', '#efe2c6'] }, style: 'silky', gloss: 0.7, funnel: true,
    under: 'gills', gill: '#f2ebdc', stem: '#ece2cc', stemStyle: 'smooth', decurrent: true, taper: 0.85 },
  russula: { shapes: ['Convexa', 'Plana'], colors: ['Rojo', 'Rosa'], d: [3, 10],
    cap: { Rojo: ['#a3121a', '#de2f36'], Rosa: ['#b8303e', '#e86a74'] }, style: 'smooth', gloss: 0.22,
    under: 'gills', gill: '#f7f4ec', stem: '#f6f4ee', stemStyle: 'smooth', wmin: 1.8 },
  suillus: { shapes: ['Convexa'], colors: ['Marrón', 'Amarillo', 'Naranja'], d: [4, 12], thick: 1.25,
    cap: { Marrón: ['#4e2c14', '#86552a'], Amarillo: ['#6a4418', '#a2742e'], Naranja: ['#5e3214', '#9a5e2a'] }, style: 'smooth', gloss: 0.12,
    under: 'pores', gill: '#d9c449', stem: '#e8d494', stemStyle: 'red-dots', ring: 'skirt', ringColor: '#6b4c62', ringAt: 0.72, wmin: 2.2 },
  coprinus: { shapes: ['Campana', 'Cónica'], colors: ['Blanco', 'Crema'], d: [2.5, 6], stretch: 2.3, hr: 2,
    cap: { Blanco: ['#b89a7a', '#f4f0e8'], Crema: ['#a88a6a', '#ece2d2'] }, style: 'shaggy', gloss: 0.8,
    under: 'gills', gill: '#4a3c3c', stem: '#f6f3ec', stemStyle: 'smooth', ring: 'thin', ringAt: 0.3, wr: 1.6 },
  lactarius: { shapes: ['Hundida', 'Plana'], colors: ['Naranja', 'Amarillo', 'Rosa'], d: [4, 12], funnel: true,
    cap: { Naranja: ['#c8642a', '#eba05e'], Amarillo: ['#cc7a30', '#eeb06a'], Rosa: ['#c06a4a', '#eaa47c'] }, style: 'zoned', gloss: 0.5,
    under: 'gills', gill: '#e8904a', stem: '#e9a468', stemStyle: 'smooth', wmin: 1.8, hmax: 0.6 },
  lycoperdon: { shapes: ['Esférica'], colors: ['Blanco', 'Crema', 'Marrón'], d: [2, 6], puff: true, warts: '#fbf8f0', wartSize: 0.45,
    cap: { Blanco: ['#efe8da', '#e2d8c4'], Crema: ['#e6d8bc', '#d6c6a6'], Marrón: ['#cdb894', '#bca582'] }, style: 'spiny', gloss: 0.9,
    under: 'none', gill: '#e2d8c4', stem: '#e2d6c0', stemStyle: 'smooth', wmin: 5.5, hmax: 0.5, taper: 0.62 }, // (como una pera: el pie se afina hacia abajo)
  hypholoma: { shapes: ['Convexa', 'Campana'], colors: ['Amarillo', 'Naranja'], d: [2, 6],
    cap: { Amarillo: ['#c8761e', '#ecd452'], Naranja: ['#c0601a', '#e8c048'] }, style: 'smooth', gloss: 0.45,
    under: 'gills', gill: '#9fa858', stem: '#e2cc6a', stemStyle: 'fibrous-dark', wood: true, wr: 1.3, hr: 1.6 },
  pleurotus: { shapes: ['Plana', 'Convexa', 'Hundida'], colors: ['Gris', 'Marrón', 'Blanco', 'Crema'], d: [5, 15], tilt: 0.35,
    cap: { Gris: ['#5e5852', '#a29c94'], Marrón: ['#6a5a4a', '#ad9c88'], Blanco: ['#a8a29a', '#e4e0d8'], Crema: ['#9c9080', '#dcd2c2'] }, style: 'silky', gloss: 0.5,
    under: 'gills', gill: '#efe9de', stem: '#ece6da', stemStyle: 'smooth', decurrent: true, taper: 0.7, hmax: 0.3, wood: true, lateral: 0.55 }, // (el pie, a un costado)
  // Los gemelos: a simple vista iguales (blancos, con anillo, del mismo tamaño). La diferencia no se ve.
  gemelo: { shapes: ['Convexa', 'Plana'], colors: ['Blanco', 'Crema'], d: [6, 10],
    cap: { Blanco: ['#e9e4d6', '#f6f2ea'], Crema: ['#e4dccb', '#f4efe4'] }, style: 'silky', gloss: 0.5,
    under: 'gills', gill: '#efe8dc', stem: '#f0ebe0', ring: 'skirt', ringAt: 0.7 }
};

// Proporciones típicas de cada especie (para elegir, entre las filas reales del Excel, las que se le parecen):
// [alto del tallo / diámetro del sombrero (mín, máx), ancho del tallo / diámetro (mín, máx)]
const PROP = {
  muscaria: [0.8, 1.6, 0.1, 0.25], phalloides: [0.8, 1.5, 0.1, 0.22], galerina: [0.9, 2.6, 0.07, 0.2], conica: [1.1, 3, 0.1, 0.32],
  mycena: [1.8, 5, 0.05, 0.16], campestris: [0.4, 0.95, 0.14, 0.32], procera: [1.1, 2.6, 0.05, 0.13], cantharellus: [0.5, 1.3, 0.18, 0.45],
  edulis: [0.5, 1.3, 0.25, 0.65], pulverulentus: [0.5, 1.3, 0.18, 0.45], gibba: [0.7, 1.6, 0.08, 0.22], russula: [0.5, 1.1, 0.18, 0.38],
  suillus: [0.4, 1, 0.14, 0.32], coprinus: [1.4, 3.6, 0.12, 0.32], lactarius: [0.35, 0.95, 0.15, 0.38], hypholoma: [1.1, 2.6, 0.08, 0.22],
  pleurotus: [0.05, 0.45, 0.08, 0.3], gemelo: [0.7, 1.4, 0.1, 0.22]
};
for (const [k, v] of Object.entries(PROP)) if (LOOKS[k]) LOOKS[k].prop = v;
const propOk = (row, look) => !look.prop || (row.h / row.d >= look.prop[0] && row.h / row.d <= look.prop[1] && row.w / 10 / row.d >= look.prop[2] && row.w / 10 / row.d <= look.prop[3]);

/* ---------- Elegir una fila real del Excel ---------- */
// need: { tox, trait, yes } · look: la especie. Prueba filtros de más estricto a menos estricto.
const pick = (list, i) => (i >= 0 && i != null ? list[i] : null);
const rowObj = (f) => ({ tox: f[0], d: f[1], h: f[2], w: f[3], shape: FORMAS[f[4]], color: COLORES[f[5]], ring: f[6], bruise: f[7], hab: f[8],
  sup: pick(SUPERFICIES, f[9]), lam: pick(COLORES, f[10]), tal: pick(COLORES, f[11]), esp: pick(ESPACIADOS, f[12]), ani: pick(ANILLOS, f[13]), base: pick(BASES, f[14]), temp: pick(TEMPORADAS, f[15]) });
const ROWS = FILAS.map(rowObj);
function traitOk(row, trait, yes) {
  switch (trait) {
    case 'ring': return !!row.ring === yes;
    case 'bruise': return !!row.bruise === yes;
    case 'color': return VIVID.has(row.color) === yes;
    case 'size': return yes ? row.d <= 4 : row.d >= 10;
    case 'stem': { const k = row.w / row.d; return yes ? k > 2.2 : k < 1.4; }
    case 'twin': return row.ring === 1 && (row.color === 'Blanco' || row.color === 'Crema') && row.d >= 6 && row.d <= 10;
    default: return true;
  }
}
export function pickRow(r, look, { tox, trait = null, yes = false }) {
  const inD = (row) => row.d >= look.d[0] && row.d <= look.d[1];
  // primero, filas cuyas láminas y tallo (en el Excel) tengan colores parecidos a los de la especie
  const gillOk = look.gill ? nearNames(look.gill) : null, stemOk = look.stem ? nearNames(look.stem) : null;
  const colorsOk = (row) => (!row.lam || !gillOk || look.under !== 'gills' || gillOk.includes(row.lam)) && (!row.tal || !stemOk || stemOk.includes(row.tal));
  const tries = [
    (row) => traitOk(row, trait, yes) && look.shapes.includes(row.shape) && look.colors.includes(row.color) && inD(row) && colorsOk(row) && propOk(row, look),
    (row) => traitOk(row, trait, yes) && look.colors.includes(row.color) && inD(row) && propOk(row, look),
    (row) => traitOk(row, trait, yes) && look.shapes.includes(row.shape) && look.colors.includes(row.color) && inD(row) && colorsOk(row),
    (row) => traitOk(row, trait, yes) && look.shapes.includes(row.shape) && look.colors.includes(row.color) && inD(row),
    (row) => traitOk(row, trait, yes) && look.colors.includes(row.color) && inD(row),
    (row) => traitOk(row, trait, yes) && inD(row),
    (row) => traitOk(row, trait, yes) && look.colors.includes(row.color),
    (row) => traitOk(row, trait, yes),
    () => true
  ];
  for (const ok of tries) {
    const list = ROWS.filter((row) => row.tox === (tox ? 1 : 0) && ok(row));
    if (list.length) return list[Math.floor(r() * list.length)];
  }
  return ROWS[0];
}

/* ---------- Texturas (una por especie y color, compartidas) ---------- */
const texCache = new Map();
function canvasTex(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false;
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 4;
  texCache.set(key, t); return t;
}
// Sombrero: x = alrededor, y = del centro (arriba) al borde (abajo)
function capTexture(look, id, colorName) {
  const [c0, c1] = look.cap[colorName] || Object.values(look.cap)[0];
  return canvasTex(`cap|${id}|${colorName}`, 512, 256, (g, w, h) => {
    const r = rng(id.length * 31 + colorName.length);
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, c0);
    grad.addColorStop(look.style === 'scales' ? 0.12 : 0.35, look.style === 'scales' ? c0 : mixHex(c0, c1, 0.4));
    grad.addColorStop(look.style === 'scales' ? 0.2 : 1, c1); grad.addColorStop(1, c1);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.02 + r() * 0.04})`; g.fillRect(r() * w, r() * h, 2, 2); }
    if (look.style === 'fibrils' || look.style === 'silky') {
      for (let i = 0; i < (look.style === 'fibrils' ? 380 : 180); i++) { const x = r() * w; g.strokeStyle = `rgba(${look.style === 'fibrils' ? '40,40,10' : '120,100,70'},${0.05 + r() * 0.1})`; g.lineWidth = 1 + r(); g.beginPath(); g.moveTo(x, r() * h * 0.3); g.lineTo(x + (r() - 0.5) * 8, h); g.stroke(); }
    }
    if (look.style === 'striate') { for (let i = 0; i < 90; i++) { const x = (i / 90) * w; g.strokeStyle = 'rgba(30,20,10,0.22)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, h * 0.35); g.lineTo(x, h); g.stroke(); } }
    if (look.style === 'hygro') { const gr = g.createLinearGradient(0, h * 0.55, 0, h); gr.addColorStop(0, 'rgba(60,30,10,0)'); gr.addColorStop(0.6, 'rgba(60,30,10,0.35)'); gr.addColorStop(1, 'rgba(60,30,10,0.1)'); g.fillStyle = gr; g.fillRect(0, h * 0.55, w, h * 0.45); }
    if (look.style === 'scales') { // escamas marrones concéntricas, más ralas hacia el borde
      for (let i = 0; i < 1100; i++) {
        const y = h * (0.14 + Math.pow(r(), 1.3) * 0.8), x = r() * w, s = 2 + (1 - y / h) * 4 + r() * 2.5;
        g.fillStyle = `rgba(${70 + r() * 30},${44 + r() * 20},${24},${0.55 + r() * 0.35})`;
        g.beginPath(); g.ellipse(x, y, s * 1.5, s * 0.8, 0, 0, Math.PI * 2); g.fill();
      }
    }
    if (look.style === 'shaggy') { // barbuda: escamas que se levantan y el borde que se vuelve tinta
      for (let i = 0; i < 900; i++) { const y = h * (0.1 + Math.pow(r(), 0.8) * 0.8), x = r() * w, s = 3 + r() * 4; g.fillStyle = `rgba(${150 + r() * 40},${120 + r() * 30},${90},${0.35 + r() * 0.35})`; g.beginPath(); g.ellipse(x, y, s * 0.7, s * 1.6, 0, 0, Math.PI * 2); g.fill(); }
      const gr = g.createLinearGradient(0, h * 0.82, 0, h); gr.addColorStop(0, 'rgba(40,30,30,0)'); gr.addColorStop(1, 'rgba(40,30,30,0.85)'); g.fillStyle = gr; g.fillRect(0, h * 0.82, w, h * 0.18);
    }
    if (look.style === 'zoned') for (let y = h * 0.15; y < h; y += 14 + r() * 10) { g.fillStyle = `rgba(150,60,20,${0.18 + r() * 0.2})`; g.fillRect(0, y, w, 5 + r() * 6); }
    if (look.style === 'spiny') for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${r() < 0.3 ? '150,130,100' : '255,255,250'},${0.25 + r() * 0.35})`; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 2.2, 0, 7); g.fill(); }
    if (look.style === 'bun') { const gr = g.createLinearGradient(0, h * 0.85, 0, h); gr.addColorStop(0, 'rgba(255,240,210,0)'); gr.addColorStop(1, 'rgba(255,240,210,0.45)'); g.fillStyle = gr; g.fillRect(0, h * 0.85, w, h * 0.15); }
  });
}
function hashStr(t) { let h = 7; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return h.toString(36); }
function mixHex(a, b, k) { return '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString(); }
// Abajo del sombrero: láminas, poros (esponja) o pliegues
function underTexture(look, id) {
  return canvasTex(`under|${id}`, 512, 64, (g, w, h) => {
    const base = new THREE.Color(look.gill), dark = base.clone().multiplyScalar(0.72);
    g.fillStyle = base.getStyle(); g.fillRect(0, 0, w, h);
    if (look.under === 'pores') { const r = rng(5); for (let i = 0; i < 2600; i++) { g.fillStyle = dark.getStyle(); g.beginPath(); g.arc(r() * w, r() * h, 0.9 + r() * 0.8, 0, 7); g.fill(); } }
    else for (let i = 0; i < 160; i++) { g.fillStyle = dark.getStyle(); g.fillRect((i / 160) * w, i % 2 ? h * 0.35 : 0, 1.6, h); }
  });
}
// Tallo: x = alrededor, y = de la base (arriba de la imagen) a la punta
function stemTexture(look, id) {
  return canvasTex(`stem|${id}`, 256, 512, (g, w, h) => {
    const r = rng(id.length * 7), base = new THREE.Color(look.stem);
    g.fillStyle = base.getStyle(); g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { g.strokeStyle = `rgba(110,90,60,${0.04 + r() * 0.07})`; const x = r() * w; g.beginPath(); g.moveTo(x, r() * h); g.lineTo(x + (r() - 0.5) * 4, r() * h); g.stroke(); }
    const st = look.stemStyle;
    if (st === 'snakeskin') for (let y = 0; y < h * 0.62; y += 7 + r() * 5) { g.strokeStyle = `rgba(110,80,50,${0.2 + r() * 0.2})`; g.lineWidth = 1 + r() * 2; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * 0.15 + y) * 3); g.stroke(); }
    if (st === 'zigzag') for (let y = 0; y < h * 0.75; y += 14) { g.strokeStyle = 'rgba(150,150,100,0.12)'; g.lineWidth = 1.5; g.beginPath(); for (let x = 0; x <= w; x += 10) g.lineTo(x, y + ((x / 10) % 2 ? 4 : -4)); g.stroke(); }
    if (st === 'net') { g.strokeStyle = 'rgba(255,252,240,0.8)'; g.lineWidth = 1.5; for (let i = 0; i < 260; i++) { const x = r() * w, y = h * (0.45 + r() * 0.55); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 18, y + (r() - 0.5) * 12); g.stroke(); } }
    if (st === 'red-dots') { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(150,40,20,0.75)'); gr.addColorStop(0.6, 'rgba(150,40,20,0.2)'); gr.addColorStop(1, 'rgba(150,40,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    if (st === 'blackening') { const gr = g.createLinearGradient(0, 0, 0, h * 0.35); gr.addColorStop(0, 'rgba(25,20,18,0.9)'); gr.addColorStop(1, 'rgba(25,20,18,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h * 0.35); }
    if (st === 'fibrous-dark') { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(50,30,15,0.6)'); gr.addColorStop(0.7, 'rgba(50,30,15,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    if (look.base === 'scaly-bulb') for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,255,248,0.9)'; g.fillRect(0, h * (0.02 + i * 0.05), w, 4); }
  });
}

// Relieve del sombrero según su superficie en el Excel (uno por tipo, en grises, compartido por todos los hongos)
const surfCache = new Map();
function surfTex(kind) {
  if (surfCache.has(kind)) return surfCache.get(kind);
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d'), r = rng(kind.length * 17), w = 512, h = 256;
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  // (manchas irregulares y suaves, más ralas hacia el centro: nada de patrones repetidos, que parecen tejidos)
  if (kind === 'escamas') for (let i = 0; i < 260; i++) { const y = h * (0.25 + Math.pow(r(), 0.7) * 0.72), x = r() * w, sz = 2 + r() * 4; g.fillStyle = `rgba(${r() < 0.6 ? '70,70,70' : '180,180,180'},${0.25 + r() * 0.3})`; g.beginPath(); g.ellipse(x, y, sz * (1 + r()), sz * (0.5 + r() * 0.4), r() * 3, 0, 7); g.fill(); }
  if (kind === 'fibras') for (let i = 0; i < 220; i++) { const x = r() * w; g.strokeStyle = `rgba(${r() < 0.5 ? '70,70,70' : '180,180,180'},${0.2 + r() * 0.25})`; g.lineWidth = 0.8 + r(); g.beginPath(); g.moveTo(x, h * (0.2 + r() * 0.4)); g.lineTo(x + (r() - 0.5) * 6, h); g.stroke(); }
  if (kind === 'surcos') {
    for (let i = 0; i < 60; i++) { const x = (i / 60) * w + (r() - 0.5) * 4; g.strokeStyle = `rgba(40,40,40,${0.35 + r() * 0.3})`; g.lineWidth = 1.5 + r(); g.beginPath(); g.moveTo(x, h * (0.6 + r() * 0.15)); g.lineTo(x, h); g.stroke(); } // surcos solo en el borde
    for (let i = 0; i < 50; i++) { const x = r() * w, y = h * (0.2 + r() * 0.4); g.strokeStyle = 'rgba(60,60,60,0.3)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 12, y + 8, x + 24, y + (r() - 0.5) * 10); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.flipY = false; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  surfCache.set(kind, t); return t;
}

/* ---------- Materiales (compartidos por especie y color) ---------- */
const matCache = new Map();
// Olvidar texturas y materiales guardados (el taller lo usa al cambiar un diseño)
export function resetCache() {
  for (const t of texCache.values()) t.dispose(); texCache.clear();
  for (const m of matCache.values()) for (const x of Object.values(m)) x.dispose?.(); matCache.clear();
}
// Podredumbre: la misma textura, más apagada, con manchas oscuras y moho blanco (rot 1: pasado · 2: muerto)
function rotTex(base, rot, key) {
  return canvasTex(`${key}|rot${rot}`, base.image.width, base.image.height, (g, w, h) => {
    const r = rng(key.length * 13 + rot);
    g.drawImage(base.image, 0, 0);
    g.globalCompositeOperation = 'saturation'; g.fillStyle = `rgba(128,128,128,${rot === 1 ? 0.55 : 0.9})`; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = rot === 1 ? '#b8a48a' : '#6a5a4a'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < (rot === 1 ? 40 : 90); i++) { const x = r() * w, y = r() * h, s = (6 + r() * 26) * (w / 512); g.fillStyle = `rgba(${30 + r() * 20},${22 + r() * 12},${14},${0.35 + r() * 0.4})`; g.beginPath(); g.ellipse(x, y, s, s * (0.5 + r() * 0.6), r() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < (rot === 1 ? 300 : 1400); i++) { const x = r() * w, y = r() * h; g.fillStyle = `rgba(240,238,228,${0.25 + r() * 0.45})`; g.beginPath(); g.arc(x, y, (0.6 + r() * 1.8) * (w / 512), 0, 7); g.fill(); } // moho
  });
}
// xl: lo que agrega la fila del Excel (relieve del sombrero, color de las láminas y del tallo)
function materials(look, id, colorName, rot = 0, xl = {}) {
  const key = `${id}|${colorName}|${rot}|${xl.surf || ''}|${xl.lam || ''}|${xl.tal || ''}`;
  if (matCache.has(key)) return matCache.get(key);
  const R = (t, k) => (rot ? rotTex(t, rot, k) : t);
  const rough = rot ? 0.95 : xl.surf === 'brillo' ? look.gloss * 0.35 : xl.surf === 'mate' ? Math.min(1, look.gloss + 0.25) : look.gloss;
  const capBase = new THREE.MeshStandardMaterial({ map: R(capTexture(look, id, colorName), `cap|${id}|${colorName}`), roughness: rough, side: THREE.DoubleSide });
  if (xl.surf && xl.surf !== 'brillo' && xl.surf !== 'mate') { capBase.bumpMap = surfTex(xl.surf); capBase.bumpScale = xl.surf === 'surcos' ? 0.7 : 0.45; }
  const tint = (name, k) => new THREE.Color('#ffffff').lerp(new THREE.Color(NAMED[name]).multiplyScalar(1.15), k);
  const underBase = new THREE.MeshStandardMaterial({ map: R(underTexture(look, id), `under|${id}`), roughness: 0.95, side: THREE.DoubleSide });
  if (xl.lam) underBase.color = tint(xl.lam, 0.2);
  const stem = new THREE.MeshStandardMaterial({ map: R(stemTexture(look, id), `stem|${id}`), roughness: 0.92 });
  if (xl.tal) stem.color = tint(xl.tal, 0.2);
  const gillHex = xl.lam ? mixHex(look.gill, NAMED[xl.lam], 0.2) : look.gill;
  const out = {
    cap: translucent(capBase, '#ffb470', 1.1), under: translucent(underBase, '#ffc58a', 0.9), stem,
    plate: translucent(new THREE.MeshStandardMaterial({ color: new THREE.Color(gillHex).lerp(new THREE.Color('#3a2c20'), rot * 0.35), roughness: 0.95, side: THREE.DoubleSide }), '#ffc58a', 0.9),
    mold: new THREE.MeshStandardMaterial({ color: '#f1efe6', roughness: 1, flatShading: true }),
    white: new THREE.MeshStandardMaterial({ color: new THREE.Color(look.warts || '#f2ede2').lerp(new THREE.Color('#6a5a48'), rot * 0.3), roughness: 0.9, flatShading: true }),
    volva: new THREE.MeshStandardMaterial({ color: new THREE.Color('#efeadb').lerp(new THREE.Color('#5a4a3a'), rot * 0.35), roughness: 0.95, side: THREE.DoubleSide })
  };
  matCache.set(key, out); return out;
}

/* ---------- Geometría ---------- */
const V2 = ([r, y]) => new THREE.Vector2(r, y);
function lerpTable(tab, x) {
  if (x <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (x <= tab[i][0]) { const [x0, y0] = tab[i - 1], [x1, y1] = tab[i]; return y0 + (y1 - y0) * ((x - x0) / (x1 - x0 || 1)); }
  return tab[tab.length - 1][1];
}

// Construye un hongo. Devuelve { group, climb } con todo en cm, con la base en (0, 0, 0).
// group.children: [tallo, sombrero, abajo del sombrero, …detalles]
// what: el nombre de una especie (LOOKS) o un aspecto armado en el taller (mismos campos)
// Cada hongo además tiene su propia edad (joven, maduro o viejo) e imperfecciones: no hay dos iguales.
// rot: 0 sano · 1 pasado (se está pudriendo) · 2 muerto (podrido)
export function buildMushroom(what, row, seed, { segs = 40, age: forceAge = null, perfect = false, rot = 0 } = {}) {
  const look = typeof what === 'string' ? LOOKS[what] : what;
  const id = typeof what === 'string' ? what : 'u' + hashStr(JSON.stringify(what));
  let shape = look.shapes.includes(row.shape) ? SHAPE_ID[row.shape] : SHAPE_ID[look.shapes[0]];
  if (look.funnel) shape = 'hundida';
  if (look.puff) shape = 'esferica';
  if (id === 'conica' && shape !== 'conica') shape = 'campana';
  const r = rng((seed * 2654435761) % 2147483629 + 1); r(); r(); // semilla mezclada: con semillas chicas, los primeros números salen casi en cero
  const age = rot ? 1 : forceAge ?? (look.puff ? 0.5 : r());
  const colorName = look.colors.includes(row.color) ? row.color : look.colors[0];
  // Medidas reales (acotadas para que el juego siga siendo jugable)
  // (algunas especies tienen proporciones propias: la parasol es alta y de tallo fino; la mycena, un hilo)
  const D = Math.min(18, Math.max(1.4, row.d));
  const H = Math.min(19, look.hmax ? Math.max(1, D * look.hmax) : Infinity, Math.max(1.5, row.h, look.hr ? D * look.hr : 0)) * (perfect ? 1 : 0.88 + age * 0.2);
  const Wmm = Math.min(D * 10 * 0.5, look.wr ? D * look.wr : Infinity, Math.max(2, row.w, look.wmin ? D * look.wmin : 0));
  const p = profile({ id: shape, cap: D, alto: H, grosor: Wmm, ring: false }); // en mm
  // La fila del Excel también decide el relieve del sombrero (si la especie no tiene uno propio), el tono de láminas y tallo,
  // cuán apretadas van las láminas, el tipo de anillo y la base del tallo
  // (el relieve del Excel solo se suma si la especie no tiene una superficie propia muy marcada: escamas, verrugas, ceras brillantes…)
  const ownSurf = look.puff || look.warts || ['scales', 'shaggy', 'spiny', 'striate', 'hygro'].includes(look.style) || look.gloss < 0.4;
  const xl = { surf: ownSurf ? null : SURF[row.sup] || null, lam: look.under === 'gills' ? row.lam : null, tal: row.tal };
  const mats = materials(look, id, colorName, rot, xl);
  const bulbK = look.bulb || (look.base === 'volva' ? 0 : row.base === 'Bulbosa' ? 1.32 : row.base === 'Hinchada' ? 1.16 : row.base === 'En maza' ? 1.22 : 0);
  const clubK = look.club || (!look.bulb && row.base === 'En maza');
  const k = 0.1;
  const g = new THREE.Group();

  // Tallo: el perfil del Excel, con la forma de la especie (bulbo, maza, se afina abajo…)
  const stemPts = p.stem.map(([sr, sy], i, arr) => {
    const u = sy / (H * 10);
    let f = 1;
    if (bulbK) f *= 1 + (bulbK - 1) * Math.exp(-(((u - 0.06) / (clubK ? 0.32 : 0.12)) ** 2));
    if (look.puff) f /= 1 + 0.55 * Math.exp(-(((u - 0.1) / 0.14) ** 2)); // el bejín no tiene bulbo abajo: es una pera
    if (look.taper) f *= look.taper + (1 - look.taper) * u;
    if (rot) f *= 1 - 0.18 * rot * Math.sin(Math.PI * u); // marchito: más fino en el medio
    return [sr * f * k, sy * k];
  });
  const stemR = stemPts.map(([sr, sy]) => [sy, sr]);
  const stem = new THREE.Mesh(new THREE.LatheGeometry(stemPts.map(V2), segs), mats.stem); g.add(stem);

  // Sombrero: arriba y abajo, con el centro hacia arriba en la textura
  const capBase = p.capUnder[p.capUnder.length - 1][1];
  // de joven, el sombrero es más cerrado y alto; de viejo, más plano y con el borde levantado
  const ageK = perfect || look.funnel || shape === 'conica' ? 1 : 1.25 - 0.5 * age;
  const hk = (look.thick || 1) * (look.stretch || 1) * ageK;
  const topPts = p.capTop.map(([cr, cy]) => [cr * k, (capBase + (cy - capBase) * hk) * k]);
  { // un sombrero nunca es un disco de papel: en el centro tiene, por lo menos, un 15 % de su diámetro de alto (salvo los embudos)
    const R0 = topPts[topPts.length - 1][0], base = capBase * k, hTop = Math.max(...topPts.map((q) => q[1])) - base, need = R0 * 0.3;
    if (!look.funnel && !look.puff && hTop > 1e-3 && hTop < need) { const f = need / hTop; for (const q of topPts) q[1] = base + (q[1] - base) * f; }
  }
  if (!perfect && age > 0.75 && !look.funnel && !rot) { const R0 = topPts[topPts.length - 1][0]; for (const q of topPts) q[1] += Math.max(0, q[0] / R0 - 0.75) * (age - 0.75) * R0 * 0.5; }
  if (rot) { // pasado: se aplana y el borde se cae; muerto: se hunde
    const R0 = topPts[topPts.length - 1][0], base = capBase * k;
    for (const q of topPts) { q[1] = base + (q[1] - base) * (1 - 0.3 * rot); q[1] -= Math.max(0, q[0] / R0 - 0.5) * R0 * 0.22 * rot; }
  }
  if (look.umbo) { const R0 = topPts[topPts.length - 1][0]; for (const q of topPts) q[1] += Math.max(0, 1 - q[0] / (R0 * 0.22)) * R0 * 0.07; }
  const underPts = p.capUnder.map(([cr, cy]) => [cr * k, cy * k]);
  const capGeo = new THREE.LatheGeometry(topPts.map(V2), segs);
  const underGeo = new THREE.LatheGeometry(underPts.map(V2), segs);
  if (look.wavy) for (const geo of [capGeo, underGeo]) { // borde ondulado (cantarela)
    const pos = geo.attributes.position, R0 = topPts[topPts.length - 1][0];
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), rr = Math.hypot(x, z); if (rr < R0 * 0.6) continue; pos.setY(i, pos.getY(i) + Math.sin(Math.atan2(z, x) * 6) * R0 * 0.07 * ((rr - R0 * 0.6) / (R0 * 0.4))); }
    geo.computeVertexNormals();
  }
  const cap = new THREE.Mesh(capGeo, mats.cap); g.add(cap);
  const under = new THREE.Mesh(underGeo, look.puff ? mats.cap : mats.under); g.add(under);

  // Láminas o pliegues (placas radiales que siguen la cara de abajo; las decurrentes bajan por el tallo)
  if (look.under === 'gills' || look.under === 'ridges') {
    const und = [...underPts].sort((a, b) => a[0] - b[0]);
    const r0 = und[0][0] * 1.05, r1 = und[und.length - 1][0] * 0.97, n = look.under === 'ridges' ? 26 : Math.min(64, Math.round((18 + D * 3) * (row.esp === 'Apretadas' ? 1.35 : row.esp === 'Separadas' ? 0.6 : 1))), plates = [];
    if (r1 - r0 > 0.15) for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th), steps = 6, pos = [], idx = [];
      const start = look.under === 'gills' && i % 2 ? r0 + (r1 - r0) * 0.45 : r0;
      const depthMax = look.under === 'ridges' ? Math.min(0.25, (r1 - r0) * 0.1) : Math.min(0.6, (r1 - r0) * 0.13);
      for (let q = 0; q <= steps; q++) {
        const rr = start + ((r1 - start) * q) / steps, y = lerpTable(und, rr), depth = depthMax * Math.sin(Math.PI * Math.min(1, 0.15 + 0.85 * q / steps));
        pos.push(c * rr, y - 0.02, s * rr, c * rr, y - 0.02 - depth, s * rr);
        if (q < steps) { const b = q * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
      }
      if ((look.decurrent || look.under === 'ridges') && !look.lateral) { // bajan por el tallo
        const top = und[0][1], sr = lerpTable(stemR, top), drop = Math.min(H * 0.35, D * 0.3), b = (steps + 1) * 2;
        pos.push(c * sr, top - drop, s * sr, c * (sr + depthMax * 0.6), top - drop * 0.5, s * (sr + depthMax * 0.6));
        idx.push(0, 1, b, 1, b + 1, b);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      plates.push(geo);
    }
    if (plates.length) { const lam = new THREE.Mesh(mergeGeometries(plates), mats.plate); lam.receiveShadow = true; g.add(lam); }
  }

  // Anillo: falda colgante (amanitas), collar grueso (parasol) o anillo fino
  if (look.ring) {
    const y = H * look.ringAt, sr = lerpTable(stemR, y);
    let pts = look.ring === 'skirt' ? [[sr * 0.98, 0.15], [sr * 1.5, 0.02], [sr * 2.0, -0.35], [sr * 2.15, -0.75], [sr * 2.05, -0.85]]
      : look.ring === 'collar' ? [[sr * 0.98, 0.25], [sr * 1.9, 0.2], [sr * 2.0, 0], [sr * 1.9, -0.2], [sr * 0.98, -0.25]]
        : [[sr * 0.98, 0.06], [sr * 1.35, -0.02], [sr * 1.45, -0.14]];
    // el tipo de anillo de la fila: grande o colgante (más falda), evanescente (apenas un resto), acampanado (se abre hacia arriba)
    const rk = row.ani === 'Grande' || row.ani === 'Colgante' ? 1.2 : row.ani === 'Evanescente' ? 0.6 : 1;
    pts = pts.map(([x, yy]) => [sr * 0.98 + (x - sr * 0.98) * rk, row.ani === 'Acampanado' ? -yy * 0.8 : yy * (row.ani === 'Evanescente' ? 0.5 : rk)]);
    const ringMat = look.ringColor ? new THREE.MeshStandardMaterial({ color: new THREE.Color(look.ringColor).lerp(new THREE.Color('#3a2c20'), rot * 0.3), roughness: 0.9, side: THREE.DoubleSide }) : look.ring === 'collar' ? mats.under : mats.volva;
    const ring = new THREE.Mesh(new THREE.LatheGeometry(pts.map(V2), segs), ringMat);
    ring.position.y = y; g.add(ring);
  }
  // Volva: la "bolsa" de la amanita mortal; anillos de escamas en la base de la muscaria
  if (look.base === 'volva') {
    const sr = lerpTable(stemR, 0.3), vh = Math.min(1.6, H * 0.14), pts = [[0.01, -0.1], [sr * 1.1, -0.05], [sr * 1.22, vh * 0.45], [sr * 1.15, vh * 0.85], [sr * 1.3, vh]];
    g.add(new THREE.Mesh(new THREE.LatheGeometry(pts.map(V2), segs), mats.volva));
  }
  if (look.base === 'scaly-bulb') for (let i = 0; i < 3; i++) {
    const y = 0.3 + i * 0.45, sr = lerpTable(stemR, y);
    const tor = new THREE.Mesh(new THREE.TorusGeometry(sr * 0.98, 0.09, 6, segs), mats.volva); tor.rotation.x = Math.PI / 2; tor.position.y = y; g.add(tor);
  }

  // Verrugas blancas (muscaria): restos del velo sobre el sombrero
  const top = []; let maxR = -1;
  for (const [cr, cy] of topPts) { if (cr <= maxR) break; maxR = cr; top.push([cr, cy]); }
  if (look.warts) {
    const bumps = [], count = Math.round((20 + D * 4) * (look.puff ? 3 : 1));
    for (let i = 0; i < count; i++) {
      const rr = Math.sqrt(r()) * maxR * 0.9, th = r() * Math.PI * 2, sz = (0.08 + r() * 0.1) * Math.max(1, D / 8) * (look.wartSize || 1);
      const b = new THREE.IcosahedronGeometry(sz, 0); b.scale(1, 0.5, 1); b.translate(Math.cos(th) * rr, lerpTable(top, rr) + sz * 0.2, Math.sin(th) * rr); bumps.push(b);
    }
    const w = new THREE.Mesh(mergeGeometries(bumps), mats.white); g.add(w);
  }

  // Moho blanco sobre el sombrero de los que se pudren
  if (rot) {
    const fuzz = [], n = rot === 1 ? 10 : 34;
    for (let i = 0; i < n; i++) { const rr = Math.sqrt(r()) * maxR * 0.85, th = r() * Math.PI * 2, sz = (0.06 + r() * 0.12) * Math.max(1, D / 6); const b = new THREE.IcosahedronGeometry(sz, 0); b.scale(1, 0.45, 1); b.translate(Math.cos(th) * rr, lerpTable(top, rr) + sz * 0.15, Math.sin(th) * rr); fuzz.push(b); }
    g.add(new THREE.Mesh(mergeGeometries(fuzz), mats.mold));
  }

  // Imperfecciones: sombrero un poco desparejo, a veces una mordida (de babosa) y, de viejo, el borde roto
  const flaws = []; // lo que se le nota a este ejemplar (se muestra en la ficha)
  if (!perfect) {
    const R0 = maxR, a1 = 0.03 + r() * 0.05, a2 = r() * 0.04, p1 = r() * 6, p2 = r() * 6;
    const bites = [];
    if (r() < 0.3 || rot) { bites.push({ at: r() * Math.PI * 2, w: 0.3 + r() * 0.3, d: 0.15 + r() * 0.15 + rot * 0.08 }); if (!rot) flaws.push('mordida'); }
    if (rot === 2) for (let i = 0; i < 3; i++) bites.push({ at: r() * Math.PI * 2, w: 0.15 + r() * 0.2, d: 0.2 + r() * 0.15 });
    if (age > 0.8) { for (let i = 0; i < 3; i++) bites.push({ at: r() * Math.PI * 2, w: 0.08 + r() * 0.08, d: 0.06 + r() * 0.05 }); flaws.push('borde roto'); }
    if (a1 + a2 > 0.08) flaws.push('desparejo');
    const sr0 = lerpTable(stemR, H * 0.9) * 1.1;
    for (const o of g.children.slice(1)) {
      if (o.position.y !== 0) continue; // el anillo no
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), rr = Math.hypot(x, z); if (rr <= sr0) continue;
        const ph = Math.atan2(z, x); let f = 1 + (a1 * Math.sin(2 * ph + p1) + a2 * Math.sin(3 * ph + p2)) * Math.min(1, (rr - sr0) / (R0 * 0.5));
        let lim = Infinity;
        for (const b of bites) { const dp = Math.atan2(Math.sin(ph - b.at), Math.cos(ph - b.at)); if (Math.abs(dp) < b.w) lim = Math.min(lim, R0 * (1 - b.d * (1 - (dp / b.w) ** 2))); }
        const nr = Math.max(sr0, Math.min(rr * f, rr * f > lim ? lim + (rr * f - lim) * 0.15 : Infinity));
        pos.setX(i, (x / rr) * nr); pos.setZ(i, (z / rr) * nr);
      }
      pos.needsUpdate = true; o.geometry.computeVertexNormals();
    }
    g.rotation.z = (r() - 0.5) * (look.tilt || 0.08) + (rot ? (r() < 0.5 ? -1 : 1) * 0.12 * rot : 0); g.rotation.x = (r() - 0.5) * (look.tilt ? look.tilt * 0.5 : 0.06);
    if (!look.tilt && Math.hypot(g.rotation.x, g.rotation.z) > 0.03) flaws.push('torcido');
  }

  // Pie a un costado (gírgola): el sombrero se corre y el tallo queda cerca del borde
  const offX = look.lateral ? maxR * look.lateral : 0;
  if (offX) for (const o of g.children.slice(1)) o.position.x += offX;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const under0 = p.capUnder[p.capUnder.length - 1][1] * k;
  return {
    group: g, colorName, shape, D, H, W: Wmm, age, flaws, rot,
    climb: {
      stemR: (h) => lerpTable(stemR, h), capY: (rr) => lerpTable(top, rr), Rw: maxR,
      climbTop: Math.min(under0, H) - 0.2, top: Math.max(...top.map((t) => t[1])), offX
    }
  };
}
