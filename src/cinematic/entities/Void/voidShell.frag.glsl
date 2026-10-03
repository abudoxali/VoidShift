uniform vec3 uColor;
uniform vec3 uHot;
varying float vAlpha;
varying float vHot;

void main() {
  if (vAlpha < 0.003) discard;
  gl_FragColor = vec4(mix(uColor, uHot, vHot), vAlpha * mix(0.8, 1.0, vHot));
}
