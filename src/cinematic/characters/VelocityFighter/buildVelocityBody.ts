import { BoxGeometry, Color, ConeGeometry, LineBasicMaterial, MeshBasicMaterial, MeshStandardMaterial, type Mesh } from 'three'
import type { CharacterRig } from '../../animation/CharacterRig'
import type { Proportions } from '../../animation/skeleton'
import { withDissolve, type FighterUniforms } from '../fighterMaterials'
import { column, gem, limb, part } from '../bodyParts'

export const VELOCITY_COLORS = {
  armor: 0x2c4b56,
  armorEmissive: 0x0b3540,
  accent: [0.55, 2.1, 2.8] as const,
  edge: [0.28, 0.95, 1.25] as const,
  dissolve: [0.7, 2.4, 3.0] as const,
}

export interface VelocityBody {
  materials: { armor: MeshStandardMaterial; accent: MeshBasicMaterial; edge: LineBasicMaterial }
  /** Accent meshes whose intensity follows energy. */
  accents: Mesh[]
}

/**
 * VELOCITY: a lean, angular, luminous construct. Dark faceted armour plates outlined in cyan
 * vector edges; a bright chest line, visor and joint nodes; blade hands; a swept-back crest
 * that gives the silhouette its triangular read.
 */
export function buildVelocityBody(rig: CharacterRig, u: FighterUniforms, p: Proportions): VelocityBody {
  const armor = withDissolve(
    new MeshStandardMaterial({ color: VELOCITY_COLORS.armor, metalness: 0.35, roughness: 0.42, emissive: new Color(VELOCITY_COLORS.armorEmissive), emissiveIntensity: 0.7, flatShading: true }),
    u,
    'velocity-armor',
  )
  const accent = withDissolve(new MeshBasicMaterial({ color: new Color(...VELOCITY_COLORS.accent) }), u, 'velocity-accent')
  const edge = withDissolve(new LineBasicMaterial({ color: new Color(...VELOCITY_COLORS.edge) }), u, 'velocity-edge')
  const accents: Mesh[] = []
  const A = (m: Mesh) => (accents.push(m), m)
  const E = { edges: edge }

  // Torso.
  rig.attach('hips', part(column(0.14, 0.11, 0.14, 6).translate(0, -0.08, 0), armor, E))
  rig.attach('spine', part(column(p.chest, 0.11, 0.13, 6), armor, E))
  const thorax = part(column(p.neck - 0.02, 0.13, 0.22, 4).rotateY(Math.PI / 4).scale(1, 1, 0.62), armor, E)
  rig.attach('chest', thorax)
  // Chest core line: a bright inverted V.
  for (const s of [-1, 1]) {
    const line = A(part(new BoxGeometry(0.012, 0.2, 0.012), accent))
    line.position.set(s * 0.05, 0.13, 0.115)
    line.rotation.z = s * 0.45
    rig.attach('chest', line)
  }
  const core = A(part(gem(0.03, 0.04, 0.02), accent))
  core.position.set(0, 0.07, 0.12)
  rig.attach('chest', core)

  // Head: faceted helmet, visor slit, swept crest.
  rig.attach('neck', part(column(0.09, 0.035, 0.03, 5), armor))
  const helmet = part(gem(0.1, 0.13, 0.115), armor, E)
  helmet.position.set(0, 0.06, 0)
  rig.attach('head', helmet)
  const visor = A(part(new BoxGeometry(0.13, 0.014, 0.012), accent))
  visor.position.set(0, 0.07, 0.1)
  rig.attach('head', visor)
  const crest = part(new ConeGeometry(0.035, 0.3, 3).rotateX(-Math.PI / 2 - 0.55), armor, E)
  crest.position.set(0, 0.12, -0.1)
  rig.attach('head', crest)

  // Arms.
  for (const side of ['L', 'R'] as const) {
    const s = side === 'L' ? 1 : -1
    const pad = part(new BoxGeometry(0.15, 0.06, 0.13).rotateZ(s * 0.35), armor, E)
    pad.position.set(s * 0.02, 0.03, 0)
    rig.attach(`upperArm${side}`, pad)
    rig.attach(`upperArm${side}`, part(limb(p.upperArm, 0.05, 0.04, 6), armor, E))
    rig.attach(`foreArm${side}`, part(limb(p.foreArm, 0.045, 0.03, 6), armor, E))
    const fin = part(new ConeGeometry(0.03, 0.2, 3).rotateX(Math.PI).scale(0.4, 1, 1), armor, E)
    fin.position.set(s * 0.03, -0.12, -0.03)
    fin.rotation.z = s * 0.25
    rig.attach(`foreArm${side}`, fin)
    const elbow = A(part(gem(0.022, 0.022, 0.022), accent))
    rig.attach(`foreArm${side}`, elbow)
    // Blade hand.
    rig.attach(`hand${side}`, part(new ConeGeometry(0.04, p.hand, 4).rotateX(Math.PI).translate(0, -p.hand / 2, 0).scale(1, 1, 0.45), armor, E))
  }

  // Legs.
  for (const side of ['L', 'R'] as const) {
    rig.attach(`thigh${side}`, part(limb(p.thigh, 0.075, 0.055, 6), armor, E))
    rig.attach(`shin${side}`, part(limb(p.shin, 0.055, 0.035, 6), armor, E))
    const knee = A(part(gem(0.028, 0.028, 0.028), accent))
    knee.position.set(0, 0, 0.05)
    rig.attach(`shin${side}`, knee)
    rig.attach(`foot${side}`, part(new ConeGeometry(0.045, 0.24, 4).rotateX(Math.PI / 2).translate(0, -0.03, 0.08).scale(0.8, 0.5, 1), armor, E))
  }

  return { materials: { armor, accent, edge }, accents }
}
