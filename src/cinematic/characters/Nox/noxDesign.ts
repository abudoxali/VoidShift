import type { HandShape } from '../../animation/pose'
import type { JointName, Proportions } from '../../animation/skeleton'
import { ZONE, type ArmorPiece, type CharacterDesign, type ZoneFinish } from '../sculpt/design'
import type { Frames } from '../sculpt/frames'
import { lock, type HairClump, type HairSpec } from '../sculpt/hair'
import { Op, Sculpt, rotation, type V3 } from '../sculpt/sdf'

/**
 * NOX — the dimensional fighter. Taller and heavier than AERON, broad-shouldered, planted. Black
 * lacquered layered armour, a heavy mantle, a massive asymmetric left pauldron grown through with
 * violet crystal, gauntlets and greaves. A mature, hard face with a fractured crystal half-mask
 * over his right side (the jaw, mouth and left eye stay readable); long dark hair falling back
 * from a broken crystal crown.
 */
export const NOX_PROPORTIONS: Proportions = {
  hipHeight: 1.0,
  spine: 0.13,
  chest: 0.26,
  neck: 0.1,
  head: 0.25,
  shoulderWidth: 0.5,
  upperArm: 0.31,
  foreArm: 0.28,
  hand: 0.2,
  hipWidth: 0.23,
  thigh: 0.46,
  shin: 0.46,
}

type Side = 'L' | 'R'
const SIDES: readonly Side[] = ['L', 'R']
const sgn = (s: Side) => (s === 'L' ? 1 : -1)
const J = (name: string, s: Side) => `${name}${s}` as JointName
const mirror = (p: V3, s: Side): V3 => [p[0] * sgn(s), p[1], p[2]]

function body(f: Frames): Sculpt {
  const b = new Sculpt()
  const B = f.bone
  b.k = 0.03
  b.on(B.hips, ZONE.SUIT)
  b.ellipsoid([0, 0.985, -0.006], [0.158, 0.11, 0.105], { k: 0.035 })
  for (const s of SIDES) b.ellipsoid(mirror([0.07, 0.93, -0.05], s), [0.078, 0.082, 0.07])
  b.ellipsoid([0, 0.9, 0.004], [0.07, 0.055, 0.068])
  b.on(B.spine, ZONE.SUIT)
  b.ellipsoid([0, 1.2, 0.006], [0.135, 0.15, 0.098], { k: 0.04 })
  b.on(B.chest, ZONE.SUIT)
  b.ellipsoid([0, 1.38, -0.006], [0.158, 0.17, 0.115], { k: 0.04 })
  b.ellipsoid([0, 1.45, -0.01], [0.185, 0.085, 0.105], { k: 0.035 })
  for (const s of SIDES) {
    b.ellipsoid(mirror([0.072, 1.405, 0.064], s), [0.085, 0.064, 0.052], { rot: rotation(0, 0, -0.18 * sgn(s)) })
    b.ellipsoid(mirror([0.12, 1.33, -0.028], s), [0.066, 0.12, 0.08])
    b.cone(mirror([0.04, 1.54, -0.03], s), mirror([0.17, 1.49, -0.018], s), 0.052, 0.042)
  }
  b.on(B.neck, ZONE.SKIN)
  b.cone([0, 1.48, -0.014], [0, 1.52, -0.01], 0.062, 0.054, { k: 0.02 })
  for (const s of SIDES) {
    const ua = J('upperArm', s), fa = J('foreArm', s)
    b.on(B[ua], ZONE.SUIT)
    b.ellipsoid(f.at(ua, [0.006 * sgn(s), -0.03, 0]), [0.062, 0.08, 0.068], { rot: f.rot(ua), k: 0.035 })
    b.flatCone(f.at(ua, [0, 0, 0]), f.at(ua, [0, -0.295, 0]), 0.056, 0.046, 0.92, { k: 0.025 })
    b.ellipsoid(f.at(ua, [0, -0.13, 0.02]), [0.047, 0.095, 0.049], { rot: f.rot(ua) })
    b.ellipsoid(f.at(ua, [0, -0.11, -0.022]), [0.049, 0.1, 0.046], { rot: f.rot(ua) })
    b.on(B[fa], ZONE.SUIT)
    b.sphere(f.at(fa, [0, 0, -0.006]), 0.043, { k: 0.02 })
    b.cone(f.at(fa, [0, 0, 0]), f.at(fa, [0, -0.27, 0]), 0.05, 0.034, { k: 0.02 })
    b.ellipsoid(f.at(fa, [0, -0.075, 0.004]), [0.053, 0.085, 0.048], { rot: f.rot(fa) })
  }
  for (const s of SIDES) {
    const th = J('thigh', s), sh = J('shin', s), ft = J('foot', s)
    b.on(B[th], ZONE.SUIT)
    b.cone(f.at(th, [0, 0.02, 0]), f.at(th, [0, -0.43, 0]), 0.1, 0.064, { k: 0.03 })
    b.ellipsoid(f.at(th, [0, -0.17, 0.025]), [0.085, 0.18, 0.078], { rot: f.rot(th) })
    b.on(B[sh], ZONE.SUIT)
    b.sphere(f.at(sh, [0, 0, 0.008]), 0.058, { k: 0.025 })
    b.cone(f.at(sh, [0, 0, 0]), f.at(sh, [0, -0.42, 0]), 0.06, 0.043, { k: 0.02 })
    b.ellipsoid(f.at(sh, [0, -0.11, -0.03]), [0.06, 0.12, 0.058], { rot: f.rot(sh) })
    b.on(B[sh], ZONE.BOOT)
    b.cone(f.at(sh, [0, -0.2, 0.002]), f.at(sh, [0, -0.435, 0.004]), 0.06, 0.055, { k: 0.012 })
    b.on(B[ft], ZONE.BOOT)
    b.box(f.at(ft, [0, -0.012, 0.055]), [0.052, 0.034, 0.112], { rot: f.rot(ft), round: 0.03, k: 0.02 })
    b.ellipsoid(f.at(ft, [0, -0.02, 0.145]), [0.05, 0.027, 0.055], { rot: f.rot(ft) })
    b.sphere(f.at(ft, [0, -0.008, -0.032]), 0.046)
  }
  return b
}

