// La "mirada" del bosque: efectos de luz compartidos escritos en TSL (shaders que corren en la GPU).
// - Translucidez: cuando mirás hacia el sol a través de un sombrero, una hoja o el pasto, la luz los atraviesa.
// - Niebla a ras del suelo: más densa abajo, más clara arriba (al trepar un hongo "salís" de la niebla).
// - Cielo con degradé y el resplandor del sol.
import * as THREE from 'three/webgpu';
import { uniform, positionWorld, positionView, cameraPosition, normalWorld, color, float, fog, densityFogFactor, triNoise3D, time, exp, mix, texture } from 'three/tsl';

export const SUN = new THREE.Vector3(0.62, 0.5, -0.6).normalize();
export const sunDir = uniform(SUN.clone());
export const FOG = '#caa078';
export const nightU = uniform(0); // 0 = atardecer, 1 = noche (claro de los gemelos)

// Cuánta luz del sol atraviesa una superficie vista desde la cámara (0 a 1)
export function backlight(power = 5) {
  const view = positionWorld.sub(cameraPosition).normalize();
  const toward = view.dot(sunDir).max(0).pow(power);                 // mirás hacia el sol
  const behind = normalWorld.dot(sunDir).negate().max(0).mul(0.7).add(0.3); // la cara está a contraluz
  return toward.mul(behind);
}

export function sky(scene) {
  const dir = normalWorld; // en el fondo, normalWorld es la dirección de la vista
  const up = dir.y.max(0);
  const base = mix(color(FOG), color('#e9b98a'), up.pow(0.6));
  const top = mix(base, color('#a7b6c4'), up.pow(2).mul(0.55));
  const glow = dir.dot(sunDir).max(0);
  const day = top.add(color('#ffd9a0').mul(glow.pow(24).mul(1.6).add(glow.pow(4).mul(0.25))));
  const night = mix(color('#121a2a'), color('#05070d'), up.pow(0.5)).add(color('#9fb4e0').mul(glow.pow(60).mul(0.8))); // luna
  scene.backgroundNode = mix(day, night, nightU);
}

// Niebla: lejanía (como antes) + capa baja junto al suelo que se mueve lento
export function groundFog(scene, density = 0.0058) {
  const dist = positionView.z.negate();
  const low = exp(positionWorld.y.max(0).mul(-0.11));                          // densa abajo
  const wisps = triNoise3D(positionWorld.mul(0.012), 0.15, time).mul(0.6).add(0.7); // jirones
  const near = float(1).sub(exp(dist.mul(-0.028)));                             // crece con la distancia
  const factor = densityFogFactor(density).add(near.mul(low).mul(wisps).mul(0.42)).saturate();
  scene.fogNode = fog(mix(color(FOG), color('#141c2a'), nightU), factor);
}

// Material de sombrero / láminas con translucidez (a partir del material original)
export function translucent(src, tint = '#ffb36a', amount = 1.1) {
  const m = new THREE.MeshStandardNodeMaterial({
    map: src.map, bumpMap: src.bumpMap, bumpScale: src.bumpScale, roughness: src.roughness, side: src.side, color: src.color
  });
  const albedo = src.map ? texture(src.map).rgb : color(src.color);
  m.userData.scatter = albedo.mul(color(tint)).mul(backlight(5)).mul(amount);
  m.emissiveNode = m.userData.scatter;
  return m;
}
