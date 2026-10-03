import { CinematicCameraRig } from '../camera/CinematicCameraRig'
import { PostPipeline } from '../effects/post/PostPipeline'
import { GlyphLayer } from '../effects/typography/GlyphLayer'
import { SceneController } from '../engine/SceneController'
import { AttackVector } from '../entities/Velocity/AttackVector'
import { VelocityEntity } from '../entities/Velocity/VelocityEntity'
import { VoidEntity } from '../entities/Void/VoidEntity'
import { Atmosphere } from '../environment/Atmosphere'
import { BackgroundField } from '../environment/BackgroundField'
import { Coordinates } from '../environment/Coordinates'
import { WorldGrid } from '../environment/WorldGrid'

/**
 * Milestone 01 scene graph. Pure composition — no timing, no state. Every child reads the
 * cinematic state through the engine and the world uniforms.
 */
export function FoundationScene() {
  return (
    <SceneController>
      <CinematicCameraRig />
      <Atmosphere />
      <WorldGrid />
      <BackgroundField />
      <GlyphLayer>
        <Coordinates />
        <VelocityEntity />
        <AttackVector />
        <VoidEntity />
      </GlyphLayer>
      <PostPipeline />
    </SceneController>
  )
}
