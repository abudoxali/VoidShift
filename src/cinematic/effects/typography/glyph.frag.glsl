uniform sampler2D uAtlas;
varying vec2 vUv;
varying vec4 vStyle;
varying float vGlitch;

void main() {
  float d = texture2D(uAtlas, vUv).r;
  float w = max(fwidth(d) * 0.7, 0.02);
  float fill = smoothstep(0.5 - w, 0.5 + w, d);
  // Faint halo so text reads against the void and catches a little bloom.
  float halo = smoothstep(0.18, 0.5, d) * 0.12;
  float a = (fill + halo) * vStyle.a;
  if (a < 0.003) discard;
  vec3 color = mix(vStyle.rgb, vec3(1.6, 0.25, 0.4), vGlitch * 0.6);
  gl_FragColor = vec4(color, a);
}
