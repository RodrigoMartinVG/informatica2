// Taller de hongos: diseñar un hongo con controles y verlo en 3D al instante.
// El hongo se arma con el mismo código que el bosque (hongos3d.js) y con una fila real del Excel
// que coincide con la forma, el color, el rango de tamaño y la toxicidad elegidos.
import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildMushroom, pickRow, LOOKS, resetCache } from './hongos3d.js';
import { FORMAS, COLORES } from './filas.js';
import { rng } from './config.js';
import { SPECIES } from './species.js';
import { loadLocal, saveLocal } from './disenos.js';

const $ = (s) => document.querySelector(s);
const NAMES = { ...Object.fromEntries(Object.entries(SPECIES).map(([k, v]) => [k, v.name])), gemelo: 'Gemelo (blanco, con anillo)' };

/* ---------- Escena ---------- */
const renderer = new THREE.WebGPURenderer({ canvas: $('#c'), antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true;
await renderer.init();
const scene = new THREE.Scene(); scene.background = new THREE.Color('#1a130c');
scene.fog = new THREE.Fog('#1a130c', 60, 140);
scene.add(new THREE.HemisphereLight('#ffe6c4', '#4a3420', 1.7));
const sun = new THREE.DirectionalLight('#ffd6a0', 2.8); sun.position.set(-14, 26, 18); sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 30, bottom: -5 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; scene.add(sun);
const back = new THREE.DirectionalLight('#ffb27a', 1.4); back.position.set(10, 8, -20); scene.add(back);
const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: '#4a3826', roughness: 1 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.49; controls.autoRotate = true; controls.autoRotateSpeed = 0.8;
renderer.domElement.addEventListener('pointerdown', () => (controls.autoRotate = false));
function resize() { const c = renderer.domElement.parentElement, w = c.clientWidth, h = c.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(renderer.domElement.parentElement); resize();
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

/* ---------- El diseño ---------- */
// Convierte una especie del juego en un diseño editable (los mismos campos que LOOKS)
function fromSpecies(id) {
  const L = LOOKS[id], color = L.colors[0];
  return {
    shape: L.shapes[0], color, dmin: L.d[0], dmax: L.d[1], c0: L.cap[color][0], c1: L.cap[color][1],
    style: L.style, gloss: L.gloss, thick: L.thick || 1, stretch: L.stretch || 1, funnel: !!L.funnel, wavy: !!L.wavy, umbo: !!L.umbo,
    warts: !!L.warts, wartc: L.warts || '#f6f0e0', wartSize: L.wartSize || 1,
    under: L.under, gill: L.gill, decurrent: !!L.decurrent,
    stem: L.stem, stemStyle: L.stemStyle || 'smooth', bulb: L.bulb || 1, club: !!L.club, taper: L.taper || 1, hr: L.hr || 0, wmin: L.wmin || 0,
    ring: L.ring || '', ringAt: L.ringAt || 0.7, ringColor: L.ringColor || '#efeadb', baseT: L.base || '',
    tox: SPECIES[id]?.tox ?? true
  };
}
// Del diseño editable al aspecto que entiende hongos3d.js
export function toLook(d) {
  return {
    shapes: [d.shape], colors: [d.color], d: [Math.min(d.dmin, d.dmax), Math.max(d.dmin, d.dmax)], cap: { [d.color]: [d.c0, d.c1] },
    style: d.style, gloss: +d.gloss, thick: +d.thick, stretch: +d.stretch, funnel: d.funnel, wavy: d.wavy, umbo: d.umbo,
    warts: d.warts ? d.wartc : undefined, wartSize: +d.wartSize, puff: d.under === 'none',
    under: d.under, gill: d.gill, decurrent: d.decurrent,
    stem: d.stem, stemStyle: d.stemStyle, bulb: +d.bulb > 1.01 ? +d.bulb : undefined, club: d.club, taper: +d.taper < 0.99 ? +d.taper : undefined,
    hr: +d.hr || undefined, wmin: +d.wmin || undefined,
    ring: d.ring || undefined, ringAt: +d.ringAt, ringColor: d.ringColor, base: d.baseT || undefined
  };
}

let design = fromSpecies('muscaria'), name = '', editing = null, seed = 1, current = null;

/* ---------- Controles ---------- */
$('#base').innerHTML = Object.keys(LOOKS).map((k) => `<option value="${k}">${NAMES[k] || k}</option>`).join('');
$('#shape').innerHTML = FORMAS.map((f) => `<option>${f}</option>`).join('');
$('#color').innerHTML = COLORES.map((c) => `<option>${c}</option>`).join('');
const FIELDS = ['shape', 'color', 'dmin', 'dmax', 'c0', 'c1', 'style', 'gloss', 'thick', 'stretch', 'funnel', 'wavy', 'umbo', 'warts', 'wartc', 'wartSize',
  'under', 'gill', 'decurrent', 'stem', 'stemStyle', 'bulb', 'club', 'taper', 'hr', 'wmin', 'ring', 'ringAt', 'ringColor', 'baseT', 'tox'];
function fill() {
  for (const f of FIELDS) {
    const el = $('#' + f); if (!el) continue;
    if (el.type === 'checkbox') el.checked = !!design[f];
    else if (f === 'tox') el.value = design.tox ? '1' : '0';
    else el.value = design[f];
  }
  $('#name').value = name;
  $('#dmin-v').textContent = `${design.dmin} cm`; $('#dmax-v').textContent = `${design.dmax} cm`;
}
function read() {
  for (const f of FIELDS) {
    const el = $('#' + f); if (!el) continue;
    design[f] = el.type === 'checkbox' ? el.checked : f === 'tox' ? el.value === '1' : el.type === 'range' ? +el.value : el.value;
  }
  name = $('#name').value.trim();
  $('#dmin-v').textContent = `${design.dmin} cm`; $('#dmax-v').textContent = `${design.dmax} cm`;
}
let queued = false;
const rebuild = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; build(); }); };
for (const f of FIELDS) $('#' + f)?.addEventListener('input', () => { read(); rebuild(); });
$('#name').addEventListener('input', read);
for (const id of ['age', 'perfect']) $('#' + id).addEventListener('input', rebuild);
$('#base').addEventListener('change', (e) => { design = fromSpecies(e.target.value); name = ''; editing = null; fill(); build(true); });
$('#reroll').addEventListener('click', () => { seed++; build(); });

