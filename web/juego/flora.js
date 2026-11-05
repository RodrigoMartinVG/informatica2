// Los hongos del bosque. Son los mismos modelos 3D de la investigación (perfil girado 360°,
// con las medidas promedio de cada forma), escalados de milímetros a centímetros.
// Cada hongo sabe su propia forma: el escarabajo puede trepar el tallo y caminar sobre el sombrero.
import * as THREE from 'three/webgpu';
import { color, uniform } from 'three/tsl';
import { build } from '../viewer3d.js';
import { profile } from '../profiles.js';
import { height, inClearing, rng, BOUNDS, LEVELS } from './config.js';
import { obstacles } from './world.js';
import { translucent } from './look.js';

const R = window.RESEARCH;
const ARQ = Object.fromEntries(R.arquetipos.map((a) => [a.id, a]));

const PALETTES = [
  { fill: '#8a6446', tallo: '#ece6da' }, { fill: '#e9e2d2', tallo: '#f2eee6' }, { fill: '#b98a4e', tallo: '#efe8d8' },
  { fill: '#6e4a30', tallo: '#d9cdb8' }, { fill: '#c9b48a', tallo: '#f0ebe0' }, { fill: '#9a3b25', tallo: '#efe6d6' }
];

// "Visión de antenas": mantener V resalta lo que ya conocés
export const vision = uniform(0);
const BRUISE = new THREE.Color('#4f6fae'); // el azul de la magulladura

const templates = new Map();
// pal: índice de PALETTES o un objeto { fill, tallo }; gk: factor de grosor del tallo
function template(shape, pal, ring, gk = 1) {
  const key = `${shape}|${JSON.stringify(pal)}|${ring}|${gk}`;
  if (!templates.has(key)) {
    const colors = typeof pal === 'number' ? PALETTES[pal] : pal;
    const a = { ...ARQ[shape], ...colors, ring, grosor: ARQ[shape].grosor * gk };
    const g = build(a, 64); g.scale.setScalar(0.1); // mm → cm
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // [tallo, sombrero, láminas, anillo]: sombrero y láminas translúcidos; tallo más mate y cálido
    const [stem, cap, gills] = g.children;
    cap.material = translucent(cap.material, '#ffb470', 1.2);
    gills.material = translucent(gills.material, '#ffc58a', 0.9);
    stem.material = stem.material.clone(); stem.material.color = new THREE.Color('#e3d3b8'); stem.material.roughness = 0.92;
    if (g.children[3]) g.children[3].material = stem.material;
    templates.set(key, { g, a, p: profile(a) });
  }
  return templates.get(key);
}

// Interpolación lineal en una lista de pares [x, y] ordenada por x
function lerpTable(tab, x) {
  if (x <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (x <= tab[i][0]) { const [x0, y0] = tab[i - 1], [x1, y1] = tab[i]; return y0 + (y1 - y0) * ((x - x0) / (x1 - x0 || 1)); }
  return tab[tab.length - 1][1];
}

let yawSeed = rng(5);
function plant(scene, list, { x, z, shape, pal, ring = false, scale = 1, toxic, gk = 1 }) {
  const { g, a, p } = template(shape, pal, ring, gk), k = 0.1 * scale;
  const mesh = g.clone(true);
  const base = height(x, z) - 0.05;
  mesh.position.set(x, base, z); mesh.scale.multiplyScalar(scale); mesh.rotation.y = yawSeed() * 6;
  scene.add(mesh);
  // Geometría para trepar: radio del tallo según la altura, y altura del sombrero según el radio
  const stem = p.stem.map(([r, y]) => [y * k, r * k]);                 // [altura, radio]
  const top = []; let maxR = -1;
  for (const [r, y] of p.capTop) { if (r <= maxR) break; maxR = r; top.push([r * k, y * k]); } // [radio, altura]
  const under = p.capUnder[p.capUnder.length - 1][1] * k;
  const m = {
    mesh, a, x, z, base, scale, toxic, level: null, yes: false, traitKnown: false, known: false, eaten: false, glow: 0, bruise: 0,
    stemR: (h) => lerpTable(stem, h), capY: (r) => lerpTable(top, r), Rw: maxR * k,
    climbTop: Math.min(under, a.alto * scale) - 0.2, top: Math.max(...top.map((t) => t[1]))
  };
  list.push(m);
  return m;
}

// Especies reales para los hongos sueltos del bosque
const DECOR = { tox: ['phalloides', 'galerina', 'muscaria', 'conica', 'mycena'], ed: ['campestris', 'procera', 'cantharellus', 'edulis', 'gibba'] };
const pickDecor = (toxic, r = Math.random) => { const p = DECOR[toxic ? 'tox' : 'ed']; return p[Math.floor(r() * p.length)]; };

/* ---------- Hongos dispersos por el bosque (también se pueden comer) ---------- */
function scatter(scene, list) {
  const r = rng(97), shapes = ['convexa', 'plana', 'hundida', 'campana', 'conica', 'convexa', 'plana'];
  let n = 0;
  while (n < 46) {
    const cx = BOUNDS.minX + 20 + r() * 350, cz = BOUNDS.minZ + 20 + r() * 400;
    if (inClearing(cx, cz, 1.3) || Math.hypot(cx, cz - 18) < 25) continue;
    const k = 1 + Math.floor(r() * 4), shape = shapes[Math.floor(r() * shapes.length)], pal = Math.floor(r() * PALETTES.length);
    const placed = [];
    for (let i = 0; i < k; i++) {
      const x = cx + (r() - 0.5) * 12, z = cz + (r() - 0.5) * 12;
      if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 5)) continue;
      if (obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 4)) continue; // no adentro de un tronco
      placed.push([x, z]);
      const toxic = r() < R.stats.toxicos, m = plant(scene, list, { x, z, shape, pal, scale: 0.6 + r() * 0.9, toxic });
      m.species = pickDecor(toxic, r);
    }
    n++;
  }
}

