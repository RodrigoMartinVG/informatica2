// El escarabajo: armado y animado 100 % por código.
// Camina por el suelo (y por ramas, piedras y troncos caídos), trepa tallos y troncos de árboles,
// camina sobre los sombreros, salta, cae con gravedad sobre lo que haya abajo y vuela libre.
// Las seis patas caminan con "marcha en trípode" y cinemática inversa de dos huesos.
import * as THREE from 'three/webgpu';
import { walkHeight, walkNormal, wallTop, STEP } from './surfaces.js';
import { obstacles } from './world.js';
import { height, BOUNDS } from './config.js';

const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();
const CLEAR = 0.3; // altura del cuerpo sobre la superficie
const G = 34, JUMP = 10;   // gravedad y salto (cm/s², cm/s): a esta escala, un salto sube ~1 cm y llega a otro sombrero cercano
const CEIL = 30;            // altura máxima de vuelo sobre el suelo (cm)
const FLY = { speed: 9, run: 15, up: 7, down: 9, sink: 1.3 };
const DIVE = { speed: 19, down: 16 };  // picada: X + adelante, volando
const GLIDE = 2.4;                      // planeo sin energía: manteniendo el salto, cae despacito
const PUFF = 19;                        // el bejín es un trampolín: salto desde arriba de uno (cm/s)
// Conductas en reposo (cuando no lo movés un rato): limpiarse, estirarse, mirar alrededor…
const IDLE = ['antenas', 'patas', 'elitros', 'alas', 'mirar', 'antenas', 'mirar'];
const IDLE_DUR = { antenas: 3, patas: 2.6, elitros: 2.8, alas: 2.2, mirar: 2.6, festejo: 1.6, estornudo: 1.1 };

function bone(mesh, a, b) {
  tmp.subVectors(b, a); const len = tmp.length();
  mesh.position.copy(a).addScaledVector(tmp, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, tmp.normalize());
  mesh.scale.set(1, Math.max(0.001, len), 1);
}
const easeIO = (t) => t * t * (3 - 2 * t);

