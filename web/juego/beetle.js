// El escarabajo: armado y animado 100 % por código.
// Puede caminar por el suelo (y trepar ramas y piedras), subir por el tallo de un hongo,
// caminar sobre el sombrero y saltar de vuelta al suelo.
// Las seis patas caminan con "marcha en trípode" y cinemática inversa de dos huesos.
import * as THREE from 'three/webgpu';
import { walkHeight, walkNormal } from './surfaces.js';
import { obstacles } from './world.js';

const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();
const CLEAR = 0.3; // altura del cuerpo sobre la superficie

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
  // Élitros: dos mitades que se abren para volar, con las alas membranosas debajo
  const elytra = [-1, 1].map((side) => {
    const pivot = new THREE.Group(); pivot.position.set(0, -0.03, 0.46); body.add(pivot);
    const geo = new THREE.SphereGeometry(1, 24, 20, side > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI, 0, Math.PI / 2);
    const m = new THREE.Mesh(geo, shell); m.position.set(0, 0, -0.58); m.scale.set(0.43, 0.3, 0.62); m.castShadow = true; pivot.add(m);
    return { pivot, side };
  });
  const wingMat = new THREE.MeshPhysicalMaterial({ color: '#d7e3ea', roughness: 0.15, transparent: true, opacity: 0.4, side: THREE.DoubleSide, iridescence: 0.6, depthWrite: false });
  const wingGeo = new THREE.PlaneGeometry(1.05, 0.34); wingGeo.rotateX(-Math.PI / 2); wingGeo.translate(0.52, 0, -0.05);
  const wings = [-1, 1].map((side) => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.1, 0.12, 0.3); body.add(pivot);
    const w = new THREE.Mesh(wingGeo, wingMat); w.scale.x = side; pivot.add(w); pivot.visible = false;
    return { pivot, side };
  });
  add(sph, dark, [0, -0.05, -0.1], [0.4, 0.1, 0.6]);                       // vientre
  add(sph, shell, [0, 0.02, 0.47], [0.31, 0.17, 0.22]);                    // pronoto
  const head = new THREE.Group(); head.position.set(0, 0, 0.68); body.add(head);
  add(sph, dark, [0, 0, 0.04], [0.17, 0.12, 0.15], head);
  add(sph, eyeMat, [0.12, 0.03, 0.08], [0.05, 0.05, 0.05], head);
  add(sph, eyeMat, [-0.12, 0.03, 0.08], [0.05, 0.05, 0.05], head);
  const mand = new THREE.ConeGeometry(0.035, 0.16, 8); mand.rotateX(Math.PI / 2);
  const mandL = add(mand, dark, [0.06, -0.04, 0.2], [1, 1, 1], head), mandR = add(mand, dark, [-0.06, -0.04, 0.2], [1, 1, 1], head);

  const seg = new THREE.CylinderGeometry(0.012, 0.014, 1, 6); seg.translate(0, 0.5, 0);
  const antennae = [-1, 1].map((side) => {
    const base = new THREE.Group(); base.position.set(side * 0.08, 0.07, 0.12); head.add(base);
    const a = new THREE.Mesh(seg, dark); a.scale.set(1, 0.22, 1); base.add(a);
    const mid = new THREE.Group(); mid.position.y = 0.22; base.add(mid);
    const b = new THREE.Mesh(seg, dark); b.scale.set(1, 0.24, 1); mid.add(b);
    const club = new THREE.Mesh(sph, dark); club.scale.set(0.03, 0.06, 0.03); club.position.y = 0.26; mid.add(club);
    return { base, mid, side };
  });

  // Patas: cadera (en el cuerpo) → rodilla → pie (en la superficie)
  const legGeo = new THREE.CylinderGeometry(0.032, 0.045, 1, 7);
  const A = 0.34, B = 0.4, REACH = A + B;
  const LEGS = [
    { hip: [0.18, -0.06, 0.42], rest: [0.5, -CLEAR, 0.66] }, { hip: [0.2, -0.08, 0.12], rest: [0.56, -CLEAR, 0.12] }, { hip: [0.18, -0.08, -0.2], rest: [0.52, -CLEAR, -0.52] }
  ].flatMap((l, i) => [-1, 1].map((side) => ({
    hip: new THREE.Vector3(l.hip[0] * side, l.hip[1], l.hip[2]), rest: new THREE.Vector3(l.rest[0] * side, l.rest[1], l.rest[2]),
    group: (i + (side > 0 ? 1 : 0)) % 2,
    femur: new THREE.Mesh(legGeo, dark), tibia: new THREE.Mesh(legGeo, dark),
    foot: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3(), t: 1
  })));
  for (const l of LEGS) { l.femur.castShadow = l.tibia.castShadow = true; scene.add(l.femur, l.tibia); }
  scene.add(root);

  /* ---------- Estado ---------- */
  // mode: 'ground' | 'stem' | 'cap' | 'transit'
  const st = { mode: 'ground', x: 0, z: 0, yaw: Math.PI, speed: 0, turn: 0, sniff: 0, chew: 0, t: 0, m: null, th: 0, h: 0, push: 0, wobble: 0, touch: null, flying: false, fly: 0 };
  let mushrooms = [];
  const pos = new THREE.Vector3(), N = new THREE.Vector3(0, 1, 0), F = new THREE.Vector3(0, 0, 1);
  const smoothN = new THREE.Vector3(0, 1, 0);
  const basis = new THREE.Matrix4(), world = new THREE.Matrix4();
  const tr = { a: new THREE.Vector3(), b: new THREE.Vector3(), ctrl: new THREE.Vector3(), t: 1, dur: 0.7, qa: new THREE.Quaternion(), qb: new THREE.Quaternion(), next: 'ground' };

  const yawDir = (out) => out.set(Math.sin(st.yaw), 0, Math.cos(st.yaw));
  const radial = (m, x, z, out) => { out.set(x - m.x, 0, z - m.z); const d = out.length(); if (d < 1e-4) out.set(1, 0, 0); else out.divideScalar(d); return d; };

  // Pose (posición, normal y frente) según el modo
  const P = { pos: new THREE.Vector3(), N: new THREE.Vector3(), F: new THREE.Vector3() };
  function poseOf(mode, out = P) {
    if (mode === 'ground') {
      walkNormal(st.x, st.z, out.N);
      out.pos.set(st.x, walkHeight(st.x, st.z), st.z).addScaledVector(out.N, CLEAR);
      yawDir(out.F);
    } else if (mode === 'cap') {
      const m = st.m, d = radial(m, st.x, st.z, tmp3), r = Math.min(d, m.Rw);
      const slope = (m.capY(r + 0.15) - m.capY(Math.max(0, r - 0.15))) / 0.3;
      out.N.copy(tmp3).multiplyScalar(-slope).add(UP).normalize();
      out.pos.set(st.x, m.base + m.capY(r), st.z).addScaledVector(out.N, CLEAR);
      yawDir(out.F);
    } else {
      const m = st.m; tmp3.set(Math.cos(st.th), 0, Math.sin(st.th));
      out.N.copy(tmp3); out.pos.set(m.x, m.base + st.h, m.z).addScaledVector(tmp3, m.stemR(st.h) + CLEAR);
      out.F.copy(UP);
    }
    return out;
  }

  // Punto de apoyo de un pie sobre la superficie del modo
  function snap(p, mode) {
    if (mode === 'ground' || !st.m) { p.y = walkHeight(p.x, p.z); return p; }
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
    const bob = Math.abs(st.speed) > 0.1 ? Math.sin(st.t * 22) * 0.012 : 0;
    root.position.copy(pose.pos).addScaledVector(N, bob - st.sniff * 0.08);
  }

  function applyPose(dt) {
    if (st.mode === 'transit') {
      const k = easeIO(tr.t);
      pos.set(0, 0, 0).addScaledVector(tr.a, (1 - k) ** 2).addScaledVector(tr.ctrl, 2 * (1 - k) * k).addScaledVector(tr.b, k * k);
      root.position.copy(pos); root.quaternion.slerpQuaternions(tr.qa, tr.qb, k);
      N.set(0, 1, 0).applyQuaternion(root.quaternion); smoothN.copy(N);
    } else orient(poseOf(st.mode), dt);
    body.rotation.set(-st.sniff * 0.12 - st.chew * 0.15, 0, Math.sin(st.t * 3.1) * 0.12 * st.wobble);
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
    tr.t = 0; tr.dur = dur; tr.next = toMode; st.mode = 'transit'; st.speed = 0;
  }

  function restWorld(l, out) {
    out.copy(l.rest); out.z += Math.sign(st.speed) * Math.min(Math.abs(st.speed) * 0.05, 0.3);
    out.applyMatrix4(world);
    return snap(out, st.mode === 'transit' ? tr.next : st.mode);
  }

  function place(x, z, yaw) {
    Object.assign(st, { mode: 'ground', x, z, yaw, speed: 0, turn: 0, m: null, push: 0 });
    orient(poseOf('ground'), -1); root.updateMatrixWorld(true); world.copy(body.matrixWorld);
    for (const l of LEGS) { restWorld(l, l.foot); l.from.copy(l.foot); l.to.copy(l.foot); l.t = 1; }
  }

  /* ---------- Movimiento por modo ---------- */
  function moveGround(dt, input) {
    st.yaw -= st.turn * dt * (0.4 + Math.min(1, Math.abs(st.speed) / 4) * 0.6);
    st.x += Math.sin(st.yaw) * st.speed * dt; st.z += Math.cos(st.yaw) * st.speed * dt;
    for (const o of obstacles) {
      const dx = st.x - o.x, dz = st.z - o.z, d = Math.hypot(dx, dz), min = o.r + 0.45;
      if (d < min && d > 1e-4) { st.x = o.x + (dx / d) * min; st.z = o.z + (dz / d) * min; }
    }
    // Hongos: chocar contra el tallo; si seguís empujando de frente, empezás a trepar
    let climb = null;
    for (const m of mushrooms) {
      const dx = st.x - m.x, dz = st.z - m.z; if (Math.abs(dx) > 8 || Math.abs(dz) > 8) continue;
      const d = Math.hypot(dx, dz), min = m.stemR(0.4) + 0.5;
      if (d < min + 0.35) st.touch = m; // las antenas llegan a tocar el tallo
      if (d < min && d > 1e-4) {
        st.x = m.x + (dx / d) * min; st.z = m.z + (dz / d) * min; st.touch = m;
        const facing = -(Math.sin(st.yaw) * dx + Math.cos(st.yaw) * dz) / d;
        if (input.fwd > 0.3 && facing > 0.5) climb = m;
      }
    }
    st.push = climb ? st.push + dt : 0;
    st.x = Math.max(-190, Math.min(190, st.x)); st.z = Math.max(-390, Math.min(40, st.z));
    if (climb && st.push > 0.3) {
      const m = climb, th = Math.atan2(st.z - m.z, st.x - m.x);
      startTransit('stem', () => { st.m = m; st.th = th; st.h = 0.5; }, 0.45, 0.1);
      st.push = 0; return 'trepa';
    }
  }

  function moveStem(dt, input) {
    const m = st.m;
    st.h += input.fwd * (input.run ? 5 : 3) * dt;
    st.th -= input.turn * dt * 2.2 / Math.max(0.6, m.stemR(st.h) + CLEAR);
    st.speed = input.fwd * 3;
    if (st.h <= 0.25 && input.fwd < 0) { // bajar al suelo
      const th = st.th, r = m.stemR(0.3) + 0.9;
      startTransit('ground', () => { st.m = null; st.x = m.x + Math.cos(th) * r; st.z = m.z + Math.sin(th) * r; st.yaw = Math.atan2(Math.cos(th), Math.sin(th)); }, 0.45, 0.2);
      return 'bajó';
    }
    if (st.h >= m.climbTop) { // pasar por el borde del sombrero y salir arriba
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
      if (out > 0.2 && input.fwd > 0) { // saltar desde el borde
        const dir = tmp3.clone(), r = m.Rw + 1.8;
        startTransit('ground', () => { st.m = null; st.x = m.x + dir.x * r; st.z = m.z + dir.z * r; }, 0.75, 1.5);
        return 'saltó';
      }
      st.x = m.x + tmp3.x * m.Rw * 0.97; st.z = m.z + tmp3.z * m.Rw * 0.97;
    }
  }

  /* ---------- Cada cuadro ---------- */
  function update(dt, input) {
    st.t += dt; st.touch = null;
    let event = null;
    const slow = Math.max(0, 1 - st.sniff * 0.9 - st.chew * 0.95);
    const wob = st.wobble ? Math.sin(st.t * 2.3) * 0.7 * st.wobble : 0;
    if (st.mode === 'transit') {
      tr.t = Math.min(1, tr.t + dt / tr.dur);
      if (tr.t >= 1) { st.mode = tr.next; smoothN.copy(poseOf(st.mode).N); event = (st.flying ? 'aterrizó:' : 'llegó:') + st.mode; st.flying = false; }
    } else {
      const target = input.fwd * (input.run ? 10 : 4.6) * slow;
      st.speed += (target - st.speed) * Math.min(1, dt * 6);
      st.turn += ((input.turn + wob) * 2.4 - st.turn) * Math.min(1, dt * 8);
      if (st.mode === 'ground') event = moveGround(dt, input) || null;
      else if (st.mode === 'stem') event = moveStem(dt, { ...input, fwd: input.fwd * slow }) || null;
      else event = moveCap(dt, input) || null;
    }
    applyPose(dt);

    // Patas: un trípode da el paso mientras el otro sostiene. Si un pie quedó lejos, paso inmediato.
    const moving = Math.abs(st.speed) > 0.05 || Math.abs(st.turn) > 0.1 || st.mode === 'transit';
    const stepDur = st.mode === 'transit' ? 0.09 : 0.16 / Math.max(1, Math.abs(st.speed) / 5);
    const busy = [0, 1].map((g) => LEGS.some((l) => l.group === g && l.t < 1));
    for (const l of LEGS) {
      const hip = tmp3.copy(l.hip).applyMatrix4(world).clone();
      if (st.flying) { // en el aire, las patas cuelgan recogidas
        l.foot.copy(l.rest).multiplyScalar(0.7).applyMatrix4(world); l.from.copy(l.foot); l.t = 1;
      }
      restWorld(l, tmp2);
      const far = l.foot.distanceTo(tmp2);
      if (l.t < 1) {
        l.t = Math.min(1, l.t + dt / stepDur);
        l.to.copy(tmp2);
        l.foot.lerpVectors(l.from, l.to, l.t).addScaledVector(N, Math.sin(Math.PI * l.t) * 0.16);
      } else if (st.flying) { /* sin pasos en el aire */
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
    }

    for (const a of antennae) {
      const w = Math.sin(st.t * 3 + a.side) * 0.12 + Math.sin(st.t * 38) * 0.1 * st.sniff;
      a.base.rotation.set(0.9 - st.sniff * 0.55 + w, 0, -a.side * (0.45 + st.sniff * 0.15));
      a.mid.rotation.set(-0.7 + st.sniff * 0.5 + w * 0.6, 0, a.side * 0.2);
    }
    st.fly += ((st.flying ? 1 : 0) - st.fly) * Math.min(1, dt * (st.flying ? 10 : 4));
    for (const e of elytra) { e.pivot.rotation.x = st.fly * 0.75; e.pivot.rotation.z = e.side * st.fly * 0.55; }
    for (const w of wings) {
      w.pivot.visible = st.fly > 0.05; w.pivot.scale.setScalar(Math.max(0.001, st.fly));
      w.pivot.rotation.set(0.25 * st.fly, 0, w.side * (0.2 + Math.sin(st.t * 75) * 0.7) * st.fly);
    }
    const c = Math.sin(st.t * 26) * st.chew * 0.5;
    mandL.rotation.y = -0.4 - c; mandR.rotation.y = 0.4 + c;
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
    get touching() { return st.touch; },
    get flying() { return st.flying; },
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
    get on() { return st.m; }
  };
}
