// Junta todas las frases que puede decir la narración (main.js + niveles) → frases.json { clave: texto }
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
const dir = process.argv[2], out = process.argv[3];
const { LEVELS, SLEEPING } = await import(dir + '/config.js');
const src = readFileSync(dir + '/main.js', 'utf8');
const texts = new Set();
for (const line of src.split('\n')) {
  if (!/\bsay\(/.test(line) || /const say/.test(line)) continue;
  const call = line.slice(line.indexOf('say('));
  for (const m of call.matchAll(/'([^']*)'/g)) if (m[1].length > 12) texts.add(m[1]);   // literales (incluye las dos ramas de los ternarios)
}
for (const t of ['Venenoso', 'Comestible']) texts.add(`${t}. Tus antenas no se equivocan… pero olfatear cansa.`);
const toPlace = (p) => ('a ' + p).replace(/^a el /, 'al ');
for (const L of LEVELS) { L.enter.forEach((t) => texts.add(t)); texts.add(L.after); texts.add(`Abrís las alas y seguís las esporas ${toPlace(L.place)}. Otro claro, otra creencia para poner a prueba.`); }
for (const s of SLEEPING) texts.add(`Este claro todavía duerme. Pronto: ${s.name}.`);
const map = {};
for (const t of texts) map[createHash('sha1').update(t).digest('hex').slice(0, 10)] = t;
writeFileSync(out, JSON.stringify(map, null, 1));
console.log(Object.keys(map).length, 'frases');
