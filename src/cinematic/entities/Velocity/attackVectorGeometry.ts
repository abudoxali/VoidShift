import { BufferAttribute, BufferGeometry, Sphere, Vector3 } from 'three'

const DASHES = 140
const CHEVRONS = 12
const RETICLE_SEGMENTS = 40

/**
 * Static geometry for the predicted attack vector. Positions are computed in the vertex shader
 * from the attack state (from/to/intercept), so a new vector costs uniform writes, not uploads.
 */
export function buildAttackVectorGeometry(reticleRadius: number): BufferGeometry {
  const t: number[] = []
  const kind: number[] = []
  const off: number[] = []
  const push = (ti: number, k: number, ox = 0, oy = 0) => {
    t.push(ti)
    kind.push(k)
    off.push(ox, oy)
  }
  for (let i = 0; i < DASHES; i++) {
    const t0 = i / DASHES
    push(t0, 0)
    push(t0 + 0.55 / DASHES, 0)
  }
  for (let i = 1; i <= CHEVRONS; i++) {
    const ti = i / (CHEVRONS + 1)
    const s = 0.09
    push(ti, 1, -s, s)
    push(ti, 1, 0, 0)
    push(ti, 1, -s, -s)
    push(ti, 1, 0, 0)
  }
  const r = reticleRadius
  for (let i = 0; i < RETICLE_SEGMENTS; i++) {
    // Broken circle: every fourth segment missing.
    if (i % 4 === 3) continue
    const a0 = (i / RETICLE_SEGMENTS) * Math.PI * 2
    const a1 = ((i + 1) / RETICLE_SEGMENTS) * Math.PI * 2
    push(0, 2, Math.cos(a0) * r, Math.sin(a0) * r)
    push(0, 2, Math.cos(a1) * r, Math.sin(a1) * r)
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2
    push(0, 2, Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15)
    push(0, 2, Math.cos(a) * r * 1.55, Math.sin(a) * r * 1.55)
  }
  const n = t.length
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3))
  g.setAttribute('aT', new BufferAttribute(new Float32Array(t), 1))
  g.setAttribute('aKind', new BufferAttribute(new Float32Array(kind), 1))
  g.setAttribute('aOff', new BufferAttribute(new Float32Array(off), 2))
  g.boundingSphere = new Sphere(new Vector3(), 50)
  return g
}
