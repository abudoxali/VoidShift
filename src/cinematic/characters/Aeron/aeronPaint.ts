import type { PaintSet } from '../sculpt/SculptedFighter'

/**
 * AERON's paint pass (GLSL, bind space: p = A-pose position in metres, n = bind normal, zone =
 * paint zone; `s` is the surface being built). Zones: 0 suit, 2 glove, 3 boot, 4 white plate,
 * 5 graphite plate, 6 trim, 9 coat.
 */
const COMMON = /* glsl */ `
  float ax = abs(p.x);
  float aa = 0.0009;
`

const BODY = /* glsl */ `${COMMON}
  if (zone == 0) {
    // Quilted panel ribs on the thighs and shins.
    float rib = smoothstep(0.35, 0.5, abs(fract(p.y * 26.0) - 0.5));
    s.albedo *= mix(1.0, 0.82, rib * step(p.y, 0.95) * 0.6);
  }
  if (zone == 3) {
    // Boots: a dark sole, a cyan welt line.
    s.albedo = mix(s.albedo, vec3(0.012), 1.0 - smoothstep(0.012, 0.016, p.y));
    float welt = 1.0 - smoothstep(0.0012, 0.0024, abs(p.y - 0.03));
    s.emissive += vec3(0.25, 1.1, 1.45) * welt * 1.2;
    s.rough = mix(s.rough, 0.7, 1.0 - smoothstep(0.012, 0.016, p.y));
  }
  if (zone == 2) {
    // Gloves: knuckle seam glow.
    s.rough = 0.45;
  }
`

const ARMOR = /* glsl */ `${COMMON}
  if (zone == 9) {
    // Coat: white fabric with black angular inlays and cyan piping.
    float chevron = p.y - (1.215 + 0.6 * ax);
    float band = step(0.0, chevron) * step(chevron, 0.042) * step(-0.03, p.z);
    float flank = step(0.112, ax) * step(p.y, 1.265) * step(-0.06, p.z);
    float yoke = step(p.z, -0.035) * step(1.315, p.y);
    float sleeve = step(0.2, ax) * step(0.55, n.x * sign(p.x)) * step(p.y, 1.36);
    float black = clamp(band + flank + yoke + sleeve, 0.0, 1.0);
    // Piping along the inlay boundaries (distance in the panel field).
    float edge = min(min(abs(chevron), abs(chevron - 0.042)), abs(ax - 0.112) + step(1.265, p.y));
    float pipe = (1.0 - smoothstep(0.0, 0.0022, edge)) * step(-0.03, p.z);
    s.albedo = mix(s.albedo, vec3(0.018, 0.02, 0.024), black);
    s.rough = mix(s.rough, 0.45, black);
    s.toon = mix(s.toon, 0.25, black);
    s.emissive += vec3(0.25, 1.1, 1.45) * pipe * 1.3;
    // Hem shadow line.
    s.albedo *= 1.0 - 0.5 * (1.0 - smoothstep(1.0, 1.012, p.y));
  }
  if (zone == 4) {
    // White plates: soft wear toward the edges (normal facing away from the plate centre).
    s.rough = mix(0.26, 0.38, smoothstep(0.2, 0.9, 1.0 - abs(n.y)));
  }
  if (zone == 6) {
    // Belt: a cyan buckle core.
    float buckle = (1.0 - smoothstep(0.012, 0.016, ax)) * step(0.05, p.z);
    s.emissive += vec3(0.3, 1.2, 1.6) * buckle * 1.5;
  }
`

export const AERON_PAINT: PaintSet = { body: BODY, armor: ARMOR, head: COMMON, hair: '' }
