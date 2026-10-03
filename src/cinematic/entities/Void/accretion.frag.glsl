varying float vAlpha;
varying float vHeat;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = vAlpha * (1.0 - smoothstep(0.3, 1.0, d));
  if (a < 0.003) discard;
  // Data (cold, environment-coloured) is torn apart into ultraviolet as it falls.
  vec3 data = vec3(0.16, 0.3, 0.32);
  vec3 torn = vec3(1.05, 0.42, 1.7);
  vec3 color = mix(data, torn, smoothstep(0.2, 0.85, vHeat));
  color = mix(color, vec3(1.9, 0.25, 0.45), smoothstep(0.9, 1.0, vHeat));
  gl_FragColor = vec4(color, a);
}
