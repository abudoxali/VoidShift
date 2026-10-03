import { resetCinematicState } from '../engine/CinematicState'
import type { SequenceDefinition } from '../engine/CinematicTimeline'
import { engageSegment } from './combat/engage'
import { phaseSegment } from './combat/phase'
import { bootSegment } from './foundation/boot'
import { revealSegment } from './foundation/reveal'
import { spawnSegment } from './foundation/spawn'

/**
 * The master intro sequence, as far as it is built: Milestone 01 foundation + Milestone 02
 * first combat exchange. Later milestones append TELEPORT, LOCK, … segments here.
 */
export const INTRO_SEQUENCE: SequenceDefinition = {
  id: 'intro',
  initialize: resetCinematicState,
  segments: [bootSegment, revealSegment, spawnSegment, engageSegment, phaseSegment],
}
