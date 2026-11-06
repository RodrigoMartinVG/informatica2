// Superficies caminables: el suelo más todo lo que se puede pisar encima (ramas, troncos caídos,
// piedras, hojas, musgo y los hongos repisa de los árboles).
// Cada forma sabe su "tajada" vertical en un punto: desde dónde hasta dónde es sólida.
// Así el escarabajo puede caminar por debajo de una repisa, chocar contra un tronco caído o caer encima de él.
// Las formas se guardan en una grilla para consultarlas rápido desde cualquier punto.
import { height } from './config.js';

const CELL = 12, grid = new Map();
const key = (i, j) => i * 100003 + j;
export const STEP = 1.2; // lo más alto que se sube caminando, sin trepar

function insert(shape, minX, maxX, minZ, maxZ) {
  for (let i = Math.floor(minX / CELL); i <= Math.floor(maxX / CELL); i++)
    for (let j = Math.floor(minZ / CELL); j <= Math.floor(maxZ / CELL); j++) {
      const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(shape);
    }
}

// Rama o tronco caído: cilindro horizontal de radio rad, centro (x, cy, z), eje con ángulo yaw y largo len.
// taper: cuánto se afina hacia una punta (las ramas sí, los troncos casi nada)
export function addTwig(x, z, cy, yaw, len, rad, taper = 0.2) {
  const ax = Math.cos(yaw), az = -Math.sin(yaw), h = len / 2;
  const s = { type: 0, x, z, cy, ax, az, h, rad, taper };
  const ex = Math.abs(ax) * h + rad, ez = Math.abs(az) * h + rad;
  insert(s, x - ex, x + ex, z - ez, z + ez);
  return s;
}
export const addLog = (x, z, cy, yaw, len, rad) => addTwig(x, z, cy, yaw, len, rad, 0.06);

// Piedra: casquete de elipsoide (radio horizontal rad, vertical ry) con centro (x, cy, z)
export function addPebble(x, z, cy, rad, ry = rad) {
  insert({ type: 1, x, z, cy, rad, ry }, x - rad, x + rad, z - rad, z + rad);
}

// Hoja caída: un disco casi plano (radio rad) a la altura y
export function addLeaf(x, z, y, rad) {
  insert({ type: 2, x, z, cy: y, rad }, x - rad, x + rad, z - rad, z + rad);
}

// Hongo repisa: medio disco que sale del tronco de un árbol (centro en la corteza, hacia dx, dz)
export function addShelf(x, z, y, dx, dz, rad, thick) {
  const s = { type: 3, x, z, cy: y, dx, dz, rad, thick };
  insert(s, x - rad, x + rad, z - rad, z + rad);
  return s;
}

// Tajada sólida de una forma en (x, z): [abajo, arriba] o null si no la toca
function span(s, x, z) {
  if (s.type === 0) {
    const dx = x - s.x, dz = z - s.z, t = dx * s.ax + dz * s.az;
    if (t < -s.h || t > s.h) return null;
    const d = Math.abs(dx * s.az - dz * s.ax), r = s.rad * (1 - s.taper * (t / s.h + 1) / 2);
    if (d >= r) return null;
    const k = Math.sqrt(r * r - d * d); return [s.rad > 1.5 ? -Infinity : s.cy - k, s.cy + k]; // los troncos gruesos llegan hasta el suelo
  }
  const dx = x - s.x, dz = z - s.z, d2 = dx * dx + dz * dz;
  if (d2 >= s.rad * s.rad) return null;
  if (s.type === 1) return [-Infinity, s.cy + s.ry * Math.sqrt(1 - d2 / (s.rad * s.rad))];
  if (s.type === 2) return [s.cy - 0.1, s.cy + 0.25 * d2 / (s.rad * s.rad)];      // la hoja se curva un poco hacia los bordes
  if (dx * s.dx + dz * s.dz < 0) return null;                                    // la repisa solo sale hacia afuera del tronco
  const k = 1 - Math.sqrt(d2) / s.rad;
  return [s.cy - s.thick * (0.25 + 0.75 * k), s.cy + 0.8 * (1 - (1 - k) * (1 - k))];
}

// Altura caminable en (x, z): la superficie más alta que no pase de maxY (por defecto, la más alta de todas)
export function walkHeight(x, z, maxY = Infinity) {
  let y = height(x, z);
  const list = grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (!list) return y;
  for (const s of list) { const sp = span(s, x, z); if (sp && sp[1] <= maxY && sp[1] > y) y = sp[1]; }
  return y;
}

// ¿Hay una pared en (x, z) para alguien parado a la altura y? Devuelve la altura de arriba de la pared, o -Infinity
export function wallTop(x, z, y) {
  let top = -Infinity;
  const list = grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (!list) return top;
  for (const s of list) {
    const sp = span(s, x, z);
    if (sp && sp[1] > y + STEP && sp[0] < y + 0.7) top = Math.max(top, sp[1]);
  }
  return top;
}

// Normal de la superficie (diferencias centrales)
export function walkNormal(x, z, out, maxY = Infinity, e = 0.3) {
  const hx = walkHeight(x + e, z, maxY) - walkHeight(x - e, z, maxY), hz = walkHeight(x, z + e, maxY) - walkHeight(x, z - e, maxY);
  return out.set(-hx, 2 * e, -hz).normalize();
}
