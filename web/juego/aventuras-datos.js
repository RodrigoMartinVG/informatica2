// Datos y frases de las aventuras (sin three.js, así la herramienta de la voz también los puede leer:
// cada frase que se dice tiene su audio pregrabado con la voz rioplatense).
export const HATS = {
  lycoperdon: { name: 'Bejín', how: 'un combo de 4 sombreros' },
  muscaria: { name: 'Matamoscas', how: 'todas las esporas doradas de un claro' },
  cantharellus: { name: 'Cantarela dorada', how: 'la medalla de oro en los aros' },
  procera: { name: 'Parasol', how: 'encontrar a todos los amigos' },
  conica: { name: 'Sombrero de bruja', how: 'zafar tres veces del pájaro' }
};
export const FRIENDS = [['Rubí', '#b8342a'], ['Celeste', '#2f6fc8'], ['Oro', '#d4a020'], ['Ciruela', '#7a3a9a'], ['Mandarina', '#e07a1a']];
// El color del hilo de esporas que lleva a cada claro
export const TRAILS = [['#ffb86b', 'naranjas'], ['#c9a0ff', 'violetas'], ['#7fd8ff', 'celestes'], ['#ff8fb8', 'rosadas'], ['#ffe066', 'amarillas'], ['#a8ff9f', 'verdes']];
const toPlace = (p) => ('a ' + p).replace(/^a el /, 'al ');
export const PH = {
  hat: (id) => `Ganaste un sombrero: ${HATS[id].name}, por ${HATS[id].how}. Apretá H para ponértelo o cambiarlo.`,
  hat0: () => `Todavía no ganaste sombreros. Se ganan con ${Object.values(HATS).map((h) => h.how).join(', ')}.`,
  friend: (name) => `Encontraste a ${name}, un escarabajo perdido. Te va a seguir. Hay más escondidos debajo de los sombreros, en los bordes de los claros.`,
  ring: (medal) => `Circuito completo: medalla de ${medal}. ${medal === 'oro' ? '¡Impecable!' : 'Para el oro, andá más rápido: con Shift volás más ligero, y en picada, más todavía.'}`,
  trail: (cname, place) => `Un hilo de esporas ${cname} se enciende entre los hongos. Llevan ${toPlace(place)}: seguilas cuando quieras.`,
  // todas, para la herramienta de la voz
  all(LEVELS) {
    return [...Object.keys(HATS).map(this.hat), this.hat0(), ...FRIENDS.map(([n]) => this.friend(n)), ...['oro', 'plata', 'bronce'].map(this.ring),
      ...LEVELS.map((L, i) => this.trail(TRAILS[i % TRAILS.length][1], L.place))];
  }
};
