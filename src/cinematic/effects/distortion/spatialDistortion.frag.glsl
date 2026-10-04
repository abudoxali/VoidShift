// Spatial distortion — the VOID's screen-space presence, plus a generic shockwave ring.
//
// Gravitational lens: image position θ samples source position β = θ − θE²/θ (point-mass lens
// equation). Inside the Einstein radius samples come from the opposite side → mirrored ring.
// A frame-drag rotation adds the spiral; a band of quantised data corruption surrounds the
// horizon; the horizon itself is absence, not a black sphere.

uniform vec2 uCenter;      // void centre (uv)
uniform float uHorizon;    // horizon radius (uv-height units)
uniform float uMass;
uniform float uReveal;
uniform float uCorruption;
uniform float uChroma;
uniform float uOnScreen;
uniform float uClock;
uniform vec4 uShock;       // xy: centre uv, z: age (s), w: strength
// PHASE (VOID outside solid space). Directions are unit vectors in aspect-corrected screen space.
uniform float uPhase;      // interior folds into re-sampled space instead of absence
uniform float uFold;       // space parts along the attack line
uniform float uDesync;     // channel separation along the attack direction
uniform vec2 uSplitDir;    // across the attack line (on screen)
uniform vec2 uAxisDir;     // along the attack line (on screen)

