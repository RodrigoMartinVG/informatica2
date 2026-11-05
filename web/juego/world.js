// El suelo del bosque a escala de insecto: terreno, musgo y pasto con viento, hojas caídas,
// piedras, ramitas, troncos gigantes, rayos de sol y polvo flotando en el aire.
import * as THREE from 'three/webgpu';
import { positionLocal, time, sin, vec3, uv, mix, color, float, hash, instanceIndex, cos } from 'three/tsl';
import { height, inClearing, nearPath, rng, BOUNDS, RING, SLEEPING, TRAIL } from './config.js';

const W = BOUNDS.maxX - BOUNDS.minX + 140, D = BOUNDS.maxZ - BOUNDS.minZ + 140;
const CX = (BOUNDS.maxX + BOUNDS.minX) / 2, CZ = (BOUNDS.maxZ + BOUNDS.minZ) / 2;

export const obstacles = []; // círculos {x, z, r} que el escarabajo no puede atravesar

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

/* ---------- Terreno ---------- */
function ground(scene) {
  const geo = new THREE.PlaneGeometry(W, D, 260, 280);
  geo.rotateX(-Math.PI / 2); geo.translate(CX, 0, CZ);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const moss = new THREE.Color('#56702e'), dirt = new THREE.Color('#7a5634'), dark = new THREE.Color('#3a2c1c'), lit = new THREE.Color('#9a8450'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, height(x, z));
    const n = 0.5 + 0.5 * Math.sin(x * 0.06 + Math.sin(z * 0.04) * 2) * Math.cos(z * 0.05 + Math.sin(x * 0.03));
    const m = 0.5 + 0.5 * Math.sin(x * 0.31 + z * 0.17) * Math.sin(z * 0.27 - x * 0.11);
    c.copy(dirt).lerp(moss, n * 0.9).lerp(dark, m * 0.35);
    if (inClearing(x, z, 1.1)) c.lerp(lit, 0.35);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const soil = canvasTexture(1024, 1024, (g, w, h) => {
    const r = rng(17); g.fillStyle = '#d8d0c4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '70,50,30' : '240,230,210'},${0.05 + r() * 0.12})`; g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 40, 4 + r() * 22, r() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 30000; i++) { const v = 90 + r() * 140; g.fillStyle = `rgba(${v},${v * 0.92},${v * 0.8},${0.12 + r() * 0.25})`; g.beginPath(); g.arc(r() * w, r() * h, 0.6 + r() * 1.6, 0, 7); g.fill(); }
    for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(50,32,18,${0.15 + r() * 0.3})`; g.lineWidth = 1 + r() * 2; const x = r() * w, y = r() * h, a = r() * 6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * (8 + r() * 30), y + Math.sin(a) * (8 + r() * 30)); g.stroke(); }
  });
  soil.repeat.set(W / 26, D / 26);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: soil, roughness: 0.96, bumpMap: soil, bumpScale: 2.2 });
  const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; scene.add(mesh);
}

/* ---------- Pasto y musgo con viento (shader TSL en la GPU) ---------- */
function grass(scene, count) {
  const seg = 5, geo = new THREE.BufferGeometry(), p = [], u = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, w = 0.22 * (1 - t) ** 0.8, bend = 0.35 * t * t;
    p.push(-w, t, bend, w, t, bend); u.push(0, t, 1, t);
    if (i < seg) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
  geo.setIndex(idx); geo.computeVertexNormals();

  const mat = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.75 });
  const h = uv().y, h2 = h.mul(h);
  const phase = positionLocal.x.mul(0.07).add(positionLocal.z.mul(0.05));
  const gust = sin(time.mul(0.6).add(phase.mul(0.6))).mul(0.5).add(0.5);
  const w = sin(time.mul(1.6).add(phase)).add(sin(time.mul(3.1).add(phase.mul(2.3))).mul(0.35)).mul(gust.mul(0.8).add(0.3));
  mat.positionNode = positionLocal.add(vec3(w.mul(h2).mul(1.1), 0, w.mul(h2).mul(0.5)));
  mat.colorNode = mix(color('#1f3312'), color('#c8c86a'), h.pow(1.4));

  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const r = rng(23), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
  let n = 0;
  while (n < count) {
    const x = BOUNDS.minX - 40 + r() * (W - 60), z = BOUNDS.minZ - 40 + r() * (D - 60);
    const patch = 0.5 + 0.5 * Math.sin(x * 0.045 + 0.7) * Math.cos(z * 0.038) + 0.25 * Math.sin(x * 0.11 + z * 0.09);
    if (r() > patch * 0.95) continue;
    if (inClearing(x, z, 1)) { if (r() > 0.08) continue; }
    const path = nearPath(x, z);
    if (path < 4 && r() > 0.15) continue;
    const tall = inClearing(x, z, 1.25) ? 0.4 : path < 9 ? 0.35 : 1;
    const hgt = (2.5 + r() * r() * 9) * tall;
    e.set((r() - 0.5) * 0.35, r() * Math.PI * 2, (r() - 0.5) * 0.35); q.setFromEuler(e);
    s.set(0.7 + r() * 0.8, hgt, 1);
    v.set(x, height(x, z) - 0.1, z);
    m.compose(v, q, s); mesh.setMatrixAt(n, m);
    c.setHSL(0.18 + r() * 0.1, 0.45 + r() * 0.2, 0.32 + r() * 0.22); mesh.setColorAt(n, c);
    n++;
  }
  mesh.receiveShadow = true; mesh.castShadow = false; mesh.frustumCulled = false;
  scene.add(mesh);
}

/* ---------- Hojas caídas ---------- */
function leaves(scene, count) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -1); shape.bezierCurveTo(0.7, -0.5, 0.65, 0.5, 0, 1.15); shape.bezierCurveTo(-0.65, 0.5, -0.7, -0.5, 0, -1);
  const geo = new THREE.ShapeGeometry(shape, 10);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, 0.25 * x * x + 0.08 * y * y); } // curvatura
  geo.rotateX(-Math.PI / 2); geo.computeVertexNormals();
  const tex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(60,30,10,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 0); g.stroke();
    g.lineWidth = 1.5; for (let i = 1; i < 8; i++) { const y = h - (i / 8) * h; g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2 - 70, y - 40); g.moveTo(w / 2, y); g.lineTo(w / 2 + 70, y - 40); g.stroke(); }
    const r = rng(5); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(70,35,10,${r() * 0.12})`; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 8, 0, 7); g.fill(); }
  });
  const mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.7 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const palette = ['#b4562a', '#c9822f', '#8a3b1e', '#d6a23d', '#6e4a26', '#a8722d', '#5c3a1c'].map((x) => new THREE.Color(x));
  const r = rng(31), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), e = new THREE.Euler();
  for (let i = 0; i < count; i++) {
    const x = BOUNDS.minX - 30 + r() * (W - 80), z = BOUNDS.minZ - 30 + r() * (D - 80);
    const k = 2.2 + r() * 3.2;
    e.set((r() - 0.5) * 0.3, r() * Math.PI * 2, (r() - 0.5) * 0.3); q.setFromEuler(e);
    s.set(k * 0.75, k, k); v.set(x, height(x, z) + 0.05 + r() * 0.15, z);
    m.compose(v, q, s); mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, palette[Math.floor(r() * palette.length)].clone().multiplyScalar(0.8 + r() * 0.4));
  }
  mesh.receiveShadow = true; mesh.castShadow = true; scene.add(mesh);
}

