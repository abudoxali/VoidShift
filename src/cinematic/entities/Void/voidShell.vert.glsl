attribute vec3 aScatter;
attribute float aOrder;
attribute float aGlow;

uniform float uReveal;
uniform float uCorruption;

varying float vAlpha;
varying float vHot;
varying float vDesync;

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

  // ── PHASE, in world space relative to the core (independent of the shell's spin).
  vec3 rel = (modelMatrix * vec4(p, 1.0)).xyz - uVoidPos;
  // Contradictory positions: chosen fragments are mirrored across the attack plane and
  // flicker between their true and mirrored placement — the lattice exists in two states.
  float pick = step(0.45, vsHash11(aOrder * 53.1 + floor(uTime * 14.0)));
  float mirror = uVoidPhase * pick;
  rel = mix(rel, rel - 2.0 * dot(rel, uPhaseAxis) * uPhaseAxis, mirror);
  // Divergence along the attack axis: the shell is no longer one object.
  rel += uPhaseAxis * (vsHash11(aOrder * 7.7) - 0.5) * 1.6 * uVoidPhase * uVoidRadius;
  // Fold: the two halves part perpendicular to the attack line, opening a gap.
  float sideS = sign(dot(rel, uSplitAxis) + 1e-4);
  rel += uSplitAxis * sideS * uVoidFold * uVoidRadius * 1.9;

  float drop = step(vsHash11(aOrder * 17.9 + floor(uTime * 3.0 * uMotion + 0.5)), 0.2 + 0.25 * uCorruption);
  vAlpha = a * (1.0 - drop * (1.0 - uVoidPhase * 0.5)) * uReveal;
  vHot = g;
  vDesync = mirror;
  gl_Position = projectionMatrix * viewMatrix * vec4(uVoidPos + rel, 1.0);
}
