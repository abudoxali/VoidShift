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

  vec2 d = (suv - uCenter) * asp;
  float r = length(d);
  float thetaE = uHorizon * 1.5 * uMass;
  if (uMass < 0.001 || uOnScreen < 0.5 || r > thetaE * 9.0 + uHorizon * 4.0) {
    outputColor = suv == uv ? inputColor : texture2D(inputBuffer, suv);
    return;
  }

  vec2 n = d / max(r, 1e-5);
  float Rh = uHorizon * uReveal;
  float window = 1.0 - smoothstep(thetaE * 4.0, thetaE * 9.0, r);
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
  col = mix(col, absence, inside * step(0.001, uReveal));

  // Thin photon rim.
  float rimW = Rh * 0.022 + 1e-4;
  float rim = exp(-pow((r - Rh * 1.04) / rimW, 2.0)) * uMass * uReveal;
  col += vec3(0.42, 0.3, 0.95) * rim * 0.7;

  outputColor = vec4(col, inputColor.a);
}