/* ---------- Armar el hongo ---------- */
function build(frame = false) {
  if (current) { scene.remove(current); current.traverse((o) => o.geometry?.dispose()); }
  resetCache();
  const look = toLook(design), row = pickRow(rng(seed * 7919), look, { tox: design.tox });
  const b = buildMushroom(look, row, seed, { segs: 64, age: +$('#age').value, perfect: $('#perfect').checked });
  current = b.group; scene.add(current);
  const size = Math.max(b.H + b.climb.top * 0.2, b.D) * 1.2 + 4;
  if (frame || !camera.userData.framed) {
    controls.target.set(0, Math.max(b.H, b.climb.top) * 0.55, 0);
    camera.position.set(size * 0.9, size * 0.55 + b.H * 0.3, size * 1.4); camera.userData.framed = true;
  }
  const match = row.shape === design.shape && row.color === design.color && row.d >= look.d[0] && row.d <= look.d[1];
  $('#row-info').innerHTML = `<span class="chip">Fila real del Excel</span> sombrero <b>${row.d} cm</b> · tallo <b>${row.h} cm</b> de alto y <b>${row.w} mm</b> de ancho ·
    ${row.shape.toLowerCase()} · ${row.color.toLowerCase()} · <b class="${row.tox ? 'tox' : 'ed'}">${row.tox ? 'venenoso' : 'comestible'}</b>${row.ring ? ' · con anillo' : ''}${row.bruise ? ' · se mancha' : ''}
    ${match ? '' : '<span class="chip">no hay una fila exacta: se usó la más parecida</span>'}`;
}

/* ---------- Guardar, plantar, exportar ---------- */
const toast = (t) => { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 1800); };
function renderSaved() {
  const list = loadLocal();
  $('#saved').innerHTML = list.length ? list.map((d, i) => `<li><span>${d.name}<br><small>${d.look.shapes[0]} · ${d.look.colors[0]} · ${d.tox ? 'venenoso' : 'comestible'}</small></span>
    <label><input type="checkbox" data-plant="${i}" ${d.plant ? 'checked' : ''}> en el bosque</label>
    <button class="btn" data-edit="${i}" type="button">Editar</button><button class="btn" data-del="${i}" type="button" aria-label="Borrar ${d.name}">✕</button></li>`).join('')
    : '<li><span><small>Todavía no guardaste ningún diseño.</small></span></li>';
  for (const b of $('#saved').querySelectorAll('[data-plant]')) b.addEventListener('change', () => { const l = loadLocal(); l[b.dataset.plant].plant = b.checked; saveLocal(l); toast(b.checked ? 'Va a crecer en el bosque' : 'Ya no crece en el bosque'); });
  for (const b of $('#saved').querySelectorAll('[data-edit]')) b.addEventListener('click', () => { const d = loadLocal()[b.dataset.edit]; design = { ...d.design }; name = d.name; editing = d.id; fill(); build(true); });
  for (const b of $('#saved').querySelectorAll('[data-del]')) b.addEventListener('click', () => { const l = loadLocal(); if (!confirm(`¿Borrar «${l[b.dataset.del].name}»?`)) return; l.splice(b.dataset.del, 1); saveLocal(l); renderSaved(); });
}
$('#save').addEventListener('click', () => {
  read();
  const l = loadLocal(), entry = { id: editing || 'd' + Date.now().toString(36), name: name || 'Mi hongo', tox: design.tox, plant: true, design: { ...design }, look: toLook(design) };
  const i = l.findIndex((d) => d.id === entry.id);
  if (i >= 0) { entry.plant = l[i].plant; l[i] = entry; } else l.push(entry);
  saveLocal(l); editing = entry.id; renderSaved(); toast('Guardado · crece en el bosque');
});
$('#new').addEventListener('click', () => { design = fromSpecies($('#base').value); name = ''; editing = null; fill(); build(true); });
$('#export').addEventListener('click', async () => {
  read();
  const txt = JSON.stringify({ id: editing || 'd' + Date.now().toString(36), name: name || 'Mi hongo', tox: design.tox, plant: true, design, look: toLook(design) });
  const ta = $('#json'); ta.hidden = false; ta.value = txt; ta.select();
  try { await navigator.clipboard.writeText(txt); toast('Copiado: pegalo en juego/disenos.js'); } catch { toast('Copiá el texto de abajo'); }
});
$('#import').addEventListener('click', () => {
  const ta = $('#json');
  if (ta.hidden || !ta.value.trim()) { ta.hidden = false; ta.value = ''; ta.placeholder = 'Pegá acá un diseño exportado y apretá Importar otra vez'; ta.focus(); return; }
  try { const d = JSON.parse(ta.value); design = { ...fromSpecies('muscaria'), ...d.design }; name = d.name || ''; editing = null; fill(); build(true); toast('Diseño importado: guardalo para plantarlo'); }
  catch { toast('Ese texto no es un diseño válido'); }
});

fill(); build(true); renderSaved();