/* ---------- Claros de los niveles: los dos grupos crecen mezclados ---------- */
// Proporciones de la investigación (ver LEVELS en config.js), con los hongos entremezclados
// Colores llamativos y comunes (claro de los colores)
const VIVID = ['#b8352a', '#d9782a', '#6f8a3a', '#c8708a', '#7a4a7a', '#d4b13a'];
const COMMON = ['#ebe4d4', '#8a6446', '#9a948c', '#d9c9a3', '#6e4a30'];

function levelClearing(scene, list, L, seed) {
  const r = rng(seed), n = L.nYes + L.nNo, pts = [], c = L.at;
  const gap = L.trait === 'size' ? 7 : 5.2;
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
  const ALL = ['convexa', 'plana', 'hundida', 'campana', 'conica'];
  pts.forEach(([x, z], i) => {
    const yes = groups[i], k = yes ? iy++ : ino++, toxic = yes ? toxYes.has(k) : toxNo.has(k);
    const o = { x, z, shape: ALL[Math.floor(r() * ALL.length)], pal: Math.floor(r() * 5), scale: 0.85 + r() * 0.45, toxic };
    if (L.trait === 'ring') { o.ring = yes; o.shape = yes ? ['convexa', 'plana', 'esferica', 'campana'][Math.floor(r() * 4)] : o.shape; }
    if (L.trait === 'color') { const list = yes ? VIVID : COMMON; o.pal = { fill: list[Math.floor(r() * list.length)], tallo: '#efe8d8' }; }
    if (L.trait === 'size') o.scale = yes ? 0.42 + r() * 0.16 : 1.55 + r() * 0.45;     // ~3 cm contra ~11 cm de sombrero
    if (L.trait === 'stem') { o.gk = yes ? 1.8 : 0.5; o.shape = ['convexa', 'plana', 'hundida'][Math.floor(r() * 3)]; }
    if (L.trait === 'twin') { o.shape = 'convexa'; o.pal = { fill: '#ece5d6', tallo: '#f2eee6' }; o.ring = true; o.scale = 1.05 + r() * 0.08; }
    const m = plant(scene, list, o);
    m.level = L.id; m.trait = L.trait; m.yes = yes;
    m.traitKnown = L.trait !== 'bruise' && L.trait !== 'twin'; // la mancha hay que provocarla; los gemelos, olfatearlos
    const pool = L.photos[yes ? 'yes' : 'no'][toxic ? 'tox' : 'ed'];
    m.species = pool[k % pool.length];
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

export function buildFlora(scene) {
  const all = [];
  scatter(scene, all);
  LEVELS.forEach((L, i) => levelClearing(scene, all, L, 113 + i * 17));
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
    cap.material = base.clone();
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
    flipDecor(m) { m.toxic = !m.toxic; m.species = pickDecor(m.toxic); },
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
      m.capMat.color = m.capMat.color.clone().multiplyScalar(0.7); // queda mordido (más oscuro)
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
