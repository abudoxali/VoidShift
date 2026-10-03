import { AdditiveBlending, BufferAttribute, BufferGeometry, DynamicDrawUsage, Mesh, ShaderMaterial, Vector2, Vector3 } from 'three'
import type { CharacterRig } from '../../animation/CharacterRig'
import type { JointName } from '../../animation/skeleton'
import type { WorldUniforms } from '../../shaders'

/** Bones drawn for a pose ghost (child → parent). */
const BONES: [JointName, JointName][] = [
  ['spine', 'hips'], ['chest', 'spine'], ['neck', 'chest'], ['head', 'neck'],
  ['upperArmL', 'neck'], ['foreArmL', 'upperArmL'], ['handL', 'foreArmL'],
  ['upperArmR', 'neck'], ['foreArmR', 'upperArmR'], ['handR', 'foreArmR'],
  ['thighL', 'hips'], ['shinL', 'thighL'], ['footL', 'shinL'],
  ['thighR', 'hips'], ['shinR', 'thighR'], ['footR', 'shinR'],
]

const VERT = /* glsl */ `
attribute vec3 aOther;
attribute float aSide;
attribute float aBirth;
uniform float uTime;
uniform float uLife;
uniform vec2 uResolution;
uniform float uWidth;
varying float vAge;
varying float vSide;
void main() {
  float age = (uTime - aBirth) / uLife;
  if (age < 0.0 || age > 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vAge = 1.0; return; }
  mat4 vp = projectionMatrix * viewMatrix;
  vec4 a = vp * vec4(position, 1.0);
  vec4 b = vp * vec4(aOther, 1.0);
  float aspect = uResolution.x / uResolution.y;
  vec2 d = (b.xy / max(b.w, 1e-3) - a.xy / max(a.w, 1e-3)) * vec2(aspect, 1.0);
  d = length(d) > 1e-6 ? normalize(d) : vec2(1.0, 0.0);
  vec2 n = vec2(-d.y, d.x);
  n.x /= aspect;
  a.xy += n * aSide * uWidth * (1.0 - age * 0.6) * 2.0 / uResolution.y * a.w;
  vAge = age;
  vSide = aSide;
  gl_Position = a;
}`

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAge;
varying float vSide;
void main() {
  float a = uOpacity * pow(1.0 - vAge, 2.0) * (1.0 - smoothstep(0.3, 1.0, abs(vSide)));
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
}`

/**
 * Pose afterimages: the fighter's skeleton captured at high speed and left behind as luminous
 * stroke figures that fade — anime speed rendered as vector history. All ghosts share one
 * buffer and one draw call; capture rewrites one slot (16 bones × 4 vertices).
 */
export class PoseGhosts {
  readonly mesh: Mesh<BufferGeometry, ShaderMaterial>
  private readonly pos: BufferAttribute
  private readonly other: BufferAttribute
  private readonly birth: BufferAttribute
  private next = 0
  private readonly a = new Vector3()
  private readonly b = new Vector3()

  constructor(readonly capacity: number, world: WorldUniforms, color: readonly [number, number, number], width = 3.5, life = 0.32) {
    const verts = capacity * BONES.length * 4
    const g = new BufferGeometry()
    this.pos = new BufferAttribute(new Float32Array(verts * 3), 3).setUsage(DynamicDrawUsage)
    this.other = new BufferAttribute(new Float32Array(verts * 3), 3).setUsage(DynamicDrawUsage)
    this.birth = new BufferAttribute(new Float32Array(verts).fill(-1e6), 1).setUsage(DynamicDrawUsage)
    const side = new Float32Array(verts)
    const index: number[] = []
    for (let q = 0; q < capacity * BONES.length; q++) {
      const o = q * 4
      side.set([-1, 1, 1, -1], o)
      index.push(o, o + 1, o + 2, o, o + 2, o + 3)
    }
    g.setIndex(index)
    g.setAttribute('position', this.pos)
    g.setAttribute('aOther', this.other)
    g.setAttribute('aBirth', this.birth)
    g.setAttribute('aSide', new BufferAttribute(side, 1))
    const material = new ShaderMaterial({
      uniforms: {
        uTime: world.uTime,
        uLife: { value: life },
        uResolution: { value: new Vector2(1, 1) },
        uWidth: { value: width },
        uColor: { value: color },
        uOpacity: { value: 0.85 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    this.mesh = new Mesh(g, material)
    this.mesh.frustumCulled = false
  }

  capture(rig: CharacterRig, birth: number): void {
    const slot = this.next
    this.next = (this.next + 1) % this.capacity
    const pos = this.pos.array as Float32Array
    const oth = this.other.array as Float32Array
    const bir = this.birth.array as Float32Array
    BONES.forEach(([child, parent], i) => {
      rig.jointWorld(child, this.a)
      rig.jointWorld(parent, this.b)
      const v = (slot * BONES.length + i) * 4
      // Quad: two vertices at A (other = B), two at B (other = A).
      for (const [k, p, o] of [[0, this.a, this.b], [1, this.a, this.b], [2, this.b, this.a], [3, this.b, this.a]] as const) {
        pos.set([p.x, p.y, p.z], (v + k) * 3)
        // For the B end the "other" must still point along A→B for a consistent normal.
        const dir = k < 2 ? o : p === this.b ? this.a : o
        oth.set(k < 2 ? [o.x, o.y, o.z] : [2 * p.x - dir.x, 2 * p.y - dir.y, 2 * p.z - dir.z], (v + k) * 3)
        bir[v + k] = birth
      }
    })
    this.pos.needsUpdate = true
    this.other.needsUpdate = true
    this.birth.needsUpdate = true
  }

  clear(): void {
    ;(this.birth.array as Float32Array).fill(-1e6)
    this.birth.needsUpdate = true
  }

  setResolution(w: number, h: number): void {
    ;(this.mesh.material.uniforms.uResolution.value as Vector2).set(w, h)
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}
