// Vocabulario de la voz: fragmentos que se generan de antemano con Kokoro (ver tools/voz)
// y que el juego encadena para describir cosas que cambian (rasgos, direcciones, distancias, vidas…).
// Este archivo no depende del navegador: lo usa también el script que genera los audios (tools/voz/frases.mjs).

export const MUSH = {
  decor: 'Un hongo,', ringYes: 'Hongo con anillo,', ringNo: 'Hongo sin anillo,',
  bruiseYes: 'Hongo que se mancha,', bruiseNo: 'Hongo que no se mancha,', bruiseUnknown: 'Hongo sin tocar todavía,',
  colorYes: 'Hongo de color llamativo,', colorNo: 'Hongo de color común,', sizeYes: 'Hongo chico,', sizeNo: 'Hongo grande,',
  stemYes: 'Hongo de tallo grueso,', stemNo: 'Hongo de tallo fino,', twin: 'Hongo idéntico a los demás,'
};
export const STATE = { unknown: 'sin explorar.', tox: 'venenoso.', ed: 'comestible.', rot: 'Pero está podrido.', eaten: 'Ya comido.' };
export const DIRS = ['adelante,', 'adelante a la derecha,', 'a la derecha,', 'atrás a la derecha,', 'atrás,', 'adelante a la izquierda,', 'a la izquierda,', 'atrás a la izquierda,'];
const DIST_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 150];
export const distPhrase = (n) => (n === 1 ? 'a un centímetro.' : `a ${n} centímetros.`);
export function distStep(d) { let best = DIST_STEPS[0]; for (const s of DIST_STEPS) if (Math.abs(s - d) < Math.abs(best - d)) best = s; return best; }
export const ENERGY_STEPS = Array.from({ length: 21 }, (_, i) => i * 5);
export const livesPhrase = (n) => (n === 1 ? 'Tenés una vida,' : `Tenés ${n} vidas,`);
export const energyPhrase = (n) => `y ${n} de energía.`;
export const donePhrase = (n, total) => `Descubriste ${n} de ${total} claros.`;
export const speciesPhrase = (sp) => `Se parece a ${sp.name}: ${sp.tag}.`;
export const remainPhrase = (n) => (n === 0 ? 'No quedan hongos sin explorar en este claro.' : n === 1 ? 'Queda un hongo sin explorar.' : `Quedan ${n} hongos sin explorar.`);
export const placeIn = (L) => `Estás en ${L.place}.`;
export const placeDir = (L) => `${L.place[0].toUpperCase()}${L.place.slice(1)} está`;
const strip = (h) => h.replace(/<br>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
// Lo que se dice al descubrir un mito
export function insightText(L) {
  const nums = L.nums ? L.nums.map((n) => `${n[0]} ${strip(n[1])}`).join('; ') : `${Math.round(L.research[0] * 100)} por ciento de venenosos ${L.yes}; ${Math.round(L.research[1] * 100)} por ciento ${L.no}`;
  return `Descubrimiento: ${L.title}. ${L.stamp.toLowerCase()}. ${strip(L.h2)} ${nums}. ${L.small} Apretá Enter para seguir.`;
}
export const MISC = {
  near: 'Cerca:', landed: 'Aterrizaste sobre:', onCap: 'Estás arriba de un sombrero.', onStem: 'Estás trepando un tallo.',
  nearOne: 'Hay un hongo sin explorar cerca:', nearMany: 'Los hongos sin explorar más cercanos:', flyHint: 'Con G volás al más cercano.',
  noneNear: 'No quedan hongos sin explorar cerca.', poisoned: 'Estás envenenado.', bird: '¡Un pájaro! El hongo más cercano para esconderte está',
  keyChanged: 'Tecla cambiada.', pressKey: 'Apretá la nueva tecla.', test: 'Así suena la voz que describe el juego.',
  audioOn: 'Modo audio activado. G: volar a un hongo. Espacio: saltar. E: olfatear. F: comer. Q: qué hay cerca. R: tus vidas.',
  audioOnIntro: 'Modo audio activado. G: volar a un hongo. Espacio: saltar. E: olfatear. F: comer. Q: qué hay cerca. R: tus vidas. Apretá Enter para entrar al bosque.',
  audioOff: 'Modo audio desactivado.', nearest: 'El más cercano:', arrived: 'Llegaste a un claro nuevo.',
  tox: 'Venenoso.', ed: 'Comestible.', ateEd: 'Era comestible: más energía.', ateTox: 'Era venenoso: perdiste una vida.',
  shelfSniff: 'Un hongo repisa: Trametes versicolor, la «cola de pavo». Crece sobre la madera de los árboles y no es venenoso… pero es duro como un cuero.',
  shelfEat: 'Lo mordiste, pero es duro como la madera: no se puede comer. Los hongos repisa sirven de escalón, no de comida.',
  rot: 'Podrido. No se come.', ateRot: 'Estaba podrido: perdiste energía.',
  safe: 'A salvo.', hit: 'Te picoteó: menos energía.', faint: 'Te desmayaste.', wake: 'Despertaste. Tenés tres vidas.'
};

// Todas las frases posibles (para generar los audios)
export function allPhrases(LEVELS, SPECIES) {
  const out = new Set([...Object.values(MUSH), ...Object.values(STATE), ...DIRS, ...Object.values(MISC)]);
  DIST_STEPS.forEach((n) => out.add(distPhrase(n)));
  [1, 2, 3].forEach((n) => out.add(livesPhrase(n)));
  for (let n = 0; n <= 40; n++) out.add(remainPhrase(n));
  ENERGY_STEPS.forEach((n) => out.add(energyPhrase(n)));
  for (let i = 0; i <= LEVELS.length; i++) out.add(donePhrase(i, LEVELS.length));
  Object.values(SPECIES).forEach((sp) => out.add(speciesPhrase(sp)));
  LEVELS.forEach((L) => { out.add(placeIn(L)); out.add(placeDir(L)); out.add(insightText(L)); });
  return [...out];
}
