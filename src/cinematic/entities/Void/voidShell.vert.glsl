attribute vec3 aScatter;
attribute float aOrder;
attribute float aGlow;

uniform float uReveal;
uniform float uCorruption;

varying float vAlpha;
varying float vHot;

void main() {
  vec3 p = position;
  // Unstable surface: low-frequency deformation of the lattice.
  float n = vsNoise3(p * 1.9 + vec3(0.0, uTime * 0.3 * uMotion, uTime * 0.17 * uMotion));
  p *= 1.0 + (n - 0.5) * 0.5;

  // Fragment glitch: whole edges snap to displaced positions for a few frames.
  float tq = floor(uTime * mix(2.5, 9.0, uMotion));
  float g = step(1.0 - uCorruption * 0.3, vsHash11(aOrder * 41.3 + tq));
  p += aScatter * 0.45 * g;

  // The shell appears by implosion: fragments are drawn in from outside.
  float a = vsAssemble(aOrder, uReveal, 0.45);
  p = mix(p + aScatter * 3.5, p, a);

  float drop = step(vsHash11(aOrder * 17.9 + floor(uTime * 3.0 * uMotion + 0.5)), 0.2 + 0.25 * uCorruption);
  vAlpha = a * (1.0 - drop) * uReveal;
  vHot = g;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
