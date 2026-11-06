// Aventuras para jugar (no para aprender): esporas doradas escondidas, un circuito de aros para volar con cronómetro,
// escarabajos amigos perdidos que te siguen, telas de araña que frenan y sombreritos para el escarabajo.
// Todo se arma con geometría simple y sin archivos nuevos: no suma tiempo de carga.
import * as THREE from 'three/webgpu';
import { color, float, sin, time } from 'three/tsl';
import { walkHeight } from './surfaces.js';
import { height, LEVELS, SPAWN, rng } from './config.js';
import { obstacles, logs } from './world.js';
import { buildMushroom, pickRow, LOOKS } from './hongos3d.js';
import { HATS, FRIENDS, PH } from './aventuras-datos.js';

const KEY = 'bajo-el-sombrero:aventuras';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };

export { HATS };

export function createAdventures({ scene, beetle, flora, S, tip, floatText, game, drawStatus, secrets }) {
  const secret = (id) => secrets?.hit(id);
  const saved = Object.assign({ hats: [], hat: null, best: null }, load());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* sin almacenamiento */ } };
  const r = rng(4242);
  const hud = document.getElementById('adv');
  const glow = (hex, k) => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = color(hex).mul(k); return m; };

  /* ---------- Esporas doradas: 5 por claro (y 3 en la salida), en lugares difíciles ---------- */
  const gold = [];
  const addGold = (x, y, z, area) => gold.push({ p: new THREE.Vector3(x, y, z), area, got: false, ph: r() * 6 });
  // un punto en el aire, lejos de hongos y de árboles (para llegar hay que volar)
  const free = (x, y, z) => !flora.all.some((m) => Math.hypot(m.x - x, m.z - z) < m.Rw + 1.5 && m.base + m.top > y - 3) && !obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 4);
  const airGold = (cx, cz, spread, area) => {
    for (let k = 0; k < 80; k++) {
      const a = r() * 6.28, d = spread * (0.2 + r() * 0.7), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, y = height(x, z) + 13 + r() * 7;
      if (free(x, y, z)) return addGold(x, y, z, area);
    }
  };
  const shelfSpot = (cx, cz, maxD) => { // la repisa más alta del árbol más cercano
    let best = null, bd = maxD;
    for (const o of obstacles) { const d = Math.hypot(o.x - cx, o.z - cz); if (o.climb?.shelves.length && d < bd) { bd = d; best = o; } }
    if (!best) return null;
    const c = best.climb, sh = c.shelves.reduce((a, b) => (b.y > a.y ? b : a));
    const rr = c.stemR(sh.y - c.base) + sh.rad * 0.5;
    return [c.x + Math.cos(sh.th) * rr, sh.y + 1.3, c.z + Math.sin(sh.th) * rr];
  };
  for (const L of LEVELS) {
    const mine = flora.all.filter((m) => m.level === L.id).sort((a, b) => b.base + b.top - (a.base + a.top));
    for (const m of mine.slice(0, 2)) addGold(m.x, m.base + m.top + 1.1, m.z, L.id); // arriba de los más altos
    const sh = shelfSpot(L.at.x, L.at.z, 120); if (sh) addGold(...sh, L.id);            // en la repisa más alta de un árbol
    for (let i = 0; i < 5 - (sh ? 3 : 2); i++) airGold(L.at.x, L.at.z, L.spread, L.id); // en el aire: hay que volar
  }
  { // la salida: arriba de un bejín, arriba de un tronco caído y en el aire
    const puff = flora.all.find((m) => m.species === 'lycoperdon'); if (puff) addGold(puff.x, puff.base + puff.top + 4.5, puff.z, 'inicio');
    const lg = logs.reduce((a, b) => (Math.hypot(b.x - SPAWN.x, b.z - SPAWN.z) < Math.hypot(a.x - SPAWN.x, a.z - SPAWN.z) ? b : a), logs[0]);
    if (lg) addGold(lg.x, lg.cy + lg.rad + 1.4, lg.z, 'inicio');
    airGold(SPAWN.x, SPAWN.z - 4, 16, 'inicio');
  }
  const goldMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.32, 0), glow('#ffd24a', 3.2), gold.length);
  goldMesh.frustumCulled = false; scene.add(goldMesh);
  const gm = new THREE.Matrix4(), gq = new THREE.Quaternion(), gs = new THREE.Vector3(), ge = new THREE.Euler();
  const areaName = (id) => (id === 'inicio' ? 'la salida' : LEVELS.find((L) => L.id === id).place);
  const goldOf = (area) => { const list = gold.filter((g) => g.area === area); return [list.filter((g) => g.got).length, list.length]; };

  /* ---------- Aros de vuelo: un circuito alrededor de la salida ---------- */
  const rings = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2, R = 26 + Math.sin(i * 1.7) * 5;
    let x = SPAWN.x + Math.cos(a) * R, z = SPAWN.z - 20 + Math.sin(a) * R * 0.9;
    for (const o of obstacles) { const d = Math.hypot(x - o.x, z - o.z); if (d < o.r + 5) { x = o.x + ((x - o.x) / (d || 1)) * (o.r + 5); z = o.z + ((z - o.z) / (d || 1)) * (o.r + 5); } }
    rings.push({ c: new THREE.Vector3(x, height(x, z) + 7 + (i % 3) * 3.5, z), n: new THREE.Vector3(), R: 2.4, prev: 0 });
  }
  const ringGeo = new THREE.TorusGeometry(2.4, 0.16, 8, 40);
  const ringMat = [glow('#ffe27a', 2.6), glow('#9fe8c8', 1.2), new THREE.MeshBasicMaterial({ color: '#f4efe0', transparent: true, opacity: 0.35 })];
  ringMat[0].colorNode = color('#ffe27a').mul(sin(time.mul(6)).mul(0.8).add(2.6)); // el aro que sigue late
  rings.forEach((g, i) => {
    const nx = rings[(i + 1) % rings.length].c, pv = rings[(i + rings.length - 1) % rings.length].c;
    g.n.subVectors(nx, pv).normalize();
    g.mesh = new THREE.Mesh(ringGeo, ringMat[2]); g.mesh.position.copy(g.c);
    g.mesh.lookAt(g.c.clone().add(g.n)); scene.add(g.mesh);
  });
  const race = { next: 0, t: 0, on: false, since: 0 };
  const pathLen = rings.reduce((s, g, i) => s + (i ? g.c.distanceTo(rings[i - 1].c) : 0), 0);
  const paintRings = () => rings.forEach((g, i) => (g.mesh.material = i === race.next ? ringMat[0] : i === race.next + 1 ? ringMat[1] : ringMat[2]));
  paintRings();

  /* ---------- Escarabajos amigos perdidos ---------- */
  const legGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.42, 5); legGeo.translate(0, -0.21, 0);
  const sph = new THREE.SphereGeometry(1, 16, 12), darkMat = new THREE.MeshStandardMaterial({ color: '#17130e', roughness: 0.4, metalness: 0.3 });
  const elyGeoR = new THREE.SphereGeometry(1, 16, 10, Math.PI / 2, Math.PI, 0, Math.PI / 2), elyGeoL = new THREE.SphereGeometry(1, 16, 10, -Math.PI / 2, Math.PI, 0, Math.PI / 2);
  const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0.05); wingShape.bezierCurveTo(0.3, 0.14, 0.75, 0.16, 1, 0.03); wingShape.bezierCurveTo(1.05, -0.08, 0.6, -0.2, 0, -0.04);
  const wingGeo = new THREE.ShapeGeometry(wingShape, 10); wingGeo.rotateX(-Math.PI / 2);
  const wingMat = new THREE.MeshStandardMaterial({ color: '#dfe8ee', roughness: 0.3, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  function friendModel(hex) {
    const g = new THREE.Group(), shell = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.25, metalness: 0.55 });
    const add = (geo, mat, p, s) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.scale.set(...s); m.castShadow = true; g.add(m); return m; };
    add(sph, darkMat, [0, 0.08, -0.12], [0.34, 0.18, 0.5]);   // el abdomen (se ve al abrir los élitros)
    add(sph, shell, [0, 0.1, 0.42], [0.3, 0.16, 0.2]);
    // élitros: dos cáscaras con bisagra adelante que se abren en V para volar, y abajo las alas membranosas
    const elytra = [-1, 1].map((side) => {
      const piv = new THREE.Group(); piv.position.set(side * 0.012, 0.1, 0.36); piv.rotation.order = 'YXZ'; g.add(piv);
      const m = new THREE.Mesh(side > 0 ? elyGeoR : elyGeoL, shell); m.position.set(0, 0, -0.48); m.scale.set(0.4, 0.28, 0.56); m.castShadow = true; piv.add(m);
      return { piv, side };
    });
    const wings = [-1, 1].map((side) => {
      const piv = new THREE.Group(); piv.position.set(side * 0.08, 0.16, 0.2); piv.rotation.order = 'YXZ'; g.add(piv);
      const w = new THREE.Mesh(wingGeo, wingMat); w.scale.set(side, 1, 1); piv.add(w); piv.visible = false;
      return { piv, side };
    });
    add(sph, darkMat, [0, 0.08, 0.64], [0.15, 0.1, 0.12]);
    const legs = [];
    for (const z of [0.36, 0.08, -0.22]) for (const s of [-1, 1]) { const l = add(legGeo, darkMat, [s * 0.2, 0.06, z], [1, 1, 1]); l.rotation.z = s * 1.0; legs.push(l); }
    const ants = [-1, 1].map((s) => { const a = add(legGeo, darkMat, [s * 0.07, 0.14, 0.72], [0.7, 0.9, 0.7]); a.rotation.set(-2.2, 0, s * 0.4); return a; });
    g.scale.setScalar(0.8); g.rotation.order = 'YXZ'; scene.add(g);
    return { g, legs, ants, elytra, wings, fly: 0 };
  }
  const friends = [];
  LEVELS.slice(0, FRIENDS.length).forEach((L, i) => {
    // escondido debajo del sombrero más ancho del borde del claro
    const ms = flora.all.filter((m) => m.level === L.id && m.climbTop > 2.5).sort((a, b) => b.Rw * Math.hypot(b.x - L.at.x, b.z - L.at.z) - a.Rw * Math.hypot(a.x - L.at.x, a.z - L.at.z));
    const m = ms[0]; if (!m) return;
    const a = Math.atan2(m.z - L.at.z, m.x - L.at.x), d = m.stemR(0.3) + 1, x = m.x + Math.cos(a) * d, z = m.z + Math.sin(a) * d;
    const f = { ...friendModel(FRIENDS[i][1]), name: FRIENDS[i][0], found: false, p: new THREE.Vector3(x, walkHeight(x, z, m.base + 1) + 0.18, z), yaw: a + Math.PI, ph: r() * 6 };
    f.g.position.copy(f.p); f.g.rotation.y = f.yaw; friends.push(f);
  });
  const trail = []; let trailT = 0; // por dónde pasó el escarabajo (los amigos van detrás)

  /* ---------- Telas de araña entre dos tallos ---------- */
  const webs = [];
  const webMat = new THREE.LineBasicMaterial({ color: '#f4f2ea', transparent: true, opacity: 0.6, depthWrite: false });
  function webGeo(R) {
    const pts = [], N = 10;
    for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; pts.push(0, 0, 0, Math.cos(a) * R, Math.sin(a) * R, 0); }
    for (let k = 1; k <= 7; k++) { const rr = (R * k) / 7.5; for (let i = 0; i < N; i++) { const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2; pts.push(Math.cos(a0) * rr, Math.sin(a0) * rr, 0, Math.cos(a1) * rr, Math.sin(a1) * rr, 0); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return geo;
  }
  {
    const tall = flora.all.filter((m) => m.climbTop > 3 && !m.wood);
    for (let tries = 0; webs.length < 10 && tries < 3000; tries++) {
      const a = tall[Math.floor(r() * tall.length)], b = tall[Math.floor(r() * tall.length)];
      if (!a || a === b) continue;
      const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < 4.5 || d > 14) continue;
      const R = Math.min(d / 2 - Math.max(a.stemR(1), b.stemR(1)) - 0.2, 3.6); if (R < 1.4) continue;
      const cy = Math.min(a.base + a.climbTop, b.base + b.climbTop) - R - 0.3, gy = Math.max(a.base, b.base);
      if (cy - R < gy + 1.2) continue; // por abajo se pasa caminando
      const c = new THREE.Vector3((a.x + b.x) / 2, cy, (a.z + b.z) / 2);
      if (webs.some((w) => w.c.distanceTo(c) < 15)) continue;
      const n = new THREE.Vector3(-(b.z - a.z), 0, b.x - a.x).normalize();
      const lines = new THREE.LineSegments(webGeo(R), webMat.clone()); lines.position.copy(c); lines.lookAt(c.clone().add(n));
      const spider = new THREE.Group(), body = new THREE.Mesh(sph, darkMat); body.scale.set(0.22, 0.2, 0.3); spider.add(body);
      for (let i = 0; i < 8; i++) { const l = new THREE.Mesh(legGeo, darkMat); l.rotation.z = (i < 4 ? 1 : -1) * 1.2; l.rotation.y = ((i % 4) - 1.5) * 0.5; l.scale.setScalar(0.9); spider.add(l); }
      spider.position.set(0, R * 0.25, 0.05); lines.add(spider);
      scene.add(lines); webs.push({ c, n, R, lines, broken: 0, shake: 0 });
    }
  }

  /* ---------- Sombreritos ---------- */
  let hatObj = null;
  function wear(id) {
    if (hatObj) { hatObj.removeFromParent(); hatObj = null; }
    saved.hat = id; save();
    if (!id) return;
    const look = LOOKS[id], row = pickRow(rng(7), look, { tox: id === 'muscaria' || id === 'conica' });
    const b = buildMushroom(id, row, 11, { segs: 24, perfect: true });
    b.group.remove(b.group.children[0]); // sin tallo
    const k = 0.42 / b.D; b.group.scale.setScalar(k); b.group.rotation.set(-0.25, 0, 0);
    b.group.position.set(0, 0.1 - (b.climb.climbTop + 0.15) * k * 0.9, 0.0);
    hatObj = b.group; beetle.wear(hatObj);
  }
  function unlock(id) {
    if (saved.hats.includes(id)) return;
    saved.hats.push(id); save(); S.record(); secret('sombrero');
    setTimeout(() => floatText(`¡Sombrero nuevo: ${HATS[id].name}!`, 'combo'), 600);
    tip('hat-' + id, PH.hat(id), { repeat: true });
  }
  if (saved.hat && saved.hats.includes(saved.hat)) wear(saved.hat);
  let dodges = 0;

  /* ---------- Cada cuadro ---------- */
  let hudText = '';
  function update(dt, t, play) {
    const p = beetle.pos;
    // esporas doradas
    for (let i = 0; i < gold.length; i++) {
      const g = gold[i];
      if (!g.got && play && p.distanceToSquared(g.p) < 2.4) {
        g.got = true; S.gold(); secret('dorada'); game.energy = Math.min(100, game.energy + 4); drawStatus();
        const [n, of] = goldOf(g.area);
        floatText(`✦ ${n}/${of}`, 'combo');
        tip('gold1', 'Una espora dorada. Hay unas cuantas en cada claro, en lugares difíciles: arriba de los hongos más altos, en las repisas de los árboles o en el aire.');
        if (n === of) { secret('doradas'); setTimeout(() => floatText(`¡Todas las esporas doradas de ${areaName(g.area)}!`, 'gain'), 700); unlock('muscaria'); }
      }
      ge.set(0, t * 1.6 + g.ph, 0); gq.setFromEuler(ge); gs.setScalar(g.got ? 0 : 1 + Math.sin(t * 4 + g.ph) * 0.12);
      gm.compose(g.p.clone().setY(g.p.y + Math.sin(t * 2 + g.ph) * 0.25), gq, gs); goldMesh.setMatrixAt(i, gm);
    }
    goldMesh.instanceMatrix.needsUpdate = true;

    // aros
    if (race.on) { race.t += dt; race.since += dt; if (race.since > 25) { race.on = false; race.next = 0; paintRings(); tip('ringlost' + Math.floor(t), 'Se cortó la carrera de aros: tardaste mucho entre uno y otro. Empezá de nuevo por el aro dorado.', { repeat: true }); } }
    for (let i = 0; i < rings.length; i++) {
      const g = rings[i], rel = p.clone().sub(g.c), along = rel.dot(g.n), lat = rel.addScaledVector(g.n, -along).length();
      if (i === race.next && play && g.prev < 0 && along >= 0 && lat < g.R) {
        S.ring(race.next); game.energy = Math.min(100, game.energy + 3); drawStatus();
        if (race.next === 0) { race.on = true; race.t = 0; tip('ring1', '¡Carrera de aros! Pasá volando por cada aro dorado, en orden. El reloj ya corre.'); }
        race.since = 0; race.next++;
        if (race.next === rings.length) { // ¡llegada!
          const tt = race.t, medal = tt <= pathLen / 12 ? 'oro' : tt <= pathLen / 9 ? 'plata' : 'bronce';
          const best = !saved.best || tt < saved.best; if (best) { saved.best = +tt.toFixed(1); save(); }
          floatText(`${tt.toFixed(1)} s · medalla de ${medal}${best ? ' · ¡récord!' : ''}`, 'combo'); S.medal(medal);
          tip('ringdone' + Math.floor(t), PH.ring(medal), { repeat: true });
          secret('aros'); if (medal === 'oro') { secret('oro'); unlock('cantharellus'); }
          beetle.cheer(); race.on = false; race.next = 0;
        }
        paintRings();
      }
      g.prev = along;
    }

    // amigos
    // el rastro se marca por distancia (no por tiempo): si te quedás quieto, los amigos no se te suben encima
    if (!trail.length || trail[0].distanceTo(p) > 0.35) { const q = p.clone(); q.air = beetle.airborne; trail.unshift(q); if (trail.length > 120) trail.pop(); }
    friends.forEach((f) => {
      if (!f.found) {
        f.g.position.y = f.p.y + Math.abs(Math.sin(t * 3 + f.ph)) * 0.03;
        f.ants.forEach((a, k) => (a.rotation.x = -2.2 + Math.sin(t * 4 + k) * 0.2));
        if (play && p.distanceTo(f.p) < 2.4) {
          f.found = true; S.cheer(); beetle.cheer(); secret('amigo');
          const n = friends.filter((x) => x.found).length;
          floatText(`¡${f.name}! 🐞 ${n}/${friends.length}`, 'combo');
          tip('friend' + n, n === friends.length ? '¡Encontraste a todos tus amigos! Ahora el bosque es una caravana.' : PH.friend(f.name), { repeat: true });
          if (n === friends.length) { secret('amigos'); unlock('procera'); }
        }
        return;
      }
      // cada amigo va unos 2,5 cm detrás del anterior, sobre el camino que hiciste
      const k = 7 + friends.filter((x) => x.found).indexOf(f) * 6, q = trail[Math.min(trail.length - 1, k)];
      if (!q) return;
      // si ya aterrizaste, los amigos también bajan: van a la superficie que hay debajo de su punto del camino
      const tq = beetle.airborne || !q.air ? q : q.clone().setY(walkHeight(q.x, q.z, q.y + 0.5) + 0.18);
      const prev = f.g.position.clone(); f.g.position.lerp(tq, Math.min(1, dt * (beetle.airborne ? 6 : 4)));
      // y nunca más cerca que 2 cm de vos ni 1,5 cm de otro amigo
      const keep = (o, min) => { const dx = f.g.position.x - o.x, dz = f.g.position.z - o.z, d = Math.hypot(dx, dz); if (d < min && d > 1e-4) { f.g.position.x = o.x + (dx / d) * min; f.g.position.z = o.z + (dz / d) * min; } };
      keep(p, 2);
      for (const o of friends) if (o !== f && o.found) keep(o.g.position, 1.5);
      f.g.position.y = Math.max(f.g.position.y, walkHeight(f.g.position.x, f.g.position.z, f.g.position.y + 1) + 0.18);
      const mv = f.g.position.clone().sub(prev); mv.y = 0;
      if (mv.lengthSq() > 1e-6) f.yaw = Math.atan2(mv.x, mv.z);
      f.g.rotation.y += (Math.atan2(Math.sin(f.yaw - f.g.rotation.y), Math.cos(f.yaw - f.g.rotation.y))) * Math.min(1, dt * 8);
      const speed = mv.length() / Math.max(dt, 1e-3);
      // ¿Vuela? Si por ese tramo del camino ibas volando (o quedó lejos del piso): abre los élitros y bate las alas
      const air = (q.air && beetle.airborne) || f.g.position.y - walkHeight(f.g.position.x, f.g.position.z, f.g.position.y + 0.5) > 1.2;
      f.fly += ((air ? 1 : 0) - f.fly) * Math.min(1, dt * (air ? 8 : 4));
      for (const e of f.elytra) e.piv.rotation.set(f.fly * 0.72, -e.side * f.fly * 0.5, e.side * f.fly * 0.25);
      for (const w of f.wings) { w.piv.visible = f.fly > 0.05; w.piv.rotation.set(0.3 * Math.cos(t * 70) * f.fly, w.side * ((1 - f.fly) * 1.4 + 0.15), w.side * (0.12 + Math.sin(t * 70) * 0.8 * f.fly)); }
      f.g.rotation.x = -0.38 * f.fly; // en vuelo, el cuerpo va erguido, como el tuyo
      if (f.fly > 0.5) f.g.position.y += Math.sin(t * 9 + f.ph) * 0.02;
      f.legs.forEach((l, j) => (l.rotation.x = f.fly > 0.5 ? 0.5 : Math.sin(t * 18 + j * 2) * 0.5 * Math.min(1, speed / 3)));
    });

    // telas de araña
    for (const w of webs) {
      if (w.broken > 0) { // tiembla mientras el escarabajo forcejea, después queda rota un minuto y la araña la vuelve a tejer
        w.broken -= dt;
        w.lines.scale.setScalar(w.broken > 60 ? 1 + Math.sin(t * 40) * 0.05 : 1);
        w.lines.visible = w.broken > 60 || w.broken <= 0;
        continue;
      }
      if (!play || !beetle.airborne) continue;
      const rel = p.clone().sub(w.c), along = rel.dot(w.n), lat = rel.addScaledVector(w.n, -along).length();
      if (Math.abs(along) < 0.5 && lat < w.R * 0.92) {
        beetle.stick(1.6); S.stuck(); w.broken = 61.6; secret('tela'); // se suelta en 1,6 s y la tela queda rota un minuto
        game.energy = Math.max(0, game.energy - 5); drawStatus(); floatText('¡Atrapado!', 'loss');
        tip('web1', '¡Una tela de araña! Te frena y te cansa. Rodeala, o pasá caminando por abajo.');
      }
    }

    // el panel de arriba: esporas del lugar, amigos y reloj de la carrera
    let area = 'inicio', ad = Math.hypot(p.x - SPAWN.x, p.z - SPAWN.z);
    for (const L of LEVELS) { const d = Math.hypot(p.x - L.at.x, p.z - L.at.z) - L.spread; if (d < ad) { ad = d; area = L.id; } }
    const [gn, gof] = goldOf(area), fn = friends.filter((f) => f.found).length;
    const text = `<button class="sec" type="button" title="Secretos del bosque: tocá para una pista">🔍 ${secrets ? secrets.count : 0}/${secrets ? secrets.SECRETS.length : 0}</button><span title="Esporas doradas de ${areaName(area)}">✦ ${gn}/${gof}</span><span title="Amigos encontrados">🐞 ${fn}/${friends.length}</span>${race.on ? `<span title="Carrera de aros">⏱ ${race.t.toFixed(1)} s · aro ${race.next + 1}/${rings.length}</span>` : saved.best ? `<span title="Mejor tiempo en los aros">⏱ ${saved.best} s</span>` : ''}`;
    if (hud && text !== hudText) { hud.innerHTML = text; hudText = text; }
  }

  return {
    update,
    goldOf,
    debug: { gold, rings, friends, webs, unlock, wear },
    // el escarabajo zafó del pájaro / hizo un combo: puede ganar sombreros
    dodged() { if (++dodges === 3) unlock('conica'); },
    combo(n) { if (n >= 4) unlock('lycoperdon'); },
    // H: el próximo sombrero ganado (o ninguno)
    nextHat() {
      if (!saved.hats.length) { tip('hat0', PH.hat0(), { repeat: true }); return; }
      const list = [null, ...saved.hats], i = list.indexOf(saved.hat), id = list[(i + 1) % list.length];
      wear(id); floatText(id ? HATS[id].name : 'Sin sombrero', 'gain'); S.page();
    }
  };
}
