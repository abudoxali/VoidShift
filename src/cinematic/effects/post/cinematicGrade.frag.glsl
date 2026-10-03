// Final grade, after tone mapping: exposure, flash, vignette, grain, cinematic gate.
uniform float uGate;       // 0 = closed (black), 1 = open to the letterbox
uniform float uLetterbox;  // bar height (fraction of screen) at full open
uniform float uFlash;
uniform float uExposure;
uniform float uVignette;
uniform float uGrain;
uniform float uClock;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb * uExposure;

  vec2 q = (uv - 0.5) * vec2(mix(1.0, aspect, 0.5), 1.0);
  float vig = (1.0 - smoothstep(0.2, 0.9, length(q)));
  c *= mix(1.0 - uVignette, 1.0, vig);

  c += uFlash * vec3(0.82, 0.96, 1.0);

  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float grain = vsHash12(uv * resolution + fract(uClock * 17.0) * 311.0) - 0.5;
  c += grain * uGrain * 0.016 * (1.0 - luma * 0.7);

  float bar = mix(0.5, uLetterbox, uGate);
  float px = 1.0 / resolution.y;
  float open = smoothstep(bar - px, bar + px, uv.y) * smoothstep(bar - px, bar + px, 1.0 - uv.y);
  c *= open;

  outputColor = vec4(c, inputColor.a);
}
