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

// Niveles: cada claro pone a prueba una creencia con los números de la investigación.
// yes/no: los dos grupos que se comparan; tox*: cuántos venenosos hay en cada grupo (proporciones del Excel).
export const LEVELS = [
  {
    id: 'anillo', at: RING, spread: 22, trait: 'ring', title: 'El anillo', place: 'el claro del anillo',
    yes: 'con anillo', no: 'sin anillo', nYes: 13, toxYes: 8, nNo: 13, toxNo: 7, research: [0.605, 0.538],
    enter: ['El claro del anillo. Los hongos con anillo y sin anillo crecen mezclados.', 'Dicen que el anillo sirve para saber cuáles son venenosos. ¿Será cierto? Comé… y averigualo.'],
    goal: 'El claro del anillo: comé para sobrevivir y averiguá si el anillo sirve para elegir.',
    h2: 'Con anillo o sin anillo,<br><em>el bosque se parece demasiado.</em>',
    small: 'En los 61.069 hongos de la investigación, el anillo casi no cambia la proporción de venenosos (55,5 % en total).',
    after: 'El anillo no avisa nada: con anillo o sin anillo, el bosque se parece demasiado.',
    page: 'En los dos grupos aparecen venenosos casi por igual: <b>61 %</b> con anillo y <b>54 %</b> sin anillo.'
  },
  {
    id: 'magulladura', at: SLEEPING[0], spread: 17, trait: 'bruise', title: 'La magulladura', place: 'el claro de la magulladura',
    yes: 'se mancha', no: 'no se mancha', nYes: 13, toxYes: 7, nNo: 9, toxNo: 5, research: [0.533, 0.559],
    enter: ['El claro de la magulladura. Dicen que si un hongo se mancha al tocarlo, es venenoso.', 'Empujá contra los tallos: algunos se manchan de azul. ¿Eso avisa algo?'],
    goal: 'El claro de la magulladura: empujá los tallos para ver cuáles se manchan, y averiguá si eso avisa algo.',
    h2: 'Se manche o no se manche,<br><em>el riesgo es casi el mismo.</em>',
    small: 'En la investigación, los que se magullan son 53 % venenosos y los que no, 56 %: mancharse no avisa nada.',
    after: 'Mancharse no es una señal: los que se manchan son tan peligrosos como los que no.',
    page: 'Los que se manchan al tocarlos son <b>53 %</b> venenosos; los que no, <b>56 %</b>. Casi lo mismo que el promedio.'
  }
];
