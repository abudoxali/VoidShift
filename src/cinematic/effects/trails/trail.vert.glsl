attribute vec3 aPrev;
attribute vec3 aNext;
attribute float aSide;
attribute float aAge;

uniform vec2 uResolution;
uniform float uWidth;

varying float vAge;
varying float vSide;

void main() {
  mat4 vp = projectionMatrix * viewMatrix;
  vec4 c = vp * vec4(position, 1.0);
  vec4 p = vp * vec4(aPrev, 1.0);
  vec4 n = vp * vec4(aNext, 1.0);
  float aspect = uResolution.x / uResolution.y;
  vec2 sp = p.xy / max(p.w, 1e-3);
  vec2 sn = n.xy / max(n.w, 1e-3);
  vec2 dir = (sp - sn) * vec2(aspect, 1.0);
  float l = length(dir);
  dir = l > 1e-6 ? dir / l : vec2(1.0, 0.0);
  vec2 normal = vec2(-dir.y, dir.x);
  normal.x /= aspect;
  float taper = (1.0 - aAge);
  float w = uWidth * taper * taper;
  c.xy += normal * aSide * w * 2.0 / uResolution.y * c.w;
  vAge = aAge;
  vSide = aSide;
  gl_Position = c;
}
