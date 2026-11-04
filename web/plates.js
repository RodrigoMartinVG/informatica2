// Láminas SVG dibujadas a partir de las medidas promedio del Excel.
import { profile } from './profiles.js';

const f1 = (v) => v.toFixed(1).replace('.', ',');
const f2 = (v) => v.toFixed(2).replace('.', ',');

// Silueta completa (perfil + espejo) como path SVG. k = px por mm; (cx, by) = eje y suelo.
function mirrorPath(pts, k, cx, by) {
  const right = pts.map(([r, y]) => `${(cx + r * k).toFixed(2)},${(by - y * k).toFixed(2)}`);
  const left = [...pts].reverse().map(([r, y]) => `${(cx - r * k).toFixed(2)},${(by - y * k).toFixed(2)}`);
  return `M${right.join('L')}L${left.join('L')}Z`;
}
const halfPath = (pts, k, cx, by) => 'M' + pts.map(([r, y]) => `${(cx + r * k).toFixed(2)},${(by - y * k).toFixed(2)}`).join('L');

function mushroomSVG(a, p, k, cx, by, opts = {}) {
  const stemPts = [...p.stem, [0, a.alto * 10]].map(([r, y]) => [r, y]);
  const stemOutline = p.stem.concat([[p.stem[p.stem.length - 1][0], p.stem[p.stem.length - 1][1]]]);
  let s = '';
  s += `<path d="${mirrorPath(stemOutline, k, cx, by)}" fill="${a.tallo}" style="stroke:var(--ink)" stroke-width="0.8"/>`;
  if (p.ring) {
    const ry = p.ring.y;
    s += `<path d="${mirrorPath(p.ring.pts.map(([r, y]) => [r, y + ry]), k, cx, by)}" fill="${a.tallo}" style="stroke:var(--ink)" stroke-width="0.8"/>`;
  }
  s += `<path d="${mirrorPath([...p.capTop, ...p.capUnder], k, cx, by)}" fill="${a.fill}" style="stroke:var(--ink)" stroke-width="0.8"/>`;
  // láminas: líneas radiales en la cara inferior, sugeridas
  if (opts.gills !== false && a.id !== 'esferica') {
    const u0 = p.capUnder[0], u1 = p.capUnder[p.capUnder.length - 1];
    for (let i = 1; i < 10; i++) {
      const t = i / 10, r = u0[0] * (1 - t) + u1[0] * t, y = u0[1] * (1 - t) + u1[1] * t;
      for (const sg of [-1, 1]) s += `<line x1="${cx + sg * r * k}" y1="${by - y * k}" x2="${cx + sg * r * k * 0.97}" y2="${by - (y + 1.5) * k}" style="stroke:var(--ink)" stroke-width="0.4" opacity=".5"/>`;
    }
  }
  if (opts.profile) {
    // mitad derecha marcada como el perfil que gira
    s += `<path d="${halfPath(p.stem, k, cx, by)}" fill="none" style="stroke:var(--accent)" stroke-width="2.4"/>`;
    s += `<path d="${halfPath([...p.capTop, ...p.capUnder], k, cx, by)}" fill="none" style="stroke:var(--accent)" stroke-width="2.4"/>`;
  }
  return s;
}

