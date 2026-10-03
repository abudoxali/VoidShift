import { BufferAttribute, BufferGeometry, Vector3 } from 'three'
import { loft, merge, plate, xform, type Ring, TAU } from './anatomy'

/**
 * Heads, faces and hands. All geometry is authored in joint space:
 *  - heads: the head joint sits at the base of the skull; y up, the face looks along +Z
 *  - hands: the hand joint is the wrist; the hand hangs along -Y, thumb toward +Z
 * Sizes are in metres for a ~1.8 m figure.
 */

export interface HeadShape {
  /** Chin-to-crown height. */
  height: number
  /** Width multiplier (1 = average). */
  width?: number
  /** Jaw width multiplier. */
  jaw?: number
  /** Chin forward projection. */
  chin?: number
  /** Brow ridge depth. */
  brow?: number
}

/** The skull + face form, including nose, brow ridge, cheekbones, ears and a short neck stub. */
export function headGeometry(shape: HeadShape): BufferGeometry {
  const H = shape.height
  const w = shape.width ?? 1
  const jw = shape.jaw ?? 1
  const ch = shape.chin ?? 1
  const R = (y: number, rx: number, rz: number, z: number, n = 2.6, front = 0): Ring => ({ y: y * H, rx: rx * H * w, rz: rz * H, z: z * H, n, front: front * H })
  const skull = loft(
    [
      R(-0.02, 0.07 * jw, 0.05, 0.27 * ch, 2.2),
      R(0.03, 0.15 * jw, 0.1, 0.25 * ch, 2.4),
      R(0.12, 0.27 * jw, 0.22, 0.14, 2.7),
      R(0.24, 0.32, 0.31, 0.08, 3.0),
      R(0.36, 0.355, 0.36, 0.05, 3.2),
      R(0.48, 0.37, 0.39, 0.03, 3.4),
      R(0.6, 0.375, 0.41, 0.01, 3.2),
      R(0.72, 0.365, 0.42, -0.02, 2.8),
      R(0.84, 0.32, 0.39, -0.04, 2.4),
      R(0.93, 0.22, 0.29, -0.05, 2.2),
      R(0.985, 0.1, 0.14, -0.05, 2.0),
    ],
    { segments: 28, capTop: 0.012 * H, capBottom: 0.01 * H },
  )
  // Nose: bridge → tip, sitting on the face plane.
  const nose = loft(
    [
      { y: 0.3 * H, rx: 0.045 * H, rz: 0.03 * H, z: 0.415 * H, n: 2.2 },
      { y: 0.34 * H, rx: 0.05 * H, rz: 0.05 * H, z: 0.43 * H, n: 2.4 },
      { y: 0.45 * H, rx: 0.032 * H, rz: 0.035 * H, z: 0.425 * H, n: 2.6 },
      { y: 0.56 * H, rx: 0.026 * H, rz: 0.02 * H, z: 0.41 * H, n: 2.6 },
    ],
    { segments: 12, capBottom: 0.012 * H, capTop: 0.005 * H },
  )
  // Brow ridge: a horizontal bar over the eyes (lofted along X).
  const brow = xform(
    loft(
      [
        { y: -0.34 * H * w, rx: 0.018 * H, rz: 0.02 * H, n: 2.4 },
        { y: -0.17 * H * w, rx: 0.03 * H, rz: 0.035 * H * (shape.brow ?? 1), n: 2.6 },
        { y: 0, rx: 0.026 * H, rz: 0.03 * H * (shape.brow ?? 1), n: 2.6 },
        { y: 0.17 * H * w, rx: 0.03 * H, rz: 0.035 * H * (shape.brow ?? 1), n: 2.6 },
        { y: 0.34 * H * w, rx: 0.018 * H, rz: 0.02 * H, n: 2.4 },
      ],
      { segments: 10, capBottom: 0.01 * H, capTop: 0.01 * H },
    ),
    { rz: Math.PI / 2, y: 0.64 * H, z: 0.395 * H },
  )
  // Cheekbones.
  const cheeks = [-1, 1].map((s) =>
    xform(loft([{ y: -0.05 * H, rx: 0.02 * H, rz: 0.02 * H }, { y: 0, rx: 0.06 * H, rz: 0.045 * H }, { y: 0.05 * H, rx: 0.02 * H, rz: 0.02 * H }], { segments: 10, capBottom: 0.01 * H, capTop: 0.01 * H }), {
      x: s * 0.25 * H * w,
      y: 0.4 * H,
      z: 0.31 * H,
      ry: s * 0.6,
    }),
  )
  // Ears.
  const ears = [-1, 1].map((s) =>
    xform(loft([{ y: 0, rx: 0.015 * H, rz: 0.04 * H }, { y: 0.06 * H, rx: 0.02 * H, rz: 0.055 * H }, { y: 0.13 * H, rx: 0.012 * H, rz: 0.035 * H }], { segments: 10, capBottom: 0.01 * H, capTop: 0.01 * H }), {
      x: s * 0.37 * H * w,
      y: 0.4 * H,
      z: 0.02 * H,
    }),
  )
  return merge([skull, nose, brow, ...cheeks, ...ears])
}