/* ---------- Matas de musgo ---------- */
function moss(scene, count) {
  const geo = new THREE.SphereGeometry(1, 12, 8), p = geo.attributes.position, r0 = rng(3);
  for (let i = 0; i < p.count; i++) { const k = 0.85 + r0() * 0.3; p.setXYZ(i, p.getX(i) * k, Math.max(-0.2, p.getY(i)) * k, p.getZ(i) * k); }
  geo.computeVertexNormals();
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 1, bumpMap: canvasTexture(128, 128, (g, w, h) => { const r = rng(2); g.fillStyle = '#888'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { const v = r() * 255; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); } }), bumpScale: 3 }), count);
  const r = rng(29), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    let x, z; do { x = BOUNDS.minX + r() * (W - 140); z = BOUNDS.minZ + r() * (D - 140); } while (inClearing(x, z, 0.8));
    const k = 1.2 + r() * 4;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6); s.set(k * (0.8 + r() * 0.6), k * (0.25 + r() * 0.2), k); v.set(x, height(x, z) - 0.1, z);
    m.compose(v, q, s); mesh.setMatrixAt(i, m);
    c.setHSL(0.22 + r() * 0.06, 0.45 + r() * 0.2, 0.22 + r() * 0.14); mesh.setColorAt(i, c);
  }
  mesh.receiveShadow = true; mesh.castShadow = true; scene.add(mesh);
}

