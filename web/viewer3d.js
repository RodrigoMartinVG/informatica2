// Modelos 3D de las seis formas: el perfil de las láminas girado alrededor del eje (LatheGeometry = rotate_extrude).
// Las texturas se generan por código según la superficie más frecuente de cada forma en los datos.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { profile } from './profiles.js';

const V2 = ([r, y]) => new THREE.Vector2(r, y);

// Superficie más frecuente por forma (hoja Data) → estilo de textura
const SURFACE = { convexa: 'lisa', plana: 'escamas-finas', hundida: 'pegajosa', campana: 'surcos', esferica: 'escamas', conica: 'fibras' };

// Generador pseudoaleatorio con semilla: la misma textura en cada carga
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
const hex = (c) => new THREE.Color(c);

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Textura del sombrero. En LatheGeometry, u recorre el giro (0..1) y v el perfil (0 = ápice, 1 = borde).
function capMaps(a) {
  const style = SURFACE[a.id], base = hex(a.fill);
  const dark = base.clone().multiplyScalar(0.62).getStyle(), light = base.clone().lerp(hex('#efe6d6'), 0.28).getStyle();
  const map = canvasTex(1024, 512, (g, w, h) => {
    const r = rng(7);
    // degradé: centro más oscuro, borde más claro (como en los hongos reales)
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, dark); grad.addColorStop(0.45, base.getStyle()); grad.addColorStop(1, light);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},${0.025 + r() * 0.035})`; g.fillRect(r() * w, r() * h, 2, 2); }
    if (style === 'escamas' || style === 'escamas-finas') {
      const n = style === 'escamas' ? 520 : 900, sz = style === 'escamas' ? 9 : 5;
      for (let i = 0; i < n; i++) {
        const y = Math.pow(r(), 0.7) * h * 0.92, x = r() * w, s = sz * (0.6 + r()) * (0.5 + y / h);
        g.fillStyle = `rgba(40,25,12,${0.22 + r() * 0.25})`;
        g.beginPath(); g.ellipse(x, y, s * 1.4, s * 0.8, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = `rgba(255,240,220,${0.10 + r() * 0.12})`;
        g.beginPath(); g.ellipse(x - s * 0.3, y - s * 0.3, s * 0.6, s * 0.35, 0, 0, Math.PI * 2); g.fill();
      }
    }
    if (style === 'surcos' || style === 'fibras') {
      const n = style === 'surcos' ? 64 : 260;
      for (let i = 0; i < n; i++) {
        const x = (i / n) * w + r() * 3, y0 = style === 'surcos' ? h * (0.12 + r() * 0.1) : h * r() * 0.3;
        g.strokeStyle = `rgba(30,18,8,${style === 'surcos' ? 0.35 : 0.12 + r() * 0.15})`; g.lineWidth = style === 'surcos' ? 3 : 1 + r();
        g.beginPath(); g.moveTo(x, y0); g.lineTo(x + (r() - 0.5) * 6, h); g.stroke();
      }
    }
  });
  const bump = canvasTex(512, 256, (g, w, h) => {
    const r = rng(11); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    if (style.startsWith('escamas')) for (let i = 0; i < (style === 'escamas' ? 300 : 500); i++) { g.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.4})`; g.beginPath(); g.ellipse(r() * w, Math.pow(r(), 0.7) * h, 4 + r() * 4, 2.5 + r() * 2, 0, 0, Math.PI * 2); g.fill(); }
    if (style === 'surcos') for (let i = 0; i < 64; i++) { g.strokeStyle = '#2a2a2a'; g.lineWidth = 2; const x = (i / 64) * w; g.beginPath(); g.moveTo(x, h * 0.15); g.lineTo(x, h); g.stroke(); }
    if (style === 'fibras') for (let i = 0; i < 220; i++) { g.strokeStyle = `rgba(0,0,0,${0.2 + r() * 0.3})`; const x = r() * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  }, false);
  const rough = style === 'pegajosa' ? 0.32 : style === 'lisa' ? 0.5 : 0.78;
  return { map, bump, rough, bumpScale: style === 'lisa' || style === 'pegajosa' ? 0.2 : 1.2 };
}

function gillMap(a) {
  const c1 = hex(a.tallo).lerp(hex(a.fill), 0.28), c2 = c1.clone().multiplyScalar(0.72);
  return canvasTex(2048, 64, (g, w, h) => {
    g.fillStyle = c1.getStyle(); g.fillRect(0, 0, w, h);
    const n = 220; for (let i = 0; i < n; i++) { g.fillStyle = c2.getStyle(); g.fillRect((i / n) * w, i % 2 ? h * 0.35 : 0, 2.2, h); }
  });
}

function stemMap(a) {
  const base = hex(a.tallo);
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(3); g.fillStyle = base.getStyle(); g.fillRect(0, 0, w, h);
    const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, 'rgba(90,70,40,.18)'); grad.addColorStop(0.2, 'rgba(0,0,0,0)'); g.fillStyle = grad; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 420; i++) { g.strokeStyle = `rgba(110,90,60,${0.04 + r() * 0.08})`; const x = r() * w; g.beginPath(); g.moveTo(x, r() * h); g.lineTo(x + (r() - .5) * 4, r() * h); g.stroke(); }
  });
}

