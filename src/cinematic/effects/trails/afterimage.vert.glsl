attribute vec3 aScatter;
attribute float aOrder;
attribute float aGlow;
attribute vec4 aGhost;   // xyz: captured position, w: heading
attribute vec2 aGhostB;  // x: pitch, y: birth time (world clock)

uniform float uTime;
uniform float uLife;
uniform float uStretch;

varying float vAlpha;
varying float vGlow;

void main() {
  float age = (uTime - aGhostB.y) / uLife;
  if (age < 0.0 || age > 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vAlpha = 0.0;
    return;
  }
  // A replica is a captured sample of the kernel, stretched along its heading (speed),
  // shedding fragments as it ages.
  vec3 p = position * vec3(uStretch, 0.85, 0.85);
  p += aScatter * age * age * 0.9;
  p.xy = vsRot(aGhostB.x) * p.xy;
  p.xz = vsRot(-aGhost.w) * p.xz;
  float shed = step(age * 1.15, vsHash11(aOrder * 37.1 + aGhostB.y * 13.0));
  vAlpha = (1.0 - age) * (1.0 - age) * shed;
  vGlow = aGlow;
  gl_Position = projectionMatrix * viewMatrix * vec4(aGhost.xyz + p, 1.0);
}