/* ---------- Piedritas y ramitas ---------- */
function pebbles(scene, count) {
  const geo = new THREE.IcosahedronGeometry(1, 2), pos = geo.attributes.position, r0 = rng(7);
  for (let i = 0; i < pos.count; i++) { const k = 0.85 + r0() * 0.3; pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.7, pos.getZ(i) * k); }
  geo.computeVertexNormals();
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.85 }), count);
  const r = rng(41), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    let x, z; do { x = BOUNDS.minX + r() * (W - 140); z = BOUNDS.minZ + r() * (D - 140); } while (inClearing(x, z, 0.6));
    const k = 0.6 + r() * r() * 3.5;
    e.set(r() * 3, r() * 3, r() * 3); q.setFromEuler(e); s.set(k, k, k); v.set(x, height(x, z) + k * 0.25, z);
    m.compose(v, q, s); mesh.setMatrixAt(i, m);
    c.setHSL(0.08, 0.06 + r() * 0.08, 0.32 + r() * 0.25); mesh.setColorAt(i, c);
    if (k > 1.6) obstacles.push({ x, z, r: k * 0.95 });
  }
  mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
}

function twigs(scene, count) {
  const geo = new THREE.CylinderGeometry(1, 0.8, 1, 7, 1); geo.rotateZ(Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#5a3e26', roughness: 0.9 }), count);
  const r = rng(53), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), e = new THREE.Euler();
  for (let i = 0; i < count; i++) {
    let x, z; do { x = BOUNDS.minX + r() * (W - 140); z = BOUNDS.minZ + r() * (D - 140); } while (inClearing(x, z, 0.8));
    const len = 12 + r() * 30, rad = 0.35 + r() * 0.5;
    e.set(0, r() * Math.PI, (r() - 0.5) * 0.08); q.setFromEuler(e); s.set(len, rad, rad); v.set(x, height(x, z) + rad * 0.7, z);
    m.compose(v, q, s); mesh.setMatrixAt(i, m);
  }
  mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
}

