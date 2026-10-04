import { Color, DoubleSide, FrontSide, MeshStandardMaterial, ShaderChunk, Vector2, Vector3, Vector4, type WebGLProgramParametersWithUniforms } from 'three'
import { GLSL } from '../../shaders'
import { ZONE_COUNT, type CharacterDesign } from './design'

/**
 * Fighter surface shading. One material family extends MeshStandardMaterial (so every stage
 * light, the Code Core light and the impact light still apply) with:
 *  - per-vertex paint zones (albedo / roughness / metalness / glow / toon per zone),
 *  - a design-supplied procedural paint pass in bind space (panels, seams, energy channels),
 *  - a cel-style terminator on direct light (per zone), for an anime-game read,
 *  - an identity rim (cyan / violet) on the side facing the fighter's rim light,
 *  - the dissolve used by reveals and teleports,
 *  - hand shape switching (open / fist / blade) by collapsing inactive hand variants,
 *  - variants: a painted anime face on the head, anisotropic strand shading on hair.
 */
export interface FighterUniforms {
  uReveal: { value: number }
  uEdgeColor: { value: Color }
  uEnergy: { value: Color }
  uEnergyLevel: { value: number }
  uRimColor: { value: Color }
  uRimStrength: { value: number }
  /** View-space direction toward the fighter's rim light. */
  uRimDir: { value: Vector3 }
  uHand: { value: Vector2 }
  /** Face: lid open, squint, brow raise, brow angle. */
  uExpr: { value: Vector4 }
  /** Face: mouth open, smile, strain, blink. */
  uMouth: { value: Vector4 }
  /** Iris offset (-1..1, character left / up). */
  uGaze: { value: Vector2 }
  /** Hair tip swing (head-local, m). */
  uHairSwing: { value: Vector3 }
  /** View-space key light direction (hair highlight). */
  uKeyDir: { value: Vector3 }
  /** 0..1 overall emissive suppression (FX off keeps identity, removes bloom fodder). */
  uGlowScale: { value: number }
  /** 0..1 spatial desync: the body splits into displaced, flickering slices (phase / teleport). */
  uPhase: { value: number }
  uTime: { value: number }
}

export function createFighterUniforms(design: CharacterDesign): FighterUniforms {
  return {
    uReveal: { value: 1 },
    uEdgeColor: { value: new Color(...design.energy).multiplyScalar(1.3) },
    uEnergy: { value: new Color(...design.energy) },
    uEnergyLevel: { value: 0.6 },
    uRimColor: { value: new Color(...design.rim) },
    uRimStrength: { value: 0.6 },
    uRimDir: { value: new Vector3(0, 0.3, -1).normalize() },
    uHand: { value: new Vector2(0, 0) },
    uExpr: { value: new Vector4(1, 0, 0, 0) },
    uMouth: { value: new Vector4(0, 0, 0, 0) },
    uGaze: { value: new Vector2(0, 0) },
    uHairSwing: { value: new Vector3() },
    uKeyDir: { value: new Vector3(0.4, 0.6, 0.7).normalize() },
    uGlowScale: { value: 1 },
    uPhase: { value: 0 },
    uTime: { value: 0 },
  }
}

export type MaterialKind = 'body' | 'armor' | 'head' | 'hair'

/** Toon terminator applied to direct diffuse light. */
const DIFFUSE_TERM = /* glsl */ `
float vsToon = 0.0;
float vsDiffuseTerm(float ndl) {
  float lam = clamp(ndl, 0.0, 1.0);
  float cel = smoothstep(-0.02, 0.14, ndl);
  // Soft cel: a crisp terminator, some lambert gradient kept in the lit side.
  return mix(lam, cel * (0.55 + 0.45 * lam), vsToon);
}
`

function physicalParsWithToon(): string {
  const src = ShaderChunk.lights_physical_pars_fragment
  const target = 'vec3 irradiance = dotNL * directLight.color;'
  if (!src.includes(target)) throw new Error('VoidShift: three.js lighting chunk changed (toon terminator hook missing)')
  return DIFFUSE_TERM + src.replace(target, 'vec3 irradiance = vsDiffuseTerm( dot( geometryNormal, directLight.direction ) ) * directLight.color;')
}

