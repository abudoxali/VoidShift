import { Color, DoubleSide, Group, Mesh, MeshStandardMaterial, Vector3, type BufferGeometry, type Material, type Object3D } from 'three'
import type { CharacterRig } from '../../animation/CharacterRig'
import type { JointName, Proportions } from '../../animation/skeleton'
import { createRng } from '../../../utils/random'
import { limbSegment, loft, merge, plate, xform, type Ring } from '../anatomy'
import { eyeGeometry, handGeometries, headGeometry, mouthGeometry, shell, socketGeometry, type EyeShape } from '../features'
import { withDissolve, type FighterUniforms } from '../fighterMaterials'
import type { FighterBody } from '../Aeron/buildAeronBody'

/**
 * NOX — spatial distortion / counter fighter. Larger and heavier than AERON: broad shoulders, a
 * planted stance. A deep hood and mantle; a fractured pale half-mask over the left face and brow
 * (the jaw and the right eye stay visible); narrow violet-crimson eyes; an armoured torso under
 * the cloak; broken dimensional plates around the shoulders that drift apart when he phases.
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

export const NOX_COLORS = {
  skin: 0x56505c,
  suit: 0x221c2a,
  armor: 0x463c52,
  cloak: 0x1c1624,
  mask: 0x8c8794,
  violet: [0.75, 0.3, 1.6] as const,
  crimson: [1.6, 0.12, 0.3] as const,
  eye: [2.8, 0.7, 3.2] as const,
  dissolve: [0.9, 0.25, 1.8] as const,
}

export const NOX_EYE: EyeShape = { x: 0.155, y: 0.525, z: 0.428, width: 0.11, height: 0.024, tilt: -0.06 }

export interface PhasePart {
  object: Object3D
  base: Vector3
  /** Direction this part jumps to while phased (joint-local). */
  dir: Vector3
  seed: number
}

export interface NoxBody extends FighterBody {
  phaseParts: PhasePart[]
  /** Fragments orbiting the shoulders. */
  shards: Group
}

