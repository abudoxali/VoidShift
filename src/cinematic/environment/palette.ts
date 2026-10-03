/** Environment palette (linear). Desaturated teal-black, after the reference's night palette. */
export const ENVIRONMENT_PALETTE = {
  ground: [0.006, 0.011, 0.013],
  line: [0.075, 0.18, 0.2],
  axis: [0.3, 0.72, 0.8],
  accent: [0.35, 1.05, 1.35],
  voidTint: [0.55, 0.18, 0.75],
  horizon: [0.0085, 0.019, 0.022],
  zenith: [0.0012, 0.0025, 0.0034],
  haze: [0.018, 0.045, 0.05],
  data: [0.22, 0.45, 0.48],
} as const satisfies Record<string, readonly [number, number, number]>