export interface EyeShape {
  /** Eye centre (head space, fraction of head height). */
  x: number
  y: number
  z: number
  width: number
  height: number
  /** Outer corner lift (radians): + = sharp upswept, - = drooping/heavy. */
  tilt: number
}

/** One luminous almond eye, facing +Z, for the character's left (s = 1) or right (s = -1). */
export function eyeGeometry(H: number, e: EyeShape, s: 1 | -1): BufferGeometry {
  const g = xform(
    loft(
      [
        { y: -e.width * 0.5 * H, rx: e.height * 0.12 * H, rz: 0.004 * H },
        { y: -e.width * 0.25 * H, rx: e.height * 0.42 * H, rz: 0.008 * H },
        { y: 0.05 * e.width * H, rx: e.height * 0.5 * H, rz: 0.01 * H },
        { y: e.width * 0.32 * H, rx: e.height * 0.32 * H, rz: 0.008 * H },
        { y: e.width * 0.5 * H, rx: e.height * 0.05 * H, rz: 0.004 * H },
      ],
      { segments: 10, capBottom: 0.002 * H, capTop: 0.002 * H },
    ),
    // Lofted along Y → lay it along X (outer corner toward the side of the face).
    { rz: -s * Math.PI / 2 - s * e.tilt, x: s * e.x * H, y: e.y * H, z: e.z * H, ry: s * 0.28 },
  )
  return g
}

/** Dark eye socket behind the eye: frames the glow and keeps it from reading as a sticker. */
export function socketGeometry(H: number, e: EyeShape, s: 1 | -1): BufferGeometry {
  return xform(
    loft(
      [
        { y: -e.width * 0.62 * H, rx: e.height * 0.4 * H, rz: 0.006 * H },
        { y: 0, rx: e.height * 1.25 * H, rz: 0.012 * H },
        { y: e.width * 0.62 * H, rx: e.height * 0.5 * H, rz: 0.006 * H },
      ],
      { segments: 12, capBottom: 0.003 * H, capTop: 0.003 * H },
    ),
    { rz: -s * Math.PI / 2 - s * e.tilt * 0.7, x: s * e.x * H, y: (e.y + 0.005) * H, z: (e.z - 0.012) * H, ry: s * 0.28 },
  )
}

/** Angular brow slab (expression lives here: angle down toward the centre = focus). */
export function browGeometry(H: number, e: EyeShape, s: 1 | -1, angle: number): BufferGeometry {
  return xform(plate(e.width * 1.15 * H, 0.03 * H, 0.016 * H, { taper: 0.9, tipTaper: 0.35, n: 3 }), {
    rz: -s * (Math.PI / 2 + angle),
    x: s * (e.x - e.width * 0.55) * H,
    y: (e.y + 0.085) * H,
    z: (e.z + 0.008) * H,
    ry: s * 0.25,
  })
}

