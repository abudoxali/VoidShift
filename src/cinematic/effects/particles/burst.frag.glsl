varying vec3 vColor;
varying float vAlpha;

void main() {
  if (vAlpha <= 0.002) discard;
  gl_FragColor = vec4(vColor * vAlpha, 1.0);
}
