# VoidShift — STATUS

## Project

VoidShift is a real-time, code-driven cinematic web experience. The website *is* the animation. Two original characters fight in a short, fast, deterministic sequence rendered live in WebGL (three.js + React Three Fiber). No anime characters, frames, models, logos or audio are reproduced, and no external character assets are used: both fighters are sculpted in code.

- **AERON** (internal id `velocity`): precise, lean and fast. Vector Dash, Coordinate Anchor, Blink Reconstruction, Momentum Redirect, Code Core.
- **NOX** (internal id `void`): heavier, phasing and dimensional. Phase, Spatial Fold, Void Guard, Counter Shift, Fracture Field.

## Current Completion

**40%.** Unchanged: it is the last accepted state. It does not move until the owner visually accepts the rebuilt live experience.

## Current State: VISUAL REBUILD / LIVE REVIEW

Development is local and live (`npm run dev`, browser + HMR). GitHub Pages is the remote review surface. No video export.

Priority order: character quality → animation → lighting / world → choreography → camera → VFX.

### Review URLs

Local: `http://localhost:5173/`. The same paths work on <https://abudoxali.github.io/VoidShift/>.

| What | Path |
|---|---|
| Live | `/` |
| Review mode | `/?review=1` |
| A scene | `/?review=1&scene=<id>`: `arrival, standoff, first-attack, close-combat, strategy, anchor, second-attack, teleport, reversal, core, strike, impact, aftermath` |
| Readability test | append `&fx=off` |
| Character lab | `/?review=1&lab=characters` |
| Character lab, direct | `&fighter=nox&view=face&pose=guard&light=standoff&face=strain&tier=high` |

Character lab parameters:

- views: `front, three-quarter, side, back, face, face-34, hands`;
- lights: `studio, arena, standoff, core, flat`;
- faces: `neutral, focus, narrow, determined, strain, recover, threat, tracking, confident, surprise, pain`;
- toggles: `&wireframe`, `&skeleton`.

The lab is a development tool. It is only reachable with `review` in the URL and is never shown to visitors. Its panel offers fighter, view, pose (the full pose library), expression, lighting preset, wireframe, skeleton, turntable and mesh tier, plus triangle / generation-time / draw-call readouts. Mouse drag orbits; the wheel zooms.

An animation lab (`lab=animation`) is not built yet.

## Character System (rebuilt)

The old visible layer (lofted superellipse parts, rigid-batched) was replaced. The skeleton, pose library, IK, timeline and FX hooks are unchanged.

### Sculpting pipeline (`src/cinematic/characters/sculpt/`)

1. **Signed-distance sculpting (`sdf.ts`).** Each fighter is an ordered list of primitives (ellipsoids, round / flattened cones, rounded boxes, tori) with smooth unions and subtractions. Each primitive is tagged with its bone and a paint zone.
   - Primitives are authored in bone-local frames on an A-pose bind (`frames.ts`), so armpits and thighs stay open.
2. **Surface nets mesher (`mesher.ts`).**
   - Narrow-band block culling, vertices projected onto the surface, and gradient normals.
   - Body, head, three hand shapes per side, armour and hair cap are meshed separately.
3. **Armour.** Shells offset from the body surface and cut by region volumes, with bevelled edges and their hidden inner faces removed. Shells are meshed at least 2.4 cells thick so thin plates never tear.
   - Body skin under a covering layer (AERON's coat, NOX's cuirass and gauntlets) is removed.
4. **Skin weights from the sculpt (`skin.ts`).** Each bone's distance is taken from its own primitives with exponential falloff and the top 4 influences are kept. Joints blend where limb volumes meet; plates can be rigid.
5. **Hair (`hair.ts`).**
   - Flattened, tapered locks swept along Catmull-Rom curves (lens cross-section with a ridge), plus a scalp cap.
   - Per-vertex root→tip and strand tangent drive the gradient, the anisotropic highlight and tip lag.
6. **Assembly (`SculptedFighter.ts`).** Four `SkinnedMesh`es per fighter (body + hands, head, hair, armour) share one skeleton built from the rig's joints, which are now `Bone`s. That makes 4 draws per fighter.
7. **Baking.** `npm run bake` writes `public/characters/<id>-<tier>.bin.gz`.
   - Format: int16 positions, int8 normals and strands, uint8 weights / zones, gzipped. Sizes: AERON 1.35 MB (HIGH) / 0.9 MB (LITE); NOX 1.9 MB / 1.2 MB.
   - At runtime the loader takes the baked file when its design signature matches. Otherwise (a design edited in development) it regenerates in a Web Worker.
   - A unit test fails if a design changes without a re-bake.
   - The cinematic clock is held until both fighters are loaded (`CharacterGate`).
8. **Material (`material.ts`).** An extension of `MeshStandardMaterial`, so every stage, energy, Code Core and impact light still applies. It adds:
   - per-zone albedo / roughness / metalness / glow;
   - a design paint pass in bind space (panels, piping, seams, fracture veins, crystal cores);
   - a cel-style terminator per zone;
   - an identity rim on the rim-light side;
   - the dissolve (reveals, teleports);
   - **phase slicing**: the body splits into displaced, flickering horizontal slices with energy-coloured edges;
   - hand-shape switching;
   - a painted anime face on the head and Kajiya-Kay strand highlights on the hair.

### Faces

The face is painted in head space:

- almond eyes with an iris gradient, limbal ring, pupil, fibres, two catch lights and a glowing iris;
- a heavy upper lash line with a wing, a lower lash line and a lid crease;
- brows, a mouth and a strain pinch.

