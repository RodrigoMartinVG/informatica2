/* global Chart, RESEARCH */
// Modo presentación: 8 diapositivas, flechas para avanzar, F pantalla completa, N notas del orador.
(() => {
  const R = RESEARCH, slides = [...document.querySelectorAll('.slide')], drawn = new Set();
  const C = { ink: '#17161a', ink2: '#4a4843', rule: '#dedad0', ed: '#2a78d6', tox: '#eb6834', accent: '#2f5d50' };
  Chart.defaults.font.family = '"IBM Plex Sans", sans-serif';
  Chart.defaults.font.size = 14; Chart.defaults.color = C.ink2; Chart.defaults.maintainAspectRatio = false; Chart.defaults.animation = false;
  const pctAxis = { min: 0, max: 1, ticks: { callback: (v) => Math.round(v * 100) + ' %' }, grid: { color: C.rule } };
  const base = { id: 'base', afterDatasetsDraw(ch, _a, o) { if (o.v == null) return; const { ctx, chartArea: a, scales } = ch, s = o.x ? scales.x : scales.y, p = s.getPixelForValue(o.v);
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); if (o.x) { ctx.moveTo(p, a.top); ctx.lineTo(p, a.bottom); } else { ctx.moveTo(a.left, p); ctx.lineTo(a.right, p); } ctx.stroke(); ctx.restore(); } };
  Chart.register(base);

  const charts = {
    'd-rangos': () => ({ type: 'line', data: { labels: R.rangos.diametro.x, datasets: [{ data: R.rangos.diametro.y, borderColor: C.tox, backgroundColor: C.tox, borderWidth: 3, pointRadius: 4, tension: .2 }] },
      options: { plugins: { legend: { display: false }, base: { v: 0.555 } }, scales: { y: pctAxis, x: { title: { display: true, text: 'Diámetro del sombrero (cm)' }, grid: { display: false } } } } }),
    'd-tallo': () => { const d = R.rasgos.stemColor.datos, l = Object.keys(d), v = Object.values(d);
      return { type: 'bar', data: { labels: l, datasets: [{ label: 'Venenosos', data: v, backgroundColor: C.tox, stack: 's' }, { label: 'Comestibles', data: v.map((x) => 1 - x), backgroundColor: C.ed, stack: 's' }] },
        options: { indexAxis: 'y', plugins: { legend: { position: 'top', align: 'end' }, base: { v: 0.555, x: true } }, scales: { x: { ...pctAxis, stacked: true }, y: { stacked: true, grid: { display: false } } } } }; },
    'd-m2': () => { const a = 0.740, b = -0.109, c = []; for (let x = 0.3; x <= 22; x += 0.2) c.push({ x, y: a + b * Math.log(x) });
      return { type: 'scatter', data: { datasets: [{ label: 'Datos', data: R.modelo2.map(([x, y]) => ({ x, y })), backgroundColor: C.tox, pointRadius: 6 }, { type: 'line', label: 'FitLog', data: c, borderColor: C.ink, borderWidth: 3, pointRadius: 0 }] },
        options: { plugins: { legend: { display: false }, base: { v: 0.555 } }, scales: { x: { type: 'linear', min: 0, max: 22, title: { display: true, text: 'Diámetro del sombrero (cm)' }, grid: { color: C.rule } }, y: { ...pctAxis, min: 0.3, max: 0.9 } } } }; },
    'd-prog': () => ({ type: 'bar', data: { labels: ['Forma', '+ color', '+ color del tallo', '+ superficie', '+ anillo y magulladura', '+ láminas', '+ resto'], datasets: [{ data: R.progresion.map((p) => p.puros / 100), backgroundColor: C.accent }] },
      options: { plugins: { legend: { display: false } }, scales: { y: pctAxis, x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: false, callback(v) { const l = this.getLabelForValue(v); return l.length > 12 ? l.replace(/^(.{0,10}\S*)\s/, '$1\n').split('\n') : l; } } } } } })
  };

  let i = 0;
  const fromHash = () => Math.min(slides.length - 1, Math.max(0, (parseInt(location.hash.slice(1), 10) || 1) - 1));
  function show(n) {
    i = Math.min(slides.length - 1, Math.max(0, n));
    slides.forEach((s, k) => s.classList.toggle('on', k === i));
    const s = slides[i];
    if (!s.querySelector('.foot')) s.insertAdjacentHTML('beforeend', `<div class="foot"><span>¿Comestible a simple vista? · Informática II</span><span>${i + 1} / ${slides.length}</span></div>`);
    s.querySelectorAll('canvas').forEach((cv) => { if (!drawn.has(cv.id) && charts[cv.id]) { drawn.add(cv.id); new Chart(cv, charts[cv.id]()); } });
    document.getElementById('notes').textContent = `Notas (${i + 1}/${slides.length}): ${s.dataset.notes || ''}`;
    history.replaceState(null, '', '#' + (i + 1));
  }
  document.getElementById('prev').onclick = () => show(i - 1);
  document.getElementById('next').onclick = () => show(i + 1);
  document.getElementById('fs').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
  document.getElementById('nt').onclick = () => document.getElementById('notes').classList.toggle('on');
  document.getElementById('deck').addEventListener('click', (e) => { if (!e.target.closest('canvas')) show(i + (e.clientX > innerWidth / 3 ? 1 : -1)); });
  addEventListener('keydown', (e) => {
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); show(i + 1); }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) show(i - 1);
    if (e.key === 'Home') show(0);
    if (e.key === 'End') show(slides.length - 1);
    if (e.key === 'f' || e.key === 'F') document.getElementById('fs').click();
    if (e.key === 'n' || e.key === 'N') document.getElementById('nt').click();
  });
  show(fromHash());
})();
