// ── VoidShift common ────────────────────────────────────────────────────────
// Chunks are concatenated explicitly by each material (no include guards: postprocessing
// renames per-effect declarations, which guards would break).

float vsHash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float vsHash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 vsHash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 vsHash31(float p) { vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }

float vsNoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n = dot(i, vec3(1.0, 57.0, 113.0));
  float a = vsHash11(n), b = vsHash11(n + 1.0), c = vsHash11(n + 57.0), d = vsHash11(n + 58.0);
  float e = vsHash11(n + 113.0), g = vsHash11(n + 114.0), h = vsHash11(n + 170.0), k = vsHash11(n + 171.0);
  return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, g, f.x), mix(h, k, f.x), f.y), f.z);
}

mat2 vsRot(float a) { float s = sin(a), c = cos(a); return mat2(c, s, -s, c); }