function dim(x1, y1, x2, y2, label, side = 'top') {
  const tick = 4;
  const vert = x1 === x2;
  let s = `<g class="dim"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  if (vert) s += `<line x1="${x1 - tick}" y1="${y1}" x2="${x1 + tick}" y2="${y1}"/><line x1="${x2 - tick}" y1="${y2}" x2="${x2 + tick}" y2="${y2}"/>`;
  else s += `<line x1="${x1}" y1="${y1 - tick}" x2="${x1}" y2="${y1 + tick}"/><line x1="${x2}" y1="${y2 - tick}" x2="${x2}" y2="${y2 + tick}"/>`;
  if (vert) s += `<text x="${x1 + 8}" y="${(y1 + y2) / 2}" dominant-baseline="middle">${label}</text>`;
  else s += `<text x="${(x1 + x2) / 2}" y="${side === 'top' ? y1 - 8 : y1 + 16}" text-anchor="middle">${label}</text>`;
  return s + '</g>';
}

// Lámina con las seis formas a la misma escala
export function plateAll(list, { selected } = {}) {
  const k = 1.55, gap = 26, ps = list.map((a) => ({ a, p: profile(a) }));
  const widths = ps.map(({ p }) => Math.max(p.width * 2 * k, 70));
  const W = widths.reduce((s, w) => s + w, 0) + gap * (ps.length + 1);
  const Htop = Math.max(...ps.map(({ p }) => p.top)) * k;
  const by = Htop + 30, H = by + 60;
  let x = gap, s = '';
  ps.forEach(({ a, p }, i) => {
    const cx = x + widths[i] / 2;
    s += `<g class="plate-item${selected === a.id ? ' sel' : ''}" data-id="${a.id}" tabindex="0" role="button" aria-label="${a.nombre}: sombrero ${f2(a.cap)} cm, tallo ${f2(a.alto)} cm">`;
    s += `<rect x="${x - gap / 2}" y="0" width="${widths[i] + gap}" height="${H}" fill="transparent"/>`;
    s += mushroomSVG(a, p, k, cx, by, { gills: false });
    s += `<text class="pl-name" x="${cx}" y="${by + 22}" text-anchor="middle">${a.nombre}</text>`;
    s += `<text class="pl-sub" x="${cx}" y="${by + 38}" text-anchor="middle">${f1(a.pct)} %</text></g>`;
    x += widths[i] + gap;
  });
  s = `<line x1="0" y1="${by}" x2="${W}" y2="${by}" class="ground"/>` + s;
  // barra de escala: 5 cm
  s += `<g class="dim"><line x1="${W - gap - 50 * k}" y1="18" x2="${W - gap}" y2="18"/><line x1="${W - gap - 50 * k}" y1="13" x2="${W - gap - 50 * k}" y2="23"/><line x1="${W - gap}" y1="13" x2="${W - gap}" y2="23"/><text x="${W - gap - 25 * k}" y="10" text-anchor="middle">5 cm</text></g>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="plate" role="img" aria-label="Las seis formas de hongo con tallo dibujadas a la misma escala, con sus medidas promedio">${s}</svg>`;
}

// Lámina individual con cotas
export function plateOne(a, { profileMode = false } = {}) {
  const p = profile(a);
  const k = Math.min(260 / p.top, 150 / p.width, 3.4);
  const W = 420, cx = 180, by = p.top * k + 46, H = by + 40;
  let s = `<line x1="20" y1="${by}" x2="${W - 20}" y2="${by}" class="ground"/>`;
  s += `<line x1="${cx}" y1="${by + 14}" x2="${cx}" y2="${by - p.top * k - 22}" class="axis"/>`;
  s += `<text class="axis-l" x="${cx + 5}" y="${by + 24}">eje de revolución</text>`;
  s += mushroomSVG(a, p, k, cx, by, { profile: profileMode });
  const R = a.cap * 5;
  s += dim(cx - R * k, by - p.top * k - 8, cx + R * k, by - p.top * k - 8, `⌀ ${f2(a.cap)} cm`);
  const xr = cx + Math.max(R, p.width) * k + 26;
  s += dim(xr, by, xr, by - a.alto * 10 * k, `${f2(a.alto)} cm`);
  const sw = (a.grosor / 2) * k, ys = by - a.alto * 10 * k * 0.45;
  s += `<g class="dim"><line x1="${cx - sw}" y1="${ys}" x2="${cx + sw}" y2="${ys}"/><text x="${cx - sw - 6}" y="${ys + 4}" text-anchor="end">${f1(a.grosor)} mm</text></g>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="plate one" role="img" aria-label="Lámina de la forma ${a.nombre}: sombrero de ${f2(a.cap)} cm de diámetro, tallo de ${f2(a.alto)} cm de alto y ${f1(a.grosor)} mm de grosor">${s}</svg>`;
}

// Silueta sola, para tarjetas chicas (cuestionario de la portada)
export function plateMini(a, label = '', k = 1.0) { // k = px por mm, igual para todas las tarjetas
  const p = profile(a), W = 160, H = 170;
  const cx = W / 2, by = H - 12;
  return `<svg viewBox="0 0 ${W} ${H}" class="plate mini" role="img" aria-label="${label}"><line x1="10" y1="${by}" x2="${W - 10}" y2="${by}" class="ground"/>${mushroomSVG(a, p, k, cx, by)}</svg>`;
}
