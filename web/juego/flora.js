// Los hongos del bosque. Cada uno es una especie real (la de la foto) con las medidas de una fila real del Excel:
// diámetro del sombrero, alto y ancho del tallo, forma y color (ver hongos3d.js).
// Cada hongo sabe su propia forma: el escarabajo puede trepar el tallo y caminar sobre el sombrero.
import * as THREE from 'three/webgpu';
import { color, uniform } from 'three/tsl';
import { height, inClearing, rng, BOUNDS, LEVELS, SPAWN } from './config.js';
import { obstacles, logs } from './world.js';
import { buildMushroom, pickRow, LOOKS } from './hongos3d.js';
import { planted } from './disenos.js';

const R = window.RESEARCH;

// "Visión de antenas": mantener V resalta lo que ya conocés
export const vision = uniform(0);
const BRUISE = new THREE.Color('#4f6fae'); // el azul de la magulladura

let yawSeed = rng(5), buildSeed = 1;
// species: especie (foto) · look: aspecto 3D (casi siempre la misma especie) · row: fila del Excel · base: altura donde crece
function plant(scene, list, { x, z, species, look = species, row, toxic, base = height(x, z) - 0.05, quality, rot = 0 }) {
  const b = buildMushroom(look, row, buildSeed++, { segs: quality === 'alta' ? 48 : 32, rot });
  const mesh = b.group;
  mesh.position.set(x, base, z); mesh.rotation.y = yawSeed() * 6;
  scene.add(mesh);
  const m = {
    mesh, x, z, base, toxic, species, row, colorName: b.colorName, look: typeof look === 'string' ? LOOKS[look] : look,
    age: b.age, flaws: b.flaws, rot: b.rot, level: null, yes: false, traitKnown: false, known: false, eaten: false, glow: 0, bruise: 0,
    ...b.climb
  };
  // Si está torcido (o es de los que crecen inclinados), el tallo se corre: cuánto por cada cm de altura, y dónde queda el sombrero
  mesh.updateMatrix(); const ax = new THREE.Vector3(0, 1, 0).applyQuaternion(mesh.quaternion);
  m.tx = ax.x / ax.y; m.tz = ax.z / ax.y; m.cx = x + m.tx * m.climbTop; m.cz = z + m.tz * m.climbTop;
  list.push(m);
  return m;
}

// Especies reales para los hongos sueltos del bosque
const DECOR = { tox: ['phalloides', 'muscaria', 'conica', 'russula'], ed: ['campestris', 'procera', 'cantharellus', 'edulis', 'gibba', 'suillus', 'coprinus', 'lactarius', 'lycoperdon'] };
const pickDecor = (toxic, r = Math.random) => { const p = DECOR[toxic ? 'tox' : 'ed']; return p[Math.floor(r() * p.length)]; };

// Algunos hongos ya están pasados o muertos (podridos): ~1 de cada 6
const rotFor = (r) => { const v = r(); return v < 0.07 ? 2 : v < 0.17 ? 1 : 0; };

/* ---------- Hongos dispersos por el bosque (también se pueden comer) ---------- */
function scatter(scene, list, quality) {
  const r = rng(97), centers = [];
  let n = 0;
  while (n < 40) {
    const cx = BOUNDS.minX + 20 + r() * 350, cz = BOUNDS.minZ + 20 + r() * 400;
    if (inClearing(cx, cz, 1.3) || Math.hypot(cx, cz - 18) < 25) continue;
    // un grupito chico de la misma especie, como crecen de verdad; el grupo vecino casi siempre es del otro tipo
    let near = null, nd = Infinity;
    for (const c of centers) { const d = Math.hypot(c.x - cx, c.z - cz); if (d < nd) { nd = d; near = c; } }
    const toxic = near && nd < 70 ? (r() < 0.75 ? !near.toxic : near.toxic) : r() < R.stats.toxicos;
    let species = pickDecor(toxic, r); if (near && near.species === species) species = pickDecor(toxic, r);
    centers.push({ x: cx, z: cz, toxic, species });
    const k = 1 + Math.floor(r() * 2), placed = [];
    for (let i = 0; i < k; i++) {
      const x = cx + (r() - 0.5) * 14, z = cz + (r() - 0.5) * 14;
      if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 6)) continue;
      if (obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 4)) continue; // no adentro de un tronco
      if (logs.some((l) => Math.abs((x - l.x) * l.az - (z - l.z) * l.ax) < l.rad + 3 && Math.abs((x - l.x) * l.ax + (z - l.z) * l.az) < l.len / 2 + 3)) continue;
      placed.push([x, z]);
      plant(scene, list, { x, z, species, toxic, row: pickRow(r, LOOKS[species], { tox: toxic }), quality, rot: rotFor(r) });
    }
    n++;
  }
  // Sobre los troncos caídos crecen los de la madera, en racimos: la gírgola (se come) y, de los que no,
  // Galerina (mortal), Mycena e Hypholoma. En cada tronco, un racimo de cada tipo.
  const WOOD = { tox: ['galerina', 'mycena', 'hypholoma'], ed: ['pleurotus'] };
  for (const [li, l] of logs.entries()) {
    const groups = 1 + Math.floor(r() * 2);
    for (let gi = 0; gi < groups; gi++) {
      const toxic = (gi + li) % 2 === 0, pool = WOOD[toxic ? 'tox' : 'ed'], species = pool[Math.floor(r() * pool.length)], t0 = (gi ? 0.25 : -0.25) * l.len + (r() - 0.5) * l.len * 0.3, k = 2 + Math.floor(r() * 3);
      for (let i = 0; i < k; i++) {
        const t = t0 + (r() - 0.5) * 6, side = (r() - 0.5) * 1.2; // cerca de la línea de arriba del tronco
        const x = l.x + l.ax * t - l.az * side, z = l.z + l.az * t + l.ax * side;
        const base = l.cy + Math.sqrt(Math.max(0, l.rad * l.rad - side * side)) - 0.1;
        const m = plant(scene, list, { x, z, base, species, toxic, row: pickRow(r, LOOKS[species], { tox: toxic }), quality, rot: rotFor(r) });
        m.wood = true;
      }
    }
  }
}

