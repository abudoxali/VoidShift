# VoidShift — STATUS

## Project

VoidShift is a code-driven cinematic web experience. It takes the choreography, speed, deception, teleportation, phasing, impact and pacing of a high-end anime fight and rebuilds them entirely from code: WebGL, shaders, particles, vectors, coordinates, typography, camera and sound. It is not an anime recreation. No characters, frames, logos or artwork are reproduced.

Two abstract forces carry the story:

- **VELOCITY** stands for speed, precision, vectors, teleportation and reconstruction.
- **VOID** stands for dimensional instability, distortion, disappearance, corruption and gravity.

Planned flow: `BOOT → REVEAL → SPAWN → ENGAGE → PHASE → TELEPORT → LOCK → CORE_CHARGE → IMPACT → WORLD_CRASH → UI_REBUILD → WEBSITE`

## Current Completion

**20%** (Milestone 01 complete; all 16 acceptance criteria verified, see *Tests / Verification*).

## Current Milestone

**Milestone 01: Foundation + Cinematic Engine** is complete. Milestone 02 has not been started.

## Completed

| # | Acceptance criterion | Evidence |
|---|---|---|
| 1 | App starts | `npm run dev` / `npm run preview`; Playwright loads the production build |
| 2 | Real Three.js/R3F scene renders | e2e checks a non-blank canvas, 21–33 draw calls per frame |
| 3 | Distinctive identity | Rendered and inspected at every beat (BOOT → standoff) |
| 4 | Environment is intentional | Measurement lattice, dashed survey lines, ruler ticks, gravitational well, haze dome |
| 5 | VELOCITY visual language | Vector kernel, precision rings, streak halo, wake, telemetry, published arrival coordinate |
| 6 | VOID spatial language | Lens with Einstein ring and frame drag, horizon, corruption band, fractured shell, accretion, unresolved coordinates |
| 7 | Centralised timeline | `CinematicEngine` + `CinematicTimeline` + declarative segments |
| 8 | Camera controlled by the cinematic system | `shot()` is the only way to move the camera; `CameraRig` interprets it |
| 9 | High-quality custom shader | `SpatialDistortionEffect`, plus world-grid, reconstruction and SDF glyph shaders |
| 10 | Particle architecture scales | Stateless GPU particles, one draw call per system, allocate once and change the draw range |
| 11 | Responsive canvas | Verified at 1440×900, 1280×720, 834×1112 and 390×844; FOV/dolly framing; live DPR hook |
| 12 | Quality profiles | ULTRA / HIGH / LITE, device heuristics, adaptive downgrade, URL/user override |
| 13 | Reduced motion | System preference and in-app toggle; separate choreography branch; verified in e2e and by render |
| 14 | Production build | `npm run build` passes |
| 15 | No runtime/shader errors | e2e collects console errors and warnings at 3 viewports; dev StrictMode run is also clean |
| 16 | Modular, ready for M02 | New phases are new segment files; new effects plug into the shared field and cue bus |

## Implemented Architecture

```
src/
├── app/                 App shell, bootstrap (URL/device/motion config), providers
│   └── providers/       CinematicProvider (single engine, store sync, audio, visibility), debug handle
├── cinematic/
│   ├── engine/          CinematicEngine · CinematicTimeline · CinematicState · cues · frameStages
│   │                    SceneController (R3F bridge) · PerformanceManager (profiles, governor)
│   ├── sequences/       foundation/{boot,reveal,spawn}.ts: choreography as data, one file per phase
│   ├── camera/          cameraPresets (shot library) · shot() timeline helper · CameraRig · framing
│   ├── entities/        Velocity/ · Void/ (geometry builders, GLSL, materials, component)
│   ├── environment/     WorldGrid · Atmosphere · BackgroundField · Coordinates · palette
│   ├── effects/         particles/ · trails/ · typography/ · distortion/ · post/ · lineGeometry
│   ├── shaders/         shared GLSL chunks (common, field, assemble) + shared world uniforms
│   ├── audio/           AudioDirector (cue-driven Web Audio foundation)
│   ├── scenes/          FoundationScene (pure composition) · WorldContext
│   └── types/           phase / camera-mode / quality / motion vocabulary
├── components/          Stage (Canvas), StageErrorBoundary, overlay/ (controls, timecode, perf)
├── hooks/               useDevicePixelRatio
├── store/               zustand UI store (phase, quality, motion, sound): no per-frame data
├── styles/              global.css
└── utils/               math, seeded RNG, render stats
```

Key decisions:

