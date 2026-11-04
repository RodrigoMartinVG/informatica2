/* global Chart, RESEARCH, EXPLORER */
import { plateAll, plateOne, plateMini } from './plates.js';
import { profile } from './profiles.js';
import { CORR, VEREDICTOS } from './corr.js';

const R = RESEARCH, E = EXPLORER, BASE = R.stats.toxicos;
const $ = (id) => document.getElementById(id);
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const pct = (v, d = 1) => (v * 100).toFixed(d).replace('.', ',') + ' %';
const num = (v, d = 2) => Number(v).toFixed(d).replace('.', ',');
const int = (n) => n.toLocaleString('es-AR');
const T = () => ({ ink: css('--ink'), ink2: css('--ink-2'), ink3: css('--ink-3'), rule: css('--rule'), ed: css('--ed'), tox: css('--tox'), panel: css('--panel'), accent: css('--accent'), mid: css('--mid') });

/* ================= Chart.js defaults ================= */
function chartDefaults() {
  const t = T();
  Object.assign(Chart.defaults, { color: t.ink2, borderColor: t.rule, maintainAspectRatio: false });
  Chart.defaults.font.family = '"IBM Plex Sans", system-ui, sans-serif';
  Chart.defaults.font.size = 11.5;
  Object.assign(Chart.defaults.plugins.tooltip, { backgroundColor: t.ink, titleColor: t.panel, bodyColor: t.panel, padding: 10, cornerRadius: 2, displayColors: true, boxPadding: 4 });
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
  Chart.defaults.plugins.legend.labels.boxHeight = 10;
}
chartDefaults();
Chart.register({
  id: 'refLine',
  afterDatasetsDraw(chart, _a, o) {
    if (o.value == null) return;
    const { ctx, chartArea: a, scales } = chart, h = o.axis === 'x', s = h ? scales.x : scales.y, p = s.getPixelForValue(o.value);
    ctx.save(); ctx.strokeStyle = T().ink; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.beginPath();
    if (h) { ctx.moveTo(p, a.top - 4); ctx.lineTo(p, a.bottom); } else { ctx.moveTo(a.left, p); ctx.lineTo(a.right, p); }
    ctx.stroke(); ctx.setLineDash([]);
    if (o.label) { ctx.fillStyle = T().ink; ctx.font = '500 10.5px "IBM Plex Sans"'; ctx.textAlign = h ? 'left' : 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(o.label, h ? p + 4 : a.right, h ? a.top - 3 : p - 3); }
    ctx.restore();
  }
});
// Etiquetas directas: el % de venenosos escrito sobre cada barra apilada, y máximo/mínimo en las líneas
Chart.register({
  id: 'directLabels',
  afterDatasetsDraw(chart, _a, o) {
    if (!o || !o.mode) return;
    const { ctx } = chart, t = T();
    ctx.save(); ctx.font = '600 10.5px "IBM Plex Mono", monospace'; ctx.textBaseline = 'middle';
    if (o.mode === 'stack') {
      chart.getDatasetMeta(0).data.forEach((bar, i) => {
        const v = chart.data.datasets[0].data[i], txt = Math.round(v * 100) + ' %', w = bar.x - bar.base;
        if (w > 36) { ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(txt, bar.x - 6, bar.y); }
        else { ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(txt, bar.x + 6, bar.y); }
      });
    }
    if (o.mode === 'extremes') {
      const d = chart.data.datasets[0].data, meta = chart.getDatasetMeta(0).data;
      const iMax = d.indexOf(Math.max(...d)), iMin = d.indexOf(Math.min(...d));
      [[iMax, -12], [iMin, 14]].forEach(([i, dy]) => { const p = meta[i]; ctx.fillStyle = t.ink; ctx.textAlign = 'center'; ctx.fillText(Math.round(d[i] * 100) + ' %', p.x, p.y + dy); });
    }
    ctx.restore();
  }
});
const charts = [];
const pctAxis = (extra = {}) => ({ min: 0, max: 1, ticks: { callback: (v) => Math.round(v * 100) + ' %', stepSize: 0.25 }, grid: { color: () => T().rule }, border: { display: false }, ...extra });

