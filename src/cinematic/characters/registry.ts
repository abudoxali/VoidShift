import type { CharacterRig } from '../animation/CharacterRig'

/**
 * Live rigs by engine id, for effects that attach to a fighter's body (the anchor held in a
 * hand, the Code Core). Set by the fighter components on mount.
 */
export const FIGHTER_RIGS: { velocity: CharacterRig | null; void: CharacterRig | null } = { velocity: null, void: null }
