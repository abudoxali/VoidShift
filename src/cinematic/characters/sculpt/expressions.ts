import type { Vector2, Vector4 } from 'three'

/**
 * Facial expressions as painted-face parameters. `expr` = lid open, squint, brow raise, brow
 * angle (+ = outer end up, inner end down: a frown); `mouth` = open, smile, strain, blink.
 */
export interface Expression {
  expr: readonly [number, number, number, number]
  mouth: readonly [number, number, number, number]
}

export const EXPRESSIONS = {
  // AERON
  neutral: { expr: [1, 0, 0, 0], mouth: [0, 0, 0, 0] },
  focus: { expr: [0.92, 0.25, -0.2, 0.06], mouth: [0, -0.1, 0, 0] },
  narrow: { expr: [0.75, 0.55, -0.45, 0.1], mouth: [0, -0.2, 0.1, 0] },
  determined: { expr: [0.95, 0.35, -0.6, 0.14], mouth: [0.05, -0.35, 0.35, 0] },
  strain: { expr: [0.7, 0.7, -0.8, 0.18], mouth: [0.45, -0.5, 1, 0] },
  recover: { expr: [0.6, 0.2, 0.1, -0.02], mouth: [0.15, 0, 0.1, 0] },
  // NOX
  threat: { expr: [0.85, 0.35, -0.35, 0.1], mouth: [0, -0.15, 0, 0] },
  tracking: { expr: [1, 0.15, 0.2, 0.05], mouth: [0, 0, 0, 0] },
  confident: { expr: [0.72, 0.4, -0.1, 0.02], mouth: [0, 0.5, 0, 0] },
  surprise: { expr: [1.25, -0.2, 0.95, -0.12], mouth: [0.55, -0.1, 0, 0] },
  pain: { expr: [0.45, 0.85, -0.5, -0.16], mouth: [0.6, -0.6, 1, 0] },
} as const satisfies Record<string, Expression>

export type ExpressionName = keyof typeof EXPRESSIONS

/** Writes the blend of two expressions into the face uniforms. */
export function applyExpression(from: ExpressionName, to: ExpressionName, t: number, expr: Vector4, mouth: Vector4, blink = 0): void {
  const a = EXPRESSIONS[from], b = EXPRESSIONS[to]
  const k = Math.min(1, Math.max(0, t))
  expr.set(a.expr[0] + (b.expr[0] - a.expr[0]) * k, a.expr[1] + (b.expr[1] - a.expr[1]) * k, a.expr[2] + (b.expr[2] - a.expr[2]) * k, a.expr[3] + (b.expr[3] - a.expr[3]) * k)
  mouth.set(a.mouth[0] + (b.mouth[0] - a.mouth[0]) * k, a.mouth[1] + (b.mouth[1] - a.mouth[1]) * k, a.mouth[2] + (b.mouth[2] - a.mouth[2]) * k, Math.max(blink, a.mouth[3] + (b.mouth[3] - a.mouth[3]) * k))
}

/** Deterministic blink: brief lid closures at irregular intervals of the world clock. */
export function blinkAt(time: number, seed: number): number {
  const period = 3.1 + (seed % 3) * 0.7
  const t = (time + seed * 1.37) % period
  const d = 0.13
  return t < d ? Math.sin((t / d) * Math.PI) : 0
}

export type GazeTarget = Vector2