/** A thin mouth line. */
export function mouthGeometry(H: number, y: number, width: number, z: number): BufferGeometry {
  return xform(loft([{ y: -width * 0.5 * H, rx: 0.004 * H, rz: 0.004 * H }, { y: 0, rx: 0.007 * H, rz: 0.006 * H }, { y: width * 0.5 * H, rx: 0.004 * H, rz: 0.004 * H }], { segments: 8 }), {
    rz: Math.PI / 2,
    y: y * H,
    z: z * H,
  })
}

/**
 * A partial shell around the head (hoods, masks): the loft restricted to an angular range
 * [from, to] (radians; π/2 = front), open at the edges. Render double-sided.
 */
export function shell(rings: Ring[], from: number, to: number, segments = 24): BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const p = new Vector3()
  const cols = segments + 1
  for (const r of rings) {
    for (let i = 0; i <= segments; i++) {
      const theta = from + ((to - from) * i) / segments
      const c = Math.cos(theta)
      const s = Math.sin(theta)
      const n = r.n ?? 2
      const e = 2 / n
      p.set((r.x ?? 0) + r.rx * Math.sign(c) * Math.pow(Math.abs(c), e), r.y, (r.z ?? 0) + r.rz * Math.sign(s) * Math.pow(Math.abs(s), e))
      positions.push(p.x, p.y, p.z)
    }
  }
  for (let j = 0; j < rings.length - 1; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * cols + i
      const b = a + 1
      const c = a + cols
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

export { TAU }

// ── Hands ────────────────────────────────────────────────────────────────────

export interface HandGeometries {
  open: BufferGeometry
  fist: BufferGeometry
}

/**
 * Simplified readable hands: palm, thumb mass, finger block. `s` = 1 for the left hand
 * (palm faces -X, toward the body), -1 for the right. `L` is the hand length (wrist → fingertip).
 */
export function handGeometries(L: number, s: 1 | -1, bulk = 1): HandGeometries {
  const palmLen = L * 0.48
  const pw = 0.046 * bulk // palm half-width (front-back, along Z)
  const pt = 0.019 * bulk // palm half-thickness (along X)
  const palm = loft(
    [
      { y: 0.01, rx: pt * 0.9, rz: pw * 0.72, n: 2.6 },
      { y: -palmLen * 0.45, rx: pt * 1.05, rz: pw * 0.95, n: 3.2 },
      { y: -palmLen, rx: pt * 0.95, rz: pw, n: 3.4 },
    ],
    { segments: 14, capTop: 0.006, capBottom: 0.004 },
  )
  const finger = (len: number, r: number, curl: number) =>
    loft(
      [
        { y: 0, rx: r, rz: r * 1.05 },
        { y: -len * 0.5, rx: r * 0.95, rz: r },
        { y: -len, rx: r * 0.8, rz: r * 0.85 },
      ],
      { segments: 8, capBottom: r * 0.8, capTop: r * 0.4 },
    ).rotateZ(-s * curl)
  // Open: four fingers slightly spread and relaxed, thumb out toward the front.
  const fl = L * 0.5
  const openFingers = [-0.75, -0.25, 0.25, 0.75].map((k, i) =>
    xform(finger(fl * (i === 0 || i === 3 ? 0.86 : 1), 0.0095 * bulk, 0.18), { y: -palmLen + 0.004, z: k * pw * 0.8, rx: k * 0.06 }),
  )
  const openThumb = xform(finger(L * 0.4, 0.012 * bulk, 0.1), { y: -palmLen * 0.25, z: pw * 0.85, x: -s * pt * 0.4, rx: 0.75 })
  const open = merge([palm, ...openFingers, openThumb])
  // Fist: fingers rolled into a knuckle block on the palm side, thumb wrapped across the front.
  const knuckles = loft(
    [
      { y: -palmLen + 0.006, rx: pt * 1.25, rz: pw * 1.0, x: -s * pt * 0.6, n: 3.2 },
      { y: -palmLen - 0.022, rx: pt * 1.75, rz: pw * 1.02, x: -s * pt * 0.9, n: 3.6 },
      { y: -palmLen - 0.045, rx: pt * 1.35, rz: pw * 0.92, x: -s * pt * 1.1, n: 3.0 },
    ],
    { segments: 14, capBottom: 0.01 },
  )
  const fistThumb = xform(finger(L * 0.33, 0.012 * bulk, 0), { y: -palmLen * 0.55, z: pw * 0.75, x: -s * pt * 1.6, rx: 1.15, rz: s * 0.3 })
  const fist = merge([palm, knuckles, fistThumb])
  return { open, fist }
}

/** Swept crystalline hair plates for AERON (head space). */
export function hairPlates(H: number): BufferGeometry {
  const pieces: BufferGeometry[] = []
  // Crown plates sweeping up and back — the silhouette. Each plate starts at the hairline and
  // rises past the skull, so the head reads as swept crystalline hair at any distance.
  const crown: Array<[number, number, number, number, number, number]> = [
    // x, z, length, width, tilt back (rad, from vertical), yaw
    [0.0, 0.32, 0.8, 0.26, 0.62, 0],
    [0.14, 0.27, 0.7, 0.22, 0.7, 0.3],
    [-0.14, 0.27, 0.7, 0.22, 0.7, -0.3],
    [0.26, 0.14, 0.56, 0.18, 0.9, 0.6],
    [-0.26, 0.14, 0.56, 0.18, 0.9, -0.6],
    [0.07, 0.08, 0.62, 0.22, 0.95, 0.15],
    [-0.09, 0.04, 0.6, 0.22, 1.0, -0.18],
  ]
  for (const [x, z, len, wid, back, yaw] of crown) {
    pieces.push(xform(plate(len * H, wid * H, 0.06 * H, { taper: 0.75, tipTaper: 0.04, n: 3.4 }), { rx: -back, ry: yaw, x: x * H, y: 0.84 * H, z: z * H }))
  }
  // Side plates sweeping back over the ears.
  for (const s of [-1, 1]) {
    pieces.push(xform(plate(0.46 * H, 0.18 * H, 0.05 * H, { taper: 0.8, tipTaper: 0.05 }), { rx: -1.7, ry: s * 0.4, rz: s * 0.45, x: s * 0.32 * H, y: 0.72 * H, z: 0.12 * H }))
  }
  // Asymmetric fringe: one plate cutting down across the forehead (the character's right).
  pieces.push(xform(plate(0.34 * H, 0.12 * H, 0.04 * H, { taper: 0.8, tipTaper: 0.05 }), { rx: Math.PI - 0.45, rz: -0.6, x: -0.06 * H, y: 0.96 * H, z: 0.36 * H }))
  // Cap: a crown shell from the hairline up, and a back shell down to the nape, slightly larger
  // than the skull so no scalp shows between the plates. The face stays open.
  pieces.push(
    loft(
      [
        { y: 0.74 * H, rx: 0.39 * H, rz: 0.44 * H, z: -0.03 * H, n: 2.7 },
        { y: 0.86 * H, rx: 0.345 * H, rz: 0.415 * H, z: -0.045 * H, n: 2.5 },
        { y: 0.95 * H, rx: 0.25 * H, rz: 0.32 * H, z: -0.055 * H, n: 2.3 },
        { y: 1.02 * H, rx: 0.1 * H, rz: 0.14 * H, z: -0.06 * H },
      ],
      { segments: 24, capTop: 0.012 * H },
    ),
  )
  const backRings: Ring[] = [0.3, 0.45, 0.6, 0.76].map((y, i) => ({ y: y * H, rx: [0.33, 0.37, 0.385, 0.39][i] * H, rz: [0.31, 0.38, 0.42, 0.44][i] * H, z: [0.06, 0.03, 0.0, -0.03][i] * H, n: 2.7 }))
  pieces.push(shell(backRings, Math.PI + 0.35, Math.PI * 2 - 0.35, 18))
  return merge(pieces)
}
