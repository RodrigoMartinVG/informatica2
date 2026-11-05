// Los hongos del bosque. Son los mismos modelos 3D de la investigación (perfil girado 360°,
// con las medidas promedio de cada forma), escalados de milímetros a centímetros.
import * as THREE from 'three/webgpu';
import { color, uniform, uv, float } from 'three/tsl';
import { build } from '../viewer3d.js';
import { height, inClearing, rng, RING, BOUNDS } from './config.js';
import { obstacles } from './world.js';

const R = window.RESEARCH;
const ARQ = Object.fromEntries(R.arquetipos.map((a) => [a.id, a]));

// Colores de sombrero y tallo frecuentes en los datos (marrones, blancos, cremas, ocres)
const PALETTES = [
  { fill: '#8a6446', tallo: '#ece6da' }, { fill: '#e9e2d2', tallo: '#f2eee6' }, { fill: '#b98a4e', tallo: '#efe8d8' },
  { fill: '#6e4a30', tallo: '#d9cdb8' }, { fill: '#c9b48a', tallo: '#f0ebe0' }, { fill: '#9a3b25', tallo: '#efe6d6' }
];

// Plantillas: un modelo por combinación forma + colores; los ejemplares las clonan (comparten geometría y texturas)
const templates = new Map();
function template(shape, pal, ring) {
  const key = `${shape}|${pal}|${ring}`;
  if (!templates.has(key)) {
    const a = { ...ARQ[shape], ...PALETTES[pal], ring };
    const g = build(a, 64); g.scale.setScalar(0.1); // mm → cm
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    templates.set(key, { g, a });
  }
  return templates.get(key);
}

function plant(scene, { x, z, shape, pal, ring = false, scale = 1, tilt = 0, yaw = 0 }) {
  const { g, a } = template(shape, pal, ring);
  const m = g.clone(true);
  m.position.set(x, height(x, z) - 0.05, z);
  m.scale.multiplyScalar(scale);
  m.rotation.set(tilt, yaw, tilt * 0.5);
  scene.add(m);
  obstacles.push({ x, z, r: (a.grosor / 20) * scale * 1.1 });
  return { mesh: m, a, scale, x, z, top: (a.alto + a.cap * 0.4) * scale };
}

/* ---------- Hongos decorativos dispersos por el bosque ---------- */
function scatter(scene) {
  const r = rng(97), shapes = ['convexa', 'plana', 'hundida', 'campana', 'conica', 'convexa', 'plana'];
  let n = 0;
  while (n < 46) {
    const cx = BOUNDS.minX + 20 + r() * 350, cz = BOUNDS.minZ + 20 + r() * 400;
    if (inClearing(cx, cz, 1.3) || Math.hypot(cx, cz - 18) < 25) continue;
    const k = 1 + Math.floor(r() * 4), shape = shapes[Math.floor(r() * shapes.length)], pal = Math.floor(r() * PALETTES.length);
    for (let i = 0; i < k; i++) {
      const x = cx + (r() - 0.5) * 9, z = cz + (r() - 0.5) * 9;
      plant(scene, { x, z, shape, pal, scale: 0.6 + r() * 0.9, tilt: (r() - 0.5) * 0.25, yaw: r() * 6 });
    }
    n++;
  }
}

