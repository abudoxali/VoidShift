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

// Softened inverse-square pull toward the void core. Never overshoots the core.
vec3 vsVoidPull(vec3 p, float strength) {
  vec3 d = uVoidPos - p;
  float r2 = dot(d, d);
  float R = uVoidRadius * 3.5;
  float k = uVoidMass * strength * R * R / (r2 + R * R);
  float r = sqrt(r2) + 1e-4;
  return d / r * min(k, r * 0.9);
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
