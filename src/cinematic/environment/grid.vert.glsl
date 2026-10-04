uniform vec4 uRipples[4];   // x, z, birth time, strength
uniform vec4 uImpact;       // x, z, crater depth 0..1, light 0..1

varying vec3 vWorld;
varying vec2 vGrid;
varying float vWell;
varying float vRipple;

void main() {
  vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
  vGrid = p.xz;

  // Gravitational well beneath the VOID: the plane sinks and is pinched toward the core.
  float R = uVoidRadius * 3.7;
  vec2 toVoid = uVoidPos.xz - p.xz;
  float d2 = dot(toVoid, toVoid);
  float infl = R * R / (d2 + R * R);
  // Field inversion turns the well into a bulge and the pinch into a push.
  float well = uVoidMass * 0.3 * infl * vsFieldSign();
  p.xz += toVoid * uVoidMass * 0.06 * infl * vsFieldSign();
  p.y -= well;

  // Shockwave ripples travelling through the lattice (shock-ready: any cue can emit one).
  float ripple = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 r = uRipples[i];
    float age = uTime - r.z;
    if (r.w != 0.0 && age > 0.0 && age < 3.0) {
      float dist = distance(vGrid, r.xy);
      float front = dist - age * 11.0;
      float wave = sin(front * 2.2) * exp(-abs(front) * 0.9) * exp(-age * 1.6) * r.w;
      ripple += wave;
    }
  }
  p.y += ripple * 0.16;

  // Impact crater: a shallow bowl with a raised lip.
  float dc = distance(vGrid, uImpact.xy);
  p.y -= uImpact.z * (0.32 * exp(-dc * dc / 0.9) - 0.06 * exp(-pow(dc - 1.6, 2.0) / 0.12));

  vWell = well;
  vRipple = ripple;
  vWorld = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
