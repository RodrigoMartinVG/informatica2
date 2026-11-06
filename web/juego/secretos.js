// Secretos del bosque: cosas para descubrir más allá de los seis claros. Cada uno tiene una pista
// (algo misterioso, que no lo dice todo) y, cuando lo descubrís, su nombre y qué hiciste.
// Se guardan en el navegador, como los logros de un juego.
const KEY = 'bajo-el-sombrero:secretos';

export const SECRETS = [
  { id: 'rebote', name: 'Trampolín', hint: 'Hay bolas blancas que no son lo que parecen. ¿Y si saltás al lado de una?', done: 'Rebotaste en un bejín.' },
  { id: 'estornudo', name: '¡Achís!', hint: 'Las esporas de los bejines dan cosquillas… si rebotás seguido.', done: 'Las esporas te hicieron estornudar.' },
  { id: 'combo', name: 'Equilibrista', hint: 'Saltá de sombrero en sombrero sin tocar el suelo: tres seguidos.', done: 'Encadenaste tres sombreros saltando.' },
  { id: 'picada', name: 'Halcón', hint: 'Volando, probá bajar y avanzar a la vez.', done: 'Te tiraste en picada (X + W volando).' },
  { id: 'planeo', name: 'Planeador', hint: 'Aun sin energía, las alas sirven para algo. Mantené el salto en el aire.', done: 'Planeaste sin energía.' },
  { id: 'altura', name: 'Vista de pájaro', hint: 'El bosque tiene techo. ¿Llegaste hasta arriba de todo?', done: 'Volaste hasta el techo del bosque.' },
  { id: 'pajaro', name: 'Escondido', hint: 'Cuando pase una sombra grande, buscá un techo.', done: 'Zafaste del pájaro escondiéndote.' },
  { id: 'conducta', name: 'Un momento de paz', hint: 'Dejá al escarabajo quieto un rato y mirá qué hace.', done: 'Viste al escarabajo limpiarse o estirarse.' },
  { id: 'repisa', name: 'Escalador', hint: 'Los árboles se trepan. Arriba hay escalones… de hongo.', done: 'Subiste a un hongo repisa.' },
  { id: 'repisaMordida', name: 'Madera dura', hint: 'Los hongos de los árboles, ¿se podrán morder?', done: 'Mordiste un hongo repisa.' },
  { id: 'mancha', name: 'Moretón', hint: 'Algunos tallos cambian de color si los empujás.', done: 'Viste un tallo mancharse de azul.' },
  { id: 'podrido', name: 'Mal olor', hint: 'No todos los hongos están sanos. Olfateá uno que se vea viejo y apagado.', done: 'Olfateaste un hongo podrido.' },
  { id: 'dorada', name: 'Buscador de oro', hint: 'Algo brilla arriba de los hongos más altos…', done: 'Juntaste una espora dorada.' },
  { id: 'doradas', name: 'Todas las doradas', hint: 'En cada lugar hay varias esporas doradas. Juntalas todas en uno.', done: 'Juntaste todas las esporas doradas de un lugar.' },
  { id: 'aros', name: 'Piloto', hint: 'Cerca de la salida flotan unos aros. Pasalos volando, en orden.', done: 'Completaste el circuito de aros.' },
  { id: 'oro', name: 'Medalla de oro', hint: 'El circuito de aros se puede hacer mucho más rápido: corré (Shift) y tirate en picada.', done: 'Ganaste la medalla de oro en los aros.' },
  { id: 'amigo', name: 'Compañía', hint: 'Alguien chiquito y de colores se esconde bajo un sombrero, en el borde de un claro.', done: 'Encontraste a un escarabajo amigo.' },
  { id: 'amigos', name: 'Caravana', hint: 'Hay cinco amigos perdidos, uno en cada uno de los primeros claros.', done: 'Encontraste a todos tus amigos.' },
  { id: 'tela', name: 'Atrapado', hint: 'Entre algunos tallos hay hilos finos y brillantes. ¿Qué pasa si volás a través?', done: 'Quedaste atrapado en una tela de araña.' },
  { id: 'sombrero', name: 'Con estilo', hint: 'Los mejores exploradores se ganan un sombrero.', done: 'Ganaste un sombrero (H para ponértelo).' }
];

export function createSecrets({ tip, floatText, S }) {
  let got = new Set();
  try { got = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { /* sin almacenamiento */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...got])); } catch { /* nada */ } };
  let quiet = 0, lastHint = null, onChange = () => {};
  const pending = () => SECRETS.filter((s) => !got.has(s.id));
  return {
    SECRETS,
    has: (id) => got.has(id),
    get count() { return got.size; },
    onChange(fn) { onChange = fn; },
    // Se descubrió un secreto
    hit(id) {
      if (got.has(id)) return;
      const s = SECRETS.find((x) => x.id === id); if (!s) return;
      got.add(id); save(); quiet = 0; onChange();
      setTimeout(() => { floatText(`🔍 Secreto: ${s.name}`, 'combo'); S.gold(); }, 500);
      if (got.size === 1) tip('sec0', 'Descubriste un secreto del bosque. En el cuaderno (C) están todos, con pistas de los que te faltan.');
    },
    // Una pista de algo que todavía no hiciste (la próxima, no la misma de la vez anterior)
    hint() {
      const p = pending(); if (!p.length) { tip('secall' + Date.now(), '¡Descubriste todos los secretos del bosque!', { repeat: true }); return; }
      const opts = p.filter((s) => s.id !== lastHint), s = opts[Math.floor(Math.random() * opts.length)] || p[0];
      lastHint = s.id; quiet = 0;
      tip('sechint' + Date.now(), `Pista: ${s.hint}`, { repeat: true });
    },
    // Si pasa un buen rato sin descubrir nada, el bosque te sopla una pista
    update(dt, play) { if (!play) return; quiet += dt; if (quiet > 150 && pending().length) this.hint(); },
    // La lista para el cuaderno
    html() {
      return `<section class="secrets"><h3>Secretos del bosque <span>${got.size}/${SECRETS.length}</span></h3>
        <p class="sec-k">Cosas para descubrir más allá de los claros. Los que te faltan tienen una pista.</p>
        <ul>${SECRETS.map((s) => got.has(s.id) ? `<li class="ok"><b>✓ ${s.name}</b><span>${s.done}</span></li>` : `<li><b>? ? ?</b><span>${s.hint}</span></li>`).join('')}</ul></section>`;
    }
  };
}
