attribute vec4 aSeed;  // x: phase, y: orbit radius factor, z: fall speed, w: angle

uniform float uPointScale;
uniform float uSize;
uniform float uReveal;

varying float vAlpha;
varying float vHeat;

void main() {
  float speed = 0.035 + aSeed.z * 0.09;
  float ph = fract(aSeed.x + uTime * speed * uMotion * (0.5 + uVoidMass));
  float fall = ph * ph;                     // accelerates toward the horizon
  float R = uVoidRadius;
  float r = mix(R * (2.2 + aSeed.y * 5.0), R * 0.98, fall);
  float ang = aSeed.w * 6.2831853 + fall * 7.5 + uTime * 0.04 * uMotion;
  float thick = (vsHash11(aSeed.w * 91.7) - 0.5) * (1.0 - fall) * R * (0.35 + aSeed.y * 0.9);
  vec3 p = vec3(cos(ang) * r, thick, sin(ang) * r);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float px = uSize * (0.6 + aSeed.y * 0.8) * uPointScale / -mv.z;
  gl_PointSize = clamp(px, 1.0, 7.0);

  vAlpha = smoothstep(0.0, 0.12, ph) * (1.0 - smoothstep(0.82, 1.0, ph)) * smoothstep(0.0, 0.3, uVoidMass) * mix(0.3, 1.0, uReveal) * min(px, 1.0) * mix(0.18, 0.9, fall);
  vHeat = fall;
  gl_Position = projectionMatrix * mv;
}
