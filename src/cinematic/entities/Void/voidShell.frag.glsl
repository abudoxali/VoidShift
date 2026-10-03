uniform vec3 uColor;
uniform vec3 uHot;
uniform vec3 uDesyncColor;
varying float vAlpha;
varying float vHot;
varying float vDesync;

void main() {
  if (vAlpha < 0.003) discard;
  vec3 c = mix(uColor, uHot, vHot);
  // Mirrored (contradictory) fragments read in a cold, desynchronised tone.
  c = mix(c, uDesyncColor, vDesync);
  gl_FragColor = vec4(c, vAlpha * mix(0.8, 1.0, max(vHot, vDesync)));
}
