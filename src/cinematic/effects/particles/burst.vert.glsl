// Pooled one-shot bursts. Every particle is a pure function of (seed, age): no CPU simulation.
attribute float aSlot;
attribute vec4 aSeed;
attribute vec3 aDir;
attribute float aVertex;   // 0 = head, 1 = tail

uniform float uTime;
uniform vec4 uBurst[8];    // xyz origin, w birth (world clock)
uniform vec4 uBurstB[8];   // x kind, y scale, z motion
uniform float uDensity;

varying vec3 vColor;
varying float vAlpha;

// Kinds: 0 implode, 1 assemble, 2 sparks, 3 dust, 4 void.
vec3 burstPos(float kind, float t, float scale, float life, out float alpha) {
  vec3 d = aDir;
  float speed;
  alpha = 0.0;
  if (kind < 0.5) {
    // IMPLODE: a shell of light collapses to the centre, then a short bright pop outward.
    float r0 = (0.5 + aSeed.x * 0.9) * scale;
    float k = clamp(t / 0.22, 0.0, 1.0);
    float r = r0 * (1.0 - k * k) + max(t - 0.22, 0.0) * (3.0 + aSeed.y * 6.0) * scale;
    vec3 p = d * r * vec3(0.6, 1.4, 0.6);
    p.xz *= vsRot(t * (4.0 + aSeed.z * 6.0));
    alpha = smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.22, 0.42, t));
    return p;
  }
  if (kind < 1.5) {
    // ASSEMBLE: data streams converge into a standing body column.
    float h = (aSeed.x - 0.35) * 1.9;
    vec3 target = vec3(cos(aSeed.y * 6.283) * 0.12, h, sin(aSeed.y * 6.283) * 0.12);
    vec3 start = target + d * (1.2 + aSeed.z * 1.4) * scale;
    float k = smoothstep(0.0, 0.55 + aSeed.w * 0.25, t);
    alpha = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.6, 0.9, t));
    return mix(start, target, k * k);
  }
  if (kind < 2.5) {
    // SPARKS: ballistic streaks with drag and gravity.
    speed = (3.0 + pow(aSeed.x, 2.0) * 13.0) * scale;
    vec3 v = d * speed;
    float drag = 2.2;
    vec3 p = v * (1.0 - exp(-drag * t)) / drag;
    p.y -= 4.5 * t * t;
    alpha = 1.0 - smoothstep(life * 0.4, life, t);
    return p;
  }
  if (kind < 3.5) {
    // DUST: a low ring rolling outward along the floor.
    vec2 h = normalize(d.xz + 1e-4);
    float r = (1.0 - exp(-3.0 * t)) * (0.8 + aSeed.x * 1.8) * scale;
    vec3 p = vec3(h.x * r, abs(d.y) * 0.25 * scale * (1.0 - exp(-4.0 * t)) + t * 0.15, h.y * r);
    alpha = 0.55 * smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(life * 0.35, life, t));
    return p;
  }
  // VOID: dark shards that snap outward and are pulled back.
  float out_ = (1.0 - exp(-9.0 * t)) * (0.4 + aSeed.x * 0.8) * scale;
  float back = smoothstep(0.25, 0.7, t);
  vec3 p = d * out_ * (1.0 - back * 0.9);
  p.xz *= vsRot(t * 3.0);
  alpha = smoothstep(0.0, 0.03, t) * (1.0 - smoothstep(0.45, 0.75, t));
  return p;
}

vec3 burstColor(float kind) {
  if (kind < 0.5) return mix(vec3(0.6, 2.2, 2.8), vec3(3.0), aSeed.w * 0.5);
  if (kind < 1.5) return mix(vec3(0.4, 1.6, 2.1), vec3(2.2, 2.8, 3.0), aSeed.w * 0.4);
  if (kind < 2.5) return mix(vec3(0.7, 2.2, 3.0), vec3(3.2, 3.0, 2.6), step(0.6, aSeed.w));
  if (kind < 3.5) return vec3(0.12, 0.2, 0.22);
  return mix(vec3(0.9, 0.3, 1.9), vec3(1.9, 0.15, 0.4), step(0.75, aSeed.w));
}

void main() {
  int slot = int(aSlot + 0.5);
  vec4 b = uBurst[slot];
  vec4 bb = uBurstB[slot];
  float age = uTime - b.w;
  float life = 0.45 + aSeed.y * 0.65;
  float kind = bb.x;
  if (kind > 2.5 && kind < 3.5) life = 1.1 + aSeed.y * 0.9;
  float maxLife = kind < 1.5 ? 1.0 : (kind > 2.5 && kind < 3.5 ? 2.0 : 1.2);
  if (age < 0.0 || age > maxLife || aSeed.z > uDensity) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vAlpha = 0.0;
    vColor = vec3(0.0);
    return;
  }
  float scale = bb.y;
  float a0;
  // Streak: the tail samples the same particle a moment earlier.
  float lag = kind > 2.5 && kind < 3.5 ? 0.05 : 0.03;
  float t = max(age - aVertex * lag, 0.0);
  vec3 p = burstPos(kind, t, scale, life, a0);
  float aHead;
  burstPos(kind, age, scale, life, aHead);
  vAlpha = aHead * (1.0 - aVertex * 0.85);
  vColor = burstColor(kind);
  gl_Position = projectionMatrix * viewMatrix * vec4(b.xyz + p, 1.0);
}
