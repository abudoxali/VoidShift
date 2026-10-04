import type { HandShape } from '../../animation/pose'
import type { JointName, Proportions } from '../../animation/skeleton'
import { ZONE, type ArmorPiece, type CharacterDesign, type ZoneFinish } from '../sculpt/design'
import type { Frames } from '../sculpt/frames'
import { lock, type HairClump, type HairSpec } from '../sculpt/hair'
import { Op, Sculpt, rotation, type V3 } from '../sculpt/sdf'

/**
 * AERON — the precise fighter of light. Young adult, lean and athletic. A fitted graphite
 * undersuit under a short white high-collared combat coat with black geometric panels, layered
 * silver pauldrons, forearm guards, knee guards and white/black boots, cyan energy channels. Swept
 * silver-white hair with ice-blue tips; an angular face with bright cyan eyes.
 */
export const AERON_PROPORTIONS: Proportions = {
  hipHeight: 0.97,
  spine: 0.12,
  chest: 0.22,
  neck: 0.1,
  head: 0.24,
  shoulderWidth: 0.38,
  upperArm: 0.29,
  foreArm: 0.26,
  hand: 0.18,
  hipWidth: 0.18,
  thigh: 0.45,
  shin: 0.44,
}

type Side = 'L' | 'R'
const SIDES: readonly Side[] = ['L', 'R']
const sgn = (s: Side) => (s === 'L' ? 1 : -1)
const J = (name: string, s: Side) => `${name}${s}` as JointName
const mirror = (p: V3, s: Side): V3 => [p[0] * sgn(s), p[1], p[2]]

function body(f: Frames): Sculpt {
  const b = new Sculpt()
  const B = f.bone
  b.k = 0.025

  // ── Pelvis / abdomen / chest ─────────────────────────────────────────────
  b.on(B.hips, ZONE.SUIT)
  b.ellipsoid([0, 0.955, -0.006], [0.132, 0.1, 0.09], { k: 0.03 })
  for (const s of SIDES) b.ellipsoid(mirror([0.058, 0.905, -0.042], s), [0.066, 0.074, 0.062])
  b.ellipsoid([0, 0.878, 0.004], [0.058, 0.05, 0.058])

  b.on(B.spine, ZONE.SUIT)
  b.ellipsoid([0, 1.15, 0.006], [0.11, 0.13, 0.081], { k: 0.035 })
  b.ellipsoid([0, 1.165, 0.046], [0.068, 0.105, 0.04], { k: 0.03 })

  b.on(B.chest, ZONE.SUIT)
  b.ellipsoid([0, 1.29, -0.006], [0.128, 0.15, 0.096], { k: 0.035 })
  b.ellipsoid([0, 1.356, -0.008], [0.148, 0.072, 0.088], { k: 0.03 })
  for (const s of SIDES) {
    b.ellipsoid(mirror([0.058, 1.316, 0.054], s), [0.068, 0.054, 0.044], { rot: rotation(0, 0, -0.18 * sgn(s)) })
    b.ellipsoid(mirror([0.096, 1.25, -0.024], s), [0.054, 0.1, 0.068])
    b.ellipsoid(mirror([0.068, 1.335, -0.07], s), [0.06, 0.07, 0.034])
    b.cone(mirror([0.032, 1.44, -0.024], s), mirror([0.135, 1.398, -0.016], s), 0.04, 0.032)
  }

  // ── Neck (the head mesh carries the upper neck) ─────────────────────────
  b.on(B.neck, ZONE.SKIN)
  b.cone([0, 1.39, -0.012], [0, 1.432, -0.008], 0.052, 0.044, { k: 0.02 })

  // ── Arms ──────────────────────────────────────────────────────────────────
  for (const s of SIDES) {
    const ua = J('upperArm', s), fa = J('foreArm', s)
    b.on(B[ua], ZONE.SUIT)
    b.ellipsoid(f.at(ua, [0.004 * sgn(s), -0.028, 0]), [0.05, 0.066, 0.056], { rot: f.rot(ua), k: 0.03 })
    b.flatCone(f.at(ua, [0, 0, 0]), f.at(ua, [0, -0.275, 0]), 0.045, 0.037, 0.92, { k: 0.02 })
    b.ellipsoid(f.at(ua, [0, -0.125, 0.016]), [0.037, 0.085, 0.039], { rot: f.rot(ua) })
    b.ellipsoid(f.at(ua, [0, -0.105, -0.018]), [0.039, 0.09, 0.037], { rot: f.rot(ua) })
    b.on(B[fa], ZONE.SUIT)
    b.sphere(f.at(fa, [0, 0, -0.006]), 0.035, { k: 0.02 })
    b.cone(f.at(fa, [0, 0, 0]), f.at(fa, [0, -0.25, 0]), 0.04, 0.027, { k: 0.02 })
    b.ellipsoid(f.at(fa, [0, -0.068, 0.004]), [0.043, 0.075, 0.039], { rot: f.rot(fa) })
  }

  // ── Legs ──────────────────────────────────────────────────────────────────
  for (const s of SIDES) {
    const th = J('thigh', s), sh = J('shin', s), ft = J('foot', s)
    b.on(B[th], ZONE.SUIT)
    b.cone(f.at(th, [0, 0.02, 0]), f.at(th, [0, -0.42, 0]), 0.086, 0.054, { k: 0.03 })
    b.ellipsoid(f.at(th, [0, -0.17, 0.022]), [0.072, 0.17, 0.066], { rot: f.rot(th) })
    b.ellipsoid(f.at(th, [0, -0.2, -0.028]), [0.06, 0.15, 0.054], { rot: f.rot(th) })
    b.on(B[sh], ZONE.SUIT)
    b.sphere(f.at(sh, [0, 0, 0.008]), 0.049, { k: 0.025 })
    b.cone(f.at(sh, [0, 0, 0]), f.at(sh, [0, -0.4, 0]), 0.051, 0.035, { k: 0.02 })
    b.ellipsoid(f.at(sh, [0, -0.11, -0.027]), [0.05, 0.11, 0.049], { rot: f.rot(sh) })
    // Boot shaft.
    b.on(B[sh], ZONE.BOOT)
    b.cone(f.at(sh, [0, -0.2, 0.002]), f.at(sh, [0, -0.415, 0.004]), 0.05, 0.046, { k: 0.012 })
    b.on(B[ft], ZONE.BOOT)
    b.box(f.at(ft, [0, -0.012, 0.05]), [0.044, 0.032, 0.1], { rot: f.rot(ft), round: 0.028, k: 0.02 })
    b.ellipsoid(f.at(ft, [0, -0.02, 0.135]), [0.042, 0.025, 0.05], { rot: f.rot(ft) })
    b.sphere(f.at(ft, [0, -0.008, -0.03]), 0.04)
  }
  return b
}

