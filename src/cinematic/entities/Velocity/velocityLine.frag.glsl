uniform vec3 uColor;
varying float vAlpha;
varying float vGlow;

void main() {
  if (vAlpha < 0.003) discard;
  gl_FragColor = vec4(uColor * vGlow, vAlpha);
}
