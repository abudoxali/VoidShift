import type { CompiledPose } from '../animation/pose'
import { AERON_POSES } from '../animation/poses/aeronPoses'
import { NOX_POSES } from '../animation/poses/noxPoses'
import { AERON_DESIGN } from './Aeron/aeronDesign'
import { AERON_PAINT } from './Aeron/aeronPaint'
import { NOX_DESIGN } from './Nox/noxDesign'
import { NOX_PAINT } from './Nox/noxPaint'
import type { CharacterDesign } from './sculpt/design'
import type { PaintSet } from './sculpt/SculptedFighter'

export interface FighterKit {
  design: CharacterDesign
  paint: PaintSet
  poses: Record<string, CompiledPose>
}

/** Every renderable fighter: its sculpt design, paint pass and pose library. */
export const FIGHTER_KITS: Record<'aeron' | 'nox', FighterKit> = {
  aeron: { design: AERON_DESIGN, paint: AERON_PAINT, poses: AERON_POSES },
  nox: { design: NOX_DESIGN, paint: NOX_PAINT, poses: NOX_POSES },
}