/* ---------- Claro del anillo: 13 hongos con anillo y 13 sin anillo ---------- */
// Proporciones de la investigación: con anillo 61 % venenosos (8 de 13), sin anillo 54 % (7 de 13)
function ringClearing(scene) {
  const r = rng(113), specimens = [];
  const groups = [
    { side: 'con', cx: RING.x - 19, cz: RING.z, tox: 8, shapes: ['convexa', 'plana', 'esferica', 'campana', 'convexa'] },
    { side: 'sin', cx: RING.x + 19, cz: RING.z, tox: 7, shapes: ['convexa', 'plana', 'hundida', 'campana', 'conica'] }
  ];
  for (const gr of groups) {
    const pts = [];
    while (pts.length < 13) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 15;
      const x = gr.cx + Math.cos(a) * d, z = gr.cz + Math.sin(a) * d * 1.25;
      if (pts.every((p) => Math.hypot(p[0] - x, p[1] - z) > 5.2)) pts.push([x, z]);
    }
    const toxic = new Set(); while (toxic.size < gr.tox) toxic.add(Math.floor(r() * 13));
    pts.forEach(([x, z], i) => {
      const shape = gr.shapes[i % gr.shapes.length];
      const s = plant(scene, { x, z, shape, pal: Math.floor(r() * 5), ring: gr.side === 'con', scale: 0.85 + r() * 0.45, tilt: (r() - 0.5) * 0.12, yaw: r() * 6 });
      s.side = gr.side; s.toxic = toxic.has(i); s.found = false; s.glow = 0;
      // Halo en la base: se enciende al investigarlo (naranja = venenoso, azul = comestible)
      const k = uniform(0);
      const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      mat.colorNode = color(s.toxic ? '#ff6a2a' : '#3f93ff').mul(k.mul(6));
      mat.opacityNode = k;
      const halo = new THREE.Mesh(new THREE.TorusGeometry(1, 0.16, 10, 48), mat);
      halo.rotation.x = Math.PI / 2; halo.position.set(x, height(x, z) + 0.2, z);
      const rad = (s.a.grosor / 20) * s.scale + 1.2;
      halo.scale.setScalar(rad);
      scene.add(halo); s.haloK = k; s.halo = halo;
      // Columna de luz que sube desde la base (se ve de lejos)
      const beam = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      beam.colorNode = color(s.toxic ? '#ff6a2a' : '#3d8dff').mul(3.2);
      beam.opacityNode = float(1).sub(uv().y).pow(2).mul(k).mul(0.7);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.9, rad, s.top + 14, 32, 1, true), beam);
      col.position.set(x, height(x, z) + (s.top + 14) / 2, z); scene.add(col);
      // El sombrero también se tiñe apenas
      const cap = s.mesh.children[1]; cap.material = cap.material.clone(); s.capMat = cap.material; // [tallo, sombrero, láminas, anillo]
      specimens.push(s);
    });
  }
  // Una hilera de piedritas separa los dos grupos
  const peb = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#8d8478', roughness: 0.9 }));
  for (let i = 0; i < 16; i++) {
    const z = RING.z - 24 + i * 3.2, x = RING.x + Math.sin(i * 1.7) * 0.8, p = peb.clone();
    p.position.set(x, height(x, z) + 0.3, z); p.scale.set(0.9 + (i % 3) * 0.2, 0.6, 0.9); p.castShadow = true; scene.add(p);
  }
  return specimens;
}

export function buildFlora(scene) {
  scatter(scene);
  const specimens = ringClearing(scene);
  const tox = new THREE.Color('#ff5a1f'), ed = new THREE.Color('#2f7dff');
  return {
    specimens,
    // El hongo sin investigar más cercano a la cabeza del escarabajo
    nearest(p, maxD = 3.2) {
      let best = null, bd = Infinity;
      for (const s of specimens) {
        if (s.found) continue;
        const d = Math.hypot(p.x - s.x, p.z - s.z) - (s.a.grosor / 20) * s.scale;
        if (d < maxD && d < bd) { bd = d; best = s; }
      }
      return best;
    },
    reveal(s) { s.found = true; s.target = 1; },
    update(dt, t) {
      for (const s of specimens) {
        if (!s.found) continue;
        s.glow += (1 - s.glow) * Math.min(1, dt * 2.5);
        const pulse = 0.8 + 0.2 * Math.sin(t * 2.4 + s.x);
        s.haloK.value = s.glow * pulse;
        s.halo.rotation.z = t * 0.4;
        if (s.capMat) { s.capMat.emissive = s.toxic ? tox : ed; s.capMat.emissiveIntensity = s.glow * 0.45 * pulse; }
      }
    }
  };
}