/* ---------- Claros de los niveles: los dos grupos crecen mezclados ---------- */
// Proporciones de la investigación (ver LEVELS en config.js), con los hongos entremezclados
function levelClearing(scene, list, L, seed, quality) {
  const r = rng(seed), n = L.nYes + L.nNo, pts = [], c = L.at;
  // separados lo más posible, pero tienen que entrar todos (las proporciones del claro son las de los datos)
  let gap = L.trait === 'size' ? 9 : 7, guard = 0;
  while (pts.length < n) {
    if (++guard % 3000 === 0) gap *= 0.92;
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * L.spread;
    const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
    if (pts.every((p) => Math.hypot(p[0] - x, p[1] - z) > gap)) pts.push([x, z]);
  }
  // Quiénes crecen en el claro: cada grupo con su cantidad de venenosos (proporciones de los datos),
  // y las especies de cada grupo y toxicidad repartidas parejo (no siempre la primera de la lista)
  const items = [], used = {};
  for (const yes of [true, false]) {
    const n = yes ? L.nYes : L.nNo, tox = yes ? L.toxYes : L.toxNo;
    for (let k = 0; k < n; k++) {
      const toxic = k < tox, key = `${yes}|${toxic}`, pool = L.photos[yes ? 'yes' : 'no'][toxic ? 'tox' : 'ed'];
      used[key] = (used[key] ?? Math.floor(r() * pool.length)) + 1;
      items.push({ yes, toxic, species: pool[used[key] % pool.length] });
    }
  }
  // Dónde crece cada uno: mezclados de verdad. Se reparte al azar y después se intercambian lugares
  // mientras baje la "rareza": vecinos de la misma especie, o todos venenosos (o todos comestibles) juntos.
  const near = pts.map((p, i) => pts.map((q, j) => (i !== j && Math.hypot(p[0] - q[0], p[1] - q[1]) < gap * 2.2 ? j : -1)).filter((j) => j >= 0));
  const at = items.map((_, i) => i); for (let i = at.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [at[i], at[j]] = [at[j], at[i]]; }
  const cost = (i) => { const a = items[at[i]]; let c = 0; for (const j of near[i] || []) { const b = items[at[j]]; c += (a.species === b.species ? 2 : 0) + (a.toxic === b.toxic ? 1 : 0) + (a.yes === b.yes ? 0.4 : 0); } return c; };
  for (let it = 0; it < 4000; it++) {
    const i = Math.floor(r() * at.length), j = Math.floor(r() * at.length); if (i === j) continue;
    const before = cost(i) + cost(j); [at[i], at[j]] = [at[j], at[i]];
    if (cost(i) + cost(j) > before) [at[i], at[j]] = [at[j], at[i]];
  }
  pts.forEach(([x, z], i) => {
    const { yes, toxic, species } = items[at[i]];
    const look = L.trait === 'twin' ? 'gemelo' : species; // los gemelos se ven iguales
    const row = pickRow(r, LOOKS[look], { tox: toxic, trait: L.trait, yes });
    const m = plant(scene, list, { x, z, species, look, row, toxic, quality });
    m.level = L.id; m.trait = L.trait; m.yes = yes;
    m.traitKnown = L.trait !== 'bruise' && L.trait !== 'twin'; // la mancha hay que provocarla; los gemelos, olfatearlos
  });
  // En el borde del claro, unos pocos ya podridos: no cuentan para el mito (no cambian las proporciones de los datos)
  for (let i = 0; i < 3; i++) {
    const a = r() * Math.PI * 2, d = L.spread + 5 + r() * 6, x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
    if (obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 4)) continue;
    const toxic = r() < 0.5, pool = L.photos[r() < 0.5 ? 'yes' : 'no'][toxic ? 'tox' : 'ed'], species = pool[Math.floor(r() * pool.length)];
    plant(scene, list, { x, z, species, look: L.trait === 'twin' ? 'gemelo' : species, toxic, row: pickRow(r, LOOKS[species], { tox: toxic }), quality, rot: 1 + (i % 2) });
  }
}