const FACE_PAINT = /* glsl */ `
uniform vec3 uEye;
uniform vec2 uEyeSize;
uniform float uEyeTilt;
uniform float uIrisR;
uniform vec4 uBrow;      // y, thickness, length, angle
uniform vec2 uMouthPos;  // y, width
uniform vec3 uIrisColor;
uniform float uIrisGlow;
uniform vec3 uLash;
uniform vec3 uSclera;
uniform vec3 uLip;
uniform vec3 uBrowColor;
uniform vec4 uExpr;
uniform vec4 uMouth;
uniform vec2 uGaze;

float vsBand(float d, float w, float aa) { return 1.0 - smoothstep(w - aa, w + aa, abs(d)); }

// Paints eyes, brows and mouth onto the face (head-local bind position p). Returns emissive.
vec3 vsPaintFace(vec3 p, inout vec3 albedo, inout float rough) {
  vec3 glow = vec3(0.0);
  if (p.z < 0.045) return glow;
  float aa = 0.00022;
  float s = sign(p.x + 1e-6);
  float w = uEyeSize.x * 0.5;
  float h = uEyeSize.y;
  float open = clamp(uExpr.x * (1.0 - uMouth.w), 0.0, 1.0);
  float squint = uExpr.y;
  // ── Eye ──
  float u = abs(p.x) - uEye.x;
  float v = p.y - uEye.y - uEyeTilt * u;
  float un = u / w;
  float inX = 1.0 - smoothstep(0.96, 1.02, abs(un));
  float e = max(0.0, 1.0 - un * un);
  float lift = 0.12 * h * max(un, 0.0);
  float yUopen = h * pow(e, 0.5) * (0.92 + 0.12 * un) + lift - squint * h * 0.28;
  float yL = -h * 0.42 * pow(e, 0.85) + squint * h * 0.22;
  float yU = mix(yL + 0.0006, yUopen, open);
  float inside = inX * smoothstep(yL - aa, yL + aa, v) * (1.0 - smoothstep(yU - aa, yU + aa, v));
  if (inside > 0.0) {
    // Sclera with the lid's shadow along the top.
    float lidShade = smoothstep(yU - h * 0.55, yU, v);
    vec3 col = uSclera * (1.0 - 0.5 * lidShade);
    // Iris: large, slightly tall, tucked under the upper lid; follows the gaze.
    vec2 ic = vec2(s * uGaze.x * w * 0.38, uGaze.y * h * 0.3 - h * 0.12);
    vec2 iq = vec2((u - ic.x) / (uIrisR * 0.92), (v - ic.y) / (uIrisR * 1.08));
    float d = length(iq);
    float iris = 1.0 - smoothstep(0.96, 1.04, d);
    float grad = smoothstep(-0.9, 0.9, -iq.y);
    vec3 ir = uIrisColor * mix(0.28, 1.25, grad);
    ir *= mix(1.0, 0.32, smoothstep(0.7, 1.0, d));              // limbal ring
    float pupil = 1.0 - smoothstep(0.34, 0.42, d * (1.0 + squint * 0.3));
    ir = mix(ir, ir * 0.12, pupil);
    // Radial fibres.
    float ang = atan(iq.y, iq.x);
    ir *= 0.86 + 0.14 * sin(ang * 23.0 + d * 9.0);
    col = mix(col, ir * (1.0 - 0.45 * lidShade), iris);
    // Catch lights.
    float hl1 = 1.0 - smoothstep(0.15, 0.24, length(iq - vec2(-0.38 * s, 0.42)));
    float hl2 = 1.0 - smoothstep(0.06, 0.11, length(iq - vec2(0.34 * s, -0.36)));
    col = mix(col, vec3(1.6), max(hl1, hl2 * 0.8) * iris);
    albedo = mix(albedo, col, inside);
    rough = mix(rough, 0.18, inside);
    glow += (uIrisColor * uIrisGlow * iris * (1.0 - 0.6 * lidShade) * (1.0 - pupil * 0.7) + vec3(0.6) * hl1 * iris * 0.5) * inside * open;
  }
  // Upper lash line: heavy, thicker toward the outer corner, with a short wing.
  float lt = 0.00085 * (1.0 + 0.9 * smoothstep(-0.3, 1.0, un));
  float lashU = vsBand(v - yU - lt * 0.35, lt, aa) * (1.0 - smoothstep(1.0, 1.32, un)) * smoothstep(-1.08, -0.92, un);
  float wing = vsBand(v - (yU + (un - 1.0) * h * 0.55), 0.0006 * (1.3 - un), aa) * step(0.98, un) * (1.0 - smoothstep(1.15, 1.38, un));
  float lashL = vsBand(v - yL, 0.00032, aa) * smoothstep(-0.3, 0.2, un) * (1.0 - smoothstep(0.95, 1.05, un)) * 0.75;
  float crease = vsBand(v - yUopen - 0.0029 * (1.0 - 0.4 * un * un) - squint * 0.0005, 0.00024, aa) * smoothstep(-0.7, -0.3, un) * (1.0 - smoothstep(0.85, 1.05, un)) * 0.35;
  float lash = clamp(max(max(lashU, wing), max(lashL, crease)), 0.0, 1.0);
  albedo = mix(albedo, uLash, lash);
  // ── Brow ──
  float bl = uBrow.z;
  float bu = (u + w * 1.05) / bl;              // 0 at the inner end → 1 at the outer end
  float raise = uExpr.z * 0.0035;
  float angle = uBrow.w + uExpr.w;
  float yb = uBrow.x + raise + angle * (bu - 0.35) * bl - 0.0022 * pow(bu - 0.45, 2.0) * 4.0;
  float bt = uBrow.y * (1.05 - 0.75 * smoothstep(0.1, 1.0, bu));
  float brow = vsBand(p.y - yb, bt, aa) * smoothstep(-0.02, 0.06, bu) * (1.0 - smoothstep(0.94, 1.02, bu));
  albedo = mix(albedo, uBrowColor, brow);
  // ── Mouth ──
  float mx = p.x / (uMouthPos.y * 0.5);
  float my = uMouthPos.x + uMouth.y * 0.0028 * (mx * mx - 0.3) - uMouth.z * 0.0006 * cos(mx * 9.0);
  float mw = 1.0 - smoothstep(0.85, 1.05, abs(mx));
  float openH = uMouth.x * 0.0045 * (1.0 - mx * mx);
  float line = vsBand(p.y - my + openH * 0.5, 0.00042 * (1.0 - 0.7 * mx * mx) + openH * 0.5, aa) * mw;
  albedo = mix(albedo, uLip * 0.6, vsBand(p.y - my + 0.0022, 0.0016, 0.0012) * mw * 0.35);
  albedo = mix(albedo, mix(uLash, vec3(0.08, 0.02, 0.03), uMouth.x), line);
  // Strain: a crease between the brows.
  float pinch = uMouth.z * vsBand(abs(p.x) - 0.006, 0.00035, aa) * vsBand(p.y - uBrow.x + 0.002, 0.004, 0.002);
  albedo = mix(albedo, albedo * 0.6, pinch);
  return glow;
}
`

