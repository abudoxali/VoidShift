import { resetCinematicState } from '../../engine/CinematicState'
import type { SequenceDefinition } from '../../engine/CinematicTimeline'
import { bootSegment } from './boot'
import { revealSegment } from './reveal'
import { spawnSegment } from './spawn'

/**
 * Milestone 01 sequence. Later milestones append ENGAGE, PHASE, TELEPORT… segments here
 * (or compose a new sequence) without touching the engine.
 */
export const FOUNDATION_SEQUENCE: SequenceDefinition = {
  id: 'foundation',
  initialize: resetCinematicState,
  segments: [bootSegment, revealSegment, spawnSegment],
}