- **Deterministic timeline.** GSAP is used only to interpolate and ease. The timeline is paused and never ticks itself. The engine samples it with `tl.time(t)` once per frame, so playing to *t*, seeking to *t*, and replaying all produce identical state (unit-tested). Big frame gaps are clamped to 1/15 s, and the clock pauses while the tab is hidden. `fixedDelta` gives frame-exact stepping for captures and future offline rendering.
- **One mutable state object.** `CinematicState` is written only by sequences (through the timeline) and read by render code inside `useFrame`. React never re-renders per frame; the store changes only at phase boundaries and on user toggles.
- **Cue bus.** Instantaneous events (`camera:shake`, `camera:cut`, `grid:ripple`, `velocity:arrive`, `void:open`, …) are placed on the timeline. The camera, grid shockwaves, post shockwave and audio subscribe to them. There are no `setTimeout` calls anywhere in the choreography.
- **Explicit frame order.** `ENGINE → CAMERA → WORLD → LATE` stages, using negative `useFrame` priorities. The composer renders at priority 1.
- **Shared world field.** One GLSL chunk (`field.glsl`) defines VOID gravity, frame drag and VELOCITY presence. The grid, the data field and the particles all include it, and its uniforms are shared by reference, so the world bends coherently.
- **Reduced motion is a choreography branch,** not only a CSS flag. Segments receive the motion profile: the dash becomes a reconstruction fade, shakes are removed, flashes are flattened, ambient motion and glitch rates are slowed. The final composition is identical.

## Visual Systems

- **BOOT:** a cinematic gate opens like an eye from a thin slit. The origin blinks twice, then the two world axes shoot out from it while `ORIGIN +00.00 +00.00 +00.00` decodes.
- **REVEAL:** the measurement lattice resolves outward behind a scan front while the camera cranes back. A deliberate held beat follows.
- **SPAWN / VELOCITY:** the arrival coordinate (`→ X-03.40 Y+01.15 Z+00.20`) is published first, with a floor reticle and plumb line: coordinates mean teleportation. After a held beat comes a 2-frame flash cut and a 0.26 s `expo.out` dash from 30 units off-frame to a dead stop. The streak halo bursts and reconverges (reconstruction), the grid takes a shock ripple, the camera takes a shake impulse, and the telemetry decodes. At rest it holds still, then snaps to micro-positions in 160 ms.
- **SPAWN / VOID:** never seen arriving. Space bends first (the grid sags, data drifts, readouts glitch, VELOCITY turns toward it). The world then inhales (exposure dip) and the tear opens in one frame: lens, horizon, fractured lattice, an inverse shockwave and a heavy shake.
- **Standoff:** a wide two-shot with large negative space and a slow orbit drift, held in tension.
- **Palette:** desaturated teal-black world, ice-cyan VELOCITY, ink and ultraviolet VOID with crimson corruption.

Reference-video analysis (choreography/timing only; the video is not stored in the repo): 24 s total. Long held shots of 2–5 s with slow drift, cut by 1–3-frame flash cuts. The teleport reads as "marker first, then instant arrival with flash". Phasing gets a ~2 s close-up on a spiral. Impact uses radial rays and a white-out, then a cut to black. Milestone 01 applies the hold/flash rhythm, the marker-first arrival and the spiral-lens language. Phasing and impact are reserved.

**Shaders/effects:** SpatialDistortion (lens, frame drag, chroma, corruption band, horizon, photon rim, generic shockwave ring) · CinematicGrade (gate, vignette, flash, exposure, grain) · world grid (vertex well + ripples, fragment lattice/survey/ticks/axes/reveal/corruption/fog) · reconstruction (`assemble.glsl`) · streak particles · ribbon trail · accretion · fractured shell · SDF glyphs · atmosphere.

**Dependencies:** each has a reason. `three`, `@react-three/fiber`, `@react-three/postprocessing` + `postprocessing` (pass merging), `gsap` (easing/interpolation engine), `zustand` (tiny UI store reachable outside React), `@fontsource/jetbrains-mono` (self-hosted font for DOM and the glyph atlas).

- **Drei is not used.** Nothing in M01 needs it; the camera, performance monitoring and text are custom and integrated with the engine.
- **Troika is not used.** It lays out text per mesh, asynchronously. VoidShift needs hundreds of glyphs changing at 20 Hz in one draw call, and later needs them to behave as matter (explode, reassemble). An in-house SDF atlas (Felzenszwalb EDT, ~256 KB R8 texture) and an instanced glyph field do that.

## Performance

| Tier | DPR cap | MSAA | Bloom levels | Grid segs | Particles (field / velocity / accretion) | Draw calls | Triangles |
|---|---|---|---|---|---|---|---|
| ULTRA | 2.0 | 4 | 8 | 320 | 7000 / 1400 / 5000 | ~30–33 | ~208k |
| HIGH | 1.5 | 2 | 6 | 220 | 4500 / 900 / 3200 | ~29 | ~100k |
| LITE | 1.25 | 0 | 4 | 128 | 2000 / 450 / 1600 | ~22–25 | ~35k |

Measured with CDP Performance metrics in headless Chromium:

