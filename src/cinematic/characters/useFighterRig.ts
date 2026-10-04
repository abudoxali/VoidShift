import { useMemo } from 'react'
import { Group } from 'three'
import { CharacterRig } from '../animation/CharacterRig'
import type { CompiledPose } from '../animation/pose'
import type { Proportions } from '../animation/skeleton'
import type { CinematicEngine } from '../engine/CinematicEngine'
import type { FighterState } from '../engine/CinematicState'

/** Height of the body pivot: flips and dives rotate around the hips, not the feet. */
export const PIVOT_HEIGHT = 1.0

export interface FighterRig {
  /** Positioned at the fighter's feet + pivot height; rotated by yaw/pitch/roll. */
  outer: Group
  rig: CharacterRig
}

export function useFighterRigObject(proportions: Proportions): FighterRig {
  return useMemo(() => {
    const rig = new CharacterRig(proportions)
    const outer = new Group()
    rig.root.position.y = -PIVOT_HEIGHT
    outer.add(rig.root)
    return { outer, rig }
  }, [proportions])
}

/**
 * Applies a fighter's timeline state to its rig: world transform, pose blend, breathing and hit
 * shudder. Called from the fighter's useFrame; allocation-free.
 */
export function driveFighter(f: FighterState, fr: FighterRig, poses: Record<string, CompiledPose>, fallback: CompiledPose, engine: CinematicEngine): void {
  const { outer, rig } = fr
  outer.position.set(f.position.x, f.position.y + PIVOT_HEIGHT, f.position.z)
  outer.rotation.set(f.pitch, f.yaw, f.roll, 'YXZ')
  outer.visible = f.reveal > 0.001
  rig.apply(poses[f.from] ?? fallback, poses[f.pose] ?? fallback, f.blend, {
    time: engine.elapsed,
    breath: f.breath * engine.motion.ambient,
    jitter: f.hit,
  })
  outer.updateMatrixWorld(true)
}