/** Creates a fighter material for one mesh kind. `paint` is the design's GLSL paint body. */
export function createFighterMaterial(design: CharacterDesign, kind: MaterialKind, u: FighterUniforms, paint: string, headBind: readonly [number, number, number]): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0, side: kind === 'hair' ? DoubleSide : FrontSide })
  const zoneColor = Array.from({ length: ZONE_COUNT }, (_, i) => new Vector3(...(design.palette[i]?.color ?? [0.5, 0.5, 0.5])))
  const zoneMat = Array.from({ length: ZONE_COUNT }, (_, i) => {
    const z = design.palette[i]
    return new Vector4(z?.roughness ?? 0.6, z?.metalness ?? 0, z?.glow ?? 0, z?.toon ?? 0.3)
  })
  const f = design.face
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, u, {
      uZoneColor: { value: zoneColor },
      uZoneMat: { value: zoneMat },
      uHeadBind: { value: new Vector3(...headBind) },
      uEye: { value: new Vector3(...f.eye) },
      uEyeSize: { value: new Vector2(f.eyeWidth, f.eyeHeight) },
      uEyeTilt: { value: f.eyeTilt },
      uIrisR: { value: f.irisRadius },
      uBrow: { value: new Vector4(f.brow.y, f.brow.thickness, f.brow.length, f.brow.angle) },
      uMouthPos: { value: new Vector2(f.mouth.y, f.mouth.width) },
      uIrisColor: { value: new Vector3(...f.irisColor) },
      uIrisGlow: { value: f.irisGlow },
      uLash: { value: new Vector3(...f.lashColor) },
      uSclera: { value: new Vector3(...f.scleraColor) },
      uLip: { value: new Vector3(...f.lipColor) },
      uBrowColor: { value: new Vector3(...(design.palette[8]?.color ?? [0.2, 0.2, 0.2])).multiplyScalar(0.55) },
    })
    const header = /* glsl */ `
uniform vec3 uZoneColor[${ZONE_COUNT}];
uniform vec4 uZoneMat[${ZONE_COUNT}];
uniform float uReveal;
uniform vec3 uEdgeColor;
uniform vec3 uEnergy;
uniform float uEnergyLevel;
uniform vec3 uRimColor;
uniform float uRimStrength;
uniform vec3 uRimDir;
uniform vec3 uHeadBind;
uniform vec3 uKeyDir;
uniform float uGlowScale;
uniform float uTime;
uniform float uPhase;
varying vec3 vBind;
varying vec3 vBindN;
varying float vZone;
varying vec3 vWorld;
varying float vHairT;
varying vec3 vStrand;
`
    shader.vertexShader =
      header +
      `attribute float aZone;\nattribute float aHand;\nattribute float aHairT;\nattribute vec3 aStrand;\nuniform vec2 uHand;\nuniform vec3 uHairSwing;\n` +
      shader.vertexShader
        .replace(
          '#include <skinnormal_vertex>',
          `#include <skinnormal_vertex>
  vStrand = normalize((viewMatrix * modelMatrix * (skinMatrix * vec4(aStrand, 0.0))).xyz + 1e-5);`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
  vBind = position;
  vBindN = normal;
  vZone = aZone;
  vHairT = aHairT;
  ${kind === 'hair' ? 'transformed += uHairSwing * aHairT * aHairT;' : ''}
  if (uPhase > 0.001) {
    float vsSlice = floor(position.y * 15.0);
    float vsH = fract(sin(vsSlice * 12.9898 + floor(uTime * 13.0) * 78.233) * 43758.5453);
    transformed.x += (vsH - 0.5) * uPhase * 0.13;
    transformed.z += (fract(vsH * 7.13) - 0.5) * uPhase * 0.06;
  }
  ${kind === 'body' ? `if (aHand > 0.5) {
    float sideShape = aHand < 3.5 ? uHand.x : uHand.y;
    float shape = mod(aHand - 1.0, 3.0);
    if (abs(shape - sideShape) > 0.5) transformed = vec3(0.0);
  }` : ''}`,
        )
        .replace('#include <project_vertex>', '#include <project_vertex>\n  vWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;')

    shader.fragmentShader =
      header +
      GLSL.common +
      (kind === 'head' ? FACE_PAINT : '') +
      /* glsl */ `
struct VsSurface { vec3 albedo; float rough; float metal; float glow; float toon; vec3 emissive; };
void vsPaint(vec3 p, vec3 n, int zone, inout VsSurface s) {
${paint}
}
` +
      shader.fragmentShader
        .replace('#include <lights_physical_pars_fragment>', physicalParsWithToon())
        .replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
  float vsN = vsNoise3(vWorld * 9.0) * 0.7 + vsNoise3(vWorld * 23.0) * 0.3;
  float vsCut = uReveal * 1.2 - 0.1;
  if (vsN > vsCut) discard;
  float vsEdge = (1.0 - smoothstep(0.0, 0.06, vsCut - vsN)) * step(uReveal, 0.999);
  if (uPhase > 0.001) {
    float vsBand = fract(vWorld.y * 15.0);
    float vsGap = vsNoise3(vec3(floor(vWorld.y * 15.0), floor(uTime * 13.0), 2.7));
    if (vsGap < uPhase * 0.42 && vsNoise3(vWorld * 7.0) > 0.4) discard;
    vsEdge = max(vsEdge, uPhase * (1.0 - smoothstep(0.0, 0.08, min(vsBand, 1.0 - vsBand))) * 0.35);
  }`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
  int vsZone = int(vZone + 0.5);
  VsSurface vsS;
  vsS.albedo = uZoneColor[vsZone];
  vec4 vsZm = uZoneMat[vsZone];
  vsS.rough = vsZm.x;
  vsS.metal = vsZm.y;
  vsS.glow = vsZm.z;
  vsS.toon = vsZm.w;
  vsS.emissive = vec3(0.0);
  ${kind === 'hair' ? hairColor() : ''}
  vsPaint(vBind, normalize(vBindN), vsZone, vsS);
  ${kind === 'head' ? 'vsS.emissive += vsPaintFace(vBind - uHeadBind, vsS.albedo, vsS.rough);' : ''}
  diffuseColor.rgb = vsS.albedo;
  vsToon = vsS.toon;`,
        )
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vsS.rough;')
        .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vsS.metal;')
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
  totalEmissiveRadiance += (uEnergy * vsS.glow * uEnergyLevel + vsS.emissive) * uGlowScale;`,
        )
        .replace(
          '#include <opaque_fragment>',
          `{
    vec3 vsV = normalize(vViewPosition);
    float vsFres = pow(1.0 - clamp(dot(normal, vsV), 0.0, 1.0), 3.0);
    float vsSide = clamp(dot(normal, uRimDir) * 0.75 + 0.35, 0.0, 1.0);
    outgoingLight += uRimColor * uRimStrength * vsFres * vsSide;
    ${kind === 'hair' ? hairSpecular() : ''}
    outgoingLight += uEdgeColor * vsEdge * 2.0;
  }
#include <opaque_fragment>`,
        )
  }
  m.customProgramCacheKey = () => `vs-fighter-${design.id}-${kind}`
  return m
}

