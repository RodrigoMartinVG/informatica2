// Perfiles de las seis formas, en milímetros (1 cm de los datos = 10 mm).
// Un perfil es la mitad derecha de la silueta: una lista de puntos [r, y], donde r es la distancia al eje.
// Al girarlo 360° alrededor del eje se obtiene el sólido (lámina 2D → modelo 3D).

const range = (n, f) => Array.from({ length: n + 1 }, (_, i) => f(i / n));
const P = (r, y) => [Math.max(0, r), y];

// Sombrero: top va del eje al borde y under va del borde al tallo. Coordenadas relativas a la base del sombrero.
function cap(a) {
  const R = a.cap * 5, s = a.grosor / 2;
  switch (a.id) {
    case 'convexa': { const H = R * 0.45;
      return { top: range(32, (t) => { const g = t * Math.PI * 0.56; return P(R * Math.sin(g) ** 0.92, H * Math.cos(g) + 0.12 * H); }),
        under: [P(R * 0.96, 0.02 * H), P(R * 0.6, 0.16 * H), P(s, 0.22 * H)], lift: 0 }; }
    case 'plana': { const H = R * 0.14;
      return { top: [...range(16, (t) => P(R * 0.85 * t, H * (1 - 0.3 * t * t))), ...range(10, (t) => { const g = t * Math.PI * 0.75; return P(R * 0.85 + R * 0.15 * Math.sin(g), H * 0.7 * Math.cos(g)); })],
        under: [P(R * 0.95, -H * 0.42), P(R * 0.5, -H * 0.25), P(s, 0)], lift: 0 }; }
    case 'hundida': { const H = R * 0.55;
      return { top: [...range(16, (t) => P(R * 0.92 * t, H * (0.55 + 0.42 * t ** 1.6))), P(R, H * 0.98), P(R * 1.01, H * 0.9)],
        under: range(16, (t) => P(R * (1 - t) + s * 1.3 * t, H * 0.86 * (1 - t) ** 0.9)), lift: -2 }; }
    case 'campana': { const H = R * 1.05;
      return { top: [...range(28, (t) => P(R * 0.95 * Math.sin(t * Math.PI / 2) ** 0.75, H * (1 - t ** 2.2))), P(R, -H * 0.04)],
        under: [P(R * 0.9, 0), P(R * 0.4, H * 0.45), P(s, H * 0.55)], lift: -H * 0.5 }; }
    case 'esferica': { const g1 = Math.PI * 0.72, Hc = R * 0.78; // globo algo achatado
      const rim = [R * Math.sin(g1), Hc * 0.62 + Hc * Math.cos(g1)];
      return { top: range(36, (t) => { const g = t * g1; return P(R * Math.sin(g), Hc * 0.62 + Hc * Math.cos(g)); }),
        under: [P(rim[0] * 0.97, rim[1] + 0.5), P(R * 0.5, rim[1] + R * 0.08), P(s, rim[1] + R * 0.12)], lift: -(rim[1] + R * 0.12) }; }
    case 'conica': { const H = R * 1.7;
      return { top: [P(0, H), P(1.2, H - 0.8), ...range(16, (t) => P(R * (0.06 + 0.94 * t), (H - 2) * (1 - t) ** 0.95)), P(R, -1)],
        under: [P(R * 0.95, 0), P(s, H * 0.25)], lift: -H * 0.22 }; }
  }
}

function stem(a) {
  const h = a.alto * 10, r = a.grosor / 2;
  const bulb = a.id === 'esferica' ? 1.55 : a.id === 'hundida' ? 0.85 : 1.15;
  const taper = a.id === 'hundida' ? 1.35 : 0.9; // la hundida se ensancha hacia arriba
  return range(30, (u) => {
    const base = u < 0.06 ? Math.sqrt(1 - ((0.06 - u) / 0.06) ** 2) : 1;
    const swell = 1 + (bulb - 1) * Math.exp(-(((u - 0.1) / 0.14) ** 2));
    return P(r * base * swell * (1 + (taper - 1) * u), u * h);
  });
}

// Volumen de un sólido de revolución a partir de su perfil cerrado (teorema de Pappus–Guldin: V = 2π · x̄ · A)
function revolve(poly) {
  let m = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length];
    m += (x0 + x1) * (x0 * y1 - x1 * y0);
  }
  return Math.abs((2 * Math.PI * m) / 6);
}

export function profile(a) {
  const c = cap(a), st = stem(a);
  const y0 = a.alto * 10 + c.lift; // altura de la base del sombrero
  const shift = (pts) => pts.map(([r, y]) => [r, y + y0]);
  const capTop = shift(c.top), capUnder = shift(c.under);
  const capPoly = [...capTop, ...capUnder, [0, capUnder[capUnder.length - 1][1]]];
  const stemPoly = [[0, 0], ...st, [0, a.alto * 10]];
  const ring = a.id === 'esferica' ? { y: a.alto * 10 * 0.78, pts: [[a.grosor / 2 * 0.95, 8], [a.grosor / 2 * 1.35, 2], [a.grosor / 2 * 1.7, -6]] } : null;
  const top = Math.max(...capTop.map((p) => p[1]));
  const width = Math.max(...capTop.map((p) => p[0]), ...st.map((p) => p[0]));
  return {
    stem: st, capTop, capUnder, capPoly, ring, top, width, capBase: y0,
    volume: { cap: revolve(capPoly) / 1000, stem: revolve(stemPoly) / 1000 } // cm³
  };
}
