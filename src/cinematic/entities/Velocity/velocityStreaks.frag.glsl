uniform vec3 uColor;
varying float vAlpha;
varying float vTail;

void main() {
  float a = vAlpha * mix(1.0, 0.0, vTail);
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
}
