// Visor 3D: gira el mismo perfil de las láminas alrededor del eje (LatheGeometry = rotate_extrude de OpenSCAD).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { profile } from './profiles.js';

const V2 = ([r, y]) => new THREE.Vector2(r, y);

function build(a, steps) {
  const p = profile(a), g = new THREE.Group();
  const mat = (c, rough) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, side: THREE.DoubleSide, flatShading: steps < 16 });
  g.add(new THREE.Mesh(new THREE.LatheGeometry(p.stem.map(V2), steps), mat(a.tallo, 0.85)));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(p.capTop.map(V2), steps), mat(a.fill, 0.6)));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(p.capUnder.map(V2), steps), mat(new THREE.Color(a.tallo).lerp(new THREE.Color(a.fill), 0.35), 0.9)));
  if (p.ring) {
    const m = new THREE.Mesh(new THREE.LatheGeometry(p.ring.pts.map(V2), steps), mat(a.tallo, 0.9));
    m.position.y = p.ring.y; g.add(m);
  }
  return g;
}

export function createViewer(box) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  box.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 5000);
  scene.add(new THREE.HemisphereLight('#ffffff', '#a99f8d', 1.7));
  const sun = new THREE.DirectionalLight('#fff7ea', 2.1); sun.position.set(140, 260, 200); scene.add(sun);
  const grid = new THREE.GridHelper(400, 40, '#9a9488', '#9a9488'); // cuadrícula de 1 cm
  grid.material.transparent = true; grid.material.opacity = 0.28; scene.add(grid);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.autoRotateSpeed = 1.1;
  let group = null, state = { id: null, all: false, steps: 96 };

  function resize() { const w = box.clientWidth, h = box.clientHeight; if (!w) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(box); resize();
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

  function frame(dir) {
    const bb = new THREE.Box3().setFromObject(group);
    const size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const d = Math.max(size.y / (2 * t), Math.max(size.x, size.z) / (2 * t * camera.aspect)) * 1.3 + size.z / 2;
    controls.target.copy(c); camera.position.copy(c).add(dir.normalize().multiplyScalar(d));
    controls.update();
  }

  function render(list) {
    if (group) { scene.remove(group); group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); }
    group = new THREE.Group();
    if (state.all) {
      let x = 0; const gap = 30, items = list.map((a) => ({ a, w: Math.max(a.cap * 10, a.grosor * 2) }));
      const total = items.reduce((s, i) => s + i.w, 0) + gap * (items.length - 1);
      for (const { a, w } of items) { const m = build(a, state.steps); m.position.x = x + w / 2 - total / 2; x += w + gap; group.add(m); }
      controls.autoRotate = false;
    } else {
      group.add(build(list.find((a) => a.id === state.id), state.steps));
      controls.autoRotate = true;
    }
    scene.add(group);
    frame(state.all ? new THREE.Vector3(0, 0.3, 1) : new THREE.Vector3(0.7, 0.4, 1));
  }
  return {
    show(list, id, opts = {}) { Object.assign(state, { id }, opts); render(list); }
  };
}
