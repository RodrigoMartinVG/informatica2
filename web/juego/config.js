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
// yes/no: los dos grupos que se comparan; tox*: cuántos venenosos hay en cada grupo (proporciones de los datos).
// photos: especies reales parecidas para cada grupo (venenosas / comestibles). stamp: el veredicto.
export const LEVELS = [
  {
    id: 'anillo', at: RING, spread: 22, trait: 'ring', title: 'El anillo', place: 'el claro del anillo', stamp: 'MITO',
    yes: 'con anillo', no: 'sin anillo', nYes: 13, toxYes: 8, nNo: 13, toxNo: 7, research: [0.605, 0.538],
    photos: { yes: { tox: ['phalloides', 'galerina', 'muscaria'], ed: ['campestris', 'procera'] }, no: { tox: ['conica', 'mycena'], ed: ['cantharellus', 'edulis', 'gibba'] } },
    enter: ['El claro del anillo. Los hongos con anillo y sin anillo crecen mezclados.', 'Dicen que el anillo sirve para saber cuáles son venenosos. ¿Será cierto? Comé… y averigualo.'],
    goal: 'El claro del anillo: comé para sobrevivir y averiguá si el anillo sirve para elegir.',
    h2: 'Con anillo o sin anillo,<br><em>el bosque se parece demasiado.</em>',
    small: 'En los 61.069 hongos de la investigación, el anillo casi no cambia la proporción de venenosos (55,5 % en total).',
    after: 'El anillo no avisa nada: con anillo o sin anillo, el bosque se parece demasiado.',
    page: 'En los dos grupos aparecen venenosos casi por igual: <b>61 %</b> con anillo y <b>54 %</b> sin anillo.'
  },
  {
    id: 'magulladura', at: SLEEPING[0], spread: 17, trait: 'bruise', title: 'La magulladura', place: 'el claro de la magulladura', stamp: 'MITO',
    yes: 'se mancha', no: 'no se mancha', nYes: 13, toxYes: 7, nNo: 9, toxNo: 5, research: [0.533, 0.559],
    photos: { yes: { tox: ['conica'], ed: ['pulverulentus'] }, no: { tox: ['phalloides', 'mycena'], ed: ['campestris', 'cantharellus', 'gibba'] } },
    enter: ['El claro de la magulladura. Dicen que si un hongo se mancha al tocarlo, es venenoso.', 'Empujá contra los tallos: algunos se manchan de azul. ¿Eso avisa algo?'],
    goal: 'El claro de la magulladura: empujá los tallos para ver cuáles se manchan, y averiguá si eso avisa algo.',
    h2: 'Se manche o no se manche,<br><em>el riesgo es casi el mismo.</em>',
    small: 'En la investigación, los que se magullan son 53 % venenosos y los que no, 56 %: mancharse no avisa nada.',
    after: 'Mancharse no es una señal: los que se manchan son tan peligrosos como los que no.',
    page: 'Los que se manchan al tocarlos son <b>53 %</b> venenosos; los que no, <b>56 %</b>. Casi lo mismo que el promedio.'
  },
  {
    id: 'colores', at: SLEEPING[1], spread: 18, trait: 'color', title: 'Los colores', place: 'el claro de los colores', stamp: 'A MEDIAS',
    yes: 'de color llamativo', no: 'de color común', nYes: 13, toxYes: 9, nNo: 13, toxNo: 6, research: [0.683, 0.482],
    photos: { yes: { tox: ['muscaria', 'conica'], ed: ['cantharellus'] }, no: { tox: ['phalloides', 'galerina'], ed: ['campestris', 'edulis', 'gibba'] } },
    enter: ['El claro de los colores. Rojos, naranjas y verdes entre blancos y marrones.', 'Dicen que los colores llamativos avisan del peligro. ¿Y los colores comunes? ¿Son seguros?'],
    goal: 'El claro de los colores: averiguá si los colores llamativos avisan… y si los comunes son seguros.',
    h2: 'Los llamativos son más riesgosos,<br><em>pero los comunes no son seguros.</em>',
    small: 'En la investigación: los de color llamativo son 68 % venenosos y los de color común (blanco, marrón, gris, crema), 48 %. Casi la mitad de los "normales" también es venenosa.',
    after: 'El color ayuda un poco, pero no alcanza: el hongo más mortal del mundo es blanco y verdoso.',
    page: 'Llamativos: <b>68 %</b> venenosos. Comunes: <b>48 %</b>. Una pista a medias: ningún color es una garantía.'
  },
  {
    id: 'tamano', at: SLEEPING[2], spread: 20, trait: 'size', title: 'El tamaño', place: 'el claro del tamaño', stamp: 'TENDENCIA',
    yes: 'chico', no: 'grande', nYes: 13, toxYes: 9, nNo: 12, toxNo: 5, research: [0.696, 0.431],
    photos: { yes: { tox: ['galerina', 'mycena', 'conica'], ed: ['gibba', 'cantharellus'] }, no: { tox: ['muscaria', 'phalloides'], ed: ['procera', 'edulis'] } },
    enter: ['El claro del tamaño. Hongos diminutos al lado de gigantes.', 'Dicen que los chicos son los peligrosos. ¿Los grandes se pueden comer tranquilo?'],
    goal: 'El claro del tamaño: compará los hongos chicos con los grandes.',
    h2: 'Más chico, más riesgo.<br><em>Pero ningún tamaño es seguro.</em>',
    small: 'En la investigación: hasta 4 cm de sombrero, 70 % venenosos; de 10 cm o más, 43 %. Es la curva de GeoGebra: p(x) = 0,740 − 0,109·ln(x) baja, pero nunca llega a cero.',
    after: 'El tamaño muestra una tendencia real, pero casi la mitad de los grandes también es venenosa.',
    page: 'Chicos (hasta 4 cm): <b>70 %</b> venenosos. Grandes (10 cm o más): <b>43 %</b>. Una tendencia, no una regla.'
  },
  {
    id: 'proporciones', at: SLEEPING[3], spread: 18, trait: 'stem', title: 'Las proporciones', place: 'el claro de las proporciones', stamp: 'PISTA DÉBIL',
    yes: 'de tallo grueso', no: 'de tallo fino', nYes: 12, toxYes: 6, nNo: 13, toxNo: 8, research: [0.49, 0.605],
    photos: { yes: { tox: ['muscaria', 'phalloides'], ed: ['edulis', 'pulverulentus'] }, no: { tox: ['mycena', 'galerina', 'conica'], ed: ['procera', 'gibba'] } },
    enter: ['El claro de las proporciones. Tallos gruesos como troncos y tallos finos como hilos.', '¿La forma del hongo delata a los venenosos? Trepalos y comparalos.'],
    goal: 'El claro de las proporciones: compará los hongos de tallo grueso con los de tallo fino.',
    h2: 'Gruesos o finos,<br><em>las proporciones casi no los separan.</em>',
    small: 'En una muestra de 2.500 hongos: tallo grueso para su sombrero, 49 % venenosos; tallo fino, 60 %. En GeoGebra, la recta del tallo es casi igual en los dos grupos (1,83 y 1,79 mm por cm de sombrero).',
    after: 'La forma del hongo es casi la misma en venenosos y comestibles: el tallo crece igual en los dos.',
    page: 'Tallo grueso: <b>49 %</b> venenosos. Tallo fino: <b>60 %</b>. En GeoGebra, las dos rectas casi coinciden.'
  },
  {
    id: 'gemelos', at: SLEEPING[4], spread: 16, trait: 'twin', title: 'Los gemelos', place: 'el claro de los gemelos', stamp: 'NINGUNA REGLA',
    yes: 'Amanita', no: 'champiñón', nYes: 8, toxYes: 8, nNo: 8, toxNo: 0, research: [1, 0], night: true,
    nums: [['55,5 %', 'venenosos<br>en total'], ['99,8 %', 'en grupos puros<br>sumando todos los rasgos']],
    photos: { yes: { tox: ['phalloides'], ed: ['phalloides'] }, no: { tox: ['campestris'], ed: ['campestris'] } },
    enter: ['Cae la noche. El último claro: los gemelos.', 'Todos estos hongos son blancos, con anillo, del mismo tamaño. A simple vista, iguales. Pero la mitad es mortal.'],
    goal: 'El claro de los gemelos: todos parecen iguales. Descubrí cuáles son mortales.',
    h2: 'A simple vista eran iguales.<br><em>No hay una regla simple.</em>',
    small: 'Sumando muchos rasgos a la vez, el 99,8 % de los hongos de la investigación queda en grupos puros. Pero eso ya no es una regla: es identificar la especie, el trabajo de un micólogo. Ningún hongo silvestre es seguro por su aspecto.',
    after: 'Ningún hongo silvestre es seguro por su aspecto. Ante la duda, no se come.',
    page: '<i>Amanita phalloides</i> (mortal) y <i>Agaricus campestris</i> (comestible) pueden verse idénticos. Solo identificando la especie se los separa.'
  }
];
