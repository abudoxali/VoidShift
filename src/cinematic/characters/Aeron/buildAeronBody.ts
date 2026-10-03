import { Color, DoubleSide, Mesh, MeshStandardMaterial, type BufferGeometry, type Material } from 'three'
import type { CharacterRig } from '../../animation/CharacterRig'
import type { JointName, Proportions } from '../../animation/skeleton'
import { limbSegment, loft, merge, plate, xform } from '../anatomy'
import { browGeometry, eyeGeometry, hairPlates, handGeometries, headGeometry, mouthGeometry, socketGeometry, type EyeShape } from '../features'
import { withDissolve, type FighterUniforms } from '../fighterMaterials'

/**
 * AERON — precision / movement fighter. Lean, athletic, slightly tall. A fitted dark undersuit,
 * light asymmetric armour (left pauldron, forearm guards, chest plate, reinforced boots), cyan
 * seams, a calm angular face with narrow luminous eyes and swept crystalline hair plates.
 * Readable with every effect switched off.
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

export const AERON_COLORS = {
  skin: 0x7e8a92,
  suit: 0x141c23,
  armor: 0x5b7380,
  hair: 0x41606d,
  accent: [0.35, 1.7, 2.2] as const,
  eye: [0.6, 1.9, 2.3] as const,
  dissolve: [0.7, 2.4, 3.0] as const,
}

export const AERON_EYE: EyeShape = { x: 0.155, y: 0.535, z: 0.428, width: 0.115, height: 0.05, tilt: 0.14 }

export interface HandMeshes {
  open: Mesh
  fist: Mesh
}

export interface FighterBody {
  materials: Record<string, MeshStandardMaterial>
  hands: { L: HandMeshes; R: HandMeshes }
}

export function buildAeronBody(rig: CharacterRig, u: FighterUniforms, p: Proportions = AERON_PROPORTIONS): FighterBody {
  const std = (key: string, color: number, params: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {}) =>
    withDissolve(new MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, ...params }), u, `aeron-${key}`)
  const materials = {
    skin: std('skin', AERON_COLORS.skin, { roughness: 0.62, metalness: 0 }),
    suit: std('suit', AERON_COLORS.suit, { roughness: 0.7, metalness: 0.05 }),
    armor: std('armor', AERON_COLORS.armor, { roughness: 0.32, metalness: 0.55 }),
    hair: std('hair', AERON_COLORS.hair, { roughness: 0.3, metalness: 0.55, side: DoubleSide, emissive: new Color(0x0a2731), flatShading: true }),
    accent: std('accent', 0x000000, { emissive: new Color(...AERON_COLORS.accent), roughness: 1, metalness: 0 }),
    eye: std('eye', 0x000000, { emissive: new Color(...AERON_COLORS.eye), roughness: 1, metalness: 0 }),
  }
  const add = (joint: JointName, g: BufferGeometry, m: Material) => {
    const mesh = new Mesh(g, m)
    mesh.frustumCulled = false
    rig.attach(joint, mesh)
    return mesh
  }

  // ── Torso ──────────────────────────────────────────────────────────────────
  // Pelvis (hips joint) — the suit, with an armoured belt.
  add(
    'hips',
    loft(
      [
        { y: -0.13, rx: 0.07, rz: 0.06 },
        { y: -0.08, rx: 0.14, rz: 0.095, n: 2.4 },
        { y: -0.02, rx: 0.15, rz: 0.1, n: 2.6 },
        { y: 0.05, rx: 0.135, rz: 0.092, n: 2.6 },
        { y: 0.13, rx: 0.125, rz: 0.088, n: 2.5 },
      ],
      { segments: 22, capBottom: 0.02 },
    ),
    materials.suit,
  )
  add('hips', loft([{ y: -0.015, rx: 0.157, rz: 0.106, n: 3 }, { y: 0.03, rx: 0.152, rz: 0.103, n: 3 }], { segments: 24 }), materials.armor)
  // Abdomen (spine joint).
  add(
    'spine',
    loft(
      [
        { y: -0.02, rx: 0.128, rz: 0.09, n: 2.5 },
        { y: 0.08, rx: 0.122, rz: 0.088, n: 2.6, front: 0.006 },
        { y: 0.18, rx: 0.138, rz: 0.096, n: 2.6 },
        { y: 0.24, rx: 0.15, rz: 0.1, n: 2.6 },
      ],
      { segments: 22 },
    ),
    materials.suit,
  )
  // Ribcage + pecs (chest joint).
  add(
    'chest',
    loft(
      [
        { y: -0.08, rx: 0.15, rz: 0.1, n: 2.6 },
        { y: -0.02, rx: 0.165, rz: 0.108, n: 2.8, front: 0.012 },
        { y: 0.04, rx: 0.178, rz: 0.112, n: 3.0, front: 0.022 },
        { y: 0.09, rx: 0.172, rz: 0.104, n: 3.0, front: 0.012 },
        { y: 0.125, rx: 0.12, rz: 0.08, n: 2.6 },
        { y: 0.15, rx: 0.06, rz: 0.055 },
      ],
      { segments: 24 },
    ),
    materials.suit,
  )
  // Chest armour: a single asymmetric plate over the left pec and collarbone.
  add('chest', xform(plate(0.17, 0.13, 0.025, { taper: 0.95, tipTaper: 0.55, n: 3.2 }), { rz: -1.35, rx: -0.1, x: 0.115, y: 0.05, z: 0.115 }), materials.armor)
  // Cyan seams: the chest chevron.
  for (const s of [-1, 1]) {
    add('chest', xform(plate(0.16, 0.012, 0.008, { taper: 1, tipTaper: 0.6 }), { rz: s * 0.62, x: s * 0.012, y: -0.075, z: 0.122 }), materials.accent)
  }
  // Neck + collar.
  add('neck', loft([{ y: -0.04, rx: 0.058, rz: 0.055 }, { y: 0.06, rx: 0.047, rz: 0.048 }, { y: 0.12, rx: 0.045, rz: 0.046 }], { segments: 16 }), materials.skin)
  add('neck', loft([{ y: -0.05, rx: 0.085, rz: 0.075, n: 2.4 }, { y: 0.0, rx: 0.075, rz: 0.068, n: 2.4 }, { y: 0.03, rx: 0.068, rz: 0.062 }], { segments: 20 }), materials.suit)

  // ── Head ───────────────────────────────────────────────────────────────────
  const H = p.head
  add('head', headGeometry({ height: H, width: 0.94, jaw: 0.92, chin: 1.08, brow: 0.7 }), materials.skin)
  add('head', hairPlates(H), materials.hair)
  for (const s of [-1, 1] as const) {
    add('head', socketGeometry(H, AERON_EYE, s), materials.suit)
    add('head', eyeGeometry(H, AERON_EYE, s), materials.eye)
    add('head', browGeometry(H, AERON_EYE, s, 0.16), materials.hair)
  }
  add('head', mouthGeometry(H, 0.2, 0.13, 0.385), materials.suit)

  // ── Arms ───────────────────────────────────────────────────────────────────
  const hands = {} as FighterBody['hands']
  for (const side of ['L', 'R'] as const) {
    const s = side === 'L' ? 1 : -1
    // Deltoid cap connecting torso and arm.
    add(`upperArm${side}`, loft([{ y: -0.11, rx: 0.05, rz: 0.05 }, { y: -0.04, rx: 0.066, rz: 0.062 }, { y: 0.02, rx: 0.062, rz: 0.058 }, { y: 0.055, rx: 0.035, rz: 0.035 }], { segments: 16, capTop: 0.01 }), materials.suit)
    add(`upperArm${side}`, limbSegment(p.upperArm, 0.052, 0.054, 0.04, { belly: 0.35 }), materials.suit)
    add(`foreArm${side}`, limbSegment(p.foreArm, 0.043, 0.046, 0.031, { belly: 0.25 }), materials.suit)
    // Light forearm guard + seam.
    add(`foreArm${side}`, loft([{ y: -p.foreArm * 0.92, rx: 0.036, rz: 0.034, n: 3 }, { y: -p.foreArm * 0.5, rx: 0.05, rz: 0.046, n: 3 }, { y: -p.foreArm * 0.18, rx: 0.051, rz: 0.048, n: 3 }], { segments: 18, capBottom: 0.004, capTop: 0.004 }), materials.armor)
    add(`foreArm${side}`, xform(plate(p.foreArm * 0.66, 0.008, 0.006, { taper: 1, tipTaper: 0.8 }), { rx: Math.PI, x: s * 0.051, y: -p.foreArm * 0.2 }), materials.accent)
    add(`upperArm${side}`, xform(plate(p.upperArm * 0.7, 0.008, 0.006, { taper: 1, tipTaper: 0.8 }), { rx: Math.PI, x: s * 0.055, y: -0.06 }), materials.accent)
    const g = handGeometries(p.hand, s)
    const open = add(`hand${side}`, g.open, materials.skin)
    const fist = add(`hand${side}`, g.fist, materials.skin)
    fist.userData.batchHidden = true
    hands[side] = { open, fist }
  }
  // Asymmetric left pauldron: three layered plates.
  for (let i = 0; i < 3; i++) {
    add('upperArmL', xform(plate(0.12 - i * 0.02, 0.15 - i * 0.025, 0.02, { taper: 1, tipTaper: 0.45 }), { rz: -0.15 - i * 0.18, rx: 0.0, ry: 0, x: 0.045 + i * 0.012, y: 0.045 - i * 0.045, z: 0 }), materials.armor)
  }
  add('upperArmL', xform(plate(0.11, 0.008, 0.006, { taper: 1, tipTaper: 0.5 }), { rz: -0.15, x: 0.068, y: 0.05, z: 0.06 }), materials.accent)

  // ── Legs ───────────────────────────────────────────────────────────────────
  for (const side of ['L', 'R'] as const) {
    const s = side === 'L' ? 1 : -1
    add(`thigh${side}`, limbSegment(p.thigh, 0.085, 0.084, 0.056, { belly: 0.3, frontBias: 0.012 }), materials.suit)
    add(`thigh${side}`, xform(plate(p.thigh * 0.7, 0.008, 0.006, { taper: 1, tipTaper: 0.7 }), { rx: Math.PI, x: s * 0.084, y: -0.06 }), materials.accent)
    add(`shin${side}`, limbSegment(p.shin, 0.058, 0.06, 0.04, { belly: 0.28 }), materials.suit)
    // Knee guard.
    add(`shin${side}`, xform(plate(0.11, 0.075, 0.03, { taper: 0.8, tipTaper: 0.45 }), { rx: Math.PI - 0.1, y: 0.04, z: 0.05 }), materials.armor)
    // Boot shaft.
    add(`shin${side}`, loft([{ y: -p.shin - 0.01, rx: 0.05, rz: 0.055, n: 2.6 }, { y: -p.shin * 0.7, rx: 0.052, rz: 0.056, n: 2.6 }, { y: -p.shin * 0.45, rx: 0.06, rz: 0.062, n: 2.6 }], { segments: 18, capBottom: 0, capTop: 0.004 }), materials.armor)
    // Boot foot: lofted heel → toe, laid along +Z.
    const foot = xform(
      loft(
        [
          { y: -0.06, rx: 0.042, rz: 0.03, n: 2.6 },
          { y: 0.0, rx: 0.048, rz: 0.042, n: 3 },
          { y: 0.08, rx: 0.05, rz: 0.04, n: 3.2 },
          { y: 0.16, rx: 0.045, rz: 0.03, n: 3 },
          { y: 0.2, rx: 0.03, rz: 0.018, n: 2.6 },
        ],
        { segments: 16, capBottom: 0.01, capTop: 0.01 },
      ),
      { rx: Math.PI / 2, y: -0.012 },
    )
    add(`foot${side}`, merge([foot, loft([{ y: -0.03, rx: 0.05, rz: 0.055 }, { y: 0.04, rx: 0.052, rz: 0.056 }], { segments: 16 })]), materials.armor)
    add(`foot${side}`, xform(plate(0.17, 0.008, 0.006, { taper: 1, tipTaper: 0.7 }), { rx: Math.PI / 2, x: s * 0.047, y: 0.0, z: -0.02 }), materials.accent)
  }

  return { materials, hands }
}
