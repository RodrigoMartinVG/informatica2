// Configuración compartida del juego. Unidad del mundo: 1 = 1 cm (el escarabajo mide ~1,2 cm).

export const SPAWN = { x: 0, z: 18 };

// Claro del primer mito: los hongos con anillo y sin anillo
export const RING = { x: 0, z: -95, r: 48 };

// Claros que se van a despertar en las próximas etapas
export const SLEEPING = [
  { x: -125, z: -150, r: 30, name: 'la magulladura' },
  { x: 120, z: -165, r: 30, name: 'los colores' },
  { x: -75, z: -255, r: 30, name: 'el tamaño' },
  { x: 95, z: -268, r: 30, name: 'las proporciones' },
  { x: 0, z: -345, r: 34, name: 'los gemelos' }
];

export const BOUNDS = { minX: -195, maxX: 195, minZ: -395, maxZ: 45 };

// Zonas donde el suelo se aplana (claros y punto de partida)
const FLAT = [{ x: SPAWN.x, z: SPAWN.z, r: 16 }, RING, ...SLEEPING];

// Azar con semilla: el bosque es siempre el mismo
export function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Altura del terreno en (x, z): ondulaciones suaves que se aplanan en los claros
export function height(x, z) {
  let h = 1.4 * Math.sin(x * 0.021) * Math.cos(z * 0.017)
    + 0.7 * Math.sin(x * 0.05 + 1.3) * Math.sin(z * 0.043)
    + 0.25 * Math.sin(x * 0.13) * Math.cos(z * 0.11 + 2);
  for (const f of FLAT) h *= 0.15 + 0.85 * ss(f.r * 0.55, f.r * 1.15, Math.hypot(x - f.x, z - f.z));
  return h;
}

// ¿Este punto está dentro de algún claro? (ahí no crece pasto alto)
const CLEARINGS = [RING, ...SLEEPING];
export function inClearing(x, z, pad = 1) {
  return CLEARINGS.some((f) => Math.hypot(x - f.x, z - f.z) < f.r * 0.7 * pad);
}

// Camino de esporas desde el inicio hasta el primer claro
export const TRAIL = [[0, 10], [6, -10], [-4, -30], [5, -50], [0, -62]];

// Distancia al sendero (inicio + camino de esporas): ahí el pasto es bajo para que se vea el camino
export function nearPath(x, z) {
  let d = Math.hypot(x - SPAWN.x, z - SPAWN.z) - 6;
  for (let i = 0; i < TRAIL.length - 1; i++) {
    const [ax, az] = TRAIL[i], [bx, bz] = TRAIL[i + 1], vx = bx - ax, vz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
    d = Math.min(d, Math.hypot(x - (ax + vx * t), z - (az + vz * t)));
  }
  return d;
}
