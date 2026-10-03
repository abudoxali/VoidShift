attribute vec4 aSeed;     // x: orbit speed, y: assemble order, z: streak length, w: scatter
attribute float aVertex;  // 0 head, 1 tail

uniform vec3 uEntity;
uniform vec3 uMotionVec;  // world velocity (units/s)
uniform float uAssemble;
uniform float uReveal;
uniform float uEnergy;
uniform float uHeading;

varying float vAlpha;
varying float vTail;

void main() {
  vec3 local = position;
  // Slow orbit around the heading axis; faster particles closer in.
  float spin = uTime * (0.25 + aSeed.x * 0.9) * uMotion;
  local.yz = vsRot(spin) * local.yz;
  local.xz = vsRot(-uHeading) * local.xz;

  float speed = length(uMotionVec);
  vec3 dir = speed > 1e-3 ? uMotionVec / speed : vec3(0.0);
  float moving = smoothstep(0.5, 6.0, speed);

  // In flight the halo is a tight comet; as the force decelerates, its fragments burst
  // outward and then reconverge (reconstruction) as `assemble` rises.
  float a = vsAssemble(aSeed.y, uAssemble, 0.7);
  vec3 scatter = normalize(local + 1e-4) * (1.4 + aSeed.w * 3.2) * (1.0 - moving);
  local = mix(local * mix(1.6, 0.6, moving) + scatter, local, a);

  vec3 world = uEntity + local;

  // Kinetic streak: the tail is left behind along -velocity.
  float len = min(speed * (0.006 + aSeed.z * 0.022), 1.8);
  vec3 tangent = normalize(vec3(-local.z, 0.0, local.x) + 1e-4);
  vec3 trail = mix(tangent * (0.025 + aSeed.z * 0.05), dir * len, moving);
  world -= trail * aVertex;

  float twinkle = 0.55 + 0.45 * sin(uTime * (2.0 + aSeed.x * 5.0) + aSeed.w * 30.0);
  vAlpha = uReveal * mix(0.25, 1.0, a) * mix(twinkle, 0.42, moving) * (0.45 + uEnergy * 0.8);
  vTail = aVertex;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
