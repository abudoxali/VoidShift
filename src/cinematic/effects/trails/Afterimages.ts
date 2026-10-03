import {
  AdditiveBlending,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LineSegments,
  ShaderMaterial,
  type BufferGeometry,
  type Vector3,
} from 'three'
import { GLSL, type WorldUniforms } from '../../shaders'
import vertexShader from './afterimage.vert.glsl?raw'

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
varying float vGlow;
void main() {
  float a = vAlpha * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor * vGlow, a);
}`

/**
 * Computational afterimages: short-lived replicas of a line geometry left at captured
 * positions while an entity moves at extreme speed. One instanced draw call for all
 * replicas; capture writes one instance (6 floats); ageing happens in the vertex shader.
 * Births use the world clock, so captures are deterministic under fixed-step playback.
 */
export class Afterimages {
  readonly mesh: LineSegments<InstancedBufferGeometry, ShaderMaterial>
  readonly capacity: number
  private readonly ghost: InstancedBufferAttribute
  private readonly ghostB: InstancedBufferAttribute
  private next = 0

  constructor(source: BufferGeometry, capacity: number, world: WorldUniforms, color: readonly [number, number, number]) {
    this.capacity = capacity
    const geometry = new InstancedBufferGeometry()
    for (const name of ['position', 'aScatter', 'aOrder', 'aGlow']) geometry.setAttribute(name, source.getAttribute(name).clone())
    this.ghost = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(DynamicDrawUsage)
    this.ghostB = new InstancedBufferAttribute(new Float32Array(capacity * 2).fill(-1e6), 2).setUsage(DynamicDrawUsage)
    geometry.setAttribute('aGhost', this.ghost)
    geometry.setAttribute('aGhostB', this.ghostB)
    geometry.instanceCount = capacity
    const material = new ShaderMaterial({
      uniforms: {
        uTime: world.uTime,
        uLife: { value: 0.42 },
        uStretch: { value: 1.35 },
        uColor: { value: color },
        uOpacity: { value: 0.75 },
      },
      vertexShader: GLSL.common + vertexShader,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    this.mesh = new LineSegments(geometry, material)
    this.mesh.frustumCulled = false
  }

  capture(position: Vector3, heading: number, pitch: number, birth: number): void {
    const i = this.next
    this.next = (this.next + 1) % this.capacity
    this.ghost.setXYZW(i, position.x, position.y, position.z, heading)
    this.ghostB.setXY(i, pitch, birth)
    this.ghost.needsUpdate = true
    this.ghostB.needsUpdate = true
  }

  /** Forget every replica (seek, replay). */
  clear(): void {
    for (let i = 0; i < this.capacity; i++) this.ghostB.setY(i, -1e6)
    this.ghostB.needsUpdate = true
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}