/** Head-local (head bone at the origin; bind pose is axis-aligned). */
function head(f: Frames): Sculpt {
  const h = new Sculpt()
  const B = f.bone
  h.k = 0.018
  h.on(B.head, ZONE.SKIN)
  // Cranium and forehead.
  h.ellipsoid([0, 0.085, -0.014], [0.075, 0.09, 0.096], { k: 0.02 })
  h.ellipsoid([0, 0.084, 0.022], [0.067, 0.068, 0.07], { k: 0.025 })
  // Mid-face volume and the V jaw.
  h.ellipsoid([0, 0.034, 0.026], [0.063, 0.058, 0.064], { k: 0.025 })
  h.ellipsoid([0, 0.004, 0.03], [0.052, 0.046, 0.054], { k: 0.022 })
  for (const s of [1, -1]) {
    h.cone([0.056 * s, 0.024, -0.008], [0.014 * s, -0.044, 0.07], 0.021, 0.013, { k: 0.02 })
    // Cheekbones.
    h.ellipsoid([0.05 * s, 0.043, 0.054], [0.022, 0.013, 0.02], { k: 0.018 })
    // Ears.
    h.ellipsoid([0.075 * s, 0.045, -0.008], [0.009, 0.027, 0.017], { k: 0.008, rot: rotation(0, 0.25 * s, 0) })
  }
  h.sphere([0, -0.045, 0.073], 0.016, { k: 0.02 })
  // Brow ridge.
  h.ellipsoid([0, 0.073, 0.074], [0.061, 0.013, 0.02], { k: 0.02 })
  // Nose: a straight bridge to a small defined tip.
  h.cone([0, 0.064, 0.086], [0, 0.02, 0.106], 0.006, 0.0075, { k: 0.012 })
  h.sphere([0, 0.018, 0.102], 0.0088, { k: 0.008 })
  for (const s of [1, -1]) h.ellipsoid([0.0085 * s, 0.016, 0.095], [0.0075, 0.0055, 0.0065], { k: 0.006 })
  // Soft muzzle (anime faces keep the mouth area smooth; the mouth is painted).
  h.ellipsoid([0, -0.014, 0.068], [0.03, 0.02, 0.022], { k: 0.02 })
  // Eye sockets: shallow, so painted eyes sit in a soft hollow under the brow.
  for (const s of [1, -1]) h.ellipsoid([0.031 * s, 0.052, 0.097], [0.021, 0.011, 0.01], { op: Op.Subtract, k: 0.014 })
  // Upper neck, bound to the neck bone.
  h.on(B.neck, ZONE.SKIN)
  h.cone([0, -0.02, -0.022], [0, -0.078, -0.014], 0.05, 0.05, { k: 0.03 })
  return h
}

