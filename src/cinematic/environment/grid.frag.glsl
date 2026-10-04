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
// Light pools from the stage: xyz = world position, w = intensity; colours alongside.
uniform vec4 uPools[3];
uniform vec3 uPoolColors[3];
uniform vec4 uImpact;       // x, z, crater depth 0..1, light 0..1
uniform float uHeat;        // crack glow 0..1

varying vec3 vWorld;
varying vec2 vGrid;
varying float vWell;
varying float vRipple;

// Anti-aliased line at integer values of `c`, `px` pixels wide. `fw` is the screen-space
// derivative of `c`, taken from the UNWARPED coordinate so that phase discontinuities stay
// crisp instead of producing derivative spikes.
float vsLine(float c, float px, float fw) {
  float d = abs(fract(c + 0.5) - 0.5) / max(fw, 1e-4);
  return 1.0 - smoothstep(px * 0.5, px * 0.5 + 1.0, d);
}

void main() {
  vec2 gFw = max(fwidth(vGrid), vec2(1e-4));
  float fw = max(gFw.x, gFw.y);
  vec2 g = vGrid;
  float r = length(g);

  // ── PHASE: local space stops being continuous around the VOID.
  vec2 rel = g - uVoidPos.xz;
  float dv0 = length(rel);
  float region = 1.0 - smoothstep(uVoidRadius * 4.0, uVoidRadius * 10.0, dv0);
  // Fold: space parts along the attack line; an empty seam opens between the two halves.
  vec2 splitDir = normalize(uSplitAxis.xz + vec2(1e-5));
  float across = dot(rel, splitDir);
  float gap = uVoidFold * uVoidRadius * 1.6 * region;
  float inGap = 1.0 - step(gap, abs(across));
  g += splitDir * sign(across) * gap;
  float seam = uVoidFold * region * exp(-abs(abs(across) - gap) / (fw * 1.5)) * (1.0 - inGap);
  // Phase: concentric shells of the lattice rotate by contradictory angles.
  float ring = floor(dv0 / (uVoidRadius * 1.7));
  float twist = (vsHash11(ring * 7.31 + 3.0) - 0.5) * 2.4 * uVoidPhase * region;
  g = uVoidPos.xz + vsRot(twist) * (g - uVoidPos.xz);

  // ── Lattice: measurement points at every unit intersection.
  vec2 cell = fract(g + 0.5) - 0.5;
  float dotR = max(0.022, fw * 0.9);
  float lattice = 1.0 - smoothstep(dotR * 0.6, dotR, length(cell));
  lattice *= 0.16;

  // ── Major survey lines every 4 units, carrying ruler ticks every 0.5.
  vec2 major = g / 4.0;
  float mx = vsLine(major.x, 0.9, fw * 0.25);
  float mz = vsLine(major.y, 0.9, fw * 0.25);
  vec2 nearMajor = abs(fract(major + 0.5) - 0.5) * 4.0;
  float tickX = vsLine(g.y * 2.0, 1.0, fw * 2.0) * (1.0 - smoothstep(0.05, 0.09, nearMajor.x));
  float tickZ = vsLine(g.x * 2.0, 1.0, fw * 2.0) * (1.0 - smoothstep(0.05, 0.09, nearMajor.y));
  // Survey lines are interrupted (dashed) — a measured space, not a tiled floor.
  float dashX = step(0.18, fract(g.y * 0.25 + 0.09));
  float dashZ = step(0.18, fract(g.x * 0.25 + 0.09));
  // Thin continuous light seams every 4 units (a polished arena, not a tiled grid demo).
  float survey = max(mx, mz) * 0.42 + max(mx * dashX, mz * dashZ) * 0.12 + max(tickX, tickZ) * 0.12;

  // ── Origin axes, drawn outward during BOOT.
  float axisExtent = uAxis * 90.0;
  float ax = (1.0 - smoothstep(0.65, 1.65, abs(g.y) / gFw.y)) * step(abs(g.x), axisExtent);
  float az = (1.0 - smoothstep(0.65, 1.65, abs(g.x) / gFw.x)) * step(abs(g.y), axisExtent);
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
  structure *= (1.0 - drop) * mix(1.0, swallow, uVoidMass) * (1.0 - inGap);
  axes *= 1.0 - inGap;

  // Stage light: the floor is mostly dark and only reads where the fighters' light lands on it.
  vec3 pool = vec3(0.0);
  float lit = 0.0;
  for (int i = 0; i < 3; i++) {
    vec2 d = g - uPools[i].xz;
    float fall = uPools[i].w / (1.0 + dot(d, d) * 0.55);
    pool += uPoolColors[i] * fall;
    lit += fall;
  }
  structure *= 0.32 + clamp(lit, 0.0, 2.5) * 0.55;

  // Impact cracks: jagged radial fractures around the crater, hot then cooling.
  vec2 rc = g - uImpact.xy;
  float rr = length(rc);
  float ang = atan(rc.y, rc.x) / 6.28318 + 0.5;
  float wob = (vsNoise3(vec3(rr * 1.6, ang * 9.0, 1.7)) - 0.5) * 0.09 + (vsNoise3(vec3(rr * 5.0, ang * 21.0, 4.1)) - 0.5) * 0.025;
  float k = (ang + wob) * 13.0;
  float branch = vsHash11(floor(k) + 2.0);
  float reach = uImpact.z * (1.4 + branch * 3.4);
  float crackW = clamp(fwidth(k) * 1.5, 0.02, 0.2);
  float fk = abs(fract(k) - 0.5);
  float crack = smoothstep(0.5 - crackW, 0.5 - crackW * 0.3, fk) * step(0.35, rr) * (1.0 - smoothstep(reach * 0.7, reach, rr));
  float scorch = uImpact.z * exp(-rr * rr / 2.2);

  vec3 lineColor = mix(uLine, uAccent, clamp(vel * 1.4 + sampled * 0.6, 0.0, 1.0));
  lineColor = mix(lineColor, uVoidTint, clamp(corrupt * 1.3, 0.0, 1.0));

  vec3 color = uGround * (0.6 + 0.4 * revealed) * (1.0 - inGap * 0.8);
  color += lineColor * structure;
  color += uVoidTint * seam * 0.9 * revealed;
  color += uAxisColor * axes * (1.0 + vel);
  color += uAccent * front * 0.3;
  color += uAccent * shock * 0.06 * revealed;
  color += pool * (0.05 + structure * 0.6) * revealed;
  color *= 1.0 - scorch * 0.75;
  vec3 hot = mix(vec3(0.5, 1.4, 1.8), vec3(2.6, 3.0, 3.2), uHeat);
  color += crack * (hot * (0.12 + uHeat * 1.8) + uVoidTint * 0.2) * uImpact.z * (1.0 - smoothstep(0.0, reach, rr) * 0.6);
  // The well is darker than the world: light falls into it.
  color *= 1.0 - clamp(vWell * 0.55, 0.0, 0.85);

  // ── Polished floor: Fresnel sheen of the horizon haze, wet patches, and view-aligned
  // reflection streaks of every light pool (the fighters' energy, the Code Core, the impact).
  vec3 toCam = cameraPosition - vWorld;
  vec3 V = normalize(toCam);
  float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 5.0);
  float wet = 0.55 + 0.45 * smoothstep(0.35, 0.7, vsNoise3(vec3(g * 0.35, 0.5)));
  color += uHorizon * 6.0 * fres * wet;
  vec2 viewXZ = normalize(-toCam.xz + vec2(1e-5));
  for (int i = 0; i < 3; i++) {
    vec2 d = g - uPools[i].xz;
    float along = dot(d, viewXZ);
    float perp = abs(d.x * viewXZ.y - d.y * viewXZ.x);
    float streak = exp(-perp * perp * 9.0) * exp(-max(along, 0.0) * 0.9 - max(-along, 0.0) * 3.5);
    color += uPoolColors[i] * uPools[i].w * streak * 0.16 * wet * revealed;
  }

  // ── Atmospheric depth: fade to the horizon colour.
  float dist = distance(vWorld, cameraPosition);
  float fog = smoothstep(uFogNear, uFogFar, dist);
  color = mix(color, uHorizon, fog);

  gl_FragColor = vec4(color, 1.0);
}
