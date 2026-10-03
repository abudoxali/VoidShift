attribute float aT;      // parameter along the trajectory (0 = launch, 1 = predicted end)
attribute float aKind;   // 0: trajectory dash, 1: direction chevron, 2: intercept reticle
attribute vec2 aOff;     // local offsets (chevrons: along/side; reticle: side/up)

uniform vec3 uFrom;
uniform vec3 uTo;
uniform float uDraw;
uniform float uVisible;
uniform float uLock;
uniform float uResult;

varying float vAlpha;
varying float vKind;

void main() {
  vec3 span = uTo - uFrom;
  float len = max(length(span), 1e-4);
  vec3 dir = span / len;
  vec3 side = normalize(cross(dir, vec3(0.0, 1.0, 0.0)) + vec3(1e-5, 0.0, 0.0));
  vec3 up = normalize(cross(side, dir));
  // Intercept: the VOID core projected onto the predicted line.
  float tHit = clamp(dot(uVoidPos - uFrom, dir) / len, 0.0, 1.0);

  vec3 p;
  float a = uVisible;
  if (aKind < 0.5) {
    p = uFrom + span * aT;
    // A travelling pulse runs toward the intercept: the line reads as a direction.
    float pulse = smoothstep(0.75, 1.0, fract(aT * 5.0 - uTime * 1.8 * uMotion));
    a *= step(aT, uDraw) * (0.35 + 0.65 * pulse) * mix(1.0, 0.35, step(tHit, aT));
  } else if (aKind < 1.5) {
    vec3 c = uFrom + span * aT;
    p = c + dir * aOff.x + side * aOff.y;
    a *= step(aT, uDraw) * step(aT, tHit) * 0.8;
  } else {
    // Reticle faces across the line; it contracts as the lock completes.
    float s = mix(1.6, 1.0, uLock);
    p = uVoidPos + (side * aOff.x + up * aOff.y) * s;
    a *= smoothstep(0.4, 0.9, uDraw) * (0.45 + 0.55 * uLock) * (1.0 - uResult * 0.6);
  }
  vAlpha = a;
  vKind = aKind;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