function hand(f: Frames, side: Side, shape: HandShape): Sculpt {
  const hd = J('hand', side)
  const s = sgn(side)
  const g = new Sculpt()
  g.k = 0.008
  g.on(f.bone[hd], ZONE.GLOVE)
  const at = (p: V3) => f.at(hd, p)
  // Palm faces the body (-s on X), thumb forward (+Z), fingers down (-Y).
  g.box(at([0, -0.046, 0.002]), [0.0125, 0.042, 0.04], { rot: f.rot(hd), round: 0.011, k: 0.01 })
  g.ellipsoid(at([-0.006 * s, -0.035, 0.024]), [0.012, 0.024, 0.014], { rot: f.rot(hd) }) // thenar
  const fingers: [number, number][] = [
    [0.027, 0.074],
    [0.009, 0.081],
    [-0.009, 0.076],
    [-0.026, 0.061],
  ]
  for (const [z, len] of fingers) {
    const k0: V3 = [0, -0.086, z * 0.95]
    if (shape === 'fist') {
      const k1: V3 = [-0.022 * s, -0.104, z * 0.95]
      const k2: V3 = [-0.034 * s, -0.08, z * 0.92]
      g.cone(at(k0), at(k1), 0.0095, 0.0088)
      g.cone(at(k1), at(k2), 0.0088, 0.0078)
    } else if (shape === 'blade') {
      g.cone(at(k0), at([0.0, -0.086 - len, z * 0.75]), 0.0088, 0.0068)
    } else {
      const k1: V3 = [-0.006 * s, -0.086 - len * 0.45, z * 1.05]
      const k2: V3 = [-0.016 * s, -0.086 - len * 0.9, z * 1.08]
      g.cone(at(k0), at(k1), 0.009, 0.0082)
      g.cone(at(k1), at(k2), 0.0082, 0.0066)
    }
  }
  // Thumb.
  if (shape === 'fist') {
    g.cone(at([-0.004 * s, -0.03, 0.036]), at([-0.024 * s, -0.062, 0.042]), 0.0105, 0.009)
    g.cone(at([-0.024 * s, -0.062, 0.042]), at([-0.038 * s, -0.088, 0.024]), 0.009, 0.008)
  } else if (shape === 'blade') {
    g.cone(at([-0.004 * s, -0.03, 0.036]), at([-0.008 * s, -0.075, 0.042]), 0.0105, 0.0078)
  } else {
    g.cone(at([-0.004 * s, -0.03, 0.036]), at([-0.016 * s, -0.064, 0.058]), 0.0105, 0.009)
    g.cone(at([-0.016 * s, -0.064, 0.058]), at([-0.024 * s, -0.09, 0.064]), 0.009, 0.0075)
  }
  // Knuckle plate (armoured glove).
  g.on(f.bone[hd], ZONE.ARMOR_B)
  g.box(at([0.014 * s, -0.07, 0.0]), [0.006, 0.018, 0.036], { rot: f.rot(hd), round: 0.005, k: 0.004 })
  return g
}