function head(f: Frames): Sculpt {
  const h = new Sculpt()
  const B = f.bone
  h.k = 0.018
  h.on(B.head, ZONE.SKIN)
  // A heavier, mature skull: broad brow, square jaw.
  h.ellipsoid([0, 0.088, -0.016], [0.08, 0.093, 0.1], { k: 0.02 })
  h.ellipsoid([0, 0.086, 0.022], [0.073, 0.07, 0.072], { k: 0.025 })
  h.ellipsoid([0, 0.034, 0.028], [0.069, 0.062, 0.066], { k: 0.025 })
  h.ellipsoid([0, 0.0, 0.032], [0.06, 0.05, 0.056], { k: 0.022 })
  for (const s of [1, -1]) {
    h.cone([0.062 * s, 0.022, -0.008], [0.026 * s, -0.05, 0.068], 0.025, 0.017, { k: 0.02 })
    h.ellipsoid([0.055 * s, 0.044, 0.056], [0.024, 0.015, 0.021], { k: 0.018 })
    h.ellipsoid([0.08 * s, 0.045, -0.01], [0.01, 0.028, 0.018], { k: 0.008, rot: rotation(0, 0.25 * s, 0) })
  }
  h.box([0, -0.052, 0.07], [0.024, 0.014, 0.016], { round: 0.012, k: 0.02 })
  h.ellipsoid([0, 0.076, 0.078], [0.066, 0.016, 0.022], { k: 0.02 })
  h.cone([0, 0.066, 0.088], [0, 0.018, 0.112], 0.0075, 0.0095, { k: 0.012 })
  h.sphere([0, 0.016, 0.106], 0.011, { k: 0.008 })
  for (const s of [1, -1]) h.ellipsoid([0.011 * s, 0.014, 0.098], [0.009, 0.0065, 0.0075], { k: 0.006 })
  h.ellipsoid([0, -0.016, 0.072], [0.033, 0.021, 0.024], { k: 0.02 })
  for (const s of [1, -1]) h.ellipsoid([0.033 * s, 0.054, 0.1], [0.021, 0.011, 0.01], { op: Op.Subtract, k: 0.014 })
  // Fractured crystal half-mask over his right side (-x): forehead, eye and cheek shards.
  h.on(B.head, ZONE.CRYSTAL)
  const shards: [V3, V3, V3][] = [
    // centre, half extents, rotation
    [[-0.04, 0.085, 0.085], [0.03, 0.022, 0.014], [0.2, -0.35, 0.35]],
    [[-0.052, 0.055, 0.088], [0.024, 0.016, 0.012], [0.1, -0.5, -0.25]],
    [[-0.058, 0.025, 0.074], [0.016, 0.026, 0.012], [0.0, -0.7, 0.15]],
    [[-0.022, 0.115, 0.07], [0.018, 0.028, 0.012], [0.5, -0.2, 0.6]],
    [[-0.07, 0.07, 0.05], [0.012, 0.03, 0.016], [0.2, -1.0, 0.1]],
  ]
  for (const [c, half, r] of shards) h.box(c, half, { rot: rotation(r[0], r[1], r[2]), round: 0.0015, k: 0.003 })
  // Crown shards rising from the hairline.
  const crown: [V3, number, number][] = [
    [[-0.03, 0.17, 0.02], 0.35, 0.05],
    [[0.0, 0.18, -0.01], 0.0, 0.065],
    [[0.035, 0.168, 0.0], -0.3, 0.045],
    [[-0.06, 0.15, -0.02], 0.7, 0.04],
  ]
  for (const [c, tilt, len] of crown) h.cone(c, [c[0] - Math.sin(tilt) * len, c[1] + Math.cos(tilt) * len, c[2] - 0.01], 0.0065, 0.0008, { k: 0.002 })
  h.on(B.neck, ZONE.SKIN)
  h.cone([0, -0.02, -0.024], [0, -0.08, -0.016], 0.06, 0.06, { k: 0.03 })
  return h
}

