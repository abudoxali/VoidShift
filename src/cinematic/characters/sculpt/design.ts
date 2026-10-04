import type { HandShape } from '../../animation/pose'
import type { JointName, Proportions } from '../../animation/skeleton'
import type { Frames } from './frames'
import type { HairSpec } from './hair'
import type { Sculpt, V3 } from './sdf'

/** Paint zones shared by both fighters (the palette per fighter gives them colour and finish). */
export const ZONE = {
  SUIT: 0,
  SKIN: 1,
  GLOVE: 2,
  BOOT: 3,
  ARMOR_A: 4,
  ARMOR_B: 5,
  TRIM: 6,
  GLOW: 7,
  HAIR: 8,
  COAT: 9,
  CRYSTAL: 10,
  LINER: 11,
} as const

export const ZONE_COUNT = 12

/** Surface finish of one zone: linear albedo, roughness, metalness, emissive strength. */
export interface ZoneFinish {
  color: V3
  roughness: number
  metalness: number
  /** Emissive multiplier of the fighter's energy colour. */
  glow?: number
  /** 0..1 how cel-stylised the diffuse response is (skin/fabric higher). */
  toon?: number
  /** Fabric weave / panel detail strength. */
  weave?: number
}

/** An armour plate: a shell offset from the body surface, cut by a region volume. */
export interface ArmorPiece {
  name: string
  zone: number
  /** Inner offset from the body surface and plate thickness (m). */
  offset: number
  thickness: number
  /** Volume that cuts the shell (shell ∩ region). */
  region: Sculpt
  /** Optional extra volumes unioned onto the plate (ridges, fins) and grooves subtracted. */
  extra?: Sculpt
  /** Bind rigidly to one joint (plates that must not bend). */
  rigid?: JointName
  /** Edge rounding radius. */
  bevel?: number
  /** Mesh resolution multiplier (1 = the armour default). */
  detail?: number
  /** Remove body skin hidden under this layer (inset by `hideInset` from the region boundary). */
  hides?: boolean
  hideInset?: number
}

/** Painted face layout in head-local coordinates (bind pose; head bone origin). */
export interface FaceSpec {
  /** Eye centre (x of the left eye, y, z on the surface). */
  eye: V3
  eyeWidth: number
  eyeHeight: number
  /** Upward tilt of the outer corner (radians). */
  eyeTilt: number
  irisRadius: number
  brow: { y: number; thickness: number; length: number; angle: number }
  mouth: { y: number; width: number }
  irisColor: V3
  /** Iris emissive strength (glowing eyes). */
  irisGlow: number
  lashColor: V3
  scleraColor: V3
  lipColor: V3
}

export interface CharacterDesign {
  id: 'aeron' | 'nox'
  proportions: Proportions
  /** Energy colour (emissive accents, dissolve edge). */
  energy: V3
  rim: V3
  body(f: Frames): Sculpt
  /** Head + upper neck, authored in head-local coordinates (head bone at the origin). */
  head(f: Frames): Sculpt
  headBounds: readonly [V3, V3]
  hand(f: Frames, side: 'L' | 'R', shape: HandShape): Sculpt
  armor(f: Frames): ArmorPiece[]
  hair(f: Frames): HairSpec
  face: FaceSpec
  palette: readonly ZoneFinish[]
}