function armor(f: Frames): ArmorPiece[] {
  const B = f.bone
  const pieces: ArmorPiece[] = []
  const region = (bone: number) => new Sculpt().on(bone)

  // Short white coat over the torso and upper arms: crisp hems at the waist and mid-biceps.
  const coat = region(B.chest)
  coat.box([0, 1.215, 0], [0.24, 0.215, 0.2], { round: 0.02, k: 0.0 })
  for (const s of SIDES) {
    const ua = J('upperArm', s)
    coat.cone(f.at(ua, [0, 0.06, 0]), f.at(ua, [0, -0.15, 0]), 0.09, 0.09, { k: 0.0 })
  }
  // Open front below the sternum (the undersuit shows in a V).
  const coatExtra = new Sculpt().on(B.chest)
  pieces.push({ name: 'coat', zone: ZONE.COAT, offset: 0.009, thickness: 0.008, region: coat, extra: coatExtra, bevel: 0.003, detail: 0.8, hides: true, hideInset: 0.006 })

  // Chest plate: angular, asymmetric over the left pec and sternum.
  const chest = region(B.chest)
  chest.box([0.03, 1.33, 0.1], [0.12, 0.07, 0.1], { rot: rotation(0, 0, -0.16), round: 0.012, k: 0 })
  pieces.push({ name: 'chestPlate', zone: ZONE.ARMOR_A, offset: 0.015, thickness: 0.01, region: chest, rigid: 'chest', bevel: 0.004 })

  // High collar: a flared stand-up ring, open at the front.
  const collar = region(B.neck)
  collar.cone([0, 1.392, -0.006], [0, 1.485, -0.016], 0.084, 0.074, { k: 0 })
  collar.cone([0, 1.39, -0.006], [0, 1.5, -0.016], 0.074, 0.064, { op: Op.Subtract, k: 0.004 })
  collar.box([0, 1.47, 0.09], [0.03, 0.06, 0.05], { op: Op.Subtract, rot: rotation(0, 0, 0), round: 0.01, k: 0.01 })
  collar.box([0, 1.53, 0], [0.2, 0.03, 0.2], { op: Op.Subtract, k: 0.0 })
  pieces.push({ name: 'collar', zone: ZONE.COAT, offset: -1, thickness: 0, region: collar, bevel: 0.002, detail: 0.7 })

  for (const s of SIDES) {
    const ua = J('upperArm', s), fa = J('foreArm', s), sh = J('shin', s), ft = J('foot', s)
    // Layered pauldron: a large cap and a lower lame.
    const cap = region(B[ua])
    cap.ellipsoid(f.at(ua, [0.03 * sgn(s), 0.0, 0]), [0.085, 0.07, 0.085], { rot: f.rot(ua), k: 0 })
    pieces.push({ name: `pauldron${s}`, zone: ZONE.ARMOR_A, offset: 0.016, thickness: 0.011, region: cap, rigid: ua, bevel: 0.004 })
    const lame = region(B[ua])
    lame.box(f.at(ua, [0.04 * sgn(s), -0.075, 0]), [0.06, 0.028, 0.075], { rot: f.rot(ua, [0, 0, 0.25 * sgn(s)]), round: 0.01, k: 0 })
    pieces.push({ name: `lame${s}`, zone: ZONE.ARMOR_B, offset: 0.011, thickness: 0.008, region: lame, rigid: ua, bevel: 0.003 })
    // Forearm guard on the outer forearm.
    const guard = region(B[fa])
    guard.box(f.at(fa, [0.018 * sgn(s), -0.14, 0.0]), [0.04, 0.085, 0.05], { rot: f.rot(fa), round: 0.016, k: 0 })
    pieces.push({ name: `vambrace${s}`, zone: ZONE.ARMOR_A, offset: 0.006, thickness: 0.01, region: guard, rigid: fa, bevel: 0.004 })
    // Wrist cuff (hides the glove seam).
    const cuff = region(B[fa])
    cuff.cone(f.at(fa, [0, -0.215, 0]), f.at(fa, [0, -0.255, 0]), 0.05, 0.05, { k: 0 })
    pieces.push({ name: `cuff${s}`, zone: ZONE.ARMOR_B, offset: 0.004, thickness: 0.008, region: cuff, rigid: fa, bevel: 0.003 })
    // Knee guard and shin plate.
    const knee = region(B[sh])
    knee.ellipsoid(f.at(sh, [0, 0.0, 0.06]), [0.058, 0.075, 0.05], { rot: f.rot(sh), k: 0 })
    pieces.push({ name: `knee${s}`, zone: ZONE.ARMOR_A, offset: 0.008, thickness: 0.012, region: knee, rigid: sh, bevel: 0.004 })
    const shin = region(B[sh])
    shin.box(f.at(sh, [0, -0.28, 0.05]), [0.045, 0.12, 0.04], { rot: f.rot(sh), round: 0.012, k: 0 })
    pieces.push({ name: `greave${s}`, zone: ZONE.ARMOR_A, offset: 0.006, thickness: 0.009, region: shin, rigid: sh, bevel: 0.003 })
    // Boot toe cap.
    const toe = region(B[ft])
    toe.box(f.at(ft, [0, 0.0, 0.13]), [0.06, 0.05, 0.06], { rot: f.rot(ft), round: 0.01, k: 0 })
    pieces.push({ name: `toe${s}`, zone: ZONE.ARMOR_A, offset: 0.004, thickness: 0.008, region: toe, rigid: ft, bevel: 0.003 })
  }
  // Belt.
  const belt = region(B.hips)
  belt.box([0, 1.005, 0], [0.2, 0.02, 0.2], { round: 0.004, k: 0 })
  pieces.push({ name: 'belt', zone: ZONE.TRIM, offset: 0.004, thickness: 0.009, region: belt, bevel: 0.003 })
  return pieces
}

