attribute vec3 aScatter;
attribute float aOrder;
attribute float aGlow;

uniform float uAssemble;
uniform float uReveal;
uniform float uInterference;
uniform float uScatterScale;

varying float vAlpha;
varying float vGlow;

void main() {
  float a = vsAssemble(aOrder, uAssemble, 0.55);
  vec3 p = position + aScatter * (1.0 - a) * uScatterScale;

  // Fragments in flight flicker; settled geometry is stable.
  float flick = step(0.4, vsHash11(aOrder * 31.7 + floor(uTime * 30.0)));
  float alpha = uReveal * mix(0.35 * flick, 1.0, a);

  // Interference from the VOID: rigid fragment displacement, quantised in time.
  float tq = floor(uTime * 22.0);
  float j = step(1.0 - uInterference * 0.55, vsHash11(aOrder * 97.3 + tq));
  p += (vsHash31(aOrder * 13.1 + tq) - 0.5) * 0.3 * j;
  alpha *= 1.0 - 0.5 * j;

  vAlpha = alpha;
  vGlow = aGlow;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
