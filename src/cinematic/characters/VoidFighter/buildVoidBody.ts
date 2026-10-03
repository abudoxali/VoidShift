import { BoxGeometry, Color, CylinderGeometry, Group, LineBasicMaterial, MeshBasicMaterial, MeshStandardMaterial, TetrahedronGeometry, Vector3, type Mesh } from 'three'
import type { CharacterRig } from '../../animation/CharacterRig'
import type { Proportions } from '../../animation/skeleton'
import { createRng } from '../../../utils/random'
import { withDissolve, type FighterUniforms } from '../fighterMaterials'
import { column, gem, limb, part } from '../bodyParts'

export const VOID_COLORS = {
  shell: 0x060409,
  shellEmissive: 0x0b0414,
  violet: [0.75, 0.32, 1.7] as const,
  crimson: [1.7, 0.12, 0.32] as const,
  edge: [0.32, 0.14, 0.55] as const,
  dissolve: [0.9, 0.25, 1.8] as const,
}

export interface PhasePart {
  object: Mesh | Group
  base: Vector3
  /** Direction this part jumps to while phased (joint-local). */
  dir: Vector3
  seed: number
}

export interface VoidBody {
  materials: { shell: MeshStandardMaterial; violet: MeshBasicMaterial; crimson: MeshBasicMaterial; edge: LineBasicMaterial }
  accents: Mesh[]
  /** Parts that separate while phased. */
  phaseParts: PhasePart[]
  /** Cloak panels (sway follows the body's motion). */
  panels: Group[]
  /** Shards orbiting the shoulders. */
  shards: Group
}

/**
 * VOID: tall, heavy and almost black. A hooded head with a single vertical violet slit,
 * a wide fractured torso, cloak panels hanging from the shoulders, crimson fault lines and
 * shards that orbit the shoulders. Readable mainly through its rim light — a silhouette cut
 * out of the world.
 */
export function buildVoidBody(rig: CharacterRig, u: FighterUniforms, p: Proportions): VoidBody {
  const shell = withDissolve(
    new MeshStandardMaterial({ color: VOID_COLORS.shell, metalness: 0.35, roughness: 0.42, emissive: new Color(VOID_COLORS.shellEmissive), flatShading: true }),
    u,
    'void-shell',
  )
  const violet = withDissolve(new MeshBasicMaterial({ color: new Color(...VOID_COLORS.violet) }), u, 'void-violet')
  const crimson = withDissolve(new MeshBasicMaterial({ color: new Color(...VOID_COLORS.crimson) }), u, 'void-crimson')
  const edge = withDissolve(new LineBasicMaterial({ color: new Color(...VOID_COLORS.edge) }), u, 'void-edge')
  const rng = createRng(909)
  const accents: Mesh[] = []
  const phaseParts: PhasePart[] = []
  const E = { edges: edge, edgeAngle: 30 }
  const track = (o: Mesh | Group) => {
    phaseParts.push({ object: o, base: o.position.clone(), dir: new Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(), seed: rng() })
    return o
  }
  const add = (joint: Parameters<CharacterRig['attach']>[0], o: Mesh | Group) => {
    rig.attach(joint, o)
    track(o)
    return o
  }

  // Torso: wide, faceted, split by a crimson fault.
  add('hips', part(column(0.16, 0.13, 0.16, 7).translate(0, -0.09, 0), shell, E))
  add('spine', part(column(p.chest, 0.13, 0.17, 7), shell, E))
  add('chest', part(column(p.neck, 0.17, 0.3, 5).scale(1, 1, 0.6), shell, E))
  const fault = part(new BoxGeometry(0.012, 0.26, 0.01), crimson)
  fault.position.set(0.03, 0.12, 0.17)
  fault.rotation.z = 0.2
  accents.push(fault)
  rig.attach('chest', fault)
  const heart = part(gem(0.035, 0.05, 0.03), violet)
  heart.position.set(-0.02, 0.1, 0.16)
  accents.push(heart)
  rig.attach('chest', heart)

  // Hooded head with a vertical slit of light.
  add('neck', part(column(0.1, 0.05, 0.045, 6), shell))
  const hood = new Group()
  hood.add(part(new CylinderGeometry(0.05, 0.16, 0.34, 7).translate(0, 0.1, -0.02).rotateX(-0.18), shell, E))
  const slit = part(new BoxGeometry(0.012, 0.11, 0.01), violet)
  slit.position.set(0, 0.06, 0.135)
  accents.push(slit)
  hood.add(slit)
  add('head', hood)

  // Arms: heavy, with fractured pauldrons.
  for (const side of ['L', 'R'] as const) {
    const s = side === 'L' ? 1 : -1
    const pauldron = part(new BoxGeometry(0.22, 0.09, 0.2).rotateZ(s * 0.5), shell, E)
    pauldron.position.set(s * 0.03, 0.05, 0)
    add(`upperArm${side}`, pauldron)
    add(`upperArm${side}`, part(limb(p.upperArm, 0.065, 0.055, 6), shell, E))
    add(`foreArm${side}`, part(limb(p.foreArm, 0.06, 0.045, 6), shell, E))
    add(`hand${side}`, part(limb(p.hand, 0.045, 0.02, 4).scale(1, 1, 0.6), shell, E))
  }
  // Legs.
  for (const side of ['L', 'R'] as const) {
    add(`thigh${side}`, part(limb(p.thigh, 0.09, 0.07, 6), shell, E))
    add(`shin${side}`, part(limb(p.shin, 0.07, 0.05, 6), shell, E))
    add(`foot${side}`, part(new BoxGeometry(0.1, 0.06, 0.24).translate(0, -0.03, 0.05), shell, E))
  }

  // Cloak panels hang from the chest (back and sides), pivoting at the top edge.
  const panels: Group[] = []
  const panelSpec: [number, number, number, number][] = [
    // x, z, yaw, length
    [0.0, -0.13, 0, 1.0],
    [0.14, -0.1, 0.35, 0.92],
    [-0.14, -0.1, -0.35, 0.92],
    [0.24, 0.0, 1.2, 0.78],
    [-0.24, 0.0, -1.2, 0.78],
  ]
  for (const [x, z, yaw, len] of panelSpec) {
    const pivot = new Group()
    pivot.position.set(x, p.neck * 0.85, z)
    pivot.rotation.y = yaw
    pivot.add(part(new BoxGeometry(0.17, len, 0.012).translate(0, -len / 2, 0), shell, E))
    rig.attach('chest', pivot)
    panels.push(pivot)
    track(pivot)
  }

  // Shards orbiting the shoulders: broken geometry that never settles.
  const shards = new Group()
  for (let i = 0; i < 9; i++) {
    const shard = part(new TetrahedronGeometry(0.03 + rng() * 0.04).scale(1, 2.2, 1), i % 3 === 0 ? crimson : shell, i % 3 === 0 ? {} : E)
    shard.userData = { radius: 0.32 + rng() * 0.22, angle: rng() * Math.PI * 2, height: p.neck * 0.7 + (rng() - 0.3) * 0.25, speed: 0.3 + rng() * 0.5, tilt: rng() * Math.PI }
    shards.add(shard)
  }
  rig.attach('chest', shards)

  return { materials: { shell, violet, crimson, edge }, accents, phaseParts, panels, shards }
}
