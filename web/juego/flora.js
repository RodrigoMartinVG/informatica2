// Los hongos del bosque. Cada uno es una especie real (la de la foto) con las medidas de una fila real del Excel:
// diámetro del sombrero, alto y ancho del tallo, forma y color (ver hongos3d.js).
// Cada hongo sabe su propia forma: el escarabajo puede trepar el tallo y caminar sobre el sombrero.
import * as THREE from 'three/webgpu';
import { color, uniform } from 'three/tsl';
import { height, inClearing, rng, BOUNDS, LEVELS } from './config.js';
import { obstacles, logs } from './world.js';
import { buildMushroom, pickRow, LOOKS } from './hongos3d.js';

const R = window.RESEARCH;

// "Visión de antenas": mantener V resalta lo que ya conocés
export const vision = uniform(0);
const BRUISE = new THREE.Color('#4f6fae'); // el azul de la magulladura

let yawSeed = rng(5), buildSeed = 1;
// species: especie (foto) · look: aspecto 3D (casi siempre la misma especie) · row: fila del Excel · base: altura donde crece
function plant(scene, list, { x, z, species, look = species, row, toxic, base = height(x, z) - 0.05, quality }) {
  const b = buildMushroom(look, row, buildSeed++, { segs: quality === 'alta' ? 48 : 32 });
  const mesh = b.group;
  mesh.position.set(x, base, z); mesh.rotation.y = yawSeed() * 6;
  scene.add(mesh);
  const m = {
    mesh, x, z, base, toxic, species, row, colorName: b.colorName, look: LOOKS[look],
    level: null, yes: false, traitKnown: false, known: false, eaten: false, glow: 0, bruise: 0,
    ...b.climb
  };
  list.push(m);
  return m;
}

// Especies reales para los hongos sueltos del bosque
const DECOR = { tox: ['phalloides', 'galerina', 'muscaria', 'conica', 'mycena'], ed: ['campestris', 'procera', 'cantharellus', 'edulis', 'gibba'] };
const pickDecor = (toxic, r = Math.random) => { const p = DECOR[toxic ? 'tox' : 'ed']; return p[Math.floor(r() * p.length)]; };

/* ---------- Hongos dispersos por el bosque (también se pueden comer) ---------- */
function scatter(scene, list, quality) {
  const r = rng(97);
  let n = 0;
  while (n < 40) {
    const cx = BOUNDS.minX + 20 + r() * 350, cz = BOUNDS.minZ + 20 + r() * 400;
    if (inClearing(cx, cz, 1.3) || Math.hypot(cx, cz - 18) < 25) continue;
    // un grupito de la misma especie, como crecen de verdad
    const toxic = r() < R.stats.toxicos, species = pickDecor(toxic, r), k = 1 + Math.floor(r() * 4), placed = [];
    for (let i = 0; i < k; i++) {
      const x = cx + (r() - 0.5) * 14, z = cz + (r() - 0.5) * 14;
      if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 6)) continue;
      if (obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 4)) continue; // no adentro de un tronco
      if (logs.some((l) => Math.abs((x - l.x) * l.az - (z - l.z) * l.ax) < l.rad + 3 && Math.abs((x - l.x) * l.ax + (z - l.z) * l.az) < l.len / 2 + 3)) continue;
      placed.push([x, z]);
      plant(scene, list, { x, z, species, toxic, row: pickRow(r, LOOKS[species], { tox: toxic }), quality });
    }
    n++;
  }
  // Sobre los troncos caídos crecen los de la madera: Galerina (mortal) y Mycena, en racimos
  for (const l of logs) {
    const groups = 2 + Math.floor(r() * 2);
    for (let gi = 0; gi < groups; gi++) {
      const species = r() < 0.5 ? 'galerina' : 'mycena', t0 = (r() - 0.5) * l.len * 0.7, k = 3 + Math.floor(r() * 3);
      for (let i = 0; i < k; i++) {
        const t = t0 + (r() - 0.5) * 6, side = (r() - 0.5) * 1.2; // cerca de la línea de arriba del tronco
        const x = l.x + l.ax * t - l.az * side, z = l.z + l.az * t + l.ax * side;
        const base = l.cy + Math.sqrt(Math.max(0, l.rad * l.rad - side * side)) - 0.1;
        const m = plant(scene, list, { x, z, base, species, toxic: true, row: pickRow(r, LOOKS[species], { tox: true }), quality });
        m.wood = true;
      }
    }
  }
}

/* ---------- Claros de los niveles: los dos grupos crecen mezclados ---------- */
// Proporciones de la investigación (ver LEVELS en config.js), con los hongos entremezclados
function levelClearing(scene, list, L, seed, quality) {
  const r = rng(seed), n = L.nYes + L.nNo, pts = [], c = L.at;
  const gap = L.trait === 'size' ? 9 : 7;
  let guard = 0;
  while (pts.length < n && guard++ < 8000) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * L.spread;
    const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
    if (pts.every((p) => Math.hypot(p[0] - x, p[1] - z) > gap)) pts.push([x, z]);
  }
  // Mezclar: qué lugar le toca a cada grupo
  const groups = Array.from({ length: pts.length }, (_, i) => i < L.nYes);
  for (let i = groups.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [groups[i], groups[j]] = [groups[j], groups[i]]; }
  const pick = (count, tox) => { const s = new Set(); while (s.size < tox) s.add(Math.floor(r() * count)); return s; };
  const toxYes = pick(L.nYes, L.toxYes), toxNo = pick(L.nNo, L.toxNo);
  let iy = 0, ino = 0;
  pts.forEach(([x, z], i) => {
    const yes = groups[i], k = yes ? iy++ : ino++, toxic = yes ? toxYes.has(k) : toxNo.has(k);
    const pool = L.photos[yes ? 'yes' : 'no'][toxic ? 'tox' : 'ed'], species = pool[k % pool.length];
    const look = L.trait === 'twin' ? 'gemelo' : species; // los gemelos se ven iguales
    const row = pickRow(r, LOOKS[look], { tox: toxic, trait: L.trait, yes });
    const m = plant(scene, list, { x, z, species, look, row, toxic, quality });
    m.level = L.id; m.trait = L.trait; m.yes = yes;
    m.traitKnown = L.trait !== 'bruise' && L.trait !== 'twin'; // la mancha hay que provocarla; los gemelos, olfatearlos
  });
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

export function buildFlora(scene, { quality = 'baja' } = {}) {
  const all = [];
  scatter(scene, all, quality);
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
    update(dt, t) {
      for (const m of all) {
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
