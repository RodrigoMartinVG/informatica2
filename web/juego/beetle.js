// El escarabajo: armado y animado 100 % por código.
// Las seis patas caminan con "marcha en trípode" (como los insectos reales) y
// cinemática inversa de dos huesos: cada pie busca su lugar en el suelo y la rodilla se acomoda sola.
import * as THREE from 'three/webgpu';
import { height } from './config.js';
import { obstacles } from './world.js';

const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

// Coloca un cilindro (alto 1 en Y) entre dos puntos
function bone(mesh, a, b) {
  tmp.subVectors(b, a); const len = tmp.length();
  mesh.position.copy(a).addScaledVector(tmp, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, tmp.normalize());
  mesh.scale.set(1, len, 1);
}

export function createBeetle(scene) {
  const root = new THREE.Group(); // posición y rumbo en el mundo
  const body = new THREE.Group(); root.add(body);

  // Caparazón iridiscente (como los escarabajos de verdad): metal + barniz + iridiscencia
  const shell = new THREE.MeshPhysicalMaterial({
    color: '#2d6a3e', metalness: 0.7, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08,
    iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [250, 800]
  });
  const dark = new THREE.MeshStandardMaterial({ color: '#15110c', roughness: 0.45, metalness: 0.2 });
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: '#050505', roughness: 0.05, clearcoat: 1 });

  const add = (geo, mat, [x, y, z], [sx, sy, sz] = [1, 1, 1], parent = body) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const sph = new THREE.SphereGeometry(1, 40, 28);
  const dome = new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2);
  add(dome, shell, [0, 0.27, -0.12], [0.43, 0.3, 0.62]);              // élitros
  add(new THREE.BoxGeometry(0.012, 0.01, 1.2), dark, [0, 0.572, -0.12]); // costura entre élitros
  add(sph, dark, [0, 0.25, -0.1], [0.4, 0.1, 0.6]);                    // vientre
  add(sph, shell, [0, 0.32, 0.47], [0.31, 0.17, 0.22]);                // pronoto
  const head = new THREE.Group(); head.position.set(0, 0.3, 0.68); body.add(head);
  add(sph, dark, [0, 0, 0.04], [0.17, 0.12, 0.15], head);
  add(sph, eyeMat, [0.12, 0.03, 0.08], [0.05, 0.05, 0.05], head);
  add(sph, eyeMat, [-0.12, 0.03, 0.08], [0.05, 0.05, 0.05], head);
  const mand = new THREE.ConeGeometry(0.035, 0.16, 8); mand.rotateX(Math.PI / 2);
  add(mand, dark, [0.06, -0.04, 0.2], [1, 1, 1], head).rotation.y = -0.4;
  add(mand, dark, [-0.06, -0.04, 0.2], [1, 1, 1], head).rotation.y = 0.4;

  // Antenas: tres segmentos cada una, con una "maza" al final
  const seg = new THREE.CylinderGeometry(0.012, 0.014, 1, 6); seg.translate(0, 0.5, 0);
  const antennae = [-1, 1].map((side) => {
    const base = new THREE.Group(); base.position.set(side * 0.08, 0.07, 0.12); head.add(base);
    const a = new THREE.Mesh(seg, dark); a.scale.set(1, 0.22, 1); base.add(a);
    const mid = new THREE.Group(); mid.position.y = 0.22; base.add(mid);
    const b = new THREE.Mesh(seg, dark); b.scale.set(1, 0.24, 1); mid.add(b);
    const club = new THREE.Mesh(sph, dark); club.scale.set(0.03, 0.06, 0.03); club.position.y = 0.26; mid.add(club);
    return { base, mid, side };
  });

  // Patas: cadera en el cuerpo, fémur + tibia hasta el pie
  const legGeo = new THREE.CylinderGeometry(0.032, 0.045, 1, 7);
  const LEGS = [
    { hip: [0.18, 0.24, 0.42], rest: [0.5, 0, 0.66] }, { hip: [0.2, 0.22, 0.12], rest: [0.56, 0, 0.12] }, { hip: [0.18, 0.22, -0.2], rest: [0.52, 0, -0.52] }
  ].flatMap((l, i) => [-1, 1].map((side) => ({
    hip: new THREE.Vector3(l.hip[0] * side, l.hip[1], l.hip[2]), rest: new THREE.Vector3(l.rest[0] * side, 0, l.rest[2]),
    group: (i + (side > 0 ? 1 : 0)) % 2, // trípode A / B
    femur: new THREE.Mesh(legGeo, dark), tibia: new THREE.Mesh(legGeo, dark),
    foot: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3(), t: 1, side
  })));
  for (const l of LEGS) { l.femur.castShadow = l.tibia.castShadow = true; scene.add(l.femur, l.tibia); }
  const A = 0.34, B = 0.4; // largo de fémur y tibia

  scene.add(root);

  const st = { x: 0, z: 0, yaw: Math.PI, speed: 0, turn: 0, sniff: 0, t: 0, pitch: 0, roll: 0, y: 0 };
  const world = new THREE.Matrix4();

  function place(x, z, yaw) {
    st.x = x; st.z = z; st.yaw = yaw; st.speed = 0;
    updateBody(0);
    for (const l of LEGS) { restWorld(l, l.foot); l.from.copy(l.foot); l.to.copy(l.foot); l.t = 1; }
  }

  function restWorld(l, out) {
    out.copy(l.rest); out.z += Math.sign(st.speed) * Math.min(Math.abs(st.speed) * 0.05, 0.3);
    out.applyMatrix4(world); out.y = height(out.x, out.z);
    return out;
  }

  function updateBody(dt) {
    const h = (dx, dz) => { const c = Math.cos(st.yaw), s = Math.sin(st.yaw); return height(st.x + dx * c + dz * s, st.z - dx * s + dz * c); };
    const front = h(0, 0.6), back = h(0, -0.6), left = h(-0.5, 0), right = h(0.5, 0);
    st.pitch += (Math.atan2(back - front, 1.2) - st.pitch) * Math.min(1, dt * 8);
    st.roll += (Math.atan2(right - left, 1.0) - st.roll) * Math.min(1, dt * 8);
    const bob = Math.abs(st.speed) > 0.1 ? Math.sin(st.t * 22) * 0.012 : 0;
    st.y = (front + back + left + right) / 4 + 0.3 + bob - st.sniff * 0.08;
    root.position.set(st.x, st.y, st.z);
    root.rotation.set(0, st.yaw, 0);
    body.rotation.set(st.pitch - st.sniff * 0.12, 0, st.roll);
    root.updateMatrixWorld(true);
    world.copy(body.matrixWorld);
  }

  // input: { fwd: -1..1, turn: -1..1, run: bool }
  function update(dt, input) {
    st.t += dt;
    const target = input.fwd * (input.run ? 10 : 4.6) * (1 - st.sniff * 0.9);
    st.speed += (target - st.speed) * Math.min(1, dt * 6);
    st.turn += (input.turn * 2.4 - st.turn) * Math.min(1, dt * 8);
    st.yaw -= st.turn * dt * (0.4 + Math.min(1, Math.abs(st.speed) / 4) * 0.6);
    st.x += Math.sin(st.yaw) * st.speed * dt; st.z += Math.cos(st.yaw) * st.speed * dt;

    // Choques con hongos, piedras y troncos: empuja hacia afuera del círculo
    for (const o of obstacles) {
      const dx = st.x - o.x, dz = st.z - o.z, d = Math.hypot(dx, dz), min = o.r + 0.45;
      if (d < min && d > 1e-4) { st.x = o.x + (dx / d) * min; st.z = o.z + (dz / d) * min; }
    }
    st.x = Math.max(-190, Math.min(190, st.x)); st.z = Math.max(-390, Math.min(40, st.z));
    updateBody(dt);

    // Patas: un trípode da el paso mientras el otro sostiene
    const moving = Math.abs(st.speed) > 0.05 || Math.abs(st.turn) > 0.1;
    const stepDur = 0.16 / Math.max(1, Math.abs(st.speed) / 5);
    const busy = [0, 1].map((g) => LEGS.some((l) => l.group === g && l.t < 1));
    for (const l of LEGS) {
      if (l.t < 1) {
        l.t = Math.min(1, l.t + dt / stepDur);
        restWorld(l, l.to);
        l.foot.lerpVectors(l.from, l.to, l.t); l.foot.y += Math.sin(Math.PI * l.t) * 0.16;
      } else {
        restWorld(l, tmp2);
        if (!busy[1 - l.group] && (l.foot.distanceTo(tmp2) > (moving ? 0.24 : 0.08))) { l.from.copy(l.foot); l.t = 0; busy[l.group] = true; }
      }
      // Cinemática inversa de dos huesos
      const hip = l.hip.clone().applyMatrix4(world);
      const dir = tmp.subVectors(l.foot, hip); let d = dir.length(); dir.normalize();
      d = Math.min(d, A + B - 0.001);
      const cosA = (A * A + d * d - B * B) / (2 * A * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
      const up = UP.clone().addScaledVector(dir, -UP.dot(dir)).normalize();
      const knee = hip.clone().addScaledVector(dir, A * cosA).addScaledVector(up, A * sinA);
      bone(l.femur, hip, knee); bone(l.tibia, knee, l.foot);
    }

    // Antenas: se mueven suave al caminar y vibran al olfatear
    for (const a of antennae) {
      const w = Math.sin(st.t * 3 + a.side) * 0.12 + Math.sin(st.t * 38) * 0.1 * st.sniff;
      a.base.rotation.set(0.9 - st.sniff * 0.55 + w, 0, -a.side * (0.45 + st.sniff * 0.15));
      a.mid.rotation.set(-0.7 + st.sniff * 0.5 + w * 0.6, 0, a.side * 0.2);
    }
  }

  return {
    root, place, update, state: st,
    get pos() { return root.position; },
    forward(out = new THREE.Vector3()) { return out.set(Math.sin(st.yaw), 0, Math.cos(st.yaw)); },
    setSniff(v) { st.sniff = v; }
  };
}
