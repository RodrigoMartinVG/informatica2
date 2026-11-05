// Superficies caminables: el suelo más todo lo que se puede trepar encima (ramas y piedras).
// Las formas se guardan en una grilla para consultarlas rápido desde cualquier punto.
import { height } from './config.js';

const CELL = 12, grid = new Map();
const key = (i, j) => i * 100003 + j;

function insert(shape, minX, maxX, minZ, maxZ) {
  for (let i = Math.floor(minX / CELL); i <= Math.floor(maxX / CELL); i++)
    for (let j = Math.floor(minZ / CELL); j <= Math.floor(maxZ / CELL); j++) {
      const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(shape);
    }
}

// Rama acostada: cilindro horizontal de radio rad, centro (x, cy, z), eje con ángulo yaw y largo len
export function addTwig(x, z, cy, yaw, len, rad) {
  const ax = Math.cos(yaw), az = -Math.sin(yaw), h = len / 2;
  const s = { type: 0, x, z, cy, ax, az, h, rad };
  const ex = Math.abs(ax) * h + rad, ez = Math.abs(az) * h + rad;
  insert(s, x - ex, x + ex, z - ez, z + ez);
}

// Piedra: casquete de elipsoide (radio horizontal rad, vertical ry) con centro (x, cy, z)
export function addPebble(x, z, cy, rad, ry = rad) {
  insert({ type: 1, x, z, cy, rad, ry }, x - rad, x + rad, z - rad, z + rad);
}

// Hoja caída: un disco casi plano (radio rad) a la altura y
export function addLeaf(x, z, y, rad) {
  insert({ type: 2, x, z, cy: y, rad }, x - rad, x + rad, z - rad, z + rad);
}

// Altura caminable en (x, z): el máximo entre el suelo y lo que haya encima
export function walkHeight(x, z) {
  let y = height(x, z);
  const list = grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (!list) return y;
  for (const s of list) {
    if (s.type === 0) {
      const dx = x - s.x, dz = z - s.z, t = dx * s.ax + dz * s.az;
      if (t < -s.h || t > s.h) continue;
      const d = Math.abs(dx * s.az - dz * s.ax); if (d >= s.rad) continue;
      const taper = 1 - 0.2 * (t / s.h + 1) / 2; // la rama se afina hacia una punta
      const r = s.rad * taper; if (d >= r) continue;
      y = Math.max(y, s.cy + Math.sqrt(r * r - d * d));
    } else if (s.type === 2) {
      const d2 = (x - s.x) ** 2 + (z - s.z) ** 2; if (d2 >= s.rad * s.rad) continue;
      y = Math.max(y, s.cy + 0.25 * d2 / (s.rad * s.rad)); // la hoja se curva un poco hacia los bordes
    } else {
      const d2 = (x - s.x) ** 2 + (z - s.z) ** 2; if (d2 >= s.rad * s.rad) continue;
      y = Math.max(y, s.cy + s.ry * Math.sqrt(1 - d2 / (s.rad * s.rad)));
    }
  }
  return y;
}

// Normal de la superficie (diferencias centrales)
export function walkNormal(x, z, out, e = 0.3) {
  const hx = walkHeight(x + e, z) - walkHeight(x - e, z), hz = walkHeight(x, z + e) - walkHeight(x, z - e);
  return out.set(-hx, 2 * e, -hz).normalize();
}