function hand(f: Frames, side: Side, shape: HandShape): Sculpt {
  const hd = J('hand', side)
  const s = sgn(side)
  const g = new Sculpt()
  g.k = 0.009
  g.on(f.bone[hd], ZONE.GLOVE)
  const at = (p: V3) => f.at(hd, p)
  const S = 1.1
  g.box(at([0, -0.05 * S, 0.002]), [0.0145, 0.046 * S, 0.045], { rot: f.rot(hd), round: 0.012, k: 0.01 })
  const fingers: [number, number][] = [
    [0.03, 0.08],
    [0.01, 0.088],
    [-0.01, 0.083],
    [-0.029, 0.067],
  ]
  for (const [z, len] of fingers) {
    const k0: V3 = [0, -0.095, z]
    if (shape === 'fist') {
      g.cone(at(k0), at([-0.025 * s, -0.115, z]), 0.011, 0.0102)
      g.cone(at([-0.025 * s, -0.115, z]), at([-0.038 * s, -0.088, z * 0.95]), 0.0102, 0.009)
    } else if (shape === 'blade') {
      g.cone(at(k0), at([0, -0.095 - len, z * 0.75]), 0.0102, 0.0078)
    } else {
      g.cone(at(k0), at([-0.007 * s, -0.095 - len * 0.45, z * 1.05]), 0.0105, 0.0094)
      g.cone(at([-0.007 * s, -0.095 - len * 0.45, z * 1.05]), at([-0.02 * s, -0.095 - len * 0.9, z * 1.08]), 0.0094, 0.0075)
    }
  }
  if (shape === 'fist') {
    g.cone(at([-0.004 * s, -0.034, 0.04]), at([-0.027 * s, -0.07, 0.046]), 0.012, 0.0105)
    g.cone(at([-0.027 * s, -0.07, 0.046]), at([-0.042 * s, -0.097, 0.026]), 0.0105, 0.009)
  } else {
    g.cone(at([-0.004 * s, -0.034, 0.04]), at([-0.018 * s, -0.072, 0.064]), 0.012, 0.0102)
    g.cone(at([-0.018 * s, -0.072, 0.064]), at([-0.026 * s, -0.1, 0.07]), 0.0102, 0.0085)
  }
  // Clawed gauntlet plate over the back of the hand.
  g.on(f.bone[hd], ZONE.ARMOR_A)
  g.box(at([0.016 * s, -0.06, 0.0]), [0.008, 0.035, 0.044], { rot: f.rot(hd), round: 0.006, k: 0.004 })
  return g
}

