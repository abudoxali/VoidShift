# VoidShift — STATUS

## Project

VoidShift is a code-driven cinematic web experience. It takes the choreography, speed, deception, teleportation, phasing, impact and pacing of a high-end anime fight and rebuilds them entirely from code: WebGL, shaders, particles, vectors, coordinates, typography, camera and sound. It is not an anime recreation. No characters, bodies, frames, logos or artwork are reproduced.

Two abstract forces carry the story:

- **VELOCITY** stands for speed, precision, vectors, teleportation and reconstruction.
- **VOID** stands for dimensional instability, distortion, disappearance, corruption, gravity and phasing.

Planned flow: `BOOT → REVEAL → SPAWN → ENGAGE → PHASE → TELEPORT → LOCK → CORE_CHARGE → IMPACT → WORLD_CRASH → UI_REBUILD → WEBSITE`

## Current Completion

**40%** (Milestones 01 and 02 complete; all 24 Milestone 02 acceptance criteria verified, see *Completed* and *Tests / Verification*).

## Current Milestone

**Milestone 02: ENGAGE + PHASE** is complete. Milestone 03 has not been started.

The intro now runs 32.3 s (reduced motion: 32.7 s): `BOOT 0–2.2 · REVEAL –5.6 · SPAWN –17.2 · ENGAGE –21.8 · PHASE –32.3`. It ends on a held tension frame that establishes that ordinary attacks cannot hit VOID.

## Completed

### Milestone 02 acceptance criteria

| # | Criterion | Evidence |
|---|---|---|
| 1 | M01 intact | All 54 M01 unit tests unchanged and passing; BOOT/REVEAL/SPAWN untouched; `FOUNDATION_SEQUENCE` still exists |
| 2 | Branch normalized | `main` created at verified M01 HEAD `e64338a`; one GitHub-side action is left (see *Repository / Commit State*) |
| 3 | ENGAGE is a deterministic phase | `sequences/combat/engage.ts`; play ≡ seek tests |
| 4 | PHASE is a deterministic phase | `sequences/combat/phase.ts`; play ≡ seek, back/forward seek, replay tests |
| 5 | Anticipation + trajectory | Stillness → lock → drawn trajectory + intercept → lineup → wind-up (rendered, tested) |
| 6 | Speed reads | ~0.15 s expo-in launch (>40 u/s peak, tested); afterimages, streaks, trail, CHASE camera; streak length capped after review |
| 7 | Phasing is more than opacity | Folded interior, mirrored shell fragments, field inversion, desync, split seam, grid discontinuities, typography failure |
| 8 | Failed collision is clear | The vector is seen inside the core, exits intact, the VOID is unharmed, "COLLISION FALSE" (tested geometrically, rendered) |
| 9 | Environment reacts | Grid bulges under inversion, twists in rings, tears along the seam; data field expelled; ripples at launch/contact/exit; graduations glitch |
| 10 | Camera supports motion | STANDOFF_PUSH → ENGAGE_LINEUP → ATTACK_CHASE → cut to INTERSECTION → RECOVERY → SECOND_SETUP → cut to SPLIT_HERO → FINAL_TENSION |
| 11 | Second exchange shows futility | Adapted vector from above; VOID splits space; "COLLISION FALSE / HITS 0/2" |
| 12 | Desktop strong | 9 required beats inspected at 1440×810 (static + frame-stepped motion) |
| 13 | Portrait understandable | Purpose-built portrait shots inspected at 390×844 |
| 14 | Reduced motion tells the same story | Inspected at 1280×720; tested: no chase, no shake, no flash, peak speed < 10 u/s, same beats |
| 15 | Quality tiers | LITE (e2e), HIGH (captures), ULTRA (capture + profiling): no errors |
| 16 | No leaks | e2e geometry/texture counts stable over quality switches and combat replays; heap diffs (below) |
| 17 | No runtime/shader/React errors | e2e collects console errors/warnings during frame-stepped combat at desktop and phone |
| 18–22 | Typecheck · lint · unit · e2e · build | All pass after `npm ci` (see below) |
| 23 | Visual verification | Performed; see *Visual verification log* |
| 24 | STATUS.md | This file |

