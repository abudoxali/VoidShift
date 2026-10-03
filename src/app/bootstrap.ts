import { detectQualityTier, parseQualityOverride, readDeviceSignals } from '../cinematic/engine/PerformanceManager'
import { useExperience } from '../store/experienceStore'

/**
 * Synchronous startup configuration, applied before the first render so the canvas is
 * created once with the right quality tier and motion profile.
 *
 * URL overrides (for testing/QA): ?quality=ultra|high|lite  ?motion=reduced|full  ?debug
 * Live review: ?review=1  ?scene=<scene id>  ?fx=off  ?sheet=characters
 */
export function bootstrapExperience(): void {
  const params = new URLSearchParams(window.location.search)
  const override = parseQualityOverride(window.location.search)
  const motion = params.get('motion')
  const systemReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

  useExperience.setState({
    quality: override ? { tier: override, source: 'user' } : { tier: detectQualityTier(readDeviceSignals()), source: 'auto' },
    reducedMotion: { system: systemReduced, user: motion === 'reduced' ? true : motion === 'full' ? false : null },
    debug: params.has('debug'),
    review: params.get('review') === '1' || params.has('review'),
    fx: params.get('fx') === 'off' ? 'off' : 'full',
  })
}