function armor(f: Frames): ArmorPiece[] {
  const B = f.bone
  const pieces: ArmorPiece[] = []
  const region = (bone: number) => new Sculpt().on(bone)

  // Layered cuirass: a breastplate and an abdominal fauld.
  const cuirass = region(B.chest)
  cuirass.box([0, 1.39, 0.03], [0.2, 0.13, 0.15], { round: 0.02, k: 0 })
  pieces.push({ name: 'cuirass', zone: ZONE.ARMOR_A, offset: 0.012, thickness: 0.012, region: cuirass, rigid: 'chest', bevel: 0.005, hides: true, hideInset: 0.01 })
  const fauld = region(B.spine)
  fauld.box([0, 1.17, 0.02], [0.17, 0.075, 0.14], { round: 0.02, k: 0 })
  pieces.push({ name: 'fauld', zone: ZONE.ARMOR_B, offset: 0.008, thickness: 0.01, region: fauld, bevel: 0.004 })
  // Heavy mantle over both shoulders and the upper back.
  const mantle = region(B.chest)
  mantle.ellipsoid([0, 1.5, -0.04], [0.33, 0.1, 0.17], { k: 0 })
  mantle.box([0, 1.56, 0.09], [0.07, 0.08, 0.06], { op: Op.Subtract, round: 0.02, k: 0.01 })
  pieces.push({ name: 'mantle', zone: ZONE.COAT, offset: 0.024, thickness: 0.016, region: mantle, bevel: 0.006, detail: 0.8 })
  // Standing collar.
  const collar = region(B.neck)
  collar.cone([0, 1.48, -0.01], [0, 1.58, -0.03], 0.1, 0.092, { k: 0 })
  collar.cone([0, 1.47, -0.01], [0, 1.6, -0.03], 0.088, 0.08, { op: Op.Subtract, k: 0.004 })
  collar.box([0, 1.56, 0.1], [0.045, 0.07, 0.06], { op: Op.Subtract, round: 0.012, k: 0.01 })
  collar.box([0, 1.64, 0], [0.25, 0.03, 0.25], { op: Op.Subtract, k: 0 })
  pieces.push({ name: 'collar', zone: ZONE.ARMOR_A, offset: -1, thickness: 0, region: collar, bevel: 0.002, detail: 0.7 })
  for (const s of SIDES) {
    const ua = J('upperArm', s), fa = J('foreArm', s), th = J('thigh', s), sh = J('shin', s), ft = J('foot', s)
    const big = s === 'L'
    // Pauldrons: the left one massive and layered.
    for (let i = 0; i < (big ? 3 : 2); i++) {
      const cap = region(B[ua])
      const r = (big ? 0.12 : 0.095) - i * 0.018
      cap.ellipsoid(f.at(ua, [0.035 * sgn(s), 0.02 - i * 0.045, 0]), [r, r * 0.75, r], { rot: f.rot(ua), k: 0 })
      pieces.push({ name: `pauldron${s}${i}`, zone: i % 2 ? ARMOR_B : ZONE.ARMOR_A, offset: 0.018 + (2 - i) * 0.012, thickness: 0.012, region: cap, rigid: ua, bevel: 0.005 })
    }
    const gaunt = region(B[fa])
    gaunt.cone(f.at(fa, [0, -0.06, 0]), f.at(fa, [0, -0.27, 0]), 0.075, 0.07, { k: 0 })
    pieces.push({ name: `gauntlet${s}`, zone: ZONE.ARMOR_A, offset: 0.007, thickness: 0.012, region: gaunt, rigid: fa, bevel: 0.004, hides: true, hideInset: 0.02 })
    const tasset = region(B[th])
    tasset.box(f.at(th, [0.03 * sgn(s), -0.1, 0.02]), [0.08, 0.1, 0.1], { rot: f.rot(th, [0, 0, 0.1 * sgn(s)]), round: 0.015, k: 0 })
    pieces.push({ name: `tasset${s}`, zone: ZONE.ARMOR_B, offset: 0.01, thickness: 0.01, region: tasset, rigid: th, bevel: 0.004 })
    const greave = region(B[sh])
    greave.box(f.at(sh, [0, -0.2, 0.04]), [0.07, 0.2, 0.06], { rot: f.rot(sh), round: 0.015, k: 0 })
    pieces.push({ name: `greave${s}`, zone: ZONE.ARMOR_A, offset: 0.008, thickness: 0.011, region: greave, rigid: sh, bevel: 0.004 })
    const knee = region(B[sh])
    knee.ellipsoid(f.at(sh, [0, 0.0, 0.07]), [0.068, 0.08, 0.055], { rot: f.rot(sh), k: 0 })
    pieces.push({ name: `knee${s}`, zone: ZONE.ARMOR_B, offset: 0.012, thickness: 0.012, region: knee, rigid: sh, bevel: 0.004 })
    const sabaton = region(B[ft])
    sabaton.box(f.at(ft, [0, 0.0, 0.1]), [0.07, 0.06, 0.1], { rot: f.rot(ft), round: 0.012, k: 0 })
    pieces.push({ name: `sabaton${s}`, zone: ZONE.ARMOR_A, offset: 0.005, thickness: 0.009, region: sabaton, rigid: ft, bevel: 0.003 })
  }
  // Crystal growths through the left pauldron (solid shards).
  const crystals = region(B.upperArmL)
  const base = f.at('upperArmL', [0.06, 0.06, 0])
  const dirs: V3[] = [
    [0.4, 1, 0.1],
    [0.8, 0.7, -0.3],
    [0.2, 0.9, -0.5],
    [0.7, 0.5, 0.4],
    [0.1, 1, 0.4],
  ]
  dirs.forEach((d, i) => {
    const l = 0.07 + (i % 3) * 0.025
    const n = Math.hypot(d[0], d[1], d[2])
    const p0: V3 = [base[0] + i * 0.008 - 0.01, base[1] - 0.01, base[2] + (i - 2) * 0.02]
    crystals.cone(p0, [p0[0] + (d[0] / n) * l, p0[1] + (d[1] / n) * l, p0[2] + (d[2] / n) * l], 0.016, 0.002, { k: 0.002, zone: ZONE.CRYSTAL })
  })
  pieces.push({ name: 'crystals', zone: ZONE.CRYSTAL, offset: -1, thickness: 0, region: crystals, rigid: 'upperArmL', bevel: 0.002 })
  // Belt with a dimensional core.
  const belt = region(B.hips)
  belt.box([0, 1.045, 0], [0.24, 0.024, 0.24], { round: 0.004, k: 0 })
  pieces.push({ name: 'belt', zone: ZONE.TRIM, offset: 0.006, thickness: 0.01, region: belt, bevel: 0.003 })
  return pieces
}
const ARMOR_B = ZONE.ARMOR_B