/** Swept silver hair: bangs across the forehead, layered spikes swept up and back. */
function hair(): HairSpec {
  const clumps: HairClump[] = []
  const C: V3 = [0, 0.07, -0.01]
  // Crown / back spikes, swept back and slightly up.
  const back: [number, number, number][] = [
    // azimuth (rad from front, + = left), elevation, length
    [0.0, 0.95, 0.15],
    [0.45, 0.85, 0.14],
    [-0.45, 0.85, 0.14],
    [0.9, 0.6, 0.13],
    [-0.9, 0.6, 0.13],
    [1.35, 0.4, 0.12],
    [-1.35, 0.4, 0.12],
    [2.0, 0.35, 0.13],
    [-2.0, 0.35, 0.13],
    [2.6, 0.3, 0.14],
    [-2.6, 0.3, 0.14],
    [3.14, 0.35, 0.15],
    [2.3, 0.7, 0.15],
    [-2.3, 0.7, 0.15],
    [2.9, 0.75, 0.16],
    [-2.9, 0.75, 0.16],
    [1.7, 0.85, 0.14],
    [-1.7, 0.85, 0.14],
    [3.14, -0.05, 0.12],
    [2.6, -0.1, 0.11],
    [-2.6, -0.1, 0.11],
  ]
  for (const [az, el, len] of back) {
    const r: V3 = [Math.sin(az) * Math.cos(el) * 0.074, 0.085 + Math.sin(el) * 0.085, -0.014 + Math.cos(az) * Math.cos(el) * 0.088]
    const out: V3 = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)]
    // Sweep: outward, then backward and up, the tip flicks out.
    const backDir: V3 = [Math.sin(az) * 0.5, 0.35, -1]
    clumps.push(
      lock(
        r,
        [
          [out[0] * len * 0.25 + backDir[0] * len * 0.1, out[1] * len * 0.25 + backDir[1] * len * 0.1, out[2] * len * 0.25 + backDir[2] * len * 0.15],
          [out[0] * len * 0.15 + backDir[0] * len * 0.25, out[1] * len * 0.1 + backDir[1] * len * 0.3, backDir[2] * len * 0.35],
          [out[0] * len * 0.1 + backDir[0] * len * 0.3, backDir[1] * len * 0.25 - 0.004, backDir[2] * len * 0.3],
        ],
        0.024,
        0.009,
        { center: C, belly: 0.25, twist: 0.3 * Math.sign(az || 1) },
      ),
    )
  }
  // Top spikes, swept up and back from the hairline.
  for (let i = -3; i <= 3; i++) {
    const x = i * 0.019
    const r: V3 = [x, 0.155 - Math.abs(i) * 0.006, 0.045 - Math.abs(i) * 0.006]
    clumps.push(lock(r, [[x * 0.3, 0.028, -0.01], [x * 0.5, 0.02, -0.045], [x * 0.6, 0.004, -0.06]], 0.022, 0.009, { center: C, belly: 0.3 }))
  }
  // Bangs: long locks falling across the forehead, one between the eyes.
  const bangs: [number, number, number, number][] = [
    // root x, tip x, tip y, width
    [0.004, -0.004, 0.035, 0.016],
    [0.022, 0.036, 0.048, 0.015],
    [-0.02, -0.034, 0.05, 0.015],
    [0.042, 0.06, 0.04, 0.014],
    [-0.042, -0.06, 0.036, 0.014],
    [0.012, 0.016, 0.06, 0.012],
    [-0.01, -0.02, 0.066, 0.012],
  ]
  for (const [rx, tx, ty, w] of bangs) {
    const r: V3 = [rx, 0.15, 0.066]
    clumps.push(
      lock(
        r,
        [
          [(tx - rx) * 0.2, 0.004, 0.034],
          [(tx - rx) * 0.4, -0.04, 0.016],
          [(tx - rx) * 0.4, ty - 0.114, -0.006],
        ],
        w,
        0.0065,
        { center: [0, 0.07, -0.02], belly: 0.35, twist: (tx - rx) * 8 },
      ),
    )
  }
  // Side locks over the ears.
  for (const s of [1, -1]) {
    clumps.push(lock([0.07 * s, 0.11, 0.035], [[0.018 * s, -0.01, 0.01], [0.012 * s, -0.045, 0.004], [0.004 * s, -0.04, -0.006]], 0.016, 0.007, { center: C, belly: 0.3 }))
    clumps.push(lock([0.074 * s, 0.1, -0.005], [[0.02 * s, -0.012, -0.004], [0.014 * s, -0.05, -0.012], [0.006 * s, -0.035, -0.014]], 0.017, 0.007, { center: C, belly: 0.3 }))
  }
  const cap = new Sculpt()
  cap.ellipsoid([0, 0.135, -0.03], [0.1, 0.085, 0.13], { k: 0 })
  cap.ellipsoid([0, 0.07, -0.08], [0.1, 0.09, 0.08], { k: 0.02 })
  return { clumps, capRegion: cap, capOffset: 0.006, center: C }
}

