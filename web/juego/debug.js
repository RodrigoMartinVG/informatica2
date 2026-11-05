// Herramientas de prueba del juego. Se cargan solo con ?debug en la dirección.
// ?auto salta la intro · ?x=..&z=..&yaw=.. ubica al escarabajo · ?pitch=.. inclina la cámara
// ?sobre=N lo sube al sombrero del hongo N · ?veneno simula veneno · ?noche · ?alas · ?mancha
// ?hora=0..1 cambia la hora del día · ?ficha=N muestra la ficha del hongo N · ?resumen=id muestra el resumen de un claro · ?libro=id abre el cuaderno en ese claro
export function run(c) {
  const { params: p, THREE, gsap, $, beetle, flora, world, state, game, cam, LEVELS } = c;
  window.game = c; // acceso desde la consola
  if (p.has('auto')) {
    if (p.has('x')) beetle.place(+p.get('x'), +p.get('z'), +(p.get('yaw') ?? Math.PI));
    $('#intro').hidden = true; $('#hud').hidden = false; cam.mode = 'follow'; state.phase = 'play';
    c.snapCamera(); c.objective('Seguí las esporas brillantes hasta el claro.');
  }
  if (p.has('sobre')) { const m = flora.specimens[+p.get('sobre')]; Object.assign(beetle.state, { mode: 'cap', m, x: m.x + m.Rw * 0.3, z: m.z, yaw: Math.PI / 2 }); }
  if (p.has('veneno')) setInterval(() => (game.poison = 0.9), 30);
  if (p.has('pitch')) cam.pitch = +p.get('pitch');
  if (p.has('sobre') || p.has('pitch')) { for (let i = 0; i < 40; i++) beetle.update(0.02, { fwd: 0, turn: 0, run: false }); c.snapCamera(); }
  if (p.has('mancha')) flora.specimens.filter((s) => s.level === 'magulladura').forEach((s) => { flora.touch(s); s.bruise = 1; if (s.stemMat) s.stemMat.color.lerp(new THREE.Color('#4f6fae'), 0.75); });
  if (p.has('alas')) Object.assign(beetle.state, { fly: 1 });
  if (p.has('noche')) world.setNight(1);
  if (p.has('hora')) world.setTime(+p.get('hora'));
  if (p.has('pajaro')) { state.entered.add('anillo'); c.birdNow(); }
  if (p.has('ficha')) c.showPhoto(flora.specimens[+p.get('ficha')]);
  if (p.has('libro')) { const id = p.get('libro'); state.done.add(id); c.setBookView(id); c.toggleBook(); setTimeout(() => gsap.set('.paper', { opacity: 1, y: 0, rotate: 0 }), 60); }
  if (p.has('resumen')) {
    const L = LEVELS.find((x) => x.id === p.get('resumen')); state.cur = L; state.phase = 'insight';
    flora.specimens.filter((s) => s.level === L.id).forEach((s) => flora.reveal(s)); c.showInsight(L);
    setTimeout(() => gsap.set(['#insight', '#ins-main .stamp'], { opacity: 1, y: 0, scale: 1 }), 50);
  }
}
