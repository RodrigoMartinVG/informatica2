// Junta todas las frases que puede decir la voz del juego → frases.json { clave: texto }
// (historia, avisos, accesibilidad y el vocabulario de fragmentos de speechvocab.js)
// Uso: node frases.mjs <carpeta web/juego> <salida.json>
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
const dir = process.argv[2], out = process.argv[3];
const { LEVELS, SLEEPING } = await import(dir + '/config.js');
const { allPhrases } = await import(dir + '/speechvocab.js');
const { SPECIES } = await import(dir + '/species.js');
const texts = new Set();
// Literales dentro de say(…), tip(…) y speak(…) en el código del juego (incluye las dos ramas de los ternarios)
for (const file of ['main.js', 'access.js']) {
  for (const line of readFileSync(`${dir}/${file}`, 'utf8').split('\n')) {
    const i = line.search(/\b(say|tip|speak)\(/); if (i < 0 || /const (say|tip)\b|function speak/.test(line)) continue;
    for (const m of line.slice(i).matchAll(/'([^']*)'/g)) if (m[1].length > 12 && /[a-záéíóú]/i.test(m[1]) && !/^(bird|known|eaten|after|next|enter)/.test(m[1])) texts.add(m[1]);
  }
}
for (const t of ['Venenoso', 'Comestible']) texts.add(`${t}. Tus antenas no se equivocan… pero olfatear cansa.`);
const toPlace = (p) => ('a ' + p).replace(/^a el /, 'al ');
for (const L of LEVELS) { L.enter.forEach((t) => texts.add(t)); texts.add(L.after); texts.add(`Abrís las alas y seguís las esporas ${toPlace(L.place)}. Otro claro, otra creencia para poner a prueba.`); }
for (const s of SLEEPING) texts.add(`Este claro todavía duerme. Pronto: ${s.name}.`);
allPhrases(LEVELS, SPECIES).forEach((t) => texts.add(t));
const map = {};
for (const t of texts) map[createHash('sha1').update(t).digest('hex').slice(0, 10)] = t;
writeFileSync(out, JSON.stringify(map, null, 1));
console.log(Object.keys(map).length, 'frases');