export function buildNoxBody(rig: CharacterRig, u: FighterUniforms, p: Proportions = NOX_PROPORTIONS): NoxBody {
  const std = (key: string, color: number, params: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {}) =>
    withDissolve(new MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.15, ...params }), u, `nox-${key}`)
  const materials = {
    skin: std('skin', NOX_COLORS.skin, { roughness: 0.66, metalness: 0 }),
    suit: std('suit', NOX_COLORS.suit, { roughness: 0.75 }),
    armor: std('armor', NOX_COLORS.armor, { roughness: 0.34, metalness: 0.6, flatShading: true }),
    cloak: std('cloak', NOX_COLORS.cloak, { roughness: 0.85, side: DoubleSide }),
    mask: std('mask', NOX_COLORS.mask, { roughness: 0.4, metalness: 0.2, side: DoubleSide, flatShading: true }),
    violet: std('violet', 0x000000, { emissive: new Color(...NOX_COLORS.violet), roughness: 1, metalness: 0 }),
    crimson: std('crimson', 0x000000, { emissive: new Color(...NOX_COLORS.crimson), roughness: 1, metalness: 0 }),
    eye: std('eye', 0x000000, { emissive: new Color(...NOX_COLORS.eye), roughness: 1, metalness: 0 }),
  }
  const add = (joint: JointName | Object3D, g: BufferGeometry, m: Material) => {
    const mesh = new Mesh(g, m)
    mesh.frustumCulled = false
    if (typeof joint === 'string') rig.attach(joint, mesh)
    else joint.add(mesh)
    return mesh
  }
  const phaseParts: PhasePart[] = []
  const rng = createRng(77)
  const phased = (o: Object3D, dir: [number, number, number]) => phaseParts.push({ object: o, base: o.position.clone(), dir: new Vector3(...dir).normalize(), seed: rng() })

  // ── Torso ──────────────────────────────────────────────────────────────────
  add(
    'hips',
    loft(
      [
        { y: -0.14, rx: 0.08, rz: 0.07 },
        { y: -0.08, rx: 0.17, rz: 0.11, n: 2.4 },
        { y: 0.0, rx: 0.18, rz: 0.115, n: 2.6 },
        { y: 0.08, rx: 0.165, rz: 0.108, n: 2.6 },
        { y: 0.14, rx: 0.155, rz: 0.104 },
      ],
      { segments: 22, capBottom: 0.02 },
    ),
    materials.suit,
  )
  add('hips', loft([{ y: -0.03, rx: 0.188, rz: 0.122, n: 3.2 }, { y: 0.04, rx: 0.182, rz: 0.118, n: 3.2 }], { segments: 24 }), materials.armor)
  add(
    'spine',
    loft(
      [
        { y: -0.02, rx: 0.158, rz: 0.104, n: 2.6 },
        { y: 0.1, rx: 0.155, rz: 0.104, n: 2.7 },
        { y: 0.2, rx: 0.172, rz: 0.112, n: 2.7 },
        { y: 0.27, rx: 0.19, rz: 0.12, n: 2.7 },
      ],
      { segments: 22 },
    ),
    materials.suit,
  )
  add(
    'chest',
    loft(
      [
        { y: -0.1, rx: 0.19, rz: 0.12, n: 2.8 },
        { y: -0.02, rx: 0.21, rz: 0.13, n: 3.0, front: 0.012 },
        { y: 0.06, rx: 0.225, rz: 0.133, n: 3.2, front: 0.018 },
        { y: 0.12, rx: 0.215, rz: 0.125, n: 3.0 },
        { y: 0.16, rx: 0.15, rz: 0.1, n: 2.6 },
        { y: 0.19, rx: 0.07, rz: 0.065 },
      ],
      { segments: 24 },
    ),
    materials.suit,
  )
  // Armoured breastplate: broken into three plates with a crimson fault between them.
  add('chest', xform(plate(0.24, 0.2, 0.03, { taper: 0.9, tipTaper: 0.7, n: 3.4 }), { rx: -Math.PI / 2 + 0.1, ry: 0, x: 0.05, y: -0.04, z: 0.13, rz: 0.08 }), materials.armor)
  add('chest', xform(plate(0.2, 0.14, 0.03, { taper: 0.9, tipTaper: 0.5, n: 3.4 }), { rx: -Math.PI / 2 + 0.12, x: -0.11, y: -0.02, z: 0.125, rz: -0.12 }), materials.armor)
  add('chest', xform(plate(0.22, 0.01, 0.008, { taper: 1, tipTaper: 0.3 }), { rz: 0.25, x: -0.035, y: -0.1, z: 0.152 }), materials.crimson)
  add('chest', xform(loft([{ y: -0.012, rx: 0.02, rz: 0.006 }, { y: 0.012, rx: 0.026, rz: 0.008 }], { segments: 10, capBottom: 0.004, capTop: 0.004 }), { rx: Math.PI / 2, x: 0.07, y: 0.07, z: 0.16 }), materials.violet)

  // Neck.
  add('neck', loft([{ y: -0.04, rx: 0.07, rz: 0.066 }, { y: 0.06, rx: 0.058, rz: 0.058 }, { y: 0.12, rx: 0.054, rz: 0.055 }], { segments: 16 }), materials.skin)

  // ── Head: face, mask, hood ─────────────────────────────────────────────────
  const H = p.head
  add('head', headGeometry({ height: H, width: 1.0, jaw: 1.12, chin: 0.98, brow: 1.4 }), materials.skin)
  // Right eye: open face. Left eye: a slit glowing through the mask.
  add('head', socketGeometry(H, NOX_EYE, -1), materials.suit)
  add('head', eyeGeometry(H, NOX_EYE, -1), materials.eye)
  add('head', eyeGeometry(H, { ...NOX_EYE, z: 0.462, height: 0.02 }, 1), materials.eye)
  add('head', mouthGeometry(H, 0.19, 0.14, 0.388), materials.suit)
  // Fractured half-mask: forehead + the left side of the face, cracked through.
  const maskRings: Ring[] = [0.36, 0.46, 0.56, 0.66, 0.76, 0.86].map((y, i) => ({
    y: y * H,
    rx: [0.39, 0.4, 0.405, 0.4, 0.39, 0.34][i] * H,
    rz: [0.395, 0.42, 0.44, 0.45, 0.45, 0.42][i] * H,
    z: [0.05, 0.035, 0.02, 0.0, -0.02, -0.04][i] * H,
    n: 3.2,
  }))
  // Covers his left half: from the side of the head across to the bridge of the nose, cheek to
  // brow; the right half of the face (eye, cheek) and the whole jaw stay exposed.
  const maskLeft = shell(maskRings, 0.1, Math.PI / 2 - 0.02, 16)
  add('head', maskLeft, materials.mask)
  add('head', xform(plate(0.26 * H, 0.01 * H, 0.008 * H, { taper: 1, tipTaper: 0.2 }), { rz: 0.5, x: 0.09 * H, y: 0.5 * H, z: 0.452 * H }), materials.crimson)
  // Hood: deep, open at the front, peaked.
  const hoodRings: Ring[] = [0.05, 0.25, 0.45, 0.65, 0.85, 1.02, 1.12].map((y, i) => ({
    y: y * H,
    rx: [0.52, 0.5, 0.48, 0.47, 0.44, 0.33, 0.12][i] * H,
    rz: [0.5, 0.52, 0.53, 0.54, 0.52, 0.42, 0.18][i] * H,
    z: [-0.06, -0.05, -0.03, -0.01, 0.0, 0.0, 0.02][i] * H,
    n: 2.6,
  }))
  add('head', shell(hoodRings, Math.PI / 2 + 0.95, Math.PI / 2 + Math.PI * 2 - 0.95, 30), materials.cloak)
  add('head', xform(plate(0.16 * H, 0.2 * H, 0.03 * H, { taper: 1, tipTaper: 0.05 }), { rx: -0.35, y: 1.0 * H, z: 0.2 * H }), materials.cloak)

  // Mantle: heavy cloth over the shoulders and upper back.
  const mantleRings: Ring[] = [-0.06, 0.04, 0.12, 0.18].map((y, i) => ({
    y,
    rx: [0.33, 0.3, 0.25, 0.14][i],
    rz: [0.2, 0.18, 0.16, 0.1][i],
    z: [-0.03, -0.025, -0.02, -0.01][i],
    n: 2.6,
  }))
  add('chest', shell(mantleRings, Math.PI / 2 + 0.75, Math.PI / 2 + Math.PI * 2 - 0.75, 30), materials.cloak)

  // ── Arms ───────────────────────────────────────────────────────────────────
  const hands = {} as FighterBody['hands']
  for (const side of ['L', 'R'] as const) {
    const s = side === 'L' ? 1 : -1
    add(`upperArm${side}`, loft([{ y: -0.12, rx: 0.065, rz: 0.065 }, { y: -0.04, rx: 0.084, rz: 0.08 }, { y: 0.03, rx: 0.078, rz: 0.074 }, { y: 0.065, rx: 0.045, rz: 0.045 }], { segments: 16, capTop: 0.01 }), materials.suit)
    add(`upperArm${side}`, limbSegment(p.upperArm, 0.066, 0.068, 0.05, { belly: 0.35 }), materials.suit)
    add(`foreArm${side}`, limbSegment(p.foreArm, 0.055, 0.058, 0.04, { belly: 0.25 }), materials.suit)
    // Heavy gauntlet.
    add(`foreArm${side}`, loft([{ y: -p.foreArm - 0.02, rx: 0.05, rz: 0.05, n: 3.2 }, { y: -p.foreArm * 0.55, rx: 0.068, rz: 0.064, n: 3.4 }, { y: -p.foreArm * 0.2, rx: 0.066, rz: 0.062, n: 3.4 }], { segments: 18, capBottom: 0.004, capTop: 0.004 }), materials.armor)
    add(`foreArm${side}`, xform(plate(p.foreArm * 0.5, 0.009, 0.006, { taper: 1, tipTaper: 0.4 }), { rx: Math.PI, x: s * 0.067, y: -p.foreArm * 0.28 }), materials.violet)
    const g = handGeometries(p.hand, s, 1.22)
    const open = add(`hand${side}`, g.open, materials.armor)
    const fist = add(`hand${side}`, g.fist, materials.armor)
    fist.userData.batchHidden = true
    hands[side] = { open, fist }
  }
  // Fractured shoulder plates: a big jagged cluster on the right, two shards on the left.
  const fragments: Array<[string, number, number, number, number, number, number, number]> = [
    // side, length, width, x, y, rz, rx, ry
    ['R', 0.2, 0.17, -0.05, 0.07, 0.35, 0.0, 0.0],
    ['R', 0.16, 0.13, -0.08, 0.0, 0.6, 0.2, 0.3],
    ['R', 0.12, 0.1, -0.06, 0.12, 0.05, -0.3, -0.2],
    ['R', 0.1, 0.07, -0.1, -0.06, 0.95, 0.1, 0.5],
    ['L', 0.13, 0.11, 0.05, 0.05, -0.4, 0.1, 0.0],
    ['L', 0.09, 0.07, 0.07, -0.03, -0.75, -0.2, 0.3],
  ]
  for (const [side, len, wid, x, y, rz, rx, ry] of fragments) {
    const s = side === 'L' ? 1 : -1
    const frag = new Group()
    frag.position.set(x, y, 0)
    rig.attach(`upperArm${side as 'L' | 'R'}`, frag)
    add(frag, xform(plate(len, wid, 0.022, { taper: 0.7, tipTaper: 0.1, n: 3.6 }), { rz: rz, rx, ry }), materials.armor)
    phased(frag, [-s * 0.4 + x * 3, 0.6 + y * 3, rx])
  }
  add('upperArmR', xform(plate(0.16, 0.009, 0.006, { taper: 1, tipTaper: 0.2 }), { rz: 0.42, x: -0.075, y: 0.07, z: 0.045 }), materials.crimson)

  // Phase fragments elsewhere: the mask and breastplate pieces jump too (contradictory positions).
  const headFrag = new Group()
  rig.attach('head', headFrag)
  add(headFrag, xform(plate(0.12 * H, 0.16 * H, 0.04 * H, { taper: 0.8, tipTaper: 0.2, n: 3.4 }), { rx: -0.4, ry: -0.5, x: -0.36 * H, y: 0.82 * H, z: 0.1 * H }), materials.mask)
  phased(headFrag, [-1, 0.4, 0.3])

  // ── Legs ───────────────────────────────────────────────────────────────────
  for (const side of ['L', 'R'] as const) {
    const s = side === 'L' ? 1 : -1
    add(`thigh${side}`, limbSegment(p.thigh, 0.1, 0.098, 0.066, { belly: 0.3, frontBias: 0.012 }), materials.suit)
    add(`shin${side}`, limbSegment(p.shin, 0.068, 0.07, 0.046, { belly: 0.28 }), materials.suit)
    add(`shin${side}`, xform(plate(0.14, 0.095, 0.035, { taper: 0.85, tipTaper: 0.4, n: 3.6 }), { rx: Math.PI - 0.08, y: 0.05, z: 0.06 }), materials.armor)
    add(`shin${side}`, loft([{ y: -p.shin - 0.01, rx: 0.06, rz: 0.066, n: 3 }, { y: -p.shin * 0.62, rx: 0.068, rz: 0.072, n: 3 }, { y: -p.shin * 0.4, rx: 0.074, rz: 0.076, n: 3 }], { segments: 18, capTop: 0.004 }), materials.armor)
    const foot = xform(
      loft(
        [
          { y: -0.07, rx: 0.05, rz: 0.035, n: 2.8 },
          { y: 0.0, rx: 0.058, rz: 0.048, n: 3.2 },
          { y: 0.09, rx: 0.06, rz: 0.046, n: 3.4 },
          { y: 0.17, rx: 0.052, rz: 0.034, n: 3 },
          { y: 0.21, rx: 0.034, rz: 0.02, n: 2.6 },
        ],
        { segments: 16, capBottom: 0.01, capTop: 0.01 },
      ),
      { rx: Math.PI / 2, y: -0.015 },
    )
    add(`foot${side}`, merge([foot, loft([{ y: -0.03, rx: 0.06, rz: 0.066 }, { y: 0.05, rx: 0.062, rz: 0.067 }], { segments: 16 })]), materials.armor)
    add(`thigh${side}`, xform(plate(p.thigh * 0.55, 0.009, 0.006, { taper: 1, tipTaper: 0.3 }), { rx: Math.PI, x: s * 0.098, y: -0.08 }), materials.violet)
  }

  // Orbiting dimensional fragments (small, few — texture, not noise).
  const shards = new Group()
  rig.attach('chest', shards)
  for (let i = 0; i < 5; i++) {
    const g = new Group()
    g.userData = { angle: rng() * Math.PI * 2, radius: 0.32 + rng() * 0.12, speed: 0.3 + rng() * 0.4, height: 0.05 + rng() * 0.2, tilt: rng() * Math.PI }
    add(g, xform(plate(0.06 + rng() * 0.05, 0.035, 0.012, { taper: 0.6, tipTaper: 0.05, n: 3.6 }), { rz: rng() * 3 }), i % 3 === 0 ? materials.crimson : materials.armor)
    shards.add(g)
  }

  return { materials, hands, phaseParts, shards }
}
