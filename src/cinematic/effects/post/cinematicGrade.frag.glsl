// Final grade, after tone mapping: exposure, flash, vignette, grain, cinematic gate.
uniform float uGate;       // 0 = closed (black), 1 = open to the letterbox
uniform float uLetterbox;  // bar height (fraction of screen) at full open
uniform float uFlash;
uniform float uExposure;
uniform float uVignette;
uniform float uGrain;
uniform float uClock;
uniform float uInvert;
uniform float uSpeed;
uniform float uSpeedAngle;
uniform float uRadial;
uniform vec2 uRadialCenter;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb * uExposure;

  vec2 q = (uv - 0.5) * vec2(mix(1.0, aspect, 0.5), 1.0);
  float vig = (1.0 - smoothstep(0.2, 0.9, length(q)));
  c *= mix(1.0 - uVignette, 1.0, vig);

  vec2 sp = (uv - 0.5) * vec2(aspect, 1.0);

  // ── Speed lines: thin streaks racing along the motion, kept off the centre of frame.
  if (uSpeed > 0.001) {
    vec2 dir = vec2(cos(uSpeedAngle), sin(uSpeedAngle));
    float across = dot(sp, vec2(-dir.y, dir.x));
    float along = dot(sp, dir);
    float lane = floor(across * 170.0);
    float h = vsHash11(lane * 1.37 + 3.1);
    float seg = fract(along * (0.8 + h * 1.6) - uClock * (4.0 + h * 6.0) + h * 13.0);
    float streak = step(0.8, h) * smoothstep(0.0, 0.08, seg) * (1.0 - smoothstep(0.45, 0.9, seg));
    float keepCentreClear = smoothstep(0.16, 0.5, length(sp));
    c = mix(c, vec3(0.86, 0.97, 1.0), streak * keepCentreClear * uSpeed * 0.7);
  }

  // ── Radial burst: rays from the impact point.
  if (uRadial > 0.001) {
    vec2 q = (uv - uRadialCenter) * vec2(aspect, 1.0);
    float ang = atan(q.y, q.x);
    float wedge = floor(ang * 9.0);
    float ray = pow(max(0.0, sin(ang * 46.0 + vsHash11(wedge) * 6.28)), 5.0) * (0.55 + 0.45 * vsHash11(wedge * 3.3));
    float reach = 1.0 - smoothstep(0.05, 1.3, length(q));
    c += vec3(0.55, 0.9, 1.05) * ray * reach * uRadial * 1.2;
    c += vec3(0.7, 0.95, 1.0) * (1.0 - smoothstep(0.0, 0.35, length(q))) * uRadial * 0.6;
  }

  c += uFlash * vec3(0.82, 0.96, 1.0);

  // ── Impact frame: a stark inverted graphic frame for 1–3 frames.
  if (uInvert > 0.001) {
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    vec3 graphic = vec3(1.0 - smoothstep(0.04, 0.32, lum)) * vec3(0.9, 0.97, 1.0);
    c = mix(c, graphic, uInvert);
  }

  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float grain = vsHash12(uv * resolution + fract(uClock * 17.0) * 311.0) - 0.5;
  c += grain * uGrain * 0.016 * (1.0 - luma * 0.7);

  float bar = mix(0.5, uLetterbox, uGate);
  float px = 1.0 / resolution.y;
  float open = smoothstep(bar - px, bar + px, uv.y) * smoothstep(bar - px, bar + px, 1.0 - uv.y);
  c *= open;

  outputColor = vec4(c, inputColor.a);
}
