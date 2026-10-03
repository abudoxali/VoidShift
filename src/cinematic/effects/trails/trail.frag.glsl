uniform vec3 uColor;
uniform float uOpacity;
varying float vAge;
varying float vSide;

void main() {
  float edge = (1.0 - smoothstep(0.15, 1.0, abs(vSide)));
  float a = uOpacity * pow(1.0 - vAge, 1.6) * edge;
  if (a < 0.003) discard;
  // Hot core near the head, cooling along the tail.
  vec3 color = mix(uColor, vec3(2.4, 2.8, 3.0), (1.0 - smoothstep(0.0, 0.35, vAge)) * edge);
  gl_FragColor = vec4(color, a);
}