// Rocío: gotitas sobre los sombreros que destellan con el sol
function dew(scene, all) {
  const r = rng(131), drops = [];
  for (const m of all) {
    const n = 3 + Math.floor(r() * 7);
    for (let i = 0; i < n; i++) {
      const rr = Math.sqrt(r()) * m.Rw * 0.8, a = r() * Math.PI * 2, s = 0.035 + r() * 0.06;
      drops.push([m.x + Math.cos(a) * rr, m.base + m.capY(rr) + s * 0.45, m.z + Math.sin(a) * rr, s]);
    }
  }
  const mat = new THREE.MeshPhysicalMaterial({ color: '#bcd6e8', roughness: 0, metalness: 0, clearcoat: 1, envMapIntensity: 1.4, transparent: true, opacity: 0.32, depthWrite: false });
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), mat, drops.length);
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), v = new THREE.Vector3();
  drops.forEach(([x, y, z, s], i) => { sc.set(s, s * 0.7, s); v.set(x, y, z); mx.compose(v, q, sc); mesh.setMatrixAt(i, mx); });
  scene.add(mesh);
}

/* ---------- El jardín del taller: los hongos diseñados en taller.html, cerca del punto de partida ---------- */
function garden(scene, list, quality) {
  const designs = planted(); if (!designs.length) return;
  const r = rng(401), n = designs.length;
  designs.forEach((d, i) => {
    // repartidos alrededor del inicio, sin tapar el camino de esporas (que sale hacia −z)
    const a = -Math.PI / 2 + 0.8 + ((i + 0.25) / n) * (Math.PI * 2 - 1.6), rad = 18 + (i % 2) * 6;
    const cx = SPAWN.x + Math.cos(a) * rad, cz = SPAWN.z + Math.sin(a) * rad;
    for (let k = 0; k < 3; k++) {
      const x = cx + (r() - 0.5) * 8, z = cz + (r() - 0.5) * 8;
      const m = plant(scene, list, { x, z, species: 'taller', look: d.look, toxic: !!d.tox, row: pickRow(r, d.look, { tox: !!d.tox }), quality });
      m.design = d.name;
    }
  });
}

/* ---------- Bejinales: grupitos de bejines (pedos de lobo), que para un escarabajo son trampolines ---------- */
function puffballs(scene, list, quality) {
  const r = rng(271), spots = [{ x: SPAWN.x + 6, z: SPAWN.z - 9 }]; // el primero, justo adelante de donde empezás
  // al pie de algunos árboles (rebotando se llega más alto) y sueltos por el bosque
  for (const o of obstacles.filter((o) => o.climb).slice(0, 4)) { const a = r() * 6.28; spots.push({ x: o.x + Math.cos(a) * (o.r + 7), z: o.z + Math.sin(a) * (o.r + 7) }); }
  for (let tries = 0; spots.length < 12 && tries < 200; tries++) {
    const x = BOUNDS.minX + 20 + r() * 350, z = BOUNDS.minZ + 20 + r() * 400;
    if (!inClearing(x, z, 1.2) && !spots.some((p) => Math.hypot(p.x - x, p.z - z) < 30)) spots.push({ x, z });
  }
  for (const [si, sp] of spots.entries()) {
    const k = si === 0 ? 3 : 2 + Math.floor(r() * 3), placed = [];
    for (let i = 0, tries = 0; i < k && tries < 30; tries++) {
      const x = sp.x + (r() - 0.5) * 9, z = sp.z + (r() - 0.5) * 9;
      if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 4.5)) continue;
      if (obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 3) || list.some((m) => Math.hypot(m.x - x, m.z - z) < m.Rw + 3)) continue;
      // de las filas del Excel que le quedan a un bejín, la más grande de unas pocas (así se ve y se pisa)
      let row = pickRow(r, LOOKS.lycoperdon, { tox: false });
      for (let j = 0; j < 3; j++) { const o = pickRow(r, LOOKS.lycoperdon, { tox: false }); if (o.d > row.d) row = o; }
      placed.push([x, z]); i++;
      plant(scene, list, { x, z, species: 'lycoperdon', toxic: false, row, quality });
    }
  }
}