// Barras apiladas 100 %: venenosos / comestibles, horizontales
function stacked(id, datos, opts = {}) {
  const labels = Object.keys(datos), vals = Object.values(datos);
  const box = $(id).parentNode;
  if (!opts.fixed) box.style.height = Math.max(150, labels.length * 26 + 56) + 'px';
  charts.push(new Chart($(id), {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Venenosos', data: vals, backgroundColor: () => T().tox, stack: 's', borderColor: () => T().panel, borderWidth: { right: 2 }, borderSkipped: false, borderRadius: { topLeft: 2, bottomLeft: 2 } },
      { label: 'Comestibles', data: vals.map((v) => 1 - v), backgroundColor: () => T().ed, stack: 's', borderSkipped: false, borderRadius: { topRight: 2, bottomRight: 2 } }
    ] },
    options: {
      indexAxis: 'y', barPercentage: 0.78, categoryPercentage: 0.9,
      plugins: { legend: { display: !opts.noLegend, position: 'top', align: 'end' }, title: { display: !!opts.title, text: opts.title, align: 'start', color: T().ink, font: { weight: 600, size: 12 } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${pct(c.raw)}` } }, refLine: { value: BASE, axis: 'x' } },
      scales: { x: { ...pctAxis(), stacked: true }, y: { stacked: true, grid: { display: false }, border: { display: false } } }
    }
  }));
}

/* ================= Datos desde la hoja Data (cubo agrupado) ================= */
const LABEL = {
  ring: { 'Sí': 'Con anillo', 'No': 'Sin anillo' },
  bruise: { 'Sí': 'Se magulla', 'No': 'No se magulla' },
  stemColor: { 'Ninguno (sin tallo)': 'Sin tallo' },
  surface: { 'd (sin documentar)': 'd (sin documentar)' }
};
const lab = (dim, c) => (LABEL[dim] && LABEL[dim][c]) || c;
function marginal(dim) {
  const i = E.dims.indexOf(dim), acc = E.cats[dim].map(() => [0, 0]);
  for (const r of E.rows) { acc[r[i]][0] += r[9]; acc[r[i]][1] += r[10]; }
  return acc.map(([n, v], k) => ({ cat: E.cats[dim][k], label: lab(dim, E.cats[dim][k]), n, v, p: v / n })).filter((x) => x.n).sort((a, b) => b.p - a.p);
}
function cross(rd, cd) {
  const ri = E.dims.indexOf(rd), ci = E.dims.indexOf(cd), m = {};
  for (const r of E.rows) { const k = r[ri] + '|' + r[ci]; (m[k] ||= [0, 0]); m[k][0] += r[9]; m[k][1] += r[10]; }
  return (rc, cc) => { const v = m[E.cats[rd].indexOf(rc) + '|' + E.cats[cd].indexOf(cc)]; return v ? { n: v[0], v: v[1], p: v[1] / v[0] } : null; };
}

/* ================= Correlaciones: render genérico ================= */
const corrNum = (c) => CORR.indexOf(c) + 1;
const chapterTitle = (id) => document.querySelector(`.chapter[data-id="${id}"]`)?.dataset.title || id;

function renderCorrMaps() {
  document.querySelectorAll('[data-corr-map]').forEach((t) => {
    t.innerHTML = '<thead><tr><th>N.º</th><th>Correlación</th><th>Hoja del Excel</th><th>Capítulo</th><th>Veredicto</th></tr></thead><tbody>' +
      CORR.map((c) => `<tr><td class="num">${corrNum(c)}</td><td><a href="#/${c.chapter}/${c.id}">${c.title}</a><br><small class="muted">${c.question}</small></td><td><small>${c.sheet}</small></td><td><small>${chapterTitle(c.chapter)}</small></td><td><span class="verdict v-${c.verdict}">${VEREDICTOS[c.verdict]}</span></td></tr>`).join('') + '</tbody>';
  });
}

function corrShell(c) {
  return `<section class="cx" id="corr-${c.id}">
    <header class="cx-head">
      <p class="cx-n">Correlación ${corrNum(c)} <span class="cx-sheet">Hoja: ${c.sheet}</span></p>
      <h2>${c.title}</h2>
      <p class="cx-q">${c.question}</p>
      <span class="verdict v-${c.verdict}">${VEREDICTOS[c.verdict]}</span>
      <span class="src">${c.kind === 'heat' ? 'Excel · recalculado desde la hoja Data para mostrar cantidades' : 'Dato del Excel'}</span>
    </header>
    <figure class="fig cx-fig">
      <div class="cx-chart"></div>
      ${['stack', 'rango', 'corrST'].includes(c.kind) ? `<button type="button" class="listen" data-corr="${c.id}">▶ Escuchar el gráfico</button><span class="listen-note" aria-live="polite"></span>` : ''}
      <details class="cx-data"><summary>Ver los datos en una tabla</summary><div class="table-wrap"></div></details>
    </figure>
    <div class="cx-read">
      <section><h3>Qué muestra</h3>${c.plain}</section>
      <section class="cx-thread"><h3>En el hilo</h3>${c.thread}</section>
    </div>
    <button type="button" class="tech-open" aria-expanded="false">Ver cómo se construye y la matemática</button>
    <div class="cx-tech">
      <section class="cx-build"><h3>Cómo se construye en Excel</h3><ol>${c.build.map((b) => `<li>${b}</li>`).join('')}</ol>
        <h3>Precauciones</h3>${c.caveat}</section>
      <section class="cx-math"><h3>Qué significa matemáticamente</h3>${c.math}</section>
    </div>
  </section>`;
}

function chartBox(el, h) { el.innerHTML = `<div class="chart-box" style="height:${h}px"><canvas></canvas></div>`; return el.querySelector('canvas'); }
const tableHTML = (head, rows) => `<table class="summary"><thead><tr>${head.map((h, i) => `<th${i ? ' class="num"' : ''}>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v, i) => `<td${i ? ' class="num"' : ''}>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const signed = (d) => (d >= 0 ? '+' : '−') + num(Math.abs(d * 100), 1);

const kinds = {
  stack(c, el, tbl) {
    const m = marginal(c.dim);
    const cv = chartBox(el, Math.max(140, m.length * 27 + 50));
    charts.push(new Chart(cv, {
      type: 'bar',
      data: { labels: m.map((x) => x.label), datasets: [
        { label: 'Venenosos', data: m.map((x) => x.p), backgroundColor: () => T().tox, stack: 's', borderColor: () => T().panel, borderWidth: { right: 2 }, borderSkipped: false, borderRadius: { topLeft: 2, bottomLeft: 2 } },
        { label: 'Comestibles', data: m.map((x) => 1 - x.p), backgroundColor: () => T().ed, stack: 's', borderSkipped: false, borderRadius: { topRight: 2, bottomRight: 2 } }
      ] },
      options: { indexAxis: 'y', barPercentage: 0.78, categoryPercentage: 0.9,
        plugins: { legend: { position: 'top', align: 'end' }, refLine: { value: BASE, axis: 'x', label: '55,5 %' }, directLabels: { mode: 'stack' },
          tooltip: { callbacks: { label: (k) => `${k.dataset.label}: ${pct(k.raw)}`, afterBody: (k) => `${int(m[k[0].dataIndex].n)} hongos` } } },
        scales: { x: { ...pctAxis(), stacked: true }, y: { stacked: true, grid: { display: false }, border: { display: false } } } }
    }));
    const N = m.reduce((s, x) => s + x.n, 0), wavg = m.reduce((s, x) => s + x.n * x.p, 0) / N;
    tbl.innerHTML = tableHTML(['Categoría', 'Hongos (N<sub>c</sub>)', 'Peso N<sub>c</sub>/N', 'Venenosos (V<sub>c</sub>)', 'p(c)', 'Δ con 55,5 % (pts)'],
      m.map((x) => [x.label, int(x.n), pct(x.n / N), int(x.v), pct(x.p), signed(x.p - BASE)]).concat([[`<b>Total</b>`, `<b>${int(N)}</b>`, '100 %', int(m.reduce((s, x) => s + x.v, 0)), `<b>${pct(wavg)}</b>`, '']]));
  },

  tamanoForma(c, el, tbl) {
    const tf = R.tamanoForma, cv = chartBox(el, 320);
    charts.push(new Chart(cv, {
      type: 'bar',
      data: { labels: tf.formas, datasets: [
        { label: 'Comestibles', data: tf.comestible, backgroundColor: () => T().ed, borderRadius: 2, categoryPercentage: 0.7, barPercentage: 0.92 },
        { label: 'Venenosos', data: tf.venenoso, backgroundColor: () => T().tox, borderRadius: 2, categoryPercentage: 0.7, barPercentage: 0.92 }
      ] },
      options: { plugins: { legend: { position: 'top', align: 'end' }, tooltip: { callbacks: { label: (k) => `${k.dataset.label}: ${num(k.raw)} cm` } } },
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Diámetro promedio del sombrero (cm)' }, grid: { color: () => T().rule }, border: { display: false } }, x: { grid: { display: false } } } }
    }));
    const sh = marginal('shape'); const by = Object.fromEntries(sh.map((x) => [x.cat, x]));
    tbl.innerHTML = tableHTML(['Forma', 'Comestibles: media (cm)', 'Comestibles: hongos', 'Venenosos: media (cm)', 'Venenosos: hongos', 'Diferencia (cm)'],
      tf.formas.map((f, i) => [f, num(tf.comestible[i]), int(by[f].n - by[f].v), num(tf.venenoso[i]), int(by[f].v), signed((tf.comestible[i] - tf.venenoso[i]) / 100).replace(',', ',')]));
  },

  rango(c, el, tbl) {
    const d = R.rangos[c.key], cv = chartBox(el, 300);
    const n = c.key === 'diametro' ? [...R.modelo2n, 92, 49, 32] : null;
    charts.push(new Chart(cv, {
      type: 'line',
      data: { labels: d.x, datasets: [{ label: 'Venenosos', data: d.y, borderColor: () => T().tox, backgroundColor: () => T().tox, borderWidth: 2, pointRadius: 3, pointHoverRadius: 6, tension: 0.2 }] },
      options: { interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, refLine: { value: BASE, axis: 'y', label: 'promedio 55,5 %' }, directLabels: { mode: 'extremes' },
          tooltip: { callbacks: { title: (k) => `${d.label}: ${k[0].label}`, label: (k) => `Venenosos: ${pct(k.raw)}`, afterLabel: (k) => (n ? `${int(n[k.dataIndex])} hongos · margen ±${num(200 * Math.sqrt(k.raw * (1 - k.raw) / n[k.dataIndex]), 1)} pts` : '') } } },
        scales: { y: pctAxis(), x: { title: { display: true, text: d.label }, grid: { display: false } } } }
    }));
    tbl.innerHTML = n
      ? tableHTML(['Rango', 'Hongos (n)', 'Venenosos (p)', 'Margen ±2·EE (pts)'], d.x.map((x, i) => [x, int(n[i]), pct(d.y[i]), '±' + num(200 * Math.sqrt(d.y[i] * (1 - d.y[i]) / n[i]), 1)]))
      : tableHTML(['Rango', 'Venenosos (p)', 'Δ con 55,5 % (pts)'], d.x.map((x, i) => [x, pct(d.y[i]), signed(d.y[i] - BASE)]));
  },

  corrST(c, el, tbl) {
    const s = R.corrST, ind = R.modelo1.individual, cv = chartBox(el, 340);
    const ln = (q) => [{ x: 0, y: q.b }, { x: 25, y: q.b + q.m * 25 }];
    charts.push(new Chart(cv, {
      type: 'scatter',
      data: { datasets: [
        { type: 'line', label: 'Comestibles (promedio por cm)', data: s.x.map((x, i) => ({ x, y: s.com[i], n: s.nCom[i] })), borderColor: () => T().ed, backgroundColor: () => T().ed, borderWidth: 2, pointRadius: 3 },
        { type: 'line', label: 'Venenosos (promedio por cm)', data: s.x.map((x, i) => ({ x, y: s.ven[i], n: s.nVen[i] })), borderColor: () => T().tox, backgroundColor: () => T().tox, borderWidth: 2, pointRadius: 3, pointStyle: 'rect' },
        { type: 'line', label: 'Recta de todos (r = 0,76)', data: ln(ind.sinGigantes.todos), borderColor: () => T().ink3, borderWidth: 1.5, borderDash: [5, 4], pointRadius: 0 }
      ] },
      options: { plugins: { legend: { position: 'top', align: 'start' },
          tooltip: { filter: (k) => k.datasetIndex < 2, callbacks: { label: (k) => `${k.dataset.label.split(' (')[0]}: ${num(k.raw.y, 1)} mm (${int(k.raw.n)} hongos)` } } },
        scales: { x: { type: 'linear', min: 0, max: 25, title: { display: true, text: 'Diámetro del sombrero (cm)' }, grid: { color: () => T().rule } },
          y: { min: 0, title: { display: true, text: 'Grosor promedio del tallo (mm)' }, grid: { color: () => T().rule } } } }
    }));
    const row = (name, q) => [name, num(q.r, 3), num(q.r2, 3), num(q.m, 3), num(q.b, 3), int(q.n)];
    const sg = ind.sinGigantes, cg = ind.conGigantes;
    tbl.innerHTML = '<p class="note">Sombrero &lt; 25 cm (como el gráfico)</p>' + tableHTML(['Grupo', 'r', 'R²', 'Pendiente m (mm/cm)', 'Ordenada b (mm)', 'Hongos'], [row('Todos', sg.todos), row('Venenosos', sg.venenosos), row('Comestibles', sg.comestibles)]) +
      '<p class="note">Incluyendo los sombreros gigantes (≥ 25 cm)</p>' + tableHTML(['Grupo', 'r', 'R²', 'Pendiente m (mm/cm)', 'Ordenada b (mm)', 'Hongos'], [row('Todos', cg.todos), row('Venenosos', cg.venenosos), row('Comestibles', cg.comestibles)]);
  },

  heat(c, el, tbl) {
    const get = cross(c.rows, c.cols);
    const rows = marginal(c.rows), colsM = marginal(c.cols);
    const order = { season: ['Primavera', 'Verano', 'Otoño', 'Invierno'], shape: ['Campana', 'Cónica', 'Convexa', 'Esférica', 'Hundida', 'Plana', 'Otras'] };
    const cols = order[c.cols] || colsM.map((x) => x.cat);
    const mix = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
    const color = (p) => { const t = T(); return p < BASE ? mix(t.ed, t.mid, p / BASE) : mix(t.mid, t.tox, (p - BASE) / (1 - BASE)); };
    const cell = (p, n, title) => `<td style="background:${color(p)}" class="${Math.abs(p - BASE) < 0.2 ? 'light' : 'dark'}${n < 50 ? ' small' : ''}" title="${title}">${Math.round(p * 100)}</td>`;
    let h = '<div class="heat-wrap"><table class="heat"><thead><tr><th></th>' + cols.map((s) => `<th scope="col">${lab(c.cols, s)}</th>`).join('') + '<th scope="col">Total</th></tr></thead><tbody>';
    for (const r of rows) {
      h += `<tr><th scope="row" class="row">${r.label}</th>`;
      for (const s of cols) { const v = get(r.cat, s); h += v ? cell(v.p, v.n, `${r.label} · ${lab(c.cols, s)}: ${pct(v.p, 0)} venenosos de ${int(v.n)} hongos`) : '<td class="empty" aria-label="sin hongos"></td>'; }
      h += cell(r.p, r.n, `${r.label}, total: ${pct(r.p, 0)} de ${int(r.n)} hongos`) + '</tr>';
    }
    h += '</tbody></table></div><p class="note">Cada número es el % de venenosos. Azul = pocos, gris = cerca del 55,5 %, naranja = muchos. Las celdas en cursiva tienen menos de 50 hongos y las punteadas no tienen ninguno. Pasá el cursor por una celda para ver cuántos hongos tiene.</p>';
    el.innerHTML = h;
    const trs = [];
    for (const r of rows) for (const s of cols) { const v = get(r.cat, s); if (v) trs.push([`${r.label} · ${lab(c.cols, s)}`, int(v.n), pct(v.p)]); }
    tbl.innerHTML = tableHTML(['Combinación', 'Hongos', 'Venenosos'], trs);
    // ejemplo numérico del promedio ponderado (color × forma)
    const ex = document.getElementById('c14-example');
    if (ex && c.rows === 'capColor') {
      const b = rows.find((x) => x.cat === 'Blanco');
      const terms = cols.map((s) => ({ s, v: get('Blanco', s) })).filter((t) => t.v);
      ex.innerHTML = `Por ejemplo, para el blanco (${int(b.n)} hongos):<span class="eq">${num(b.p, 3)} = ` +
        terms.map((t) => `${num(t.v.n / b.n, 2)}·${num(t.v.p, 2)}`).join(' + ') + `</span>donde cada término es (parte de los blancos con esa forma) × (proporción de venenosos en esa forma), en el orden ${terms.map((t) => t.s.toLowerCase()).join(', ')}.`;
    }
  }
};

/* ================= Hilo visible y mini-índice ================= */
const SYM = { mito: '✕', debil: '○', ruido: '○', extremos: '◐', tendencia: '◐', interaccion: '◆', relacion: '◆' };
const THREAD_CH = ['mitos', 'tamano', 'color', 'contexto', 'geogebra', 'combinar', 'conclusion'];
function renderThread(chId) {
  const bar = $('thread'), k = THREAD_CH.indexOf(chId);
  if (k < 0) { bar.hidden = true; return; }
  const seen = CORR.filter((c) => THREAD_CH.indexOf(c.chapter) <= k);
  const mitos = seen.filter((c) => c.verdict === 'mito').length;
  let estado = 'Ninguna regla simple alcanza';
  if (k <= 0) estado = 'Las reglas populares no funcionan';
  if (chId === 'geogebra') estado = 'El tamaño informa, pero no decide';
  if (k >= THREAD_CH.indexOf('combinar')) estado = 'Combinar rasgos ≈ identificar la especie';
  bar.innerHTML = `<p class="th-q"><span>Pregunta</span>¿Se puede saber si un hongo es comestible mirándolo?</p>
    <div class="th-chips">${seen.map((c) => `<a href="#/${c.chapter}/${c.id}" class="chip v-${c.verdict}${c.chapter === chId ? ' here' : ''}" title="${corrNum(c)}. ${c.title}: ${VEREDICTOS[c.verdict]}"><i>${SYM[c.verdict]}</i>${corrNum(c)}</a>`).join('')}
      <span class="th-count">${seen.length} de ${CORR.length} correlaciones${mitos ? ` · ${mitos} mitos` : ''}</span></div>
    <p class="th-state"><span>Hasta acá</span>${estado}</p>`;
  bar.hidden = false;
}
function renderMiniIndex(chapterEl) {
  const list = [...chapterEl.querySelectorAll('.corr[data-corr]')].map((ph) => CORR.find((c) => c.id === ph.dataset.corr)).filter(Boolean);
  if (list.length < 2 || chapterEl.querySelector('.mini-index')) return;
  const nav = document.createElement('nav'); nav.className = 'mini-index'; nav.setAttribute('aria-label', 'En este capítulo');
  nav.innerHTML = `<p>En este capítulo</p><ol>${list.map((c) => `<li><a href="#/${c.chapter}/${c.id}"><span class="mi-n">${corrNum(c)}</span>${c.title}<span class="verdict v-${c.verdict}">${VEREDICTOS[c.verdict]}</span></a></li>`).join('')}</ol>`;
  chapterEl.querySelector('.dek').after(nav);
}

/* ================= Glosario ================= */
const GLOSARIO = {
  'láminas': 'Las hojitas radiales debajo del sombrero, donde se forman las esporas.',
  'anillo': 'Resto de una membrana que cubría las láminas; queda como una “pollerita” en el tallo.',
  'micólogo': 'Especialista en hongos. Identifica especies con muchos rasgos a la vez, a veces con microscopio.',
  'tabla dinámica': 'Herramienta de Excel que agrupa filas y calcula cuentas, promedios o porcentajes por grupo.',
  'probabilidad condicional': 'La probabilidad de algo sabiendo otra cosa. Acá: de ser venenoso, sabiendo que tiene cierto rasgo.',
  'promedio ponderado': 'Un promedio donde cada valor pesa según cuántos casos representa.',
  'mediana': 'El valor del medio cuando se ordenan los datos. No se mueve por unos pocos valores extremos.',
  'mínimos cuadrados': 'Método para elegir la recta (o curva) que hace más chica la suma de los errores al cuadrado.',
  'error estándar': 'Cuánto puede variar una proporción estimada por azar. Es más chico cuanto más datos hay.',
  'segmentación de datos': 'Botones de Excel que filtran una tabla dinámica con un clic.',
  'sólido de revolución': 'El cuerpo que se forma al girar una figura plana 360° alrededor de un eje.',
  'interacción': 'Cuando el efecto de un rasgo cambia según el valor de otro rasgo.',
  'simulados': 'Datos generados por computadora a partir de las especies reales, no recolectados en el campo.'
};
function addGlossary(root) {
  const used = new Set(), terms = Object.keys(GLOSARIO).sort((a, b) => b.length - a.length);
  const re = new RegExp(`(^|[^\\p{L}])(${terms.join('|')})(?![\\p{L}])`, 'iu');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) =>
    n.parentElement.closest('p, li, dd') && !n.parentElement.closest('code, h1, h2, h3, a, button, .g, .eq, figcaption, .verdict, table, .mini-index, .tech dt, svg, .qz, .sh-dl, .facts') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    const m = n.nodeValue.match(re); if (!m) continue;
    const key = m[2].toLowerCase(); if (used.has(key)) continue; used.add(key);
    const start = m.index + m[1].length, after = n.splitText(start); after.nodeValue = after.nodeValue.slice(m[2].length);
    const span = document.createElement('span'); span.className = 'g'; span.tabIndex = 0; span.textContent = m[2]; span.dataset.def = GLOSARIO[key];
    span.setAttribute('aria-description', GLOSARIO[key]); n.after(span);
  }
}

function renderChapterCorr(chapterEl) {
  renderMiniIndex(chapterEl);
  chapterEl.querySelectorAll('.corr[data-corr]').forEach((ph) => {
    const c = CORR.find((x) => x.id === ph.dataset.corr); if (!c) return;
    ph.innerHTML = corrShell(c);
    kinds[c.kind](c, ph.querySelector('.cx-chart'), ph.querySelector('.cx-data .table-wrap'));
  });
  addGlossary(chapterEl);
}

/* ================= Chapter initializers (run once, when first shown) ================= */
const inits = {
  portada() {
    renderQuiz();
    // Imagen generada desde el modelo 3D (cámara ortográfica: la posición horizontal es proporcional a la real)
    const box = $('cover-plate');
    box.innerHTML = `<img src="img/render/render_todas.jpg" alt="Las seis formas de hongo con tallo, modeladas en 3D con las medidas promedio de los datos y fotografiadas a la misma escala" width="2000" height="760"><div class="cover-labels"></div>`;
    fetch('img/render/render_todas.json').then((r) => r.json()).then(({ centers }) => {
      box.querySelector('.cover-labels').innerHTML = R.arquetipos.map((a, i) =>
        `<a href="#/formas" data-id="${a.id}" style="left:${centers[i] * 100}%"><b>${a.nombre}</b><span>${num(a.pct, 1)} %</span></a>`).join('');
      box.querySelectorAll('a').forEach((l) => l.addEventListener('click', () => setTimeout(() => selectShape(l.dataset.id), 60)));
    }).catch(() => { box.innerHTML = plateAll(R.arquetipos); });
  },

  investigacion() {
    charts.push(new Chart($('c-faltantes'), {
      type: 'bar',
      data: { labels: R.faltantes.map((f) => f[0]), datasets: [{ data: R.faltantes.map((f) => f[1] / 100), backgroundColor: () => T().ink2, borderRadius: 2, barPercentage: 0.7 }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${pct(c.raw)} de celdas vacías` } } },
        scales: { x: pctAxis(), y: { grid: { display: false }, border: { display: false } } } }
    }));
  },

  // Capítulos 2 a 5: solo correlaciones (se dibujan en renderChapterCorr)

  geogebra() {
    const fit = (pts, f = (x) => x) => { const n = pts.length; let sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (const [x, y] of pts) { const u = f(x); sx += u; sy += y; sxx += u * u; sxy += u * y; }
      const b = (n * sxy - sx * sy) / (n * sxx - sx * sx); return { a: (sy - b * sx) / n, b }; };
    const m1 = R.modelo1, L = { f: fit(m1.todos), v: fit(m1.venenosos), c: fit(m1.comestibles) };
    const line = (q) => [{ x: 0, y: q.a }, { x: 26, y: q.a + q.b * 26 }];
    const pts = (a) => a.map(([x, y]) => ({ x, y }));
    const ch1 = new Chart($('c-m1'), {
      type: 'scatter',
      data: { datasets: [
        { label: 'Hongos individuales (muestra de 2.500)', data: E.scatter.map(([x, y, t]) => ({ x, y, t })), pointRadius: 1.5, backgroundColor: (c) => (c.raw?.t ? T().tox : T().ed) + '30', borderWidth: 0 },
        { label: 'Todos', data: pts(m1.todos), backgroundColor: () => T().ink2, borderColor: () => T().panel, borderWidth: 1.5, pointRadius: 4.5, pointStyle: 'triangle' },
        { label: 'Venenosos', data: pts(m1.venenosos), backgroundColor: () => T().tox, borderColor: () => T().panel, borderWidth: 1.5, pointRadius: 4.5 },
        { label: 'Comestibles', data: pts(m1.comestibles), backgroundColor: () => T().ed, borderColor: () => T().panel, borderWidth: 1.5, pointRadius: 4.5, pointStyle: 'rect' },
        { type: 'line', label: 'f · todos', data: line(L.f), borderColor: () => T().ink2, borderWidth: 1.5, pointRadius: 0 },
        { type: 'line', label: 'v · venenosos', data: line(L.v), borderColor: () => T().tox, borderWidth: 2, pointRadius: 0 },
        { type: 'line', label: 'c · comestibles', data: line(L.c), borderColor: () => T().ed, borderWidth: 2, borderDash: [6, 4], pointRadius: 0 },
        { label: 'x elegido', data: [], pointStyle: 'line', pointRadius: 0 }
      ] },
      options: { plugins: { legend: { position: 'top', align: 'start', labels: { filter: (l) => l.datasetIndex >= 1 && l.datasetIndex <= 6 } },
          tooltip: { filter: (c) => c.datasetIndex > 0 && c.datasetIndex < 7, callbacks: { label: (c) => `${c.dataset.label}: (${num(c.raw.x, 1)} cm; ${num(c.raw.y, 1)} mm)` } },
          refLine: { value: 8, axis: 'x' } },
        scales: { x: { type: 'linear', min: 0, max: 26, title: { display: true, text: 'Diámetro del sombrero (cm)' }, grid: { color: () => T().rule } },
          y: { min: 0, max: 50, title: { display: true, text: 'Grosor del tallo (mm)' }, grid: { color: () => T().rule } } } }
    });
    charts.push(ch1);
    const sg = (v) => (v < 0 ? '− ' : '+ ') + num(Math.abs(v));
    $('m1-formula').innerHTML = `f(x) = ${num(L.f.b)}·x ${sg(L.f.a)}<br><span style="color:var(--tox)">v(x) = ${num(L.v.b)}·x ${sg(L.v.a)}</span><br><span style="color:var(--ed)">c(x) = ${num(L.c.b)}·x ${sg(L.c.a)}</span>`;
    const u1 = () => { const x = +$('m1-range').value; $('m1-x').textContent = num(x, 1);
      const v = L.v.a + L.v.b * x, c = L.c.a + L.c.b * x;
      $('m1-pred').innerHTML = `Tallo esperado: <b>${num(v, 1)} mm</b> si es venenoso, <b>${num(c, 1)} mm</b> si es comestible. Diferencia: ${num(Math.abs(v - c), 1)} mm.`;
      ch1.options.plugins.refLine.value = x; ch1.update('none'); };
    $('m1-range').oninput = u1; u1();

    const lg = fit(R.modelo2, Math.log);
    const curve = []; for (let x = 0.12; x <= 30; x += 0.12) curve.push({ x, y: lg.a + lg.b * Math.log(x) });
    const ch2 = new Chart($('c-m2'), {
      type: 'scatter',
      data: { datasets: [
        { label: 'Parte de venenosos por grupo de 1 cm', data: R.modelo2.map(([x, y], i) => ({ x, y, n: R.modelo2n[i] })), backgroundColor: () => T().tox, borderColor: () => T().panel, borderWidth: 1.5, pointRadius: 5 },
        { type: 'line', label: 'p(x) = a + b·ln(x)', data: curve, borderColor: () => T().ink, borderWidth: 2, pointRadius: 0 },
        { label: 'p = 1', data: [{ x: 0, y: 1 }, { x: 30, y: 1 }], type: 'line', borderColor: () => T().ink3, borderWidth: 1, borderDash: [2, 3], pointRadius: 0 }
      ] },
      options: { plugins: { legend: { position: 'top', align: 'start', labels: { filter: (l) => l.datasetIndex < 2 } }, refLine: { value: 3, axis: 'x' },
          tooltip: { filter: (c) => c.datasetIndex === 0, callbacks: { label: (c) => `${num(c.raw.x, 1)} cm → ${pct(c.raw.y)} venenosos (${int(c.raw.n)} hongos)` } } },
        scales: { x: { type: 'linear', min: 0, max: 30, title: { display: true, text: 'Diámetro del sombrero (cm)' }, grid: { color: () => T().rule } },
          y: { ...pctAxis(), min: 0.3, max: 1.12, ticks: { callback: (v) => Math.round(v * 100) + ' %', stepSize: 0.1 } } } }
    });
    charts.push(ch2);
    $('m2-formula').innerHTML = `p(x) = ${num(lg.a, 3)} ${lg.b < 0 ? '−' : '+'} ${num(Math.abs(lg.b), 3)}·ln(x)<br>p(3) = ${num(lg.a + lg.b * Math.log(3), 3)} · p(15) = ${num(lg.a + lg.b * Math.log(15), 3)}<br>p(x) &gt; 1 si x &lt; ${num(Math.exp((1 - lg.a) / lg.b), 2)} cm`;
    const u2 = () => { const x = +$('m2-range').value; $('m2-x').textContent = num(x, 1);
      const p = lg.a + lg.b * Math.log(x);
      $('m2-pred').innerHTML = p > 1 ? `p(${num(x, 1)}) = <b>${num(p, 3)}</b>: mayor que 1, imposible para una probabilidad.` : `Probabilidad estimada de ser venenoso: <b>${pct(p, 0)}</b>`;
      ch2.options.plugins.refLine.value = x; ch2.update('none'); };
    $('m2-range').oninput = u2; u2();
    window.__model2 = lg;
  },

  combinar() {
    // (el mapa color × forma ahora es la correlación 14, en corr.js)
    charts.push(new Chart($('c-prog'), {
      type: 'bar',
      data: { labels: R.progresion.map((p) => p.paso), datasets: [{ label: 'Hongos en grupos puros', data: R.progresion.map((p) => p.puros / 100), backgroundColor: () => T().accent, borderRadius: 2, barPercentage: 0.7 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${pct(c.raw)} de los hongos · ${int(R.progresion[c.dataIndex].grupos)} combinaciones` } } },
        scales: { y: pctAxis(), x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: false, callback(v) { const l = this.getLabelForValue(v); return l.length > 16 ? l.replace(/^(.{0,16}\S*)\s/, '$1\n').split('\n') : l; } } } } }
    }));

    // Explorador
    const labels = { shape: 'Forma', capColor: 'Color del sombrero', stemColor: 'Color del tallo', surface: 'Superficie', size: 'Diámetro (cm)', habitat: 'Hábitat', season: 'Estación', ring: '¿Anillo?', bruise: '¿Se magulla?' };
    const order = ['shape', 'capColor', 'stemColor', 'surface', 'size', 'ring', 'bruise', 'habitat', 'season'];
    const form = $('exp-form');
    order.forEach((d) => {
      const l = document.createElement('label'); l.textContent = labels[d];
      const s = document.createElement('select'); s.name = d;
      s.innerHTML = '<option value="">Cualquiera</option>' + E.cats[d].map((c, i) => `<option value="${i}">${c}</option>`).join('');
      s.onchange = upd; l.appendChild(s); form.appendChild(l);
    });
    $('exp-ref').style.left = BASE * 100 + '%';
    function upd() {
      const f = order.filter((d) => form.elements[d].value !== '').map((d) => [E.dims.indexOf(d), +form.elements[d].value]);
      order.forEach((d) => form.elements[d].classList.toggle('set', form.elements[d].value !== ''));
      let n = 0, t = 0; for (const r of E.rows) if (f.every(([i, v]) => r[i] === v)) { n += r[9]; t += r[10]; }
      const p = n ? t / n : 0;
      $('exp-fill').style.width = (n ? p * 100 : 0) + '%';
      $('exp-pct').textContent = n ? pct(p, 0) : '—';
      $('exp-n').textContent = n ? `${int(n)} hongos coinciden · ${int(t)} venenosos` : 'Ningún hongo coincide';
      let m;
      if (!n) m = 'Ninguna combinación de la muestra tiene esos rasgos. Probá quitar alguno.';
      else if (!f.length) m = 'Sin filtros: es la muestra completa. La línea punteada marca el 55,5 %.';
      else if (p === 0 || p === 1) m = `Grupo puro: ${p ? 'todos venenosos' : 'todos comestibles'}. Con ${f.length} rasgo${f.length > 1 ? 's' : ''} y ${int(n)} hongos, probablemente quedaron una o pocas especies. Es lo que muestra la figura 4.`;
      else if (n < 100) m = 'Quedan menos de 100 hongos: el porcentaje no es confiable.';
      else if (Math.abs(p - BASE) < 0.1) m = 'Casi igual al promedio: estos rasgos no ayudan a decidir.';
      else m = p > BASE ? `Más riesgo que el promedio, pero ${Math.round((1 - p) * 100)} de cada 100 son comestibles.` : `Menos riesgo que el promedio, pero ${Math.round(p * 100)} de cada 100 siguen siendo venenosos.`;
      $('exp-msg').textContent = m;
    }
    $('exp-reset').onclick = () => { form.reset(); upd(); };
    upd();
  },

  accesibilidad() {
    const s = R.sentidos;
    charts.push(new Chart($('c-sentidos'), {
      type: 'bar',
      data: { labels: [['Vista', '3 colores'], ['Vista', 'colores + magulladura'], ['Tacto', 'forma, superficie, tamaño, anillo'], ['Tacto', '+ tallo y láminas (7 rasgos)']], datasets: [{ data: s.map((x) => x.puros / 100), backgroundColor: s.map((x) => (x.tipo === 'tactil' ? T().accent : T().ink3)), borderRadius: 2, barPercentage: 0.7 }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${pct(c.raw)} en grupos puros · ${s[c.dataIndex].tipo === 'tactil' ? 'táctil' : 'visual'}` } } },
        scales: { x: pctAxis(), y: { grid: { display: false }, border: { display: false } } } }
    }));
    $('sonify').onclick = sonify;
  },

  formas() {
    const tabs = $('shape-tabs');
    R.arquetipos.forEach((a) => { const b = document.createElement('button'); b.dataset.id = a.id; b.setAttribute('role', 'tab'); b.innerHTML = `${a.nombre}<small>${num(a.pct, 1)} %</small>`; b.onclick = () => selectShape(a.id); tabs.appendChild(b); });
    document.querySelectorAll('#shape-view button').forEach((b) => b.onclick = () => {
      document.querySelectorAll('#shape-view button').forEach((x) => x.classList.toggle('on', x === b));
      selectShape(document.querySelector('#shape-tabs button.on')?.dataset.id || 'convexa');
    });
    selectShape('convexa');
    $('review').innerHTML = R.revision.map((r) => {
      const a = R.arquetipos.find((x) => x.id === r.id), mx = 3;
      return `<div class="rv"><div class="rv-pair"><figure><img src="img/${r.id}.jpg" alt="Imagen generada con IA de la forma ${a.nombre}" loading="lazy"><figcaption>Generada con IA</figcaption></figure><figure><img src="img/render/render_${r.id}.jpg" alt="Imagen de la forma ${a.nombre} generada desde los datos" loading="lazy"><figcaption>Desde los datos</figcaption></figure></div><div class="rv-body">
        <div class="rv-head"><b>${a.nombre}</b><span class="tag ${r.veredicto}">${r.veredicto === 'ok' ? 'correcta' : r.veredicto}</span></div>
        <p>${r.color}</p>
        <div class="prop"><span>Imagen</span><span class="bar"><span style="width:${(r.propImg / mx) * 100}%"></span></span><span>${num(r.propImg, 2)}</span></div>
        <div class="prop"><span>Datos</span><span class="bar d"><span style="width:${(r.propDato / mx) * 100}%"></span></span><span>${num(r.propDato, 2)}</span></div>
        <p class="note">${r.nota}</p></div></div>`;
    }).join('');
  },

  'tres-d'() {
    const tabs = $('tresd-tabs');
    let cur = 'convexa', viewer = null;
    const draw = () => {
      $('tresd-plate').innerHTML = plateOne(R.arquetipos.find((a) => a.id === cur), { profileMode: true });
      tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.id === cur));
      viewer?.show(R.arquetipos, cur, { steps: +$('steps').value, all: $('all3d').checked });
    };
    R.arquetipos.forEach((a) => { const b = document.createElement('button'); b.dataset.id = a.id; b.textContent = a.nombre; b.onclick = () => { cur = a.id; draw(); }; tabs.appendChild(b); });
    $('steps').oninput = () => { $('steps-o').textContent = $('steps').value; draw(); };
    $('all3d').onchange = draw;
    draw();
    import('./viewer3d.js').then(({ createViewer }) => { viewer = createViewer($('viewer')); draw(); })
      .catch(() => { $('viewer').innerHTML = '<p class="viewer-hint">No se pudo cargar el visor 3D (hace falta conexión a internet).</p>'; });

    const rows = R.arquetipos.map((a) => { const v = profile(a).volume; return `<tr><td>${a.nombre}</td><td class="num">${num(a.cap)}</td><td class="num">${num(a.alto)}</td><td class="num">${num(a.grosor, 1)}</td><td class="num">${num(v.cap, 1)}</td><td class="num">${num(v.stem, 1)}</td><td class="num"><b>${num(v.cap + v.stem, 1)}</b></td></tr>`; }).join('');
    $('vol-table').innerHTML = `<thead><tr><th>Forma</th><th class="num">Sombrero ⌀ (cm)</th><th class="num">Tallo alto (cm)</th><th class="num">Tallo grosor (mm)</th><th class="num">V sombrero (cm³)</th><th class="num">V tallo (cm³)</th><th class="num">V total (cm³)</th></tr></thead><tbody>${rows}</tbody>`;
    const tink = {
      convexa: ['Semiesfera de 67 mm, achatada a 28 mm', 'Cilindro de 68 × 12,4 mm', 'scale([1,1,0.45]) sphere(d=66.7)'],
      plana: ['Cilindro de 70 × 10 mm con bisel máximo', 'Cilindro de 66 × 11,7 mm', 'hull() + rotate_extrude()'],
      hundida: ['Cono invertido (14 → 74,5 mm) menos una esfera', 'Cilindro de 55 × 14 mm', 'difference(){ cylinder(d1=14,d2=74.5); sphere() }'],
      campana: ['Paraboloide de 36 × 28 mm, ahuecado', 'Cilindro de 68 × 5,3 mm', 'scale([1,1,1.5]) sphere(d=36.3)'],
      esferica: ['Esfera de 91 mm cortada en su cuarto inferior', 'Cilindro de 111 × 19 mm + bulbo + anillo', 'sphere(d=90.8) + cylinder(h=12,d1=28,d2=20)'],
      conica: ['Cono de 37,7 × 32 mm', 'Cilindro de 64 × 7,4 mm', 'cylinder(h=32, d1=37.7, d2=3)']
    };
    $('tink-table').innerHTML = '<thead><tr><th>Forma</th><th>Sombrero en Tinkercad</th><th>Tallo</th><th>OpenSCAD</th></tr></thead><tbody>' +
      R.arquetipos.map((a) => `<tr><td>${a.nombre}</td><td>${tink[a.id][0]}</td><td>${tink[a.id][1]}</td><td><code>${tink[a.id][2]}</code></td></tr>`).join('') + '</tbody>';
  }
};

/* ================= Cuestionario de la portada ================= */
function renderQuiz() {
  const Q = R.quiz, answers = [];
  $('quiz').innerHTML = Q.map((q, i) => {
    const a = { id: 'convexa', cap: q.cap, alto: q.alto, grosor: q.grosor, fill: q.fill, tallo: '#efeae0', ring: q.anillo === 'Sí' };
    const rows = [['Forma', q.forma], ['Sombrero', `${q.color}, ${num(q.cap, 1)} cm`], ['Superficie', q.superficie], ['Tallo', `${q.tallo}, ${num(q.alto, 1)} cm`], ['Anillo', q.anillo], ['Se magulla', q.magulla], ['Hábitat', q.habitat]];
    return `<article class="qz" data-i="${i}">
      <p class="qz-n">Hongo ${i + 1}</p>${plateMini(a, `Hongo ${i + 1}: ${q.forma.toLowerCase()}, ${q.color.toLowerCase()}`)}
      <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
      <div class="qz-btns"><button type="button" data-a="1">Lo comería</button><button type="button" data-a="0">No lo comería</button></div>
      <div class="qz-res" hidden></div></article>`;
  }).join('');
  $('quiz').querySelectorAll('.qz').forEach((card) => card.querySelectorAll('button').forEach((b) => b.onclick = () => {
    const i = +card.dataset.i, q = Q[i], comeria = b.dataset.a === '1', ok = comeria !== q.venenoso;
    answers[i] = ok;
    card.querySelectorAll('button').forEach((x) => { x.disabled = true; x.classList.toggle('picked', x === b); });
    const res = card.querySelector('.qz-res');
    res.innerHTML = `<p class="qz-v ${q.venenoso ? 'tox' : 'ed'}">${q.venenoso ? 'Venenoso' : 'Comestible'} <span>${ok ? '· acertaste' : '· no acertaste'}</span></p><p>${q.nota}</p>`;
    res.hidden = false; card.classList.add(q.venenoso ? 'is-tox' : 'is-ed');
    const done = answers.filter((x) => x !== undefined).length;
    if (done === Q.length) {
      const hits = answers.filter(Boolean).length;
      $('quiz-score').innerHTML = `Acertaste <b>${hits} de ${Q.length}</b>. Los cuatro son convexos y de tallo blanco, y los rasgos que “parecen” peligrosos no coinciden con los que de verdad lo son. El resto del informe muestra por qué. <a href="#/investigacion">Empezar →</a>`;
    }
  }));
}

function selectShape(id) {
  const a = R.arquetipos.find((x) => x.id === id); if (!a || !$('shape-plate')) return;
  $('shape-tabs').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
  const view = document.querySelector('#shape-view button.on')?.dataset.v || 'img';
  $('shape-plate').innerHTML = view === 'img'
    ? `<img class="shape-img" src="img/render/render_${a.id}.jpg" alt="Hongo de forma ${a.nombre}: sombrero de ${num(a.cap)} cm, tallo de ${num(a.alto)} cm, color ${a.colorCap.split(' ')[0].toLowerCase()}, generado desde los datos">`
    : plateOne(a);
  $('sh-code').textContent = `cap-shape = '${a.codigo}' · ${int(a.n)} hongos · ${num(a.pct)} % de la muestra`;
  $('sh-name').textContent = a.nombre;
  $('sh-dl').innerHTML = [
    ['Diámetro del sombrero', `${num(a.cap)} cm`], ['Alto del tallo', `${num(a.alto)} cm`], ['Grosor del tallo', `${num(a.grosor)} mm`],
    ['Color del sombrero', a.colorCap], ['Color del tallo', a.colorTallo], ['Superficie frecuente', a.superficie],
    ['Con anillo', `${num(a.anillo, 1)} %`], ['Géneros típicos', a.generos]
  ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  $('sh-split').innerHTML = `<span class="t" style="width:${a.ven}%">${num(a.ven, 1)} % venenosos</span><span class="e" style="width:${100 - a.ven}%">${num(100 - a.ven, 1)} %</span>`;
}

/* ================= Sonificación ================= */
let audio;
// Cada valor suena como un tono: más agudo = valor más alto (escala de 220 a 880 Hz)
function playSeries(values, lo, hi, dt = 0.26) {
  audio ||= new (window.AudioContext || window.webkitAudioContext)();
  const t0 = audio.currentTime + 0.08;
  values.forEach((y, i) => {
    const o = audio.createOscillator(), g = audio.createGain(), t = t0 + i * dt;
    o.type = 'sine'; o.frequency.value = 220 + Math.max(0, Math.min(1, (y - lo) / (hi - lo))) * 660;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + dt * 0.9);
    o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dt);
  });
  return values.length * dt * 1000;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('.listen'); if (!b) return;
  const c = CORR.find((x) => x.id === b.dataset.corr), note = b.nextElementSibling;
  let vals, txt;
  if (c.kind === 'stack') { const m = marginal(c.dim); vals = m.map((x) => x.p); txt = `${m.length} tonos, de la categoría con más venenosos (${m[0].label}) a la de menos (${m[m.length - 1].label}). Más agudo = más venenosos.`; }
  else if (c.kind === 'rango') { vals = R.rangos[c.key].y; txt = `${vals.length} tonos, del rango más chico al más grande. Más agudo = más venenosos.`; }
  else { vals = R.corrST.ven; txt = 'Grosor del tallo de los venenosos, de 0,5 a 24,5 cm de sombrero. El tono sube casi sin parar: la relación es fuerte.'; }
  const lo = c.kind === 'corrST' ? 0 : 0, hi = c.kind === 'corrST' ? 60 : 1;
  const ms = playSeries(vals, lo, hi); note.textContent = txt;
  setTimeout(() => { note.textContent = ''; }, ms + 2500);
});
function sonify() {
  audio ||= new (window.AudioContext || window.webkitAudioContext)();
  const pts = R.modelo2, t0 = audio.currentTime + 0.1, dt = 0.28;
  pts.forEach(([x, y], i) => {
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = 'sine'; o.frequency.value = 220 + (y - 0.3) / 0.55 * 660; // 0,30 → 220 Hz · 0,85 → 880 Hz
    g.gain.setValueAtTime(0, t0 + i * dt); g.gain.linearRampToValueAtTime(0.18, t0 + i * dt + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t0 + i * dt + dt * 0.9);
    o.connect(g).connect(audio.destination); o.start(t0 + i * dt); o.stop(t0 + i * dt + dt);
  });
  const note = $('sonify-note');
  note.textContent = `Reproduciendo ${pts.length} tonos, de 0,5 cm a 21,5 cm. Más agudo = más venenosos.`;
  setTimeout(() => { note.textContent = 'Terminado. El tono baja al principio y después se estabiliza, igual que la curva.'; }, pts.length * dt * 1000 + 300);
}

/* ================= Router ================= */
const chapters = [...document.querySelectorAll('.chapter')];
const ids = chapters.map((c) => c.dataset.id);
const done = new Set();
function route() {
  const mm = location.hash.match(/^#\/([\w-]+)(?:\/(c\d+))?/) || [];
  let id = mm[1]; const anchor = mm[2];
  if (!ids.includes(id)) id = 'portada';
  chapters.forEach((c) => (c.hidden = c.dataset.id !== id));
  document.querySelectorAll('#toc-list a').forEach((a) => { const on = a.getAttribute('href') === '#/' + id; a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  const i = ids.indexOf(id), prev = chapters[i - 1], next = chapters[i + 1];
  const tocLabel = (c) => document.querySelector(`#toc-list a[href="#/${c.dataset.id}"] span`)?.textContent;
  $('pager').innerHTML = (prev ? `<a class="prev" href="#/${prev.dataset.id}"><small>← Anterior ${tocLabel(prev) !== '—' ? '· ' + tocLabel(prev) : ''}</small><b>${prev.dataset.title}</b></a>` : '') +
    (next ? `<a class="next" href="#/${next.dataset.id}"><small>Siguiente ${tocLabel(next) !== '—' ? '· ' + tocLabel(next) : ''} →</small><b>${next.dataset.title}</b></a>` : '');
  document.title = (id === 'portada' ? '' : chapters[i].dataset.title + ' · ') + '¿Comestible a simple vista?';
  window.scrollTo(0, 0);
  if (!done.has(id)) { done.add(id); renderChapterCorr(chapters[i]); inits[id]?.(); }
  renderThread(id);
  if (anchor) requestAnimationFrame(() => document.getElementById('corr-' + anchor)?.scrollIntoView({ block: 'start' }));
  $('toc').classList.remove('open'); $('toc-toggle').setAttribute('aria-expanded', 'false');
  onScroll();
}
function onScroll() {
  const h = document.documentElement.scrollHeight - innerHeight;
  $('progress').style.width = (h > 0 ? (scrollY / h) * 100 : 100) + '%';
}
addEventListener('hashchange', route);
addEventListener('scroll', onScroll, { passive: true });
$('toc-toggle').onclick = () => { const o = $('toc').classList.toggle('open'); $('toc-toggle').setAttribute('aria-expanded', o); };
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const i = ids.indexOf((location.hash.match(/^#\/([\w-]+)/) || [])[1] || 'portada');
  if (e.key === 'ArrowRight' && ids[i + 1]) location.hash = '#/' + ids[i + 1];
  if (e.key === 'ArrowLeft' && i > 0) location.hash = '#/' + ids[i - 1];
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { chartDefaults(); charts.forEach((c) => c.update()); });
/* ================= Modo de lectura: divulgativa / técnica ================= */
const HINT = {
  div: 'Solo lo esencial: gráficos, lectura y el hilo. Lo técnico queda plegado (botones ＋).',
  tec: 'Todo a la vista: cómo se construye cada dato en Excel, la matemática y las precauciones.'
};
function techCount(ch) { return ch ? ch.querySelectorAll('.cx-tech, .read-tech .tech, .tec-only').length : 0; }
let toastTimer;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.hidden = false; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.classList.remove('on'); setTimeout(() => (t.hidden = true), 300); }, 3200);
}
function setMode(m, user = false) {
  document.body.classList.toggle('mode-div', m === 'div');
  document.body.classList.toggle('mode-tec', m === 'tec');
  document.querySelectorAll('.mode button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === m)));
  $('mode-hint').textContent = HINT[m];
  if (!user) return;
  try { localStorage.setItem('lectura', m); } catch { /* sin almacenamiento */ }
  const ch = chapters.find((c) => !c.hidden), n = techCount(ch);
  if (!n) { toast(`Lectura ${m === 'tec' ? 'técnica' : 'divulgativa'}. Este capítulo no tiene partes técnicas; se nota en los capítulos 1 a 9 y en los anexos B y C.`); return; }
  toast(m === 'tec' ? `Lectura técnica: ${n} ${n === 1 ? 'parte técnica abierta' : 'partes técnicas abiertas'} en este capítulo.` : `Lectura divulgativa: ${n} ${n === 1 ? 'parte técnica plegada' : 'partes técnicas plegadas'} en este capítulo.`);
  // llevar a la vista la primera parte técnica, para que se vea el cambio
  const first = ch.querySelector(m === 'tec' ? '.cx-tech, .read-tech .tech, .tec-only' : '.tech-open');
  const r = first?.getBoundingClientRect();
  if (r && (r.top > innerHeight || r.bottom < 0)) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
  first?.classList.add('flash'); setTimeout(() => first?.classList.remove('flash'), 1400);
}
document.querySelectorAll('.mode button').forEach((b) => b.onclick = () => setMode(b.dataset.mode, true));
// Botones para abrir cada parte técnica en modo divulgativo
document.querySelectorAll('.read-tech').forEach((rt) => {
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'tech-open'; btn.setAttribute('aria-expanded', 'false');
  btn.textContent = 'Ver cómo se calculó'; rt.querySelector('.tech')?.before(btn);
});
document.querySelectorAll('.tec-only').forEach((el) => {
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'tech-open solo'; btn.setAttribute('aria-expanded', 'false');
  btn.dataset.label = `Ver parte técnica: ${el.dataset.label}`; btn.textContent = btn.dataset.label; el.before(btn);
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('.tech-open'); if (!b) return;
  const host = b.classList.contains('solo') ? b.nextElementSibling : b.closest('.cx, .read-tech');
  const open = host.classList.toggle('show-tech');
  if (b.classList.contains('solo')) b.classList.toggle('show-tech', open);
  b.setAttribute('aria-expanded', String(open));
  b.textContent = open ? 'Ocultar la parte técnica' : (b.dataset.label || (host.classList.contains('cx') ? 'Ver cómo se construye y la matemática' : 'Ver cómo se calculó'));
});
let savedMode = 'div'; try { savedMode = localStorage.getItem('lectura') || 'div'; } catch { /* */ }
setMode(savedMode);

/* ================= Imprimir / PDF: todos los capítulos, con la parte técnica ================= */
function printAll() {
  const prev = chapters.map((c) => c.hidden);
  chapters.forEach((c) => (c.hidden = false));
  chapters.forEach((c, i) => { const id = ids[i]; if (!done.has(id)) { done.add(id); renderChapterCorr(c); inits[id]?.(); } });
  document.querySelectorAll('details').forEach((d) => { d.dataset.wasOpen = d.open ? '1' : ''; d.open = true; });
  document.body.classList.add('print-all');
  charts.forEach((c) => c.resize());
  const restore = () => {
    document.body.classList.remove('print-all');
    document.querySelectorAll('details').forEach((d) => { d.open = d.dataset.wasOpen === '1'; });
    chapters.forEach((c, i) => (c.hidden = prev[i]));
    removeEventListener('afterprint', restore);
  };
  addEventListener('afterprint', restore);
  setTimeout(() => window.print(), 700);
}
$('print-btn')?.addEventListener('click', printAll);

renderCorrMaps();
route();
