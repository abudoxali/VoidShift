import { CinematicCameraRig } from '../camera/CinematicCameraRig'
import { AeronFighter } from '../characters/Aeron/AeronFighter'
import { NoxFighter } from '../characters/Nox/NoxFighter'
import { Impact } from '../effects/impact/Impact'
import { Bursts } from '../effects/particles/Bursts'
import { PostPipeline } from '../effects/post/PostPipeline'
import { Anchor } from '../effects/teleport/Anchor'
import { GlyphLayer } from '../effects/typography/GlyphLayer'
import { SceneController } from '../engine/SceneController'
import { Atmosphere } from '../environment/Atmosphere'
import { BackgroundField } from '../environment/BackgroundField'
import { Structures } from '../environment/Structures'
import { WorldGrid } from '../environment/WorldGrid'
import { StageLights } from '../lighting/StageLights'

/**
 * Scene graph. Pure composition — no timing, no state. Every child reads the cinematic state
 * through the engine and the world uniforms.
 */
export function FoundationScene() {
  return (
    <SceneController>
      <CinematicCameraRig />
      <StageLights />
      <Atmosphere />
      <WorldGrid />
      <Structures />
      <BackgroundField />
      <GlyphLayer>
        <AeronFighter />
        <NoxFighter />
        <Anchor />
        <Impact />
        <Bursts />
      </GlyphLayer>
      <PostPipeline />
    </SceneController>
  )
}