/** Long dark hair swept back from the crown, falling to the shoulders; heavy side locks. */
function hair(): HairSpec {
  const clumps: HairClump[] = []
  const C: V3 = [0, 0.07, -0.01]
  for (let i = 0; i < 26; i++) {
    const az = Math.PI * (0.25 + (i / 25) * 1.5) // from the left temple round the back to the right
    const el = 0.35 + 0.4 * Math.abs(Math.sin(i * 1.7))
    const r: V3 = [Math.sin(az) * Math.cos(el) * 0.08, 0.09 + Math.sin(el) * 0.085, -0.016 + Math.cos(az) * Math.cos(el) * 0.092]
    const out: V3 = [Math.sin(az), 0, Math.cos(az)]
    const len = 0.2 + 0.08 * Math.abs(Math.sin(i * 2.3))
    clumps.push(
      lock(
        r,
        [
          [out[0] * 0.03, 0.01, out[2] * 0.03 - 0.025],
          [out[0] * 0.03, -len * 0.35, out[2] * 0.02 - 0.03],
          [out[0] * 0.02, -len * 0.45, -0.02],
        ],
        0.03,
        0.011,
        { center: C, belly: 0.3, twist: 0.4 * Math.sign(Math.sin(az)) },
      ),
    )
  }
  // Top: swept straight back.
  for (let i = -3; i <= 3; i++) {
    const x = i * 0.021
    clumps.push(lock([x, 0.165 - Math.abs(i) * 0.005, 0.05], [[x * 0.2, 0.018, -0.03], [x * 0.3, 0.0, -0.08], [x * 0.3, -0.06, -0.06]], 0.026, 0.01, { center: C, belly: 0.3 }))
  }
  // Two locks falling over the left (unmasked) side of the face.
  clumps.push(lock([0.035, 0.15, 0.07], [[0.012, 0.0, 0.03], [0.018, -0.05, 0.012], [0.01, -0.06, -0.004]], 0.016, 0.0065, { center: [0, 0.07, -0.02], belly: 0.35 }))
  clumps.push(lock([0.055, 0.14, 0.055], [[0.016, -0.004, 0.022], [0.016, -0.06, 0.006], [0.008, -0.06, -0.006]], 0.015, 0.0065, { center: [0, 0.07, -0.02], belly: 0.35 }))
  const cap = new Sculpt()
  cap.ellipsoid([0, 0.13, -0.035], [0.105, 0.09, 0.13], { k: 0 })
  cap.ellipsoid([0, 0.07, -0.085], [0.105, 0.1, 0.08], { k: 0.02 })
  return { clumps, capRegion: cap, capOffset: 0.007, center: C }
}