export function buildFlora(scene, { quality = 'baja' } = {}) {
  const all = [];
  scatter(scene, all, quality);
  puffballs(scene, all, quality);
  try { garden(scene, all, quality); } catch (e) { console.warn('Diseños del taller:', e); }
  LEVELS.forEach((L, i) => levelClearing(scene, all, L, 113 + i * 17, quality));
  dew(scene, all);

  // Marca discreta en la base (se crea recién cuando conocés el hongo)
  function mark(m) {
    if (m.halo) return;
    const k = uniform(0);
    const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    mat.colorNode = color(m.toxic ? '#ff6a2a' : '#3f93ff').mul(k.mul(vision.mul(3).add(1.1)));
    mat.opacityNode = k.mul(vision.mul(0.4).add(0.55));
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 8, 48), mat);
    halo.rotation.x = Math.PI / 2; halo.position.set(m.x, m.base + 0.2, m.z);
    halo.scale.setScalar(m.stemR(0.2) + 0.9);
    scene.add(halo); m.halo = halo; m.haloK = k;
    const cap = m.mesh.children[1], base = cap.material;
    m.tintK = uniform(0);
    // Copia del material para teñirla; clone() de los materiales de nodos pierde la textura, así que se copia a mano
    const capCopy = base.clone();
    Object.assign(capCopy, { map: base.map, bumpMap: base.bumpMap, bumpScale: base.bumpScale, roughness: base.roughness, side: base.side });
    capCopy.color.copy(base.color);
    cap.material = capCopy;
    cap.material.emissiveNode = base.userData.scatter.add(color(m.toxic ? '#ff5a1f' : '#2f7dff').mul(m.tintK)); // translucidez + tinte de lo que sabés
    m.capMat = cap.material;
  }

  return {
    all,
    specimens: all.filter((m) => m.level),
    // El hongo más cercano a un punto (o el que está bajo el escarabajo, si está trepado)
    nearest(p, on, maxD = 2.6) {
      if (on) return on;
      let best = null, bd = Infinity;
      for (const m of all) {
        if (Math.abs(p.x - m.x) > 10 || Math.abs(p.z - m.z) > 10) continue;
        const d = Math.hypot(p.x - m.x, p.z - m.z) - m.stemR(0.4);
        if (d < maxD && d < bd) { bd = d; best = m; }
      }
      return best;
    },
    // Cambiar un hongo suelto al otro tipo (para que no salgan tres iguales seguidos)
    reveal(m) { m.known = true; if (m.trait === 'twin') m.traitKnown = true; mark(m); },
    // Empujar un tallo: si es de los que se manchan, se pone azul de a poco
    touch(m) {
      if (m.traitKnown) return false;
      m.traitKnown = true;
      if (m.yes) { const st = m.mesh.children[0]; st.material = st.material.clone(); m.stemMat = st.material; m.bruiseFrom = st.material.color.clone(); }
      return true;
    },
    eat(m) {
      m.eaten = true; m.known = true; if (m.trait === 'twin') m.traitKnown = true; mark(m);
      m.capMat.color = m.capMat.color.clone().multiplyScalar(0.82); // queda mordido (un poco más oscuro, sin perder sus rasgos)
    },
    // Un bejín pisado se aplasta y vuelve (k: qué tan fuerte)
    squash(m, k = 1) { m.squash = Math.min(1, Math.max(m.squash || 0, k)); m.squashT = 0; },
    update(dt, t) {
      for (const m of all) {
        if (m.squash) {
          m.squashT += dt; const w = m.squash * Math.exp(-m.squashT * 6) * Math.cos(m.squashT * 22);
          m.mesh.scale.set(1 + w * 0.22, 1 - w * 0.32, 1 + w * 0.22);
          if (m.squashT > 1) { m.squash = 0; m.mesh.scale.set(1, 1, 1); }
        }
        if (m.stemMat && m.bruise < 1) { m.bruise = Math.min(1, m.bruise + dt * 0.8); m.stemMat.color.copy(m.bruiseFrom).lerp(BRUISE, m.bruise * 0.75); }
        if (!m.halo) continue;
        m.glow += (1 - m.glow) * Math.min(1, dt * 2.5);
        const pulse = 0.85 + 0.15 * Math.sin(t * 2.4 + m.x);
        m.haloK.value = m.glow * pulse;
        m.halo.rotation.z = t * 0.4;
        m.tintK.value = m.glow * (0.05 + vision.value * 0.4) * pulse;
      }
    }
  };
}
