uniform float uReveal;
uniform float uAxis;
uniform vec3 uGround;
uniform vec3 uLine;
uniform vec3 uAxisColor;
uniform vec3 uAccent;
uniform vec3 uVoidTint;
uniform vec3 uHorizon;
uniform float uFogNear;
uniform float uFogFar;

varying vec3 vWorld;
varying vec2 vGrid;
varying float vWell;
varying float vRipple;

// Anti-aliased line at integer values of `c`, `px` pixels wide.
float vsLine(float c, float px) {
  float fw = max(fwidth(c), 1e-4);
  float d = abs(fract(c + 0.5) - 0.5) / fw;
  return 1.0 - smoothstep(px * 0.5, px * 0.5 + 1.0, d);
}

void main() {
  vec2 g = vGrid;
  float r = length(g);

  // ── Lattice: measurement points at every unit intersection.
  vec2 cell = fract(g + 0.5) - 0.5;
  float fw = max(fwidth(g.x), 1e-4);
  float dotR = max(0.022, fw * 0.9);
  float lattice = 1.0 - smoothstep(dotR * 0.6, dotR, length(cell));
  lattice *= 0.55;

  // ── Major survey lines every 4 units, carrying ruler ticks every 0.5.
  vec2 major = g / 4.0;
  float mx = vsLine(major.x, 0.9);
  float mz = vsLine(major.y, 0.9);
  vec2 nearMajor = abs(fract(major + 0.5) - 0.5) * 4.0;
  float tickX = vsLine(g.y * 2.0, 1.0) * (1.0 - smoothstep(0.05, 0.09, nearMajor.x));
  float tickZ = vsLine(g.x * 2.0, 1.0) * (1.0 - smoothstep(0.05, 0.09, nearMajor.y));
  // Survey lines are interrupted (dashed) — a measured space, not a tiled floor.
  float dashX = step(0.18, fract(g.y * 0.25 + 0.09));
  float dashZ = step(0.18, fract(g.x * 0.25 + 0.09));
  float survey = max(mx * dashX, mz * dashZ) * 0.38 + max(tickX, tickZ) * 0.55;

  // ── Origin axes, drawn outward during BOOT.
  float axisExtent = uAxis * 90.0;
  vec2 fwg = max(fwidth(g), vec2(1e-4));
  float ax = (1.0 - smoothstep(0.65, 1.65, abs(g.y) / fwg.y)) * step(abs(g.x), axisExtent);
  float az = (1.0 - smoothstep(0.65, 1.65, abs(g.x) / fwg.x)) * step(abs(g.y), axisExtent);
  float axes = max(ax, az) * uAxis;

  // ── Computational shimmer: sparse cells being re-sampled.
  vec2 ci = floor(g + 0.5);
  float sampleStep = floor(uTime * 2.5 * uMotion + vsHash12(ci) * 4.0);
  float sampled = step(0.987, vsHash12(ci + sampleStep * 0.731));

  // ── Reveal: the lattice resolves outward from the origin behind a scan front.
  float revealed = 1.0 - smoothstep(uReveal - 1.5, uReveal, r);
  float front = exp(-abs(r - uReveal) * 3.5) * step(0.01, uReveal) * (1.0 - smoothstep(55.0, 72.0, uReveal));

  // ── Field response: VELOCITY energises nearby structure.
  float vel = vsVelocityPresence(vec3(g.x, 0.0, g.y), 0.75);

  // ── VOID: corruption around the well; structure fails toward its centre.
  float dv = distance(g, uVoidPos.xz);
  float corrupt = uVoidMass * (1.0 - smoothstep(uVoidRadius * 2.0, uVoidRadius * 8.0, dv));
  float drop = step(vsHash12(floor(g * 3.0) + floor(uTime * 9.0 * uMotion)), corrupt * 0.55);
  float swallow = smoothstep(uVoidRadius * 0.6, uVoidRadius * 3.4, dv);

  float shock = abs(vRipple);
  float structure = (lattice * (1.0 + vel * 3.0 + sampled * 4.0 + shock * 6.0) + survey * (1.0 + vel * 1.5 + shock * 3.0)) * revealed;
  structure *= (1.0 - drop) * mix(1.0, swallow, uVoidMass);

  vec3 lineColor = mix(uLine, uAccent, clamp(vel * 1.4 + sampled * 0.6, 0.0, 1.0));
  lineColor = mix(lineColor, uVoidTint, clamp(corrupt * 1.3, 0.0, 1.0));

  vec3 color = uGround * (0.6 + 0.4 * revealed);
  color += lineColor * structure;
  color += uAxisColor * axes * (1.0 + vel);
  color += uAccent * front * 0.3;
  color += uAccent * shock * 0.06 * revealed;
  // The well is darker than the world: light falls into it.
  color *= 1.0 - clamp(vWell * 0.55, 0.0, 0.85);

  // ── Atmospheric depth: fade to the horizon colour.
  float dist = distance(vWorld, cameraPosition);
  float fog = smoothstep(uFogNear, uFogFar, dist);
  color = mix(color, uHorizon, fog);

  gl_FragColor = vec4(color, 1.0);
}
