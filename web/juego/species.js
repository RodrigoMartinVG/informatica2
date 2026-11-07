// Especies reales (fotos de Wikimedia Commons, con créditos en img/fotos/creditos.json).
// Cada hongo del juego tiene asignada una especie real parecida, según su grupo y si es venenoso.
export const SPECIES = {
  phalloides: { name: 'Amanita phalloides', tag: 'mortal', tox: true, note: 'Causa la mayoría de las muertes por hongos. Tiene anillo y sombrero liso.' },
  galerina: { name: 'Galerina marginata', tag: 'mortal', tox: true, note: 'Chiquito y marrón, con anillo. Tiene la misma toxina que la amanita.' },
  muscaria: { name: 'Amanita muscaria', tag: 'venenoso', tox: true, note: 'El clásico rojo con puntos blancos. Grande y llamativo.' },
  conica: { name: 'Hygrocybe conica', tag: 'sospechoso', tox: true, note: 'Sombrero cónico de colores vivos; se ennegrece al tocarlo.' },
  mycena: { name: 'Mycena galericulata', tag: 'no recomendado', tox: true, note: 'Chiquito, de tallo muy fino. Fácil de confundir con otros.' },
  campestris: { name: 'Agaricus campestris', tag: 'comestible', tox: false, note: 'El champiñón de campo. Blanco, con anillo: muy parecido a la amanita.' },
  procera: { name: 'Macrolepiota procera', tag: 'comestible', tox: false, note: 'Alto, de tallo fino y sombrero enorme, con anillo.' },
  cantharellus: { name: 'Cantharellus cibarius', tag: 'comestible', tox: false, note: 'Amarillo anaranjado y llamativo, sin anillo.' },
  edulis: { name: 'Boletus edulis', tag: 'comestible', tox: false, note: 'Grande, de tallo grueso. Uno de los más buscados.' },
  pulverulentus: { name: 'Boletus pulverulentus', tag: 'comestible', tox: false, note: 'Se pone azul oscuro apenas lo tocás.' },
  gibba: { name: 'Infundibulicybe gibba', tag: 'comestible', tox: false, note: 'Sombrero hundido como un embudo, sin anillo.' },
  russula: { name: 'Russula emetica', tag: 'venenoso', tox: true, note: 'Rojo brillante y tallo blanquísimo. Su nombre lo dice: provoca vómitos.' },
  hypholoma: { name: 'Hypholoma fasciculare', tag: 'venenoso', tox: true, note: 'Amarillo azufre, en racimos sobre la madera. Láminas verdosas.' },
  suillus: { name: 'Suillus luteus', tag: 'comestible', tox: false, note: 'El hongo de pino, el más recolectado en Argentina. Sombrero pegajoso y poros.' },
  coprinus: { name: 'Coprinus comatus', tag: 'comestible de joven', tox: false, note: 'La barbuda: alta y escamosa. De vieja se deshace en una tinta negra.' },
  lactarius: { name: 'Lactarius deliciosus', tag: 'comestible', tox: false, note: 'El níscalo: naranja con anillos, suelta un jugo naranja y se mancha de verde.' },
  lycoperdon: { name: 'Lycoperdon perlatum', tag: 'comestible de joven', tox: false, note: 'Un pedo de lobo: una bola sin láminas que suelta una nube de esporas.' },
  pleurotus: { name: 'Pleurotus ostreatus', tag: 'comestible', tox: false, note: 'La gírgola: crece como repisas sobre troncos. Se cultiva y se come.' },
  trametes: { name: 'Trametes versicolor', tag: 'no se come', tox: false, note: 'La cola de pavo: crece en la madera de los árboles. No es venenosa, pero es dura como un cuero.' }
};

let credits = {};
fetch(new URL('../img/fotos/creditos.json', import.meta.url)).then((r) => r.json()).then((c) => (credits = c)).catch(() => {});
export const photo = (id) => `../img/fotos/${id}.jpg`;
export function credit(id) { const c = credits[id]; return c ? `Foto: ${c.autor.replace(/^This image was created by user ([^ ]+).*/, '$1')} · ${c.licencia} · Wikimedia Commons` : 'Foto: Wikimedia Commons'; }