function hairColor(): string {
  return /* glsl */ `
  // Root shadow → lit body → icy tips.
  vsS.albedo = mix(vsS.albedo * 0.45, vsS.albedo, smoothstep(0.0, 0.35, vHairT));
  vsS.albedo = mix(vsS.albedo, vsS.albedo * vec3(0.75, 1.05, 1.2) + uEnergy * 0.02, smoothstep(0.55, 1.0, vHairT));`
}

function hairSpecular(): string {
  return /* glsl */ `
    // Kajiya-Kay: two shifted lobes along the strand (the anime "ring" highlight).
    vec3 vsT = normalize(vStrand - normal * dot(vStrand, normal));
    vec3 vsH = normalize(uKeyDir + vsV);
    float vsTH1 = dot(normalize(vsT + normal * 0.18), vsH);
    float vsTH2 = dot(normalize(vsT - normal * 0.12), vsH);
    float vsSpec = pow(sqrt(max(0.0, 1.0 - vsTH1 * vsTH1)), 90.0) * 0.55 + pow(sqrt(max(0.0, 1.0 - vsTH2 * vsTH2)), 24.0) * 0.18;
    outgoingLight += (vsS.albedo * 0.8 + 0.12) * vsSpec * smoothstep(0.05, 0.3, vHairT) * clamp(dot(normal, uKeyDir) + 0.5, 0.0, 1.0);`
}
