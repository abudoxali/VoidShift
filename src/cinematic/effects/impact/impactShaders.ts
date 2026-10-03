/** Shaders for the impact layers. Linear HDR colours. */

export const domeVert = /* glsl */ `
varying vec3 vNormalV;
varying vec3 vViewDir;
varying vec3 vObj;
void main() {
  vObj = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormalV = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`

/** Expanding light shell: a bright rim, a filled core and streaked energy bands. */
export const domeFrag = /* glsl */ `
uniform float uIntensity;
varying vec3 vNormalV;
varying vec3 vViewDir;
varying vec3 vObj;
void main() {
  float f = clamp(dot(vNormalV, vViewDir), 0.0, 1.0);
  float rim = pow(1.0 - f, 2.5);
  float a = atan(vObj.z, vObj.x);
  float rays = pow(abs(sin(a * 11.0 + vObj.y * 3.0)), 18.0);
  vec3 col = vec3(0.6, 1.8, 2.4) * (rim * 0.8 + rays * 0.9) * (1.0 - rim * 0.4) + vec3(2.4, 2.8, 3.0) * pow(f, 4.0) * 0.9;
  gl_FragColor = vec4(col * uIntensity, 1.0);
}`

export const glyphDebrisVert = /* glsl */ `
attribute vec3 aOffset;
attribute vec4 aData;   // x glyph index, y column, z size, w alpha
attribute float aSpin;
uniform vec2 uGrid;
uniform float uCellScale;
varying vec2 vUv;
varying float vAlpha;
void main() {
  if (aData.w <= 0.002) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vAlpha = 0.0;
    return;
  }
  float size = aData.z;
  vec2 corner = position.xy + 0.5;
  vec2 local = vec2((aData.y + 0.5) * 0.6 * size, 0.0) + position.xy * size * uCellScale;
  float s = sin(aSpin), c = cos(aSpin);
  local = mat2(c, s, -s, c) * local;
  vec4 mv = viewMatrix * vec4(aOffset, 1.0);
  mv.xy += local;
  gl_Position = projectionMatrix * mv;
  float col = mod(aData.x, uGrid.x);
  float row = floor(aData.x / uGrid.x);
  vUv = vec2((col + corner.x) / uGrid.x, 1.0 - (row + 1.0 - corner.y) / uGrid.y);
  vAlpha = aData.w;
}`

export const glyphDebrisFrag = /* glsl */ `
uniform sampler2D uAtlas;
varying vec2 vUv;
varying float vAlpha;
void main() {
  float d = texture2D(uAtlas, vUv).r;
  float w = fwidth(d) * 0.75 + 1e-3;
  float a = smoothstep(0.5 - w, 0.5 + w, d) * vAlpha;
  if (a <= 0.002) discard;
  gl_FragColor = vec4(vec3(0.6, 2.1, 2.7) * a, 1.0);
}`

/** Soft rolling smoke billboards, tinted by the impact light while it lasts. */
export const smokeVert = /* glsl */ `
attribute vec4 aSeed;
uniform float uAge;
uniform float uSmoke;
uniform vec3 uOrigin;
varying vec2 vUv;
varying float vAlpha;
varying float vSeed;
void main() {
  float t = max(uAge - aSeed.w * 0.25, 0.0);
  float ang = aSeed.x * 6.2831;
  float reach = (1.0 - exp(-t * (1.4 + aSeed.y))) * (0.8 + aSeed.y * 3.0);
  vec3 c = uOrigin + vec3(cos(ang) * reach, 0.25 + t * (0.12 + aSeed.z * 0.25) + aSeed.z * 0.6, sin(ang) * reach * 0.8);
  float size = (0.6 + aSeed.z * 1.3) * (0.5 + min(t, 3.0) * 0.4);
  vec4 mv = viewMatrix * vec4(c, 1.0);
  float rot = aSeed.y * 6.0 + t * (aSeed.x - 0.5) * 0.6;
  vec2 p = position.xy;
  p = mat2(cos(rot), sin(rot), -sin(rot), cos(rot)) * p;
  mv.xy += p * size;
  gl_Position = projectionMatrix * mv;
  vUv = position.xy + 0.5;
  vAlpha = uSmoke * smoothstep(0.0, 0.25, t);
  vSeed = aSeed.x;
}`

export const smokeFrag = /* glsl */ `
uniform float uLight;
varying vec2 vUv;
varying float vAlpha;
varying float vSeed;
float n2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = fract(sin(dot(i, vec2(127.1, 311.7)) + vSeed * 13.0) * 43758.5);
  float b = fract(sin(dot(i + vec2(1, 0), vec2(127.1, 311.7)) + vSeed * 13.0) * 43758.5);
  float c = fract(sin(dot(i + vec2(0, 1), vec2(127.1, 311.7)) + vSeed * 13.0) * 43758.5);
  float d = fract(sin(dot(i + vec2(1, 1), vec2(127.1, 311.7)) + vSeed * 13.0) * 43758.5);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main() {
  vec2 q = vUv - 0.5;
  float r = length(q) * 2.0;
  float n = n2(vUv * 4.0) * 0.6 + n2(vUv * 9.0) * 0.4;
  float a = (1.0 - smoothstep(0.25, 1.0, r + (n - 0.5) * 0.6)) * vAlpha * 0.2;
  if (a <= 0.003) discard;
  vec3 col = mix(vec3(0.03, 0.05, 0.06), vec3(0.5, 1.2, 1.5), uLight * 0.8) + vec3(0.02, 0.06, 0.07) * n;
  gl_FragColor = vec4(col, a);
}`