/* ---------- Troncos gigantes (a esta escala, paredes del bosque) ---------- */
function trunks(scene) {
  const bark = canvasTexture(512, 1024, (g, w, h) => {
    g.fillStyle = '#4a3726'; g.fillRect(0, 0, w, h);
    const r = rng(9);
    for (let i = 0; i < 260; i++) { const x = r() * w; g.strokeStyle = `rgba(${r() < 0.5 ? '20,12,6' : '110,90,64'},${0.25 + r() * 0.4})`; g.lineWidth = 2 + r() * 7; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 64) g.lineTo(x + Math.sin(y * 0.01 + i) * 12, y); g.stroke(); }
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(90,120,50,${0.15 + r() * 0.25})`; g.beginPath(); g.ellipse(r() * w, h * (0.7 + r() * 0.3), 10 + r() * 40, 6 + r() * 20, 0, 0, 7); g.fill(); }
  });
  bark.repeat.set(3, 2);
  const mat = new THREE.MeshStandardMaterial({ map: bark, roughness: 0.95 });
  const r = rng(61), spots = [];
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, rad = 210 + r() * 120;
    spots.push([CX + Math.cos(a) * rad * 0.9, CZ + Math.sin(a) * rad * 1.15, 22 + r() * 30]);
  }
  spots.push([-70, -40, 26], [80, -95, 32], [-150, -210, 30], [150, -300, 34], [-40, -175, 20], [55, -215, 22]);
  for (const [x, z, R] of spots) {
    const geo = new THREE.CylinderGeometry(R * 0.85, R * 1.25, 900, 28, 6, true);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < -400) { const k = 1 + 0.35 * Math.max(0, Math.sin(Math.atan2(p.getZ(i), p.getX(i)) * 5)); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.position.set(x, 440, z); m.rotation.y = r() * 6; m.castShadow = true; m.receiveShadow = true; scene.add(m);
    obstacles.push({ x, z, r: R * 1.3 });
  }
}

/* ---------- Rayos de sol y polvo flotando ---------- */
function atmosphere(scene, sunDir, motes) {
  // Rayos: planos aditivos inclinados según el sol
  const shaft = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const fade = uv().y.mul(float(1).sub(uv().y)).mul(4).mul(sin(uv().x.mul(3.1416)));
  shaft.colorNode = color('#ffcf8a');
  shaft.opacityNode = fade.mul(0.07).mul(sin(time.mul(0.25)).mul(0.25).add(0.75));
  const r = rng(71);
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(26 + r() * 30, 520), shaft);
    g.position.set((r() - 0.5) * 300, 150, -40 - r() * 300);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sunDir); // el eje largo apunta al sol
    g.rotateY(r() * 3);
    scene.add(g);
  }
  // Polvo y polen: puntitos que flotan y brillan con el bloom
  const dust = new THREE.MeshBasicNodeMaterial();
  dust.colorNode = color('#ffe2a8').mul(2.2);
  const id = float(instanceIndex), hx = hash(id), hy = hash(id.add(17.3)), hz = hash(id.add(41.7));
  dust.positionNode = positionLocal.add(vec3(
    sin(time.mul(hx.mul(0.4).add(0.15)).add(hx.mul(30))).mul(3),
    sin(time.mul(hy.mul(0.3).add(0.1)).add(hy.mul(30))).mul(2),
    cos(time.mul(hz.mul(0.4).add(0.15)).add(hz.mul(30))).mul(3)));
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.045, 0), dust, motes);
  const m = new THREE.Matrix4(), rr = rng(83);
  for (let i = 0; i < motes; i++) {
    const x = BOUNDS.minX + rr() * (W - 140), z = BOUNDS.minZ + rr() * (D - 140);
    m.makeTranslation(x, height(x, z) + 1 + rr() * 22, z); mesh.setMatrixAt(i, m);
  }
  mesh.frustumCulled = false; scene.add(mesh);
}

/* ---------- Camino de esporas que guía al jugador ---------- */
export function sporeTrail(scene) {
  const curve = new THREE.CatmullRomCurve3(TRAIL.map(([x, z]) => new THREE.Vector3(x, height(x, z) + 2.2, z)));
  const n = 90, mat = new THREE.MeshBasicNodeMaterial({ transparent: true });
  const id = float(instanceIndex);
  mat.colorNode = color('#9fe8c8').mul(2.6);
  mat.opacityNode = sin(time.mul(2).sub(id.mul(0.35))).mul(0.4).add(0.6);
  mat.positionNode = positionLocal.add(vec3(sin(time.add(id)).mul(0.5), sin(time.mul(1.3).add(id.mul(0.7))).mul(0.6), cos(time.add(id.mul(1.7))).mul(0.5)));
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.11, 1), mat, n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { const p = curve.getPoint(i / (n - 1)); m.makeTranslation(p.x, p.y, p.z); mesh.setMatrixAt(i, m); }
  mesh.frustumCulled = false; scene.add(mesh);
  return mesh;
}

/* ---------- Claros dormidos: niebla azulada que marca los próximos mitos ---------- */
function sleepingClearings(scene) {
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const d = uv().sub(0.5).length().mul(2);
  mat.colorNode = color('#7fa8ff');
  mat.opacityNode = float(1).sub(d).clamp(0, 1).pow(2).mul(0.16).mul(sin(time.mul(0.7)).mul(0.3).add(0.7));
  for (const s of SLEEPING) {
    for (let k = 0; k < 3; k++) {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(s.r * 2.2, s.r * 1.2), mat);
      g.position.set(s.x, height(s.x, s.z) + 6 + k * 5, s.z); g.rotation.y = k * 1.05;
      scene.add(g);
    }
  }
}

// Mapa de entorno: un cielo de atardecer simplificado para que el caparazón y los hongos reflejen luz
export function environment(renderer, scene, sunDir) {
  const env = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide }));
  sky.material.colorNode = mix(color('#3b2c1c'), color('#ffd2a0'), positionLocal.y.div(100).add(0.15).clamp(0, 1).pow(0.6));
  env.add(sky);
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 8), new THREE.MeshBasicNodeMaterial());
  sunBall.material.colorNode = color('#ffe6bf').mul(14); sunBall.position.copy(sunDir).multiplyScalar(80); env.add(sunBall);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(env, 0.02).texture;
  scene.environmentIntensity = 0.75;
}

export function buildWorld(scene, { quality = 'alta' } = {}) {
  const hi = quality === 'alta';
  scene.background = new THREE.Color('#d9a877');
  scene.fog = new THREE.FogExp2('#c99a6c', 0.0058);

  const sunDir = new THREE.Vector3(0.62, 0.5, -0.6).normalize(); // sol bajo, de costado: luz rasante y contraluz suave
  const sun = new THREE.DirectionalLight('#ffbd75', 3.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 400 });
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight('#ffe6c4', '#5a4026', 1.9));

  ground(scene);
  grass(scene, hi ? 26000 : 9000);
  leaves(scene, hi ? 2600 : 1100);
  moss(scene, hi ? 900 : 400);
  pebbles(scene, 140);
  twigs(scene, 55);
  trunks(scene);
  atmosphere(scene, sunDir, hi ? 1600 : 600);
  sleepingClearings(scene);

  scene.userData.sunDir = sunDir;
  // La luz del sol sigue al jugador para que las sombras sean nítidas cerca de él
  return {
    sun,
    follow(p) {
      sun.position.set(p.x + sunDir.x * 160, p.y + sunDir.y * 160, p.z + sunDir.z * 160);
      sun.target.position.set(p.x, p.y, p.z);
    }
  };
}

export { RING };
