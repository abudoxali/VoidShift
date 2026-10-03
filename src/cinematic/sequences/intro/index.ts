import { resetCinematicState } from '../../engine/CinematicState'
import type { SequenceDefinition } from '../../engine/CinematicTimeline'
import { closeCombatSegment } from './closeCombat'
import { coreChargeSegment } from './coreCharge'
import { deceptionSegment } from './deception'
import { firstExchangeSegment } from './firstExchange'
import { impactSegment } from './impact'
import { openingSegment } from './opening'
import { revealSegment } from './reveal'
import { standoffSegment } from './standoff'
import { teleportSegment } from './teleport'

/**
 * The intro fight (~25 s): opening → reveal → standoff → first exchange → close combat →
 * teleport → deception → Code Core → impact/aftermath.
 */
export const INTRO_SEQUENCE: SequenceDefinition = {
  id: 'intro',
  initialize: resetCinematicState,
  segments: [
    openingSegment,
    revealSegment,
    standoffSegment,
    firstExchangeSegment,
    closeCombatSegment,
    teleportSegment,
    deceptionSegment,
    coreChargeSegment,
    impactSegment,
  ],
}
