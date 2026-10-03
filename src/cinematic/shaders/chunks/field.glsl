// ── VoidShift world field ───────────────────────────────────────────────────
// One definition of the forces in the world. Every material that reacts to the VOID or to
// VELOCITY includes this chunk, so the grid, the data field and the particles bend coherently.
uniform float uTime;
uniform float uMotion;
uniform vec3 uVoidPos;
uniform float uVoidMass;
uniform float uVoidRadius;
uniform vec3 uVelocityPos;
uniform float uVelocityEnergy;
// PHASE state of the VOID (see CinematicState.void) and the current attack geometry.
uniform float uVoidPhase;
uniform float uVoidFold;
uniform float uVoidInversion;
uniform vec3 uPhaseAxis;   // unit direction of the current attack vector
uniform vec3 uSplitAxis;   // horizontal perpendicular: the direction space parts along

// +1 normal gravity → -1 fully inverted (expulsion).
float vsFieldSign() { return 1.0 - 2.0 * uVoidInversion; }

// Softened inverse-square pull toward the void core. Never overshoots the core.
vec3 vsVoidPull(vec3 p, float strength) {
  vec3 d = uVoidPos - p;
  float r2 = dot(d, d);
  float R = uVoidRadius * 3.5;
  float k = uVoidMass * strength * R * R / (r2 + R * R);
  float r = sqrt(r2) + 1e-4;
  return d / r * min(k, r * 0.9) * vsFieldSign();
}

// Tangential frame-drag around the void's vertical axis.
vec3 vsVoidSwirl(vec3 p, float strength) {
  vec3 d = p - uVoidPos;
  float r2 = dot(d.xz, d.xz);
  float R = uVoidRadius * 4.2;
  float k = uVoidMass * strength * R * R / (r2 + R * R);
  return vec3(-d.z, 0.0, d.x) * k / (sqrt(r2) + 1e-3);
}

// 0..1 proximity to the VELOCITY entity, weighted by its energy.
float vsVelocityPresence(vec3 p, float falloff) {
  return uVelocityEnergy * exp(-distance(p, uVelocityPos) * falloff);
}
