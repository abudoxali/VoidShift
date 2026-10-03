attribute vec3 aAnchor;
attribute vec4 aGlyph;   // x: column, y: line, z: glyph index (-1 = hidden), w: size (world units)
attribute vec4 aStyle;   // rgb: HDR colour, a: opacity
attribute vec2 aMode;    // x: 1 = billboard, 0 = lies on the ground plane; y: glitch amount

uniform float uTime;
uniform vec2 uGrid;      // atlas columns, rows
uniform float uCellScale;  // atlas cell size / font size
uniform float uAdvance;    // advance in em

varying vec2 vUv;
varying vec4 vStyle;
varying float vGlitch;

void main() {
  if (aGlyph.z < 0.0 || aStyle.a <= 0.002) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  float size = aGlyph.w;
  vec2 corner = position.xy + 0.5;

  // Glitch: per-glyph horizontal displacement + occasional glyph dropout, quantised in time.
  float tq = floor(uTime * 18.0);
  float seed = aGlyph.x * 7.13 + aGlyph.y * 3.7 + aAnchor.x * 1.31 + aAnchor.z * 0.73;
  float g = step(1.0 - aMode.y * 0.6, vsHash11(seed + tq * 1.7));
  vec2 jitter = vec2((vsHash11(seed * 3.1 + tq) - 0.5) * 1.6, (vsHash11(seed * 5.3 + tq) - 0.5) * 0.5) * size * g;

  vec2 pen = vec2((aGlyph.x + 0.5) * uAdvance * size, -aGlyph.y * 1.3 * size);
  vec2 offset = pen + (corner - 0.5) * size * uCellScale + jitter;

  if (aMode.x > 0.5) {
    vec4 mv = viewMatrix * vec4(aAnchor, 1.0);
    mv.xy += offset;
    gl_Position = projectionMatrix * mv;
  } else {
    vec3 world = aAnchor + vec3(offset.x, 0.004, -offset.y);
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }

  float col = mod(aGlyph.z, uGrid.x);
  float row = floor(aGlyph.z / uGrid.x);
  vUv = vec2((col + corner.x) / uGrid.x, 1.0 - (row + 1.0 - corner.y) / uGrid.y);
  vStyle = aStyle;
  vGlitch = g;
}