const PALETTE: ZoneFinish[] = []
PALETTE[ZONE.SUIT] = { color: [0.03, 0.036, 0.042], roughness: 0.72, metalness: 0.05, toon: 0.3, weave: 1 }
PALETTE[ZONE.SKIN] = { color: [0.8, 0.62, 0.54], roughness: 0.5, metalness: 0, toon: 0.8 }
PALETTE[ZONE.GLOVE] = { color: [0.025, 0.028, 0.032], roughness: 0.5, metalness: 0.15, toon: 0.3 }
PALETTE[ZONE.BOOT] = { color: [0.045, 0.05, 0.056], roughness: 0.42, metalness: 0.2, toon: 0.25 }
PALETTE[ZONE.ARMOR_A] = { color: [0.44, 0.47, 0.51], roughness: 0.28, metalness: 0.45, toon: 0.35 }
PALETTE[ZONE.ARMOR_B] = { color: [0.11, 0.125, 0.14], roughness: 0.34, metalness: 0.55, toon: 0.25 }
PALETTE[ZONE.TRIM] = { color: [0.5, 0.55, 0.6], roughness: 0.25, metalness: 0.85, toon: 0.1 }
PALETTE[ZONE.GLOW] = { color: [0.1, 0.4, 0.5], roughness: 0.4, metalness: 0, glow: 1.6 }
PALETTE[ZONE.HAIR] = { color: [0.5, 0.58, 0.64], roughness: 0.38, metalness: 0.05, toon: 0.55 }
PALETTE[ZONE.COAT] = { color: [0.36, 0.385, 0.41], roughness: 0.62, metalness: 0.02, toon: 0.5, weave: 0.6 }
PALETTE[ZONE.CRYSTAL] = { color: [0.3, 0.8, 1.0], roughness: 0.1, metalness: 0.1, glow: 0.8 }
PALETTE[ZONE.LINER] = { color: [0.015, 0.018, 0.022], roughness: 0.6, metalness: 0.1, toon: 0.2 }

export const AERON_DESIGN: CharacterDesign = {
  id: 'aeron',
  proportions: AERON_PROPORTIONS,
  energy: [0.35, 1.6, 2.2],
  rim: [0.4, 0.9, 1.1],
  body,
  head,
  headBounds: [
    [-0.1, -0.085, -0.13],
    [0.1, 0.19, 0.125],
  ],
  hand,
  armor,
  hair,
  face: {
    eye: [0.031, 0.051, 0.094],
    eyeWidth: 0.0275,
    eyeHeight: 0.0128,
    eyeTilt: 0.1,
    irisRadius: 0.0068,
    brow: { y: 0.069, thickness: 0.0028, length: 0.027, angle: -0.08 },
    mouth: { y: -0.016, width: 0.017 },
    irisColor: [0.25, 0.95, 1.2],
    irisGlow: 1.4,
    lashColor: [0.04, 0.05, 0.07],
    scleraColor: [0.78, 0.82, 0.86],
    lipColor: [0.5, 0.36, 0.34],
  },
  palette: PALETTE,
}