Milestone 01 (foundation, 20%) is complete: engine, timeline, camera rig, environment, entities, SDF typography, post-processing, quality tiers, reduced motion, audio foundation and tests.

## ENGAGE implementation (`sequences/combat/engage.ts`, 4.6 s)

| Local time | Beat |
|---|---|
| 0.0 | The standoff holds. VELOCITY's idle micro-snaps stop: a decision is being made. |
| 0.6 | The two-shot slowly tightens (`STANDOFF_PUSH`). |
| 1.3 | **VECTOR LOCK** (cue `velocity:lock`). The gyroscopic rings slerp out of their spin and align into a two-ring sight along the heading. Energy rises and the kernel turns onto the line. |
| 1.75 | The predicted trajectory is drawn through the VOID core, with flowing pulses and direction chevrons. A broken intercept reticle contracts around the core. Lock telemetry decodes on the line: `VECTOR LOCK / ΔX ΔY ΔZ / ETA 0.15 INTERCEPT`. The position readout yields to the vector data. |
| 2.6 | The camera commits: an over-the-shoulder shot down the line (`ENGAGE_LINEUP`). VOID's phase begins to stir (0.1). |
| 3.9 | Wind-up: a 0.45 units pull-back against the attack direction. |
| 4.45 | **Launch** (cue `velocity:launch`, grid ripple, small shake). A 0.15 s expo-in acceleration to the edge of the VOID's volume. Afterimages start. The camera is thrown into `ATTACK_CHASE` (FOV 30 → 46, lead 1.6). |
| 4.53 | The VOID phases a frame **before** contact: the deception is spatial, not temporal. |

## PHASE implementation (`sequences/combat/phase.ts`, 10.5 s)

**Exchange 1: deception by dilation**

- **0.0 — Contact** (cue `void:phase`). Hard cut to the side-on `INTERSECTION` hero. Inside the core, time is wrong: the vector that crossed the world in 0.15 s crawls 1.26 units in 0.6 s (linear), while the camera pushes in.
- **During the crossing:**
  - The VOID's interior stops being absence and becomes a 5-fold kaleidoscopic fold of the space inside it, so the vector is seen at several contradictory positions at once.
  - The field inverts: the grid well becomes a bulge and data is expelled.
  - The image desynchronises along the attack direction.
  - Shell fragments flicker between their true and mirrored positions across the attack plane, and diverge along the axis.
  - The photon rim breaks into encoded dashes.
  - The grid lattice twists in concentric rings by contradictory angles.
  - VELOCITY's fragments are displaced by interference, and its readout reads `VELOCITY · DESYNC` with corrupted coordinates.
  - The VOID label reads `POSITION / UNRESOLVED`.
  - Exposure dips for two frames, with a light shake.
- **0.6 — Pass-through** (cue `velocity:passthrough`). The vector is released on the far side at full speed (0.3 s expo-out), fragmented (assemble 0.45). There is a light flash accent, a heavier shake, and the camera swings to `RECOVERY`.
- **1.0 — Recovery.** Hard deceleration and overshoot settle (cue `velocity:recover`). VELOCITY turns back to an intact VOID and reconstructs. The intercept label becomes `COLLISION / FALSE`, and the trajectory is erased.

**Exchange 2: adaptation**

- **3.2** — VELOCITY re-positions above and in front (0.42 s expo-in-out, with afterimages). The camera goes high and wide (`SECOND_SETUP`, the tactical problem). It locks a new vector (`VECTOR 02 · ADAPT`), winds up, and launches at 5.05.
- **5.09 — Split** (cue `void:split`). This time the VOID does not dilate: space parts along the attack line **before** contact.
  - The shell halves separate.
  - The lens horizon splits in two, with a clean seam of untouched space between bright cut lines.
  - The grid opens an empty seam.
  - The label reads `SPACE / DESYNC`.
- **5.17 — Pass** (cue `void:phase`). Hard cut to the overhead `SPLIT_HERO`, held. The vector passes through the gap at full speed, an inversion pulse expels data and bulges the grid, and the seam closes behind it.
- **5.57 → 10.5** — Recovery near the ground on the far side. VELOCITY turns back, and the camera settles to `FINAL_TENSION`. The VOID keeps a residual phase of 0.4 (its interior stays folded; "unresolved"). The label reads `COLLISION FALSE / HITS 0/2`. VELOCITY's idle micro-snaps resume, and the frame holds.