const PALETTE: ZoneFinish[] = []
PALETTE[ZONE.SUIT] = { color: [0.022, 0.018, 0.028], roughness: 0.72, metalness: 0.05, toon: 0.3, weave: 1 }
PALETTE[ZONE.SKIN] = { color: [0.27, 0.2, 0.22], roughness: 0.48, metalness: 0, toon: 0.75 }
PALETTE[ZONE.GLOVE] = { color: [0.028, 0.022, 0.034], roughness: 0.5, metalness: 0.2, toon: 0.3 }
PALETTE[ZONE.BOOT] = { color: [0.03, 0.026, 0.036], roughness: 0.4, metalness: 0.25, toon: 0.25 }
PALETTE[ZONE.ARMOR_A] = { color: [0.05, 0.045, 0.06], roughness: 0.24, metalness: 0.65, toon: 0.2 }
PALETTE[ZONE.ARMOR_B] = { color: [0.11, 0.07, 0.15], roughness: 0.3, metalness: 0.5, toon: 0.2 }
PALETTE[ZONE.TRIM] = { color: [0.32, 0.27, 0.38], roughness: 0.25, metalness: 0.9, toon: 0.1 }
PALETTE[ZONE.GLOW] = { color: [0.3, 0.1, 0.5], roughness: 0.4, metalness: 0, glow: 1.6 }
PALETTE[ZONE.HAIR] = { color: [0.06, 0.05, 0.075], roughness: 0.4, metalness: 0.05, toon: 0.5 }
PALETTE[ZONE.COAT] = { color: [0.03, 0.024, 0.036], roughness: 0.85, metalness: 0.0, toon: 0.35, weave: 0.6 }
PALETTE[ZONE.CRYSTAL] = { color: [0.12, 0.035, 0.24], roughness: 0.08, metalness: 0.4, glow: 0.2, toon: 0.1 }
PALETTE[ZONE.LINER] = { color: [0.012, 0.01, 0.016], roughness: 0.6, metalness: 0.1, toon: 0.2 }

export const NOX_DESIGN: CharacterDesign = {
  id: 'nox',
  proportions: NOX_PROPORTIONS,
  energy: [0.75, 0.3, 1.6],
  rim: [0.55, 0.35, 0.8],
  body,
  head,
  headBounds: [
    [-0.11, -0.09, -0.14],
    [0.11, 0.26, 0.135],
  ],
  hand,
  armor,
  hair,
  face: {
    eye: [0.033, 0.053, 0.097],
    eyeWidth: 0.026,
    eyeHeight: 0.0105,
    eyeTilt: -0.12,
    irisRadius: 0.0058,
    brow: { y: 0.071, thickness: 0.0034, length: 0.03, angle: 0.12 },
    mouth: { y: -0.022, width: 0.022 },
    irisColor: [0.9, 0.3, 1.6],
    irisGlow: 2.2,
    lashColor: [0.02, 0.015, 0.025],
    scleraColor: [0.35, 0.3, 0.38],
    lipColor: [0.24, 0.15, 0.18],
  },
  palette: PALETTE,
}