export function createBeetle(scene) {
  const root = new THREE.Group(); // posición + orientación sobre la superficie
  const body = new THREE.Group(); root.add(body);

  // Texturas dibujadas por código: surcos de los élitros (relieve) y nervaduras de las alas
  const canvasTex = (w, h, draw, srgb = false) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  };
  // Los surcos (estrías) corren de adelante hacia atrás, paralelos al borde; entre surco y surco, puntitos
  const striae = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, w, h);
    for (let i = 1; i < 10; i++) { const y = (i / 10) * h; g.fillStyle = '#4a4a4a'; g.fillRect(0, y - 2, w, 3); g.fillStyle = '#c4c4c4'; g.fillRect(0, y + 1, w, 2); }
    for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(40,40,40,.6)'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1, 0, 7); g.fill(); }
  });
  const pits = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(50,50,50,.55)'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1.2, 0, 7); g.fill(); } });
  const veins = canvasTex(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(210,225,235,0.55)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(60,40,25,0.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h * 0.18); g.quadraticCurveTo(w * 0.5, h * 0.05, w, h * 0.3); g.stroke();  // borde de ataque
    g.lineWidth = 1.6; for (const k of [0.35, 0.55, 0.75]) { g.beginPath(); g.moveTo(0, h * 0.2); g.quadraticCurveTo(w * 0.45, h * k, w * 0.95, h * (k + 0.1)); g.stroke(); }
    g.lineWidth = 1; for (let i = 1; i < 6; i++) { const x = (i / 6) * w; g.beginPath(); g.moveTo(x, h * 0.15); g.lineTo(x + 10, h * 0.9); g.stroke(); }
    g.fillStyle = 'rgba(60,40,25,0.7)'; g.beginPath(); g.ellipse(w * 0.62, h * 0.18, 9, 4, 0, 0, 7); g.fill(); // la mancha del ala (estigma)
  }, true);

  // Caparazón verde metálico iridiscente (como los escarabajos joya)
  const shellOpts = { color: '#2d6a3e', metalness: 0.7, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [250, 800] };
  const shellE = new THREE.MeshPhysicalMaterial({ ...shellOpts, bumpMap: striae, bumpScale: 1.2 });
  const shell = new THREE.MeshPhysicalMaterial({ ...shellOpts, bumpMap: pits, bumpScale: 0.6 });
  const inner = new THREE.MeshStandardMaterial({ color: '#3a2a16', roughness: 0.6, side: THREE.BackSide }); // el lado de adentro del élitro
  const dark = new THREE.MeshPhysicalMaterial({ color: '#16130e', roughness: 0.35, metalness: 0.35, clearcoat: 0.6 });
  const legMat = new THREE.MeshPhysicalMaterial({ color: '#1d2a1c', roughness: 0.3, metalness: 0.5, clearcoat: 0.7 });
  const belly = new THREE.MeshPhysicalMaterial({ color: '#2a1f14', roughness: 0.4, metalness: 0.3, clearcoat: 0.5 });
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: '#0b0a08', roughness: 0.05, clearcoat: 1, iridescence: 0.5 });
  const add = (geo, mat, [x, y, z], [sx, sy, sz] = [1, 1, 1], parent = body) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const sph = new THREE.SphereGeometry(1, 40, 28);

  // Abdomen: arriba (se ve cuando se abren los élitros) y abajo, en segmentos
  add(sph, belly, [0, -0.01, -0.14], [0.3, 0.12, 0.5]);
  for (let i = 0; i < 4; i++) { const z = 0.1 - i * 0.16, k = Math.sqrt(Math.max(0.05, 1 - ((z + 0.14) / 0.5) ** 2)); const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 5, 32, Math.PI), belly); r.position.set(0, -0.01, z); r.scale.set(0.3 * k, 0.12 * k, 0.5); body.add(r); } // los segmentos (arcos sobre el abdomen)
  for (let i = 0; i < 4; i++) add(sph, belly, [0, -0.07, 0.12 - i * 0.2], [0.36 - i * 0.05, 0.08, 0.14]);

  // Élitros: las dos alas duras. Cada una es una cáscara con espesor (por fuera verde, por dentro marrón),
  // con bisagra adelante: para volar se levantan y se abren en V.
  const elytra = [-1, 1].map((side) => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.015, 0.0, 0.4); pivot.rotation.order = 'YXZ'; body.add(pivot);
    const geo = new THREE.SphereGeometry(1, 28, 22, side > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI, 0, Math.PI / 2);
    // la textura se mapea por la distancia a la unión (x): así los surcos corren de adelante hacia atrás
    { const pos = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getZ(i) * 0.5 + 0.5, Math.abs(pos.getX(i))); }
    const out = new THREE.Mesh(geo, shellE); out.position.set(0, 0, -0.56); out.scale.set(0.42, 0.3, 0.64); out.castShadow = true; pivot.add(out);
    const ins = new THREE.Mesh(geo, inner); ins.position.copy(out.position); ins.scale.set(0.4, 0.28, 0.62); pivot.add(ins);
    return { pivot, side };
  });
  // Escutelo: el triangulito entre los élitros
  const scut = new THREE.ConeGeometry(0.07, 0.16, 3); scut.rotateX(-Math.PI / 2);
  add(scut, shell, [0, 0.28, 0.38], [1, 0.25, 1]);

  // Alas membranosas: plegadas debajo de los élitros; al volar se despliegan y baten en forma de ocho
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.06); wingShape.bezierCurveTo(0.35, 0.16, 0.9, 0.2, 1.22, 0.04);
  wingShape.bezierCurveTo(1.3, -0.08, 1.05, -0.22, 0.7, -0.24); wingShape.bezierCurveTo(0.35, -0.24, 0.1, -0.12, 0, -0.04);
  const wingGeo = new THREE.ShapeGeometry(wingShape, 16); wingGeo.rotateX(-Math.PI / 2);
  { const uv = wingGeo.attributes.uv, pos = wingGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 1.3, 0.5 - pos.getZ(i) * 1.8); }
  const wingMat = new THREE.MeshPhysicalMaterial({ map: veins, color: '#e6eef2', roughness: 0.2, transparent: true, opacity: 0.75, side: THREE.DoubleSide, iridescence: 0.8, iridescenceIOR: 1.3, depthWrite: false });
  const wings = [-1, 1].map((side) => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.1, 0.16, 0.22); pivot.rotation.order = 'YXZ'; body.add(pivot);
    const w = new THREE.Mesh(wingGeo, wingMat); w.scale.x = side; pivot.add(w); pivot.visible = false;
    return { pivot, side };
  });

  // Pronoto: el escudo de adelante, ancho
  add(sph, shell, [0, 0.03, 0.5], [0.34, 0.17, 0.22]);

  // Cabeza: placa frontal (clípeo), ojos compuestos, mandíbulas y antenas en abanico
  const head = new THREE.Group(); head.position.set(0, 0, 0.7); body.add(head);
  add(sph, dark, [0, 0, 0.03], [0.17, 0.11, 0.14], head);
  add(sph, shell, [0, 0.04, 0.12], [0.13, 0.04, 0.08], head);              // clípeo
  add(sph, eyeMat, [0.135, 0.02, 0.05], [0.055, 0.06, 0.065], head);
  add(sph, eyeMat, [-0.135, 0.02, 0.05], [0.055, 0.06, 0.065], head);
  const mand = new THREE.ConeGeometry(0.03, 0.15, 8); mand.rotateX(Math.PI / 2);
  const mandL = add(mand, dark, [0.055, -0.04, 0.19], [1, 1, 1], head), mandR = add(mand, dark, [-0.055, -0.04, 0.19], [1, 1, 1], head);

  const seg = new THREE.CylinderGeometry(0.011, 0.014, 1, 6); seg.translate(0, 0.5, 0);
  const antennae = [-1, 1].map((side) => {
    const base = new THREE.Group(); base.position.set(side * 0.09, 0.05, 0.12); head.add(base);
    const a = new THREE.Mesh(seg, legMat); a.scale.set(1, 0.18, 1); base.add(a);
    const mid = new THREE.Group(); mid.position.y = 0.18; base.add(mid);
    const b = new THREE.Mesh(seg, legMat); b.scale.set(1, 0.16, 1); mid.add(b);
    // el abanico (antena lamelada, como la de los escarabajos de los hongos y de las flores)
    for (let k = 0; k < 3; k++) { const leaf = new THREE.Mesh(sph, legMat); leaf.scale.set(0.034, 0.055, 0.011); leaf.position.set(0, 0.2, (k - 1) * 0.02); leaf.rotation.x = (k - 1) * 0.35; mid.add(leaf); }
    return { base, mid, side };
  });

  // Patas: cadera (en el cuerpo) → rodilla → pie (en la superficie), y un tarso con uñas apoyado en el suelo
  const femurGeo = new THREE.CylinderGeometry(0.03, 0.055, 1, 8), tibiaGeo = new THREE.CylinderGeometry(0.022, 0.034, 1, 7), tarsGeo = new THREE.CylinderGeometry(0.012, 0.018, 1, 5);
  const A = 0.34, B = 0.4, REACH = A + B;
  const LEGS = [
    { hip: [0.18, -0.06, 0.42], rest: [0.5, -CLEAR, 0.66] }, { hip: [0.2, -0.08, 0.12], rest: [0.56, -CLEAR, 0.12] }, { hip: [0.18, -0.08, -0.2], rest: [0.52, -CLEAR, -0.52] }
  ].flatMap((l, i) => [-1, 1].map((side) => ({
    hip: new THREE.Vector3(l.hip[0] * side, l.hip[1], l.hip[2]), rest: new THREE.Vector3(l.rest[0] * side, l.rest[1], l.rest[2]),
    group: (i + (side > 0 ? 1 : 0)) % 2,
    femur: new THREE.Mesh(femurGeo, legMat), tibia: new THREE.Mesh(tibiaGeo, legMat), tarsus: new THREE.Mesh(tarsGeo, legMat),
    foot: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3(), base: new THREE.Vector3(), t: 1
  })));
  for (const l of LEGS) { l.femur.castShadow = l.tibia.castShadow = true; scene.add(l.femur, l.tibia, l.tarsus); }
  scene.add(root);

  /* ---------- Estado ---------- */
  // mode: 'ground' (el suelo y todo lo que se pisa) · 'stem' (el tallo de un hongo o el tronco de un árbol)
  //       'cap' (arriba de un sombrero) · 'air' (saltando, cayendo o volando libre) · 'transit' (un paso armado de un punto a otro)
  const st = {
    mode: 'ground', x: 0, z: 0, fy: 0, yaw: Math.PI, speed: 0, turn: 0, sniff: 0, chew: 0, t: 0, m: null, th: 0, h: 0, push: 0, wall: 0,
    wobble: 0, touch: null, flying: false, fly: 0, hold: 0, grabCD: 0, shelfCD: 0, v: new THREE.Vector3(), p: new THREE.Vector3(),
    dive: 0, glide: false, glideV: 0, bounceM: null, act: null, idleT: 0, idleNext: 5, achis: false
  };
  let mushrooms = [];
  // Lo que agrega la conducta del momento (limpiarse, festejar…) a la pose del cuerpo, la cabeza y las patas
  const pose = { bx: 0, bz: 0, by: 0, hx: 0, hy: 0, hz: 0, hzPos: 0, ant: [0, 0], antZ: [0, 0], wings: 0, beat: 1, mand: 0, legs: new Map() };
  const LOCAL = new THREE.Vector3();
  const env = (p) => easeIO(Math.min(1, p * 4, (1 - p) * 4)); // entra y sale suave

  // Elegir y animar una conducta. Las patas que se usan dejan de caminar y van a un punto del cuerpo
  function startAct(kind) {
    st.act = { kind, t: 0, dur: IDLE_DUR[kind], side: Math.random() < 0.5 ? -1 : 1 };
    for (const l of LEGS) l.base.copy(l.foot);
    st.achis = false;
  }
  function actPose(dt) {
    pose.bx = pose.bz = pose.by = pose.hx = pose.hy = pose.hz = pose.hzPos = pose.mand = pose.wings = 0;
    pose.ant[0] = pose.ant[1] = pose.antZ[0] = pose.antZ[1] = 0; pose.beat = 1; pose.legs.clear();
    if (st.stuck > 0) { pose.bz = Math.sin(st.t * 32) * 0.22; pose.bx = Math.sin(st.t * 21) * 0.12; pose.ant[0] = pose.ant[1] = Math.sin(st.t * 25) * 0.5; } // forcejea
    const a = st.act; if (!a) return null;
    a.t += dt; const p = Math.min(1, a.t / a.dur), e = env(p), s = a.side, t = st.t;
    let event = null;
    const leg = (i, x, y, z) => pose.legs.set(LEGS[i], [x, y, z, e]);
    // índices de LEGS: 0/1 adelante (izq/der), 2/3 medio, 4/5 atrás
    const front = s < 0 ? 0 : 1, hind = s < 0 ? 4 : 5;
    if (a.kind === 'antenas') {
      // Se pasa la pata de adelante por la antena, de la base a la punta, varias veces (así se limpian los escarabajos)
      const k = 0.5 + 0.5 * Math.sin(t * 12);
      leg(front, s * (0.1 + k * 0.1), 0.1 + k * 0.12, 0.84 + k * 0.14);
      pose.ant[s < 0 ? 0 : 1] = -0.7 * e; pose.antZ[s < 0 ? 0 : 1] = -s * 0.35 * e;
      pose.hz = s * 0.22 * e; pose.hx = 0.18 * e; pose.bx = 0.06 * e;
    } else if (a.kind === 'patas') {
      // Frota las dos patas de atrás una contra otra, por encima de la cola
      const k = Math.sin(t * 16);
      leg(4, -0.07 + k * 0.05, 0.02, -0.78 + k * 0.05); leg(5, 0.07 + k * 0.05, 0.02, -0.78 - k * 0.05);
      pose.bx = 0.1 * e; pose.by = 0.03 * e;
    } else if (a.kind === 'elitros') {
      // Barre el costado de los élitros con una pata de atrás
      const k = 0.5 + 0.5 * Math.sin(t * 9);
      leg(hind, s * 0.36, 0.1, -0.62 + k * 0.5);
      pose.bz = -s * 0.12 * e;
    } else if (a.kind === 'alas') {
      // Estira las alas: abre los élitros, despliega las alas, un par de aleteos y las vuelve a guardar
      pose.wings = 0.85 * e; pose.beat = p > 0.3 && p < 0.7 ? 0.6 : 0.05; pose.bx = -0.08 * e;
    } else if (a.kind === 'mirar') {
      // Mira a un lado y al otro, con las antenas atentas
      pose.hy = Math.sin(p * Math.PI * 2) * 0.45 * e; pose.hx = -0.08 * e;
      pose.ant[0] = pose.ant[1] = -0.25 * e;
    } else if (a.kind === 'festejo') {
      // ¡Festejo! saltitos, bamboleo y antenas al aire
      pose.by = Math.abs(Math.sin(t * 11)) * 0.12 * e; pose.bz = Math.sin(t * 11) * 0.2 * e;
      pose.ant[0] = pose.ant[1] = (-0.5 + Math.sin(t * 20) * 0.3) * e; pose.mand = Math.sin(t * 24) * 0.4 * e;
    } else if (a.kind === 'estornudo') {
      // Aaa… ¡chís! (las esporas del bejín): se echa para atrás y de golpe para adelante
      const back = p < 0.6 ? easeIO(p / 0.6) : Math.max(0, 1 - (p - 0.6) * 8);
      const jerk = p >= 0.6 ? Math.max(0, 1 - (p - 0.6) * 4) : 0;
      pose.bx = -0.25 * back + 0.25 * jerk; pose.hx = -0.3 * back + 0.35 * jerk; pose.hzPos = 0.06 * jerk;
      pose.ant[0] = pose.ant[1] = -0.4 * back; pose.mand = 0.5 * back;
      if (p >= 0.6 && !st.achis) { st.achis = true; event = 'achís'; }
    }
    if (p >= 1) { st.act = null; st.idleT = 0; st.idleNext = 6 + Math.random() * 8; }
    return event;
  }
  const pos = new THREE.Vector3(), N = new THREE.Vector3(0, 1, 0), F = new THREE.Vector3(0, 0, 1);
  const smoothN = new THREE.Vector3(0, 1, 0);
  const basis = new THREE.Matrix4(), world = new THREE.Matrix4();
  const qFly = new THREE.Quaternion();
  const tr = { dir: new THREE.Vector3(), bank: 0, fly: false, a: new THREE.Vector3(), b: new THREE.Vector3(), ctrl: new THREE.Vector3(), t: 1, dur: 0.7, qa: new THREE.Quaternion(), qb: new THREE.Quaternion(), next: 'ground' };

  const yawDir = (out) => out.set(Math.sin(st.yaw), 0, Math.cos(st.yaw));
  const radial = (m, x, z, out) => { out.set(x - m.x, 0, z - m.z); const d = out.length(); if (d < 1e-4) out.set(1, 0, 0); else out.divideScalar(d); return d; };
  const clampB = () => { st.x = Math.max(BOUNDS.minX + 5, Math.min(BOUNDS.maxX - 5, st.x)); st.z = Math.max(BOUNDS.minZ + 5, Math.min(BOUNDS.maxZ - 5, st.z)); };

  // Pose (posición, normal y frente) según el modo
  const P = { pos: new THREE.Vector3(), N: new THREE.Vector3(), F: new THREE.Vector3() };
  function poseOf(mode, out = P) {
    if (mode === 'ground') {
      walkNormal(st.x, st.z, out.N, st.fy + STEP);
      out.pos.set(st.x, st.fy, st.z).addScaledVector(out.N, CLEAR);
      yawDir(out.F);
    } else if (mode === 'cap') {
      const m = st.m, d = radial(m, st.x, st.z, tmp3), r = Math.min(d, m.Rw);
      const slope = (m.capY(r + 0.15) - m.capY(Math.max(0, r - 0.15))) / 0.3;
      out.N.copy(tmp3).multiplyScalar(-slope).add(UP).normalize();
      out.pos.set(st.x, m.base + m.capY(r), st.z).addScaledVector(out.N, CLEAR);
      yawDir(out.F);
    } else if (mode === 'air') {
      yawDir(out.F);
      // en el aire el cuerpo se inclina: la nariz sube al ascender y baja al caer
      out.N.copy(UP).addScaledVector(out.F, -Math.max(-0.45, Math.min(0.45, st.v.y * 0.045))).normalize();
      out.pos.copy(st.p);
    } else {
      const m = st.m; tmp3.set(Math.cos(st.th), 0, Math.sin(st.th));
      out.N.copy(tmp3); out.pos.set(m.x, m.base + st.h, m.z).addScaledVector(tmp3, m.stemR(st.h) + CLEAR);
      out.F.copy(UP);
    }
    return out;
  }

  // Punto de apoyo de un pie sobre la superficie del modo
  function snap(p, mode) {
    if (mode === 'air') { p.y = walkHeight(p.x, p.z); return p; }
    if (mode === 'ground' || !st.m) { p.y = walkHeight(p.x, p.z, st.fy + STEP); return p; }
    const m = st.m;
    if (mode === 'cap') { const d = radial(m, p.x, p.z, tmp3), r = Math.min(d, m.Rw); p.set(m.x + tmp3.x * r, m.base + m.capY(r), m.z + tmp3.z * r); return p; }
    const h = Math.max(0, Math.min(m.climbTop, p.y - m.base)); radial(m, p.x, p.z, tmp3);
    const r = m.stemR(h); p.set(m.x + tmp3.x * r, m.base + h, m.z + tmp3.z * r); return p;
  }

  function orient(pose, dt) {
    if (dt < 0) smoothN.copy(pose.N); else smoothN.lerp(pose.N, Math.min(1, dt * 10)).normalize();
    N.copy(smoothN);
    F.copy(pose.F).addScaledVector(N, -pose.F.dot(N));
    if (F.lengthSq() < 1e-5) F.set(0, 0, 1).addScaledVector(N, -N.z);
    F.normalize();
    basis.makeBasis(tmp2.crossVectors(N, F).normalize(), N, F);
    root.quaternion.setFromRotationMatrix(basis);
    const bob = st.mode !== 'air' && Math.abs(st.speed) > 0.1 ? Math.sin(st.t * 22) * 0.012 : 0;
    root.position.copy(pose.pos).addScaledVector(N, bob - st.sniff * 0.08);
  }

  function applyPose(dt) {
    if (st.mode === 'transit') {
      const k = easeIO(tr.t);
      pos.set(0, 0, 0).addScaledVector(tr.a, (1 - k) ** 2).addScaledVector(tr.ctrl, 2 * (1 - k) * k).addScaledVector(tr.b, k * k);
      root.position.copy(pos);
      if (tr.fly) {
        // En vuelo mira hacia donde va (la tangente de la curva, en horizontal), con una leve inclinación en las curvas;
        // solo al despegar y al aterrizar se acomoda a la orientación de partida y de llegada
        tmp.set(0, 0, 0).addScaledVector(tr.a, -2 * (1 - k)).addScaledVector(tr.ctrl, 2 - 4 * k).addScaledVector(tr.b, 2 * k);
        tmp.y = 0;
        if (tmp.lengthSq() > 1e-4) { tmp.normalize(); if (tr.dir.lengthSq() > 0) { const turn = tr.dir.x * tmp.z - tr.dir.z * tmp.x; tr.bank += (Math.max(-0.5, Math.min(0.5, turn * 40)) - tr.bank) * 0.1; } tr.dir.copy(tmp); }
        tmp2.copy(UP).addScaledVector(tmp3.crossVectors(UP, tr.dir), -tr.bank).normalize();          // N con la inclinación
        tmp3.copy(tr.dir).addScaledVector(tmp2, -tr.dir.dot(tmp2)).normalize();                       // F perpendicular a N
        basis.makeBasis(tmp.crossVectors(tmp2, tmp3).normalize(), tmp2, tmp3);
        qFly.setFromRotationMatrix(basis);
        const a = easeIO(Math.min(1, tr.t / 0.18)), b = easeIO(Math.max(0, (tr.t - 0.8) / 0.2));
        root.quaternion.slerpQuaternions(tr.qa, qFly, a).slerp(tr.qb, b);
      } else root.quaternion.slerpQuaternions(tr.qa, tr.qb, k);
      N.set(0, 1, 0).applyQuaternion(root.quaternion); smoothN.copy(N);
    } else orient(poseOf(st.mode), dt);
    // en vuelo el cuerpo va más erguido (como vuelan los escarabajos de verdad)
    // (en picada, la nariz va para abajo)
    body.rotation.set(-st.sniff * 0.12 - st.chew * 0.15 - st.fly * 0.42 * (1 - st.dive) + st.dive * 0.3 + pose.bx, 0, Math.sin(st.t * 3.1) * 0.12 * st.wobble + pose.bz);
    body.position.y = pose.by;
    root.updateMatrixWorld(true);
    world.copy(body.matrixWorld);
  }

  // Pasar de un modo a otro con un pequeño salto (curva) en dur segundos
  function startTransit(toMode, setTo, dur, lift) {
    tr.a.copy(root.position); tr.qa.copy(root.quaternion);
    setTo(); st.mode = toMode;
    const pose = poseOf(toMode);
    const keepN = smoothN.clone(); orient(pose, -1); smoothN.copy(keepN);
    tr.b.copy(root.position); tr.qb.copy(root.quaternion);
    root.position.copy(tr.a); root.quaternion.copy(tr.qa);
    tr.ctrl.addVectors(tr.a, tr.b).multiplyScalar(0.5).addScaledVector(UP, lift);
    tr.t = 0; tr.dur = dur; tr.next = toMode; st.mode = 'transit'; st.speed = 0; st.landV = 0;
    tr.fly = st.flying; tr.dir.set(0, 0, 0); tr.bank = 0; // los vuelos miran hacia donde van
  }

  // Pasar al aire (salto o caída) con una velocidad inicial
  function startAir(vx, vy, vz) {
    st.p.copy(root.position); st.v.set(vx, vy, vz);
    st.mode = 'air'; st.m = null; st.hold = 0;
  }

  function restWorld(l, out) {
    out.copy(l.rest); out.z += Math.sign(st.speed) * Math.min(Math.abs(st.speed) * 0.05, 0.3);
    out.applyMatrix4(world);
    return snap(out, st.mode === 'transit' ? tr.next : st.mode);
  }

  function place(x, z, yaw) {
    Object.assign(st, { mode: 'ground', x, z, yaw, speed: 0, turn: 0, m: null, push: 0, flying: false, fy: walkHeight(x, z) });
    orient(poseOf('ground'), -1); root.updateMatrixWorld(true); world.copy(body.matrixWorld);
    for (const l of LEGS) { restWorld(l, l.foot); l.from.copy(l.foot); l.to.copy(l.foot); l.t = 1; }
  }

  // Agarrarse a un tallo o a un tronco (desde el suelo o en pleno vuelo)
  function grab(m, th, h, dur = 0.45) {
    st.flying = false;
    startTransit('stem', () => { st.m = m; st.th = th; st.h = Math.max(0.5, Math.min(m.climbTop - 0.3, h)); }, dur, 0.1);
    st.shelfCD = 0.8;
  }

  /* ---------- Movimiento por modo ---------- */
  function moveGround(dt, input) {
    // Si quedó metido dentro de algo sólido (un tronco caído, una piedra), se sube encima en vez de quedar trabado
    const inside = wallTop(st.x, st.z, st.fy);
    if (inside > -Infinity) st.fy = inside;
    const ox = st.x, oz = st.z;
    st.yaw -= st.turn * dt * (0.4 + Math.min(1, Math.abs(st.speed) / 4) * 0.6);
    st.x += Math.sin(st.yaw) * st.speed * dt; st.z += Math.cos(st.yaw) * st.speed * dt;
    const facingTo = (dx, dz, d) => -(Math.sin(st.yaw) * dx + Math.cos(st.yaw) * dz) / d;
    // Troncos de los árboles: chocar; si seguís empujando de frente, trepás
    let climb = null, th = 0, hh = 0;
    for (const o of obstacles) {
      const dx = st.x - o.x, dz = st.z - o.z; if (Math.abs(dx) > 80 || Math.abs(dz) > 80) continue;
      const c = o.climb, h = st.fy - (c ? c.base : 0);
      const d = Math.hypot(dx, dz), min = (c ? c.stemR(Math.max(0, h)) : o.r) + 0.45;
      if (d < min && d > 1e-4) {
        st.x = o.x + (dx / d) * min; st.z = o.z + (dz / d) * min;
        if (c && input.fwd > 0.3 && facingTo(dx, dz, d) > 0.5) { climb = c; th = Math.atan2(dz, dx); hh = h + 0.5; }
      }
    }
    // Hongos: chocar contra el tallo; si seguís empujando de frente, empezás a trepar
    let dome = null, dth = 0;
    for (const m of mushrooms) {
      const dx = st.x - m.x, dz = st.z - m.z; if (Math.abs(dx) > 8 || Math.abs(dz) > 8) continue;
      // Hongos bajitos (los bejines, los achaparrados): el sombrero llega casi al piso y no se pasa por abajo.
      // Se choca contra él y, si seguís empujando, te subís de un saltito.
      if (m.base + m.capY(m.Rw) - st.fy < 0.9 && m.base + m.top - st.fy > -0.3) {
        const d = Math.hypot(dx, dz), min = m.Rw + 0.35;
        if (d < min && d > 1e-4) {
          st.x = m.x + (dx / d) * min; st.z = m.z + (dz / d) * min;
          if (input.fwd > 0.3 && facingTo(dx, dz, d) > 0.5) { dome = m; dth = Math.atan2(dz, dx); }
        }
        continue;
      }
      const h = st.fy - m.base; if (h < -1.5 || h > m.climbTop - 0.5) continue; // por debajo del sombrero
      const d = Math.hypot(dx, dz), min = m.stemR(Math.max(0.4, h)) + 0.5;
      if (d < min + 0.35) st.touch = m; // las antenas llegan a tocar el tallo
      if (d < min && d > 1e-4) {
        st.x = m.x + (dx / d) * min; st.z = m.z + (dz / d) * min; st.touch = m;
        if (input.fwd > 0.3 && facingTo(dx, dz, d) > 0.5) { climb = m; th = Math.atan2(dz, dx); hh = Math.max(0.5, h + 0.5); }
      }
    }
    st.push = climb || dome ? st.push + dt : 0;
    clampB();
    if (climb && st.push > 0.3) { grab(climb, th, hh); st.push = 0; return climb.kind === 'trunk' ? 'trepa-tronco' : 'trepa'; }
    if (dome && st.push > 0.25) {
      const m = dome, r = m.Rw * 0.45; st.push = 0;
      startTransit('cap', () => { st.m = m; st.x = m.x + Math.cos(dth) * r; st.z = m.z + Math.sin(dth) * r; }, 0.5, Math.max(0.6, m.base + m.top - st.fy) * 0.6 + 0.5);
      return 'arriba';
    }

    // Paredes (troncos caídos, piedras grandes): si empujás, te trepás encima
    const wall = wallTop(st.x, st.z, st.fy);
    if (wall > -Infinity) {
      const nx = st.x, nz = st.z; st.x = ox; st.z = oz;
      st.wall = input.fwd > 0.3 ? st.wall + dt : 0;
      if (st.wall > 0.35 && wall - st.fy < 12) {
        st.wall = 0;
        const tx = nx + Math.sin(st.yaw) * 1.1, tz = nz + Math.cos(st.yaw) * 1.1, ty = walkHeight(tx, tz, st.fy + 12);
        if (ty > st.fy + STEP) { startTransit('ground', () => { st.x = tx; st.z = tz; st.fy = ty; }, 0.55, 0.7); return 'trepa'; }
      }
      return;
    }
    st.wall = 0;
    const top = walkHeight(st.x, st.z, st.fy + STEP);
    if (top < st.fy - 0.8) { // se terminó el piso: cae
      startAir(Math.sin(st.yaw) * st.speed, 0, Math.cos(st.yaw) * st.speed);
      return 'cae';
    }
    st.fy = top;
  }

  function moveStem(dt, input) {
    const m = st.m, trunk = m.kind === 'trunk';
    st.h += input.fwd * (input.run ? 5 : 3) * dt;
    st.th -= input.turn * dt * 2.2 / Math.max(0.6, m.stemR(st.h) + CLEAR);
    st.speed = input.fwd * 3;
    if (st.h <= 0.25 && input.fwd < 0) { // bajar al suelo
      const th = st.th, r = m.stemR(0.3) + 0.9, x = m.x + Math.cos(th) * r, z = m.z + Math.sin(th) * r;
      startTransit('ground', () => { st.m = null; st.x = x; st.z = z; st.fy = walkHeight(x, z, m.base + 1.5); st.yaw = Math.atan2(Math.cos(th), Math.sin(th)); }, 0.45, 0.2);
      return 'bajó';
    }
    if (trunk) {
      st.h = Math.min(st.h, m.climbTop);
      // Hongos repisa: si pasás por una, te subís
      st.shelfCD -= dt;
      if (st.shelfCD <= 0 && input.fwd !== 0) for (const sh of m.shelves) {
        const dth = Math.atan2(Math.sin(st.th - sh.th), Math.cos(st.th - sh.th)), y = m.base + st.h;
        if (Math.abs(dth) < sh.arc && y > sh.y - 1.2 && y < sh.y + 0.6) {
          const th = st.th, r = m.stemR(sh.y - m.base) + Math.min(sh.rad * 0.45, 2.4), x = m.x + Math.cos(th) * r, z = m.z + Math.sin(th) * r;
          startTransit('ground', () => { st.m = null; st.x = x; st.z = z; st.fy = walkHeight(x, z, sh.y + 1); st.yaw = Math.atan2(Math.cos(th), Math.sin(th)); }, 0.55, 0.6);
          return 'repisa';
        }
      }
    } else if (st.h >= m.climbTop) { // pasar por el borde del sombrero y salir arriba
      const th = st.th, r = m.Rw * 0.72;
      startTransit('cap', () => { st.x = m.x + Math.cos(th) * r; st.z = m.z + Math.sin(th) * r; st.yaw = Math.atan2(-Math.cos(th), -Math.sin(th)); }, 0.9, Math.max(0.6, m.capY(m.Rw) - m.climbTop + 1.2));
      return 'arriba';
    }
    st.h = Math.max(0.25, st.h);
  }

  function moveCap(dt, input) {
    const m = st.m;
    st.yaw -= st.turn * dt * (0.5 + Math.min(1, Math.abs(st.speed) / 4) * 0.5);
    st.x += Math.sin(st.yaw) * st.speed * dt; st.z += Math.cos(st.yaw) * st.speed * dt;
    const d = radial(m, st.x, st.z, tmp3);
    if (d > m.Rw * 0.97) {
      const out = Math.sin(st.yaw) * tmp3.x + Math.cos(st.yaw) * tmp3.z;
      if (out > 0.2 && input.fwd > 0) { // caminar más allá del borde: cae (al suelo o a lo que haya abajo)
        const s = Math.max(2.5, st.speed);
        startAir(Math.sin(st.yaw) * s, 1.5, Math.cos(st.yaw) * s);
        return 'cae';
      }
      st.x = m.x + tmp3.x * m.Rw * 0.97; st.z = m.z + tmp3.z * m.Rw * 0.97;
    }
  }

  // Saltar desde donde esté parado
  function jump(input) {
    if (st.mode === 'stem') {
      const th = st.th; st.yaw = Math.atan2(Math.cos(th), Math.sin(th));
      startAir(Math.cos(th) * 4.5, 6, Math.sin(th) * 4.5); st.grabCD = 0.5;
    } else {
      // Al lado de un bejín (desde el suelo): de un brinco te subís arriba, y ahí ya es un trampolín
      if (st.mode === 'ground') for (const m of mushrooms) {
        if (!m.look?.puff || m.rot || Math.abs(st.x - m.x) > 8 || Math.abs(st.z - m.z) > 8) continue;
        const d = Math.hypot(st.x - m.x, st.z - m.z), rise = m.base + m.top - st.fy + 1.2;
        if (d < m.Rw + 1.6 && rise > 0 && rise < 12) {
          const th = Math.atan2(st.z - m.z, st.x - m.x), r = m.Rw * 0.3;
          startTransit('cap', () => { st.m = m; st.x = m.x + Math.cos(th) * r; st.z = m.z + Math.sin(th) * r; st.yaw = Math.atan2(-Math.cos(th), -Math.sin(th)); }, 0.55, rise * 1.3 + 1);
          return 'brinco';
        }
      }
      const s = Math.max(0, st.speed) * 1.05 + (input.fwd > 0 ? 1.2 : 0), puff = st.mode === 'cap' && st.m.look?.puff ? st.m : null;
      startAir(Math.sin(st.yaw) * s, puff ? PUFF : JUMP, Math.cos(st.yaw) * s); st.grabCD = 0.25;
      if (puff) { st.bounceM = puff; st.bounceV = PUFF; st.hold = 0; return 'rebotó'; }
    }
    st.hold = 0;
    return 'saltó';
  }

  // La superficie más alta debajo de un punto (suelo, ramas, troncos, repisas o sombreros)
  const below = { y: 0, m: null };
  function under(x, z, maxY) {
    below.y = walkHeight(x, z, maxY); below.m = null;
    for (const m of mushrooms) {
      if (Math.abs(x - m.x) > 12 || Math.abs(z - m.z) > 12) continue;
      const r = Math.hypot(x - m.x, z - m.z); if (r >= m.Rw * 0.97) continue;
      const y = m.base + m.capY(r); if (y <= maxY && y > below.y) { below.y = y; below.m = m; }
    }
    return below;
  }

  function moveAir(dt, input) {
    let event = null;
    if (st.stuck > 0) { st.stuck -= dt; st.v.set(0, 0, 0); st.flying = false; return st.stuck <= 0 ? 'suelto' : null; }
    const f = yawDir(tmp);
    st.grabCD -= dt;
    st.yaw -= st.turn * dt * 0.8;
    if (!st.flying) {
      // Abrir las alas: manteniendo apretado el salto, o apretándolo otra vez en el aire
      st.hold = input.up ? st.hold + dt : 0;
      if (input.canFly && (input.jump || st.hold > 0.2)) { st.flying = true; event = 'despegó'; }
    } else if (!input.canFly) { st.flying = false; event = 'sin-fuerzas'; }
    // Picada: volando, X + adelante. Recoge las alas a medias y se tira en diagonal, rapidísimo
    const diving = st.flying && input.down && input.fwd > 0.3;
    if (diving && !st.diving) event = event || 'picada';
    st.diving = diving;
    st.glide = false;
    if (st.flying) {
      const sp = diving ? DIVE.speed : input.fwd * (input.run ? FLY.run : FLY.speed);
      const k = Math.min(1, dt * (diving ? 4 : 2.5));
      st.v.x += (f.x * sp - st.v.x) * k; st.v.z += (f.z * sp - st.v.z) * k;
      const ty = diving ? -DIVE.down : input.up ? FLY.up : input.down ? -FLY.down : -FLY.sink; // sin tocar nada, planea y baja despacio
      st.v.y += (ty - st.v.y) * Math.min(1, dt * (diving ? 5 : 3));
      // cerca de una superficie, frena para apoyarse suave (como un insecto que aterriza); en picada o sobre un bejín, no
      if (st.v.y < 0 && !diving) { const s = under(st.p.x, st.p.z, st.p.y), gap = st.p.y - CLEAR - s.y; if (gap < 3 && !s.m?.look?.puff) st.v.y = Math.max(st.v.y, -0.8 - gap * 1.6); }
    } else if (!input.canFly && input.up && st.v.y < 0) {
      // Planeo: sin energía para batir las alas, igual las abre y baja despacito
      st.glide = true;
      st.v.y = Math.max(-GLIDE, st.v.y - G * dt);
      const k = Math.min(1, dt * 2);
      st.v.x += (f.x * input.fwd * 6 - st.v.x) * k; st.v.z += (f.z * input.fwd * 6 - st.v.z) * k;
    } else {
      st.v.y = Math.max(-22, st.v.y - G * dt);
      st.v.x += f.x * input.fwd * 5 * dt; st.v.z += f.z * input.fwd * 5 * dt; // un poco de control en el aire
      const hs = Math.hypot(st.v.x, st.v.z); if (hs > 11) { st.v.x *= 11 / hs; st.v.z *= 11 / hs; }
    }
    // Techo suave: cuanto más cerca, más cuesta subir (así el escarabajo nunca se va de la pantalla)
    const ceil = height(st.p.x, st.p.z) + CEIL;
    if (st.v.y > 0 && st.p.y > ceil - 7) st.v.y *= Math.max(0, (ceil - st.p.y) / 7);
    const prevFeet = st.p.y - CLEAR;
    st.p.addScaledVector(st.v, dt);
    st.p.y = Math.min(st.p.y, ceil);
    st.x = st.p.x; st.z = st.p.z; clampB(); st.p.x = st.x; st.p.z = st.z;
    const feet = st.p.y - CLEAR;

    // Troncos de los árboles: si llegás volando o saltando, te agarrás
    for (const o of obstacles) {
      const dx = st.p.x - o.x, dz = st.p.z - o.z; if (Math.abs(dx) > 80 || Math.abs(dz) > 80) continue;
      const c = o.climb, h = feet - (c ? c.base : 0), d = Math.hypot(dx, dz);
      const min = (c ? c.stemR(Math.max(0, h)) : o.r) + 0.45;
      if (d < min && d > 1e-4) {
        if (c && st.grabCD <= 0 && h > 0.5 && h < c.climbTop) { grab(c, Math.atan2(dz, dx), h, 0.3); return 'agarró'; }
        st.p.x = o.x + (dx / d) * min; st.p.z = o.z + (dz / d) * min; st.v.x *= 0.3; st.v.z *= 0.3;
      }
    }
    // Hongos: el tallo se agarra; el sombrero frena desde abajo y empuja de costado
    for (const m of mushrooms) {
      const dx = st.p.x - m.x, dz = st.p.z - m.z; if (Math.abs(dx) > 12 || Math.abs(dz) > 12) continue;
      const d = Math.hypot(dx, dz), h = feet - m.base;
      if (h > 0.2 && h < m.climbTop - 0.3 && d < m.stemR(h) + 0.5 && d > 1e-4) {
        if (st.grabCD <= 0) { grab(m, Math.atan2(dz, dx), h, 0.3); return 'agarró'; }
        const min = m.stemR(h) + 0.5; st.p.x = m.x + (dx / d) * min; st.p.z = m.z + (dz / d) * min;
      }
      if (d < m.Rw + 0.3 && d > 1e-4) {
        const under = m.base + m.climbTop + 0.2, top = m.base + m.capY(Math.min(d, m.Rw));
        if (feet + 0.7 > under && feet < top - 0.15) {
          // (si venía de arriba del sombrero, es un aterrizaje: no se lo empuja de costado)
          if (prevFeet + 0.7 <= under + 0.08) { st.p.y = under - 0.7 + CLEAR; st.v.y = Math.min(0, st.v.y); }
          else if (prevFeet < top - 0.2 && (d > m.Rw * 0.85 || feet < top - 0.6)) { const min = m.Rw + 0.3; st.p.x = m.x + (dx / d) * min; st.p.z = m.z + (dz / d) * min; st.v.x *= 0.3; st.v.z *= 0.3; }
        }
      }
    }
    st.x = st.p.x; st.z = st.p.z;

    // Aterrizar: al tocar una superficie mientras baja
    const nowFeet = st.p.y - CLEAR;
    if (st.v.y <= 0.5) {
      const s = under(st.p.x, st.p.z, Math.max(prevFeet, nowFeet) + 0.3);
      if (nowFeet <= s.y) {
        // Rebotes: el bejín es un trampolín (cada rebote un poco más bajo); un sombrero grande y firme, si caés fuerte, te devuelve un saltito
        const m = s.m, impact = -st.v.y;
        const bounce = !m || m.rot ? 0 : m.look?.puff ? (impact > 6 ? Math.min(22, impact * 0.8) : 0) : m.Rw > 3.5 && impact > 13 ? impact * 0.3 : 0;
        if (bounce > 3) {
          st.p.y = s.y + CLEAR + 0.02; st.v.y = bounce; st.v.x *= 0.8; st.v.z *= 0.8;
          st.flying = false; st.hold = 0; st.dive = 0; st.bounceM = m; st.bounceV = impact; st.grabCD = 0.3;
          return m.look?.puff ? 'rebotó' : 'rebote';
        }
        const was = st.flying; st.flying = false; st.hold = 0; st.landV = impact;
        st.speed = Math.hypot(st.v.x, st.v.z) * 0.4;
        if (s.m) { st.mode = 'cap'; st.m = s.m; } else { st.mode = 'ground'; st.m = null; st.fy = s.y; }
        return (was ? 'aterrizó:' : 'cayó:') + st.mode;
      }
    }
    return event;
  }

  /* ---------- Cada cuadro ---------- */
  // input: fwd, turn, run · jump (se apretó el salto) · up (salto mantenido) · down (bajar volando) · canFly (hay energía)
  function update(dt, input) {
    st.t += dt; st.touch = null;
    let event = null;
    const slow = Math.max(0, 1 - st.sniff * 0.9 - st.chew * 0.95);
    const wob = st.wobble ? Math.sin(st.t * 2.3) * 0.7 * st.wobble : 0;
    if (st.mode === 'transit') {
      tr.t = Math.min(1, tr.t + dt / tr.dur); if (!(tr.t >= 0)) tr.t = 1; // nunca quedar a mitad de un paso
      if (tr.t >= 1) { st.mode = tr.next; smoothN.copy(poseOf(st.mode).N); event = (st.flying ? 'aterrizó:' : 'llegó:') + st.mode; st.flying = false; }
    } else {
      const target = input.fwd * (input.run ? 10 : 4.6) * slow;
      st.speed += (target - st.speed) * Math.min(1, dt * 6);
      st.turn += ((input.turn + wob) * 2.4 - st.turn) * Math.min(1, dt * 8);
      if (input.jump && st.mode !== 'air' && slow > 0.6) event = jump(input);
      else if (st.mode === 'ground') event = moveGround(dt, input) || null;
      else if (st.mode === 'stem') event = moveStem(dt, { ...input, fwd: input.fwd * slow }) || null;
      else if (st.mode === 'cap') event = moveCap(dt, input) || null;
      else event = moveAir(dt, input);
    }
    // Conductas: si lo dejás quieto un rato, hace cosas de escarabajo
    const still = (st.mode === 'ground' || st.mode === 'cap') && Math.abs(input.fwd) < 0.05 && Math.abs(input.turn) < 0.05 && !input.jump
      && Math.abs(st.speed) < 0.15 && st.sniff < 0.05 && st.chew < 0.05;
    if (!still && st.act && st.act.kind !== 'festejo' && st.act.kind !== 'estornudo') st.act = null;
    if (st.act && st.mode !== 'ground' && st.mode !== 'cap') st.act = null;
    if (still && !st.act) { st.idleT += dt; if (st.idleT > st.idleNext) { startAct(IDLE[Math.floor(Math.random() * IDLE.length)]); event = event || 'idle:' + st.act.kind; } }
    else if (!still) st.idleT = 0;
    const actEv = actPose(dt); event = event || actEv;
    if (st.mode !== 'air') st.diving = false;
    st.dive += ((st.diving ? 1 : 0) - st.dive) * Math.min(1, dt * (st.diving ? 6 : 10));
    applyPose(dt);

    // Patas: un trípode da el paso mientras el otro sostiene. Si un pie quedó lejos, paso inmediato.
    const air = st.flying || st.mode === 'air';
    const moving = Math.abs(st.speed) > 0.05 || Math.abs(st.turn) > 0.1 || st.mode === 'transit';
    const stepDur = st.mode === 'transit' ? 0.09 : 0.16 / Math.max(1, Math.abs(st.speed) / 5);
    const busy = [0, 1].map((g) => LEGS.some((l) => l.group === g && l.t < 1));
    for (const l of LEGS) {
      const hip = tmp3.copy(l.hip).applyMatrix4(world).clone();
      if (air) { // en el aire, las patas cuelgan recogidas
        l.foot.copy(l.rest).multiplyScalar(0.7).applyMatrix4(world); l.from.copy(l.foot); l.t = 1;
      }
      restWorld(l, tmp2);
      const far = l.foot.distanceTo(tmp2);
      const over = pose.legs.get(l);
      if (over && !air) { // esta pata está ocupada (limpiando, frotando): va al punto del cuerpo y vuelve
        LOCAL.set(over[0], over[1], over[2]).applyMatrix4(world);
        l.foot.copy(l.base).lerp(LOCAL, over[3]); l.from.copy(l.foot); l.t = 1;
      } else if (l.t < 1) {
        l.t = Math.min(1, l.t + dt / stepDur);
        l.to.copy(tmp2);
        l.foot.lerpVectors(l.from, l.to, l.t).addScaledVector(N, Math.sin(Math.PI * l.t) * 0.16);
      } else if (air) { /* sin pasos en el aire */
      } else if (far > 0.7 || hip.distanceTo(l.foot) > REACH) {
        l.from.copy(l.foot).lerp(tmp2, 0.5); l.t = 0; // muy lejos: paso ya, sin esperar turno
      } else if (!busy[1 - l.group] && far > (moving ? 0.24 : 0.08)) {
        l.from.copy(l.foot); l.t = 0; busy[l.group] = true;
      }
      // La pata nunca se estira más que su largo real
      const dir = tmp.subVectors(l.foot, hip); let d = dir.length();
      if (d > REACH - 0.002) { dir.multiplyScalar((REACH - 0.002) / d); d = REACH - 0.002; }
      const foot = tmp2.copy(hip).add(dir);
      dir.normalize();
      const cosA = Math.min(1, Math.max(-1, (A * A + d * d - B * B) / (2 * A * Math.max(d, 1e-4)))), sinA = Math.sqrt(1 - cosA * cosA);
      const up = N.clone().addScaledVector(dir, -N.dot(dir)).normalize();
      const knee = hip.clone().addScaledVector(dir, A * cosA).addScaledVector(up, A * sinA);
      bone(l.femur, hip, knee); bone(l.tibia, knee, foot);
      // tarso: el "pie" articulado, apoyado hacia afuera y adelante (en el aire, cuelga)
      tmp3.subVectors(foot, hip).addScaledVector(N, -tmp3.copy(foot).sub(hip).dot(N)).normalize();
      bone(l.tarsus, foot, tmp.copy(foot).addScaledVector(tmp3, 0.15).addScaledVector(N, air ? -0.06 : -0.01));
    }

    for (const a of antennae) {
      const w = Math.sin(st.t * 3 + a.side) * 0.12 + Math.sin(st.t * 38) * 0.1 * st.sniff;
      const i = a.side < 0 ? 0 : 1;
      a.base.rotation.set(0.9 - st.sniff * 0.55 + w + pose.ant[i], 0, -a.side * (0.45 + st.sniff * 0.15) + pose.antZ[i]);
      a.mid.rotation.set(-0.7 + st.sniff * 0.5 + w * 0.6, 0, a.side * 0.2);
    }
    st.fly += ((st.flying ? 1 : 0) - st.fly) * Math.min(1, dt * (st.flying ? 10 : 4));
    st.glideV += ((st.glide ? 0.9 : 0) - st.glideV) * Math.min(1, dt * 8);
    // en picada, los élitros quedan abiertos pero las alas se recogen a medias
    const vis = Math.max(st.fly, st.glideV, pose.wings);
    // Élitros: se levantan desde la bisagra de adelante y se abren en V (no se "parten": así vuelan los escarabajos)
    for (const e of elytra) e.pivot.rotation.set(vis * 0.72, -e.side * vis * 0.5 * (1 - st.dive * 0.4), e.side * vis * 0.25);
    // Alas: se despliegan desde abajo de los élitros y, ya abiertas, baten en forma de ocho (planeando, quietas)
    const open = Math.min(1, vis * 1.25) * (1 - st.dive * 0.45), beat = Math.max(0, (vis - 0.5) * 2) * (st.glide ? 0.05 : pose.wings > st.fly ? pose.beat : 1);
    for (const w of wings) {
      w.pivot.visible = vis > 0.03; w.pivot.scale.setScalar(Math.max(0.001, 0.35 + 0.65 * open));
      const ph = st.t * 72;
      w.pivot.rotation.set(0.32 * Math.cos(ph) * beat, w.side * ((1 - open) * 1.45 + 0.15), w.side * (0.12 + Math.sin(ph) * 0.8 * beat));
    }
    const c = Math.sin(st.t * 26) * st.chew * 0.5 + pose.mand;
    mandL.rotation.y = -0.4 - c; mandR.rotation.y = 0.4 + c;
    head.rotation.set(pose.hx, pose.hy, pose.hz); head.position.z = 0.7 + pose.hzPos;
    return event;
  }

  return {
    root, place, update, state: st,
    get pos() { return root.position; },
    get up() { return N; },
    forward(out = new THREE.Vector3()) { return out.set(0, 0, 1).applyQuaternion(root.quaternion); },
    heading(out = new THREE.Vector3()) { return yawDir(out); },
    setSniff(v) { st.sniff = v; }, setChew(v) { st.chew = v; }, setWobble(v) { st.wobble = v; },
    setMushrooms(list) { mushrooms = list; },
    // Conductas que se disparan desde el juego: festejar (combos, comida rica) y estornudar (esporas del bejín)
    cheer() { if (st.mode === 'ground' || st.mode === 'cap') startAct('festejo'); },
    sneeze() { if (st.mode === 'ground' || st.mode === 'cap') startAct('estornudo'); },
    get act() { return st.act?.kind || null; },
    doAct(kind) { startAct(kind); }, // (para probar una conducta)
    // Un sombrerito en la cabeza
    wear(obj) { head.add(obj); obj.traverse((o) => { if (o.isMesh) o.castShadow = true; }); },
    // Pegado en una tela de araña: queda colgado, forcejeando, y después cae
    stick(dur) { if (st.mode !== 'air') return; st.stuck = dur; st.flying = false; st.dive = 0; st.diving = false; },
    get dive() { return st.dive; },
    get gliding() { return st.glide; },
    get bounced() { return st.bounceM; },
    get bounceV() { return st.bounceV || 0; },
    // Un golpe (el pájaro): deja de volar y sale despedido
    knock(dx, dz) {
      if (st.mode === 'transit') return;
      if (st.mode === 'stem') return;
      st.flying = false; st.act = null;
      startAir(dx * 7, 6, dz * 7); st.grabCD = 0.4;
    },
    get touching() { return st.touch; },
    get flying() { return st.flying; },
    // ¿En el aire? (saltando, cayendo o volando)
    get airborne() { return st.mode === 'air' || (st.mode === 'transit' && st.flying); },
    // Altura sobre el suelo (para la voz y la cámara)
    get altitude() { return root.position.y - height(root.position.x, root.position.z); },
    // Volar hasta un punto del suelo (viaje entre claros)
    flyToGround(x, z, yaw, dur, lift) {
      if (st.mode === 'transit') return false;
      st.flying = true;
      startTransit('ground', () => { st.m = null; st.x = x; st.z = z; st.yaw = yaw; st.fy = walkHeight(x, z, height(x, z) + STEP); }, dur, lift);
      return true;
    },
    // Volar hasta arriba del sombrero de un hongo
    flyTo(m) {
      if (st.mode === 'transit') return false;
      const from = root.position, d = Math.hypot(m.x - from.x, m.z - from.z);
      const a = Math.atan2(from.z - m.z, from.x - m.x), r = m.Rw * 0.35;
      st.flying = true;
      startTransit('cap', () => { st.m = m; st.x = m.x + Math.cos(a) * r; st.z = m.z + Math.sin(a) * r; st.yaw = Math.atan2(-Math.cos(a), -Math.sin(a)); },
        Math.min(2.6, 0.9 + d / 22), Math.max(4, d * 0.35) + Math.max(0, m.base + m.top - from.y));
      return true;
    },
    get mode() { return st.mode === 'transit' ? tr.next : st.mode; },
    // El hongo en el que está (sombrero o tallo); los troncos de los árboles no cuentan
    get on() { return st.m && st.m.kind !== 'trunk' ? st.m : null; },
    get onTrunk() { return st.m?.kind === 'trunk'; }
  };
}