// Kaleidoscopic fold of a core-relative offset: same radius, angle folded into 5 mirrored
// wedges. Whatever passes through the core is shown at several contradictory positions.
vec2 vsFoldSpace(vec2 d, float spin) {
  float ang = atan(d.y, d.x) + spin;
  float wedge = 6.2831853 / 5.0;
  float fa = abs(mod(ang, wedge) - wedge * 0.5) - spin;
  return vec2(cos(fa), sin(fa)) * length(d);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 asp = vec2(aspect, 1.0);
  vec2 suv = uv;

  // ── Shockwave ring (expanding), usable by any cinematic cue.
  if (uShock.w != 0.0 && uShock.z < 2.0) {
    vec2 sd = (uv - uShock.xy) * asp;
    float sr = length(sd);
    float ringR = uShock.z * 1.35;
    float width = 0.05 + uShock.z * 0.06;
    float ring = exp(-pow((sr - ringR) / width, 2.0)) * exp(-uShock.z * 2.2) * uShock.w;
    suv -= (sd / max(sr, 1e-4)) / asp * ring * 0.035;
  }

  // ── FOLD: space parts along the attack line. Each half of the VOID is displaced outward;
  //    inside the seam there is no VOID at all — the vector meets a gap, not a body.
  vec2 d0 = (suv - uCenter) * asp;
  float across = dot(d0, uSplitDir);
  float gap = uFold * uHorizon * 1.25;
  float inGap = 1.0 - step(gap, abs(across));
  vec2 d = d0 - uSplitDir * sign(across) * min(abs(across), gap);
  float r = length(d);
  // While phased, folding replaces gravity: the lens weakens and the interior takes over.
  float thetaE = uHorizon * 1.5 * uMass * (1.0 - 0.6 * uPhase);
  if (uMass < 0.001 || uOnScreen < 0.5 || r > thetaE * 6.0 + uHorizon * 4.0) {
    outputColor = suv == uv ? inputColor : texture2D(inputBuffer, suv);
    return;
  }

  vec2 n = d / max(r, 1e-5);
  float Rh = uHorizon * uReveal;
  float window = 1.0 - smoothstep(thetaE * 2.5, thetaE * 6.0, r);
  float defl = thetaE * thetaE / max(r, thetaE * 0.55) * window;

  // Frame drag: strongest at the horizon, decaying as 1/r² and windowed to zero so the
  // distortion is continuous with the untouched image outside the influence radius.
  float swirl = uMass * 1.2 * (thetaE * thetaE) / (r * r + thetaE * thetaE * 0.3) * window;
  vec2 dir = vsRot(swirl) * n;

  // ── Corruption band: blocks of the image are displaced / channel-shifted.
  float band = (1.0 - smoothstep(Rh * 1.2, Rh * 3.2, r)) * smoothstep(Rh * 0.95, Rh * 1.15, r);
  vec2 block = floor(uv * resolution / vec2(14.0, 6.0));
  float tq = floor(uClock * 14.0);
  float h = vsHash12(block + tq * 0.37);
  float glitch = step(1.0 - uCorruption * band * 0.3, h);
  vec2 jitter = (vsHash22(block + tq) - 0.5) * vec2(0.06, 0.01) * glitch;

  vec2 src = uCenter + dir * (r - defl) / asp + jitter;
  vec3 col;
  if (uChroma > 0.5) {
    float spread = 0.022 * uMass * window;
    vec2 srcR = uCenter + dir * (r - defl * (1.0 + spread)) / asp + jitter;
    vec2 srcB = uCenter + dir * (r - defl * (1.0 - spread)) / asp + jitter;
    col = vec3(texture2D(inputBuffer, srcR).r, texture2D(inputBuffer, src).g, texture2D(inputBuffer, srcB).b);
  } else {
    col = texture2D(inputBuffer, src).rgb;
  }

  // ── DESYNC: near the core the image separates along the attack direction (R ahead, B behind).
  float near = 1.0 - smoothstep(uHorizon * 1.2, uHorizon * 3.5, r);
  if (uDesync > 0.001) {
    // Separation scales with the core's on-screen size, so a close-up does not smear the frame.
    vec2 o = uAxisDir * min(0.006, uHorizon * 0.05) * uDesync * near / asp;
    col.r = texture2D(inputBuffer, src + o).r;
    col.b = texture2D(inputBuffer, src - o).b;
  }
  float swap = glitch * step(0.55, vsHash12(block * 1.7 + tq));
  col = mix(col, col.brg * vec3(1.5, 0.35, 1.1), swap);

  // Light is pulled toward the core.
  float halo = exp(-max(r - Rh, 0.0) / (uHorizon * 1.4 + 1e-4));
  col *= 1.0 - 0.6 * uMass * halo * uReveal;

  // ── Horizon: absence with a faint, slowly turning interior structure.
  float inside = 1.0 - smoothstep(Rh * 0.93, Rh * 1.03, r);
  vec2 q = vsRot(uClock * 0.35) * d / max(uHorizon, 1e-4);
  float interior = vsNoise3(vec3(q * 3.0, uClock * 0.25));
  vec3 absence = vec3(0.004, 0.003, 0.008) * (0.4 + interior);
  if (uPhase > 0.001) {
    // PHASE: the interior is no longer absent — it is the surrounding space, folded.
    vec2 fd = vsFoldSpace(d, uClock * 0.6);
    vec3 folded = min(texture2D(inputBuffer, uCenter + fd / asp).rgb, vec3(1.4));
    // Encoded bands: the folded space is quantised into coordinate shells.
    float bands = 0.7 + 0.3 * step(0.5, fract(r / max(uHorizon, 1e-4) * 5.0 - uClock * 1.5));
    absence = mix(absence, folded * vec3(0.5, 0.6, 0.72) * bands, uPhase);
  }
  col = mix(col, absence, inside * step(0.001, uReveal));

  // Thin photon rim — broken into encoded dashes while phased.
  float rimW = Rh * 0.022 + 1e-4;
  float rim = exp(-pow((r - Rh * 1.04) / rimW, 2.0)) * uMass * uReveal;
  float dash = step(0.42, fract(atan(d.y, d.x) * 1.9099 + uClock * 2.0));
  rim *= mix(1.0, dash, uPhase);
  col += vec3(0.42, 0.3, 0.95) * rim * 0.7;

  // ── The seam: inside it the image is untouched space; its edges are cut lines.
  if (uFold > 0.001) {
    vec3 open = texture2D(inputBuffer, suv).rgb;
    col = mix(col, open, inGap);
    float edge = exp(-abs(abs(across) - gap) * resolution.y * 0.6) * (1.0 - inGap);
    col += vec3(0.55, 0.45, 1.2) * edge * uFold * near;
  }

  outputColor = vec4(col, inputColor.a);
}