## State, camera and architecture changes

- **`CinematicState` (extended, no second state system):**
  - `void.phase | fold | inversion | desync`
  - `attack.{from, to, draw, visible, lock, result, index}`
  - `velocity.{focus, ghosts, pitch}`
  - `camera.{fit, lead}`
  - `resetCinematicState` is now generic: every new field resets in place on replay (tested).
- **`engine/staging.ts`:** a single source for the combat geometry (attack lines, wind-up/entry/inner/exit/settle points, split axes). Choreography, camera presets and tests all use it.
- **`ViewLayout` (`landscape | portrait`)** is compiled into the timeline, like the motion profile:
  - `CinematicEngine.setLayout()` rebuilds on orientation change and preserves progress.
  - `shot()` merges each preset's `portrait` override. Portrait variants use `fit = 0` (authored composition, no fit-width widening).
- **CameraRig:**
  - `lead`: look-ahead along the tracked motion, scaled by speed.
  - `fit`: blends the fit-width adaptation.
  - CHASE uses the existing offset-from-entity interpretation.
- **New shots:** STANDOFF_PUSH, ENGAGE_LINEUP, ATTACK_CHASE, INTERSECTION, INTERSECTION_PUSH, RECOVERY, SECOND_SETUP, SPLIT_HERO, FINAL_TENSION (each with a portrait variant), plus a portrait variant for STANDOFF.
- **Sequences:**
  - `sequences/intro.ts` composes BOOT → PHASE.
  - `sequences/combat/{engage, phase, moves}.ts` holds the new choreography.
  - `moves.ts` provides `moveTo`, `reconstructAt` (reduced-motion substitute) and `publishVector`.
- **New cues:** `velocity:lock`, `velocity:launch`, `void:phase`, `velocity:passthrough`, `velocity:recover`, `void:split`. All are routed to `AudioDirector` (procedural blips, sweeps, a detuned glide for the phase event).

## Shaders / effects