Expressions (`expressions.ts`) are lid open / squint / brow raise / brow angle / mouth open / smile / strain, with a deterministic blink.

- AERON: `neutral, focus, narrow, determined, strain, recover`.
- NOX: `threat, tracking, confident, surprise, pain`.

The timeline drives them per beat (`face()` in `moves.ts`):

| Beat | Expression |
|---|---|
| Standoff | AERON focus → determined; NOX threat |
| Failed strategy | NOX confident; AERON narrow |
| Anchor throw | NOX tracking (eyes on the anchor) |
| Reversal | NOX surprise |
| Code Core | AERON strain |
| Impact | NOX pain |
| Aftermath | AERON recover |

Eyes track the opponent's head, or the anchor while it flies.

### AERON

- Lean, about 1.75 m with hair.
- Fitted graphite undersuit; short pale coat with a high flared collar, black chevron and flank inlays, and cyan piping.
- Layered pauldrons; forearm guards with cuffs; knee guards, greaves and toe caps; a belt with a cyan buckle core.
- Armoured gloves with three hand shapes.
- Swept silver hair: crown spikes, top locks, long bangs and side locks.
- Bright cyan eyes.
- Energy scarf and waist sash (Verlet strips).

### NOX

- Taller and broader, about 1.85 m with crown.
- Black lacquered cuirass, dark-violet fauld and tassets, a heavy mantle and a standing collar.
- A massive three-layer left pauldron grown through with violet crystal; gauntlets, greaves and sabatons.
- Violet fracture veins through the armour.
- A mature face with a square jaw, under a fractured crystal half-mask over his right side. The jaw, mouth and left eye stay readable.
- A broken crystal crown; long dark hair falling back to the shoulders.
- Violet eyes.
- Cloak strips. While phasing: phase slices plus a faint skinned echo body.

### Poses / animation

- Unchanged: `PoseSpec` pose library with two-bone leg IK. AERON has 25 poses, NOX 17.
- New: hair tip lag from head motion.

## Choreography (18.0 s, 13 scenes)

The beats are unchanged from the last accepted state:

1. arrival
2. standoff
3. first attack (the punch passes through phased NOX)
4. close combat
5. failed strategy
6. anchor throw
7. second attack
8. teleport
9. reversal
10. Code Core
11. final strike
12. impact
13. aftermath

The only addition is facial acting.

## World / Lighting (this pass)

- **Floor:** dark polished surface.
  - The lattice dots are much fainter; thin continuous cyan seams run every 4 m.
  - Fresnel horizon sheen with wet-patch variation.
  - View-aligned reflection streaks of the fighters' energy light, the Code Core and the impact light.
- **Lighting:** the stage rig is unchanged. Characters now answer it with cel terminators and identity rims (cyan AERON, violet NOX).
- **Camera:** the eye inserts were re-aimed for the new head heights.

## Draw Calls

Measured on a real GPU (RTX 4070, headless Chromium / ANGLE D3D11), 1280×720, every 0.25 s of the fight, post-processing included:

| Tier | Range | Peak |
|---|---|---|
| ULTRA | 23–41 | Code Core / impact |
| LITE | 15–37 | Code Core / impact |

The previous build measured ULTRA 27–49 and LITE 23–45. Each fighter body is 4 draws.

Triangles: about 160k (AERON) + 220k (NOX) at HIGH / ULTRA, and 100k + 145k at LITE. No FPS figure is claimed yet.

## Tests / Verification

`npm run typecheck`, `npm run lint`, `npm test` (95 unit tests) and `npm run build` pass.

New unit tests:

- every baked fighter is current with its design (signature);
- skin weights normalised, bone indices valid, all six hand variants present, standing heights;
- an exact bind (skinned vertices equal the rest geometry at the bind pose; posing moves the head);
- the quantised encode / decode roundtrip;
- mesher accuracy;
- expression / blink determinism.

e2e:

- `boot` now waits until both fighters are loaded.
- Baseline at the start of this pass, on the untouched tree: 8/13 passed. All 5 failures were timeouts or races under SwiftShader on a heavily loaded machine; none was a logic failure.

Developer tools (not part of the build):

- `scripts/capture.mjs`: headless frame captures (real GPU);
- `scripts/drawcalls.mjs`: draw-call sweep.

## Known Visual Weaknesses

- Faces are readable but still simple: the painted eyes read at close range only, and the head sculpt is generic. No dedicated facial rig beyond the painted expression parameters.
- Armour and coat hems where a shell meets its region cut are ragged / frilly instead of crisp.
- AERON's coat reads more like a pale breastplate than a garment. There are no cloth panels on the coat.
- Hair: AERON's clumps are tusk-like and too uniform; NOX's long hair reads as strands. The silhouette still needs more mass and layering.
- Animation is the old pose-to-pose system: no overlapping action, weight shift or follow-through layer yet (next priority).
- Cloth is the old Verlet strip system (scarf, sash, cloak); no cloak sheet with collisions.
- Lighting is the old stage rig: no shot-dependent lighting presets yet. The Code Core and impact VFX are unchanged from the previous pass.
- No planar reflections (the floor reflections are faked).
- Triangle counts are high for low-end phones (no decimation / LOD yet).
- The animation lab (`lab=animation`) is not built.

## Repository / Commit State

- Repository: `abudoxali/VoidShift`. Work branch: `claude/confident-curie-sydv8b` (also the default branch). Draft PR #1.
- Pages is deployed from the work branch by the `pages-preview.yml` workflow (`workflow_dispatch`, base `/VoidShift/`).
