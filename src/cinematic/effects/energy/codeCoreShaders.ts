/** Shaders for the Code Core. Colours are linear HDR: the core blooms. */

export const coreVert = /* glsl */ `
varying vec3 vObj;
varying vec3 vNormalV;
varying vec3 vViewDir;
void main() {
  vObj = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormalV = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`

/** White-hot spiralling plasma: bands wind around the sphere and are drawn inward. */
export const coreFrag = /* glsl */ `
uniform float uTime;
uniform float uCharge;
uniform float uOverload;
varying vec3 vObj;
varying vec3 vNormalV;
varying vec3 vViewDir;
void main() {
  float facing = clamp(dot(vNormalV, vViewDir), 0.0, 1.0);
  float a = atan(vObj.z, vObj.x);
  float spiral = sin(a * 3.0 + vObj.y * 9.0 - uTime * 11.0) * 0.5 + 0.5;
  float spiral2 = sin(a * 5.0 - vObj.y * 6.0 + uTime * 7.0) * 0.5 + 0.5;
  float bands = pow(spiral, 3.0) * 0.7 + pow(spiral2, 4.0) * 0.4;
  vec3 cyan = vec3(0.35, 1.6, 2.4);
  vec3 white = vec3(3.2, 3.4, 3.6);
  vec3 col = mix(cyan * (0.6 + bands * 1.8), white, pow(facing, 2.2));
  col += white * uOverload * 0.6;
  float alpha = (0.35 + facing * 0.65) * smoothstep(0.0, 0.15, uCharge);
  gl_FragColor = vec4(col * alpha, 1.0);
}`

/** Soft outer haze (rendered on the back faces so it surrounds the core). */
export const haloFrag = /* glsl */ `
uniform float uCharge;
uniform float uOverload;
varying vec3 vNormalV;
varying vec3 vViewDir;
void main() {
  float facing = clamp(dot(-vNormalV, vViewDir), 0.0, 1.0);
  float glow = pow(facing, 3.0);
  vec3 col = mix(vec3(0.15, 0.7, 1.0), vec3(1.6, 2.0, 2.2), uOverload) * glow * (0.5 + uCharge * 0.6);
  gl_FragColor = vec4(col, 1.0);
}`

export const ringVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

/** A ring of data: hashed on/off segments that scroll around it. */
export const ringFrag = /* glsl */ `
uniform float uTime;
uniform float uCharge;
uniform float uOverload;
uniform float uSeed;
uniform float uSegments;
varying vec2 vUv;
float h(float n) { return fract(sin(n * 91.345 + uSeed) * 43758.5453); }
void main() {
  float u = vUv.x * uSegments + uTime * (2.0 + h(1.0) * 3.0);
  float seg = floor(u);
  float on = step(0.38, h(seg + floor(uTime * 6.0) * 0.0));
  float gap = smoothstep(0.0, 0.08, fract(u)) * (1.0 - smoothstep(0.82, 0.92, fract(u)));
  float flick = 0.7 + 0.3 * h(seg + floor(uTime * 15.0));
  vec3 col = mix(vec3(0.4, 1.7, 2.3), vec3(2.6, 3.0, 3.2), uOverload) * on * gap * flick;
  gl_FragColor = vec4(col * smoothstep(0.1, 0.6, uCharge), 1.0);
}`

/** Inward spiral: particles start wide and are wound into the core. */
export const particleVert = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uCharge;
uniform float uOverload;
varying float vAlpha;
void main() {
  float life = fract(uTime * (0.6 + aSeed.x * 0.8) + aSeed.y);
  float r = mix(0.42, 0.04, life * life) * (0.4 + uCharge * 0.6);
  float ang = aSeed.z * 6.2831 + life * (5.0 + aSeed.w * 4.0);
  float tilt = (aSeed.w - 0.5) * 2.2;
  vec3 p = vec3(cos(ang) * r, sin(ang) * r * sin(tilt), sin(ang) * r * cos(tilt));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.0 + aSeed.x * 2.0) * (1.0 + uOverload) * 3.2 / max(-mv.z, 0.2);
  vAlpha = smoothstep(0.0, 0.2, life) * (1.0 - smoothstep(0.85, 1.0, life)) * smoothstep(0.05, 0.4, uCharge);
}`

export const particleFrag = /* glsl */ `
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = 1.0 - smoothstep(0.2, 0.5, length(c));
  gl_FragColor = vec4(vec3(0.7, 2.2, 2.9) * d * vAlpha, 1.0);
}`