- **`spatialDistortion.frag.glsl`** (extended):
  - phase interior (`vsFoldSpace`: 5-wedge angular fold, banded)
  - fold seam (horizon split into halves, untouched seam, cut lines)
  - desync (R/B separation along the on-screen attack direction, scaled by the core's screen size, near the core only)
  - dashed rim
  - lens weakened while phased
  - tighter lens influence window (removes far secondary images found in review)
- **`field.glsl`:** shared `uVoidPhase`, `uVoidFold`, `uVoidInversion`, `uPhaseAxis`, `uSplitAxis`, and `vsFieldSign()`. Gravity pull inverts everywhere at once.
- **Grid:**
  - inversion bulge (vertex)
  - fold seam and ring twist (fragment)
  - line anti-aliasing now uses derivatives of the unwarped coordinate, so discontinuities stay crisp
- **VOID shell:** world-space mirror/divergence/split, with a desync colour for mirrored fragments.
- **Accretion:** expelled under inversion; samples drop out while phased.
- **New `Afterimages`:** instanced kernel replicas, GPU-aged and shedding fragments. One draw call; capture writes 6 floats; births use the world clock, so captures are deterministic under fixed-step playback.
- **New `AttackVector`:** trajectory dashes, flowing pulse, chevrons and intercept reticle. It is a static geometry whose path is computed in the vertex shader from `attack.from/to` and the core, with zero uploads per vector. Lock and outcome are labels in the shared glyph field.

**Not added:** GPGPU / ping-pong particles. Every new effect is a deterministic function of the timeline state, so no particle needs history that the timeline can't reproduce.

## Responsive / portrait behaviour

- Portrait is a compiled layout, not a widened landscape frame. Shots look down the line between the two forces so their separation becomes vertical: VELOCITY low, VOID high (standoff, lineup, recovery, second setup).
- Heroes are pulled back to show the whole core at phone width.
- Lateral travel is reduced by the camera choice, not by changing the choreography. Entity motion is identical in both layouts (tested: only `camera.*` differs).
- An orientation change rebuilds the timeline once and preserves progress (tested).

## Reduced motion

The same beats and the same ending (tested), with no speed:

- The attacks become reconstruction jumps: dissolve, re-publish the position, reconstruct.
- The crossing is a 1.1 s sine move.
- The exits are 0.9–1.0 s.
- There is no CHASE camera, no shake and no flashes.
- The phase and split ramps are slower (0.5 s), desync is reduced, and ambient/glitch rates stay slowed.

Peak speed stays below 10 u/s (full motion: >40 u/s).

## Performance

Measured with CDP Performance metrics in headless Chromium + SwiftShader. CPU-side only; **no real-GPU measurement**.

| Tier / viewport | Window | Script ms/frame | Main-thread task ms/frame | Draw calls | Triangles |
|---|---|---|---|---|---|
| ULTRA 1280×720 | combat exchange 1 | 2.29 | 4.55 | 35 | 208k |
| ULTRA 1280×720 | combat exchange 2 | 1.93 | 3.55 | 35 | 208k |
| ULTRA 1280×720 | final hold | 1.36 | 2.91 | 35 | 208k |
| LITE 390×844 | exchange 1 / 2 / hold | 1.71 / 1.35 / 1.14 | 3.12 / 2.75 / 2.06 | 27 | 36k |

- **Draw calls vs M01:** +2 (attack vector, afterimages); typography stays one call. Geometries 18 (was 16), shader programs 16 (was 14), no new textures.
- **Post-processing:** still 2 effect passes. Desync adds 2 texture taps only while `desync > 0` and only near the core; the phase interior adds 1 tap only inside the horizon.
- **Memory:**
  - The heap-snapshot diff during the final hold shows no app-object growth.
  - The first pass through the combat retains a small, bounded set of objects: GSAP initialises tweens lazily the first time the playhead reaches them. The second pass through the same combat shows **no** app-object growth.
  - e2e confirms geometry/texture counts don't grow across 6 quality switches and 3 replays through the combat beats.
- **Allocation:** the new per-frame paths are allocation-free (preallocated quaternions/vectors, keyed label rewrites at ≤ 20 Hz).

## Tests / Verification

- `npm ci`: OK.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm test`: **76/76 pass** (54 from M01 + 22 new):
  - ENGAGE/PHASE boundaries and contiguity
  - combat cue order
  - play ≡ seek at six times
  - back/forward seek
  - replay resets phase/attack state
  - cue suppression while seeking
  - every cue exactly once in a full fixed-step playback
  - camera mode transitions (TRACK → CHASE → FREEZE → ORBIT)
  - stillness-then-speed
  - geometric pass-through with the VOID intact
  - split + "0/2" ending
  - reduced-motion branch (no chase/shake/flash, same beats)
  - mid-PHASE motion switch
  - portrait differs only in camera
  - mid-sequence layout switch
  - rig `fit` and CHASE `lead`
- `npm run build`: pass.
- `npm run test:e2e`: **9/9 pass**. Final hold at 3 viewports; frame-stepped playback of both exchanges at desktop and phone with no console errors/warnings and a lit canvas; ends on the PHASE hold; skip/replay/Esc; reduced motion; no resource growth across quality switches and combat replays.
- Console allow-list: one third-party warning, `THREE.Clock … deprecated`. Re-verified this milestone: it is emitted by three r186 for the `new THREE.Clock()` inside `@react-three/fiber@9.8.1`'s store, and VoidShift code never uses `Clock`. No application warning is whitelisted.

### Visual verification log

All captures were rendered in headless Chromium (SwiftShader) and inspected.

**Desktop 1440×810** (static, or frame-stepped with `fixedDelta` 1/60 for motion):

1. pre-engage standoff (17.5 s)
2. lock / anticipation (19.6, 21.2)
3. acceleration (21.69 → 21.81)
4. frame before contact (21.81)
5. intersection (21.95 → 22.18)
6. post-phase exit (22.45 → 22.57)
7. recovery (23.2 → 24.5)
8. second exchange: setup, split, pass (25.8, 26.7 → 27.8)
9. final hold (29, 32)

ULTRA was checked at 21.9 and 27.0.

**Phone 390×844 (portrait layout):** 17.5, 20.5, 21.95/22.1, 23.6, 25.9, 27.1, 32.

**Reduced motion 1280×720:** 21.2, 21.9, 22.6, 24.5, 27.4, 28.5, 33.5.

**Problems found and fixed during review:**

| Problem | Fix |
|---|---|
| Doubled/ghosted labels | Far secondary lens images: lens window tightened |
| Screen-wide rainbow at intersection | Desync localised and scaled |
| Thick overexposed Einstein ring of VELOCITY's core | Lens weakened while phased; folded samples clamped |
| Overexposed kaleidoscope | Interior brightness reduced |
| Lock label overlapping telemetry | Label moved onto the line; readout yields while locked |
| Second-exchange CHASE crashing into the lens and skimming the ground | Replaced by setup → hard cut to overhead split hero |
| A commit push-in with an unreadable in-between frame | Removed |
| Full-frame grey flashes | Exit flash 0.14 → 0.06; second-pass flash removed |
| Streak fan filling the frame at launch | Streak length capped |
| Portrait heroes too close | Pulled back |
| Shader compile error (`uTime` undeclared in afterimages) | Fixed |

## Known Issues

- Real-GPU frame rate has still not been measured (software rendering only).
- The intersection close-up is dense by design. On phones it is busier than on desktop, though the vector stays readable at the centre.
- Telemetry text is small on phones.
- Audio cues are placeholders (procedural), and audible output was not verified (headless).
- The first pass through the combat lazily initialises GSAP tweens (small, bounded, one-time).
- The `THREE.Clock` deprecation warning comes from the R3F dependency.
- No CI workflow is configured.
- GitHub default branch: see below.

## Files / Areas Changed (Milestone 02)

- **New:**
  - `src/cinematic/engine/staging.ts`
  - `src/cinematic/sequences/{intro.ts, intro.test.ts, combat/engage.ts, combat/phase.ts, combat/moves.ts}`
  - `src/cinematic/entities/Velocity/{AttackVector.tsx, attackVector.vert.glsl, attackVectorGeometry.ts}`
  - `src/cinematic/effects/trails/{Afterimages.ts, afterimage.vert.glsl}`
- **Extended:**
  - engine (`CinematicState`, `CinematicTimeline`, `CinematicEngine`, `SceneController`, `cues`)
  - camera (`cameraPresets`, `shot`, `CameraRig`, `CinematicCameraRig`, tests)
  - types (`ViewLayout`)
  - shaders (`field.glsl`, `index.ts`)
  - distortion effect + PostPipeline
  - grid shaders
  - VOID shell / accretion / entity
  - VELOCITY entity / streaks / materials
  - Coordinates
  - AudioDirector
  - Overlay
  - CinematicProvider (layout)
  - FoundationScene (AttackVector)
  - e2e suite

## Remaining Work

| Milestone | Scope |
|---|---|
| M03 | TELEPORT + LOCK: coordinate-anchor teleports and deception; the target-lock solution to "ordinary vectors cannot hit VOID" |
| M04 | CORE_CHARGE + IMPACT: code core, radial impact, white-out |
| M05 | WORLD_CRASH: code explosion of glyph matter and grid, world destruction |
| M06 | UI_REBUILD → WEBSITE: DOM/WebGL reconstruction into the site and its content sections |
| Later | Final sound design, real-device GPU profiling, CI |

## Next Target

**Milestone 03: TELEPORT + LOCK.**

- Turn M01's "published coordinate → arrival" language into combat teleports: anchors placed in the world, instant relocation with discontinuity handling (trail reset, afterimage at departure), and deception.
- Build the LOCK beat in which VELOCITY anchors itself inside VOID's unresolved coordinates.
- New segments: `sequences/combat/teleport.ts` and `lock.ts`.

## Repository / Commit State

- Repository: `abudoxali/VoidShift`
- `main`: created this milestone at the verified M01 HEAD `e64338a` (no history rewritten; nothing force-pushed).
- Work branch: `claude/confident-curie-sydv8b`.
  - M02 implementation commit: `601037c`.
  - This STATUS update follows it in a separate commit.
  - A draft PR `claude/confident-curie-sydv8b → main` carries Milestone 02.
- **GitHub-side action remaining:** the default branch is still `claude/confident-curie-sydv8b`. The available GitHub tooling has no repository-settings or default-branch operation. A repository admin needs to set it under **Settings → General → Default branch → `main`**.
