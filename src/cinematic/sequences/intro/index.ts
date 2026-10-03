import { resetCinematicState } from '../../engine/CinematicState'
import type { SequenceDefinition } from '../../engine/CinematicTimeline'
import { arrivalSegment } from './arrival'
import { closeCombatSegment } from './closeCombat'
import { coreSegment } from './core'
import { firstAttackSegment } from './firstAttack'
import { impactSegment } from './impact'
import { reversalSegment } from './reversal'
import { standoffSegment } from './standoff'
import { strategySegment } from './strategy'
import { teleportSegment } from './teleport'

/**
 * The intro fight (~18 s), 13 scenes over the nine engine phases:
 * arrival · standoff · first attack · close combat · failed strategy · anchor · second attack ·
 * teleport · reversal · Code Core · strike · impact · aftermath.
 */
export const INTRO_SEQUENCE: SequenceDefinition = {
  id: 'intro',
  initialize: resetCinematicState,
  segments: [arrivalSegment, standoffSegment, firstAttackSegment, closeCombatSegment, strategySegment, teleportSegment, reversalSegment, coreSegment, impactSegment],
}