export function build(a, steps = 128) {
  const p = profile(a), g = new THREE.Group();
  const flat = steps < 16;
  const cm = capMaps(a);
  const capMat = new THREE.MeshStandardMaterial({ map: cm.map, bumpMap: cm.bump, bumpScale: cm.bumpScale, roughness: cm.rough, side: THREE.DoubleSide, flatShading: flat });
  const stemMat = new THREE.MeshStandardMaterial({ map: stemMap(a), roughness: 0.85, side: THREE.DoubleSide, flatShading: flat });
  const gillMat = new THREE.MeshStandardMaterial({ map: gillMap(a), roughness: 0.95, side: THREE.DoubleSide, flatShading: flat });
  const add = (pts, mat, y = 0) => { const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(V2), steps), mat); m.position.y = y; m.castShadow = true; m.receiveShadow = true; g.add(m); };
  add(p.stem, stemMat);
  add(p.capTop, capMat);
  add(p.capUnder, gillMat);
  if (p.ring) add(p.ring.pts, stemMat, p.ring.y);
  return g;
}

function lights(scene, shadows) {
  scene.add(new THREE.HemisphereLight('#ffffff', '#b5ab98', 1.25));
  const key = new THREE.DirectionalLight('#fff4e4', 2.4); key.position.set(-160, 300, 220);
  if (shadows) { key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0005;
    Object.assign(key.shadow.camera, { left: -400, right: 400, top: 400, bottom: -400, near: 10, far: 1200 }); }
  scene.add(key);
  const rim = new THREE.DirectionalLight('#dfe8ff', 0.7); rim.position.set(200, 120, -200); scene.add(rim);
}

function lineup(list, steps) {
  const g = new THREE.Group(), gap = 30; let x = 0;
  const items = list.map((a) => ({ a, w: Math.max(a.cap * 10, a.grosor * 2) }));
  const total = items.reduce((s, i) => s + i.w, 0) + gap * (items.length - 1);
  const centers = [];
  for (const { a, w } of items) { const m = build(a, steps); m.position.x = x + w / 2 - total / 2; centers.push(m.position.x); x += w + gap; g.add(m); }
  return { group: g, centers, total };
}

/* ---------- Visor interactivo ---------- */
export function createViewer(box) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  box.prepend(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, 1, 5000);
  lights(scene, true);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ opacity: 0.18 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const grid = new THREE.GridHelper(400, 40, '#9a9488', '#9a9488'); grid.material.transparent = true; grid.material.opacity = 0.22; scene.add(grid);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.autoRotateSpeed = 1.1;
  let group = null; const state = { id: null, all: false, steps: 128 };
  function resize() { const w = box.clientWidth, h = box.clientHeight; if (!w) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(box); resize();
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
  function frame(dir) {
    const bb = new THREE.Box3().setFromObject(group), size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const d = Math.max(size.y / (2 * t), Math.max(size.x, size.z) / (2 * t * camera.aspect)) * 1.3 + size.z / 2;
    controls.target.copy(c); camera.position.copy(c).add(dir.normalize().multiplyScalar(d)); controls.update();
  }
  function render(list) {
    if (group) { scene.remove(group); group.traverse((o) => { o.geometry?.dispose(); }); }
    if (state.all) { group = lineup(list, state.steps).group; controls.autoRotate = false; }
    else { group = new THREE.Group(); group.add(build(list.find((a) => a.id === state.id), state.steps)); controls.autoRotate = true; }
    scene.add(group);
    frame(state.all ? new THREE.Vector3(0, 0.3, 1) : new THREE.Vector3(0.7, 0.4, 1));
  }
  return { show(list, id, opts = {}) { Object.assign(state, { id }, opts); render(list); } };
}

/* ---------- Imágenes fijas tipo estudio fotográfico ---------- */
export function renderStill(list, { id = null, width = 1000, height = 1000, bg = '#ecebe7' } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(bg);
  lights(scene, true);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShadowMaterial({ opacity: 0.22 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  let camera, meta = null;
  if (id) {
    const g = build(list.find((a) => a.id === id)); scene.add(g);
    const bb = new THREE.Box3().setFromObject(g), size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
    camera = new THREE.PerspectiveCamera(26, width / height, 1, 5000);
    const t = Math.tan(THREE.MathUtils.degToRad(13)), d = Math.max(size.y, size.x) / (2 * t) * 1.6;
    const elev = { hundida: 0.6, plana: 0.32 }[id] ?? 0.2; // la hundida se mira desde arriba para que se vea el embudo
    camera.position.set(c.x + d * 0.12, c.y + d * elev, c.z + d); camera.lookAt(c.x + size.x * 0.06, c.y * 0.92, c.z);
  } else {
    // Las seis en fila, con cámara ortográfica: la posición horizontal en la imagen es proporcional a la real
    const L = lineup(list, 128); scene.add(L.group);
    const bb = new THREE.Box3().setFromObject(L.group), size = bb.getSize(new THREE.Vector3());
    const halfW = L.total / 2 + 30, halfH = halfW * height / width;
    camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 1, 5000);
    const yc = size.y / 2 + 6;
    camera.position.set(0, yc + 120, 900); camera.lookAt(0, yc, 0);
    meta = { centers: L.centers.map((x) => (x + halfW) / (2 * halfW)) };
  }
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/jpeg', 0.9);
  renderer.dispose();
  return { url, meta };
}
