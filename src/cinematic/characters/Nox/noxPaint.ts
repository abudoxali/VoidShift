import type { PaintSet } from '../sculpt/SculptedFighter'

/**
 * NOX's paint pass (GLSL, bind space). Violet fracture veins run through the black armour; the
 * crystal glows from its core; the undersuit carries faint dimensional seams.
 */
const VEINS = /* glsl */ `
  float vein = 0.0;
  {
    vec3 q = p * 16.0;
    float a = abs(vsNoise3(q) - 0.5);
    float b = abs(vsNoise3(q * 2.3 + 7.1) - 0.5);
    vein = (1.0 - smoothstep(0.0, 0.02, a)) * smoothstep(0.35, 0.6, vsNoise3(p * 5.0));
    vein += (1.0 - smoothstep(0.0, 0.012, b)) * 0.0;
  }
`

const BODY = /* glsl */ `${VEINS}
  if (zone == 0) {
    
  }
  if (zone == 3) {
    s.albedo = mix(s.albedo, vec3(0.008), 1.0 - smoothstep(0.012, 0.016, p.y));
  }
`

const ARMOR = /* glsl */ `${VEINS}
  if (zone == 4 || zone == 5) {
    s.emissive += vec3(0.75, 0.22, 1.5) * vein * 0.35;
    s.albedo = mix(s.albedo, vec3(0.25, 0.08, 0.4), vein * 0.4);
  }
  if (zone == 10) {
    float core = 0.5 + 0.5 * vsNoise3(p * 60.0);
    s.emissive += vec3(0.7, 0.2, 1.4) * (0.1 + pow(core, 3.0) * 0.7);
  }
  if (zone == 6) {
    float buckle = (1.0 - smoothstep(0.014, 0.02, abs(p.x))) * step(0.05, p.z);
    s.emissive += vec3(0.8, 0.25, 1.6) * buckle * 1.4;
  }
`

const HEAD = /* glsl */ `
  if (zone == 10) {
    float core = 0.5 + 0.5 * vsNoise3(p * 70.0);
    s.emissive += vec3(0.6, 0.18, 1.3) * (0.06 + pow(core, 3.0) * 0.5);
  }
`

export const NOX_PAINT: PaintSet = { body: BODY, armor: ARMOR, head: HEAD, hair: '' }