- **Main thread:** script 1.0–2.3 ms per frame and total task 2.0–4.8 ms per frame (LITE phone viewport → ULTRA 1280×720, during the dash/tear and during the hold). That is well inside a 16.6 ms budget.
- **Memory:** heap ~7–14 MB. A heap-snapshot diff over 20 s of playback shows no growth in app objects; the only growth is Chrome's own long-animation-frame timing buffer and JIT code. e2e confirms geometry/texture counts don't grow across 6 quality switches and 3 replays (no GPU leak).
- **Post:** 2 effect passes (distortion; bloom + tone mapping + grade merged) plus bloom's mip chain. The lens returns early outside its influence radius.
- **Allocation:** no per-frame allocation in engine/camera/trail/glyph paths; telemetry strings rebuild at 20 Hz only on change. Textures: glyph atlas 512×512 R8, plus composer targets.
- **Bundle (gzip):** three+postprocessing 203 KB · react+zustand 65 KB · r3f 65 KB · app+gsap 57 KB.
- **Adaptive governor:** after a 2.5 s warm-up, two consecutive 2 s windows below 50 fps (ULTRA) or 34 fps (HIGH) step down one tier. It never upgrades by itself and never overrides a user choice.

## Tests / Verification

- `npm ci`: install/lockfile OK.
- `npm run typecheck` (tsc 6, strict): pass.
- `npm run lint` (ESLint 10 + typescript-eslint + react-hooks 7): pass.
- `npm test` (Vitest): **54/54 pass**. Covers engine determinism (play vs seek, backward/forward seek, replay), cue firing/suppression, phase events, dt clamping, fixed step, skip/complete, reduced-motion branch and mid-sequence switch, camera framing/damping/shake/apply, quality profiles/detection/governor hysteresis, store rules, SDF/EDT exactness, glyph encoding/formatting/scramble, particle-buffer prefix stability, trail ring buffer, letterbox math.
- `npm run build`: pass.
- `npm run test:e2e` (Playwright, Chromium + SwiftShader): **6/6 pass**. Covers no console errors/warnings and a lit canvas at desktop/tablet/phone; skip/replay/Esc; system `prefers-reduced-motion` and the toggle; no resource leak across quality switches and replays.
- Visual inspection by screenshot of every beat (full and reduced motion), frame-stepped dash, portrait/tablet framing, and React StrictMode in the dev server.
- Shader compile errors found and fixed during verification: a macro redefinition in merged effect shaders and reversed-edge `smoothstep` calls (undefined in GLSL; produced screen-wide glitches on SwiftShader). Also fixed: an un-windowed lens rotation seam.

**Not verified:** real-GPU frame rate (only software rendering was available), audible audio output (headless), and live DPR change from moving between monitors (handled in code, not exercised).

## Known Issues

- Console warning `THREE.Clock: This module has been deprecated` comes from `@react-three/fiber@9.8.1` internals on three r186. It is harmless, and the e2e filter whitelists it.
- GPU performance targets (60 fps desktop / 30 fps mobile) are designed for but not measured on real hardware.
- Portrait framing preserves the composition (FOV widening, then dolly) but has no portrait-specific choreography yet. Telemetry text is small on phones.
- Audio is a foundation only (procedural blips, sweep, thump, VOID drone). It is off by default, and final sound design is a later milestone.
- The e2e suite needs Chromium with SwiftShader; no CI workflow is configured yet.

## Files / Areas Changed

All files are new in this milestone: build/tooling (`package.json`, lockfile, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`, `playwright.config.ts`, `index.html`, `.gitignore`), `src/**` (architecture above), `e2e/**`, `README.md`, `STATUS.md`.

## Remaining Work

| Milestone | Scope |
|---|---|
| M02 | ENGAGE + PHASE: first exchange, VELOCITY's attack vectors pass through VOID's phasing |
| M03 | TELEPORT + LOCK: coordinate-anchor teleports, deception, target lock |
| M04 | CORE_CHARGE + IMPACT: code core, radial impact, white-out |
| M05 | WORLD_CRASH: code explosion of glyph matter and grid, world destruction |
| M06 | UI_REBUILD → WEBSITE: DOM/WebGL reconstruction into the site and its content sections |
| Later | Final sound design, portrait choreography, CI, real-device profiling |

## Next Target

**Milestone 02: ENGAGE + PHASE.**

- Add `sequences/foundation/engage.ts` and `phase.ts` segments after SPAWN.
- VELOCITY launches vector attacks (dash chains using the existing dash, trail and streak systems, with a new CHASE camera shot).
- VOID phases: attacks pass through corrupted coordinate space, using a phase/dissolve uniform on the distortion effect plus shell fragmentation.
- Introduce stateful (GPGPU or ping-pong) particles only if the phasing debris needs them.
- Add a portrait shot variant to `cameraPresets`.

## Repository / Commit State

- Repository: `abudoxali/VoidShift`
- Branch: `claude/confident-curie-sydv8b`
- Milestone 01 implementation commit: `737873a`. This STATUS update follows it in a separate commit on the same branch.
