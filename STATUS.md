# VoidShift — STATUS

## Project

VoidShift is a real-time, code-driven cinematic web experience. The website *is* the animation. Two original characters fight in a short, fast, deterministic sequence rendered live in WebGL (three.js + React Three Fiber). No anime characters, frames, models, logos or audio are reproduced.

- **AERON** (internal id `velocity`): precise, lean and fast. Vector Dash, Coordinate Anchor, Blink Reconstruction, Momentum Redirect, Code Core.
- **NOX** (internal id `void`): heavier, phasing and dimensional. Phase, Spatial Fold, Void Guard, Counter Shift, Fracture Field.

The live GitHub Pages build is the source of visual truth: <https://abudoxali.github.io/VoidShift/>

## Current Completion

**40%.** This is unchanged: it is the last accepted state. It will not move until the live rebuild passes the owner's review of the deployed site.

## Current State: VISUAL REBUILD / LIVE REVIEW

The first Milestone 03 visuals (placeholder figures, unclear contact, environment overpowering the fight) were rejected. MP4/video export work is stopped and its code removed. Work now follows this loop: inspect → implement → build → deploy to Pages → inspect the deployed site in motion (desktop, phone, `?fx=off`) → fix → redeploy.

Priority order: character identity → animation → choreography → camera → lighting → VFX → environment.

### Review URLs

| What | URL |
|---|---|
| Live | <https://abudoxali.github.io/VoidShift/> |
| Review mode | <https://abudoxali.github.io/VoidShift/?review=1> |
| Character sheet / reveal | <https://abudoxali.github.io/VoidShift/?review=1&sheet=characters> |
| Arrival | <https://abudoxali.github.io/VoidShift/?review=1&scene=arrival> |
| Close combat | <https://abudoxali.github.io/VoidShift/?review=1&scene=close-combat> |
| Teleport | <https://abudoxali.github.io/VoidShift/?review=1&scene=teleport> |
| Code Core | <https://abudoxali.github.io/VoidShift/?review=1&scene=core> |
| Impact | <https://abudoxali.github.io/VoidShift/?review=1&scene=impact> |
| Readability test | append `&fx=off` to any of the above |

All 13 scene ids are valid for `scene=`: `arrival, standoff, first-attack, close-combat, strategy, anchor, second-attack, teleport, reversal, core, strike, impact, aftermath`.

### Review mode (`?review=1`, hidden from visitors)

The panel offers:

- Play/Pause, Restart, previous/next shot, a timeline scrubber, and a scene selector.
- Readouts for time, scene and shot.
- An FX full/off toggle.
- Camera debug (thirds, plus shot name, position, target and FOV).
- Skeleton debug (energy skeleton lines).
- Slow motion ×0.25.
- A quality tier selector.

Scene jumps seek the deterministic timeline, so a jump equals seeking to the scene's time (tested).

`?fx=off` removes everything that is not a character or the floor: distortion, bloom, flash, invert, speed lines, radial rays, grain, bursts, impact debris, glyphs, background field, trails, ghosts, and Code Core arcs.

## Character System

- **Anatomy:**
  - Lofted superellipse bodies: head, face plane, neck, shoulders, chest, waist, pelvis, arms, hands and legs.
  - The feet are rigid parts on an 18-joint rig.
  - The head (`features.ts`) has a skull loft, brow ridge, cheek planes, nose, jaw, chin, ears, eye sockets, emissive eyes (kept below bloom blow-out) and a mouth line.
- **Hands:** separate open and fist geometries, switched per pose (`hands: open | fist | blade`). The hidden variant is collapsed in the batch.
- **AERON:**
  - narrow cyan eyes and swept crystalline hair plates;
  - a dark fitted suit with cyan seams, an asymmetric shoulder plate, forearm armour and reinforced boots;
  - a camera-facing energy scarf (2 Verlet strips) and a cloth waist sash (2 strips).
- **NOX:**
  - broader proportions, a hood and mantle, a fractured half-mask with a visible jaw, and narrow violet/red eyes;
  - layered armour with broken plates and asymmetric shoulders;
  - shoulder fragments that flicker when he phases, and 5 orbiting shards;
  - a 6-strip cloak with body colliders, plus an additive echo body while phased.
- **Rigid batching:** every fighter part is skinned in one draw per material (`RigidBatch`, per-part matrices in a float texture).
- **Poses:**
  - `PoseSpec` with hips, joints, hand shapes and planted feet;
  - two-bone leg IK keeps planted feet fixed (< 1 cm drift, tested);
  - AERON has 25 poses and NOX 17.
- **Dissolve / reconstruction:** a world-noise dissolve led by an energy skeleton (skeleton → fragments → body → scarf).

## Choreography (18.0 s, 13 scenes)

| # | Scene | Content |
|---|---|---|
| 1 | Arrival | NOX is already there; AERON reconstructs (skeleton first). |
| 2 | Standoff | Eye inserts on each fighter, then a low stance. |
| 3 | First attack | Dash, lead step, right straight. NOX phases at contact only; the fist passes through his upper torso (slowed at penetration only). NOX reforms and counters with an elbow; AERON ducks under it. |
| 4 | Close combat | A body kick blocked low, a grab that misses, a rotate-out, and a spinning kick through NOX's head as he phases. |
| 5 | Failed strategy | Back-step, then a close-up on AERON's eyes: ordinary hits fail. |
| 6 | Anchor | A geometric blade-beacon forms in his hand. He throws it with a full arm action; NOX's eyes follow it; it plants behind NOX. |
| 7 | Second attack | AERON dashes in. |
| 8 | Teleport | Fragmentation → light collapse → empty frame → anchor flare → reconstruction behind and above NOX. |
| 9 | Reversal | NOX turns head → shoulders → guard, too late. |
| 10 | Code Core | Charges in AERON's hand (0→1 in under 1 s) and lights his face, hand and NOX. |
| 11 | Final strike | Shoulder → torso → arm → core, driven into NOX's upper back. |
| 12 | Impact | Contact first (bodies readable for ~0.15 s), then light, shock, crater and debris symbols. NOX collapses. |
| 13 | Aftermath | AERON lands and recovers; exposure falls. |

Contact is tested geometrically on the real posed rigs: the punch passes through the chest while phased, the elbow passes over the ducked head, the kick reaches the head within 0.3 m, the anchor leaves the hand within 0.2 m, and the core is within 0.25 m of the neck at contact.

## Camera

- There are 28 named shots, each a hard cut with a stated subject.
  - Full-body shots declare `fullBody` subjects.
  - A framing test projects heads, hands and feet through the real camera and the 2.2:1 letterbox for every frame at 30 Hz; at most 2 edge frames are tolerated.
- Shot types: wide, two-shot, profile, low, OTS, eye close-ups, hand insert, and hero.
- Portrait recomposes only the camera; the choreography is identical (tested).

## Lighting

- A camera-relative soft key keeps faces readable without raising exposure.
- Rim lights are narrow spots aimed at their own fighter: cyan for AERON and desaturated violet for NOX. They no longer tint the other fighter's face.
- Limb trails are limited to the striking hand and the kicking foot, and only at real speed, so the silhouette stays readable.
- Each fighter carries an energy light at the chest. The Code Core and the impact carry their own lights.
- The atmosphere steps back during the first attack and close combat, and returns at the strategy beat.

## Draw Calls

Measured on the deployed build with `renderer.info` during frame-stepped playback of the whole fight. Totals include post-processing passes.

| Tier | Range | Peak |
|---|---|---|
| ULTRA 1280×720 | 27–49 | impact |
| LITE | ~39–49 | — |

This pass brought ULTRA down from 35–61 by:

- merging the anchor from 9 draws to 4;
- reducing limb trails from 4 to 2, and drawing them only while visible;
- hiding spent impact layers;
- using 6 bloom mip levels instead of 8.

Fighters render in ≤ 6 (AERON) and ≤ 8 (NOX) draws (tested). No FPS figure is claimed: only software rendering (SwiftShader) was available, and no real-GPU measurement has been made.

## Tests / Verification

- `npm run typecheck`, `npm run lint`, `npm test` (91 unit tests) and `npm run build` all pass.
- `npm run test:e2e` passes 13/13:
  - final hold at 3 viewports;
  - frame-stepped playback (first attack, teleport, impact) at desktop and phone with no console errors;
  - aftermath hold; skip/replay; reduced motion;
  - no GPU-resource growth across quality switches and replays;
  - **review panel hidden for visitors**;
  - **review controls + scene URL**;
  - **FX off renders the characters**;
  - **no resource growth across repeated scene jumps**.
- Unit coverage includes:
  - structure (18–24 s, 13 scenes in order, ≥ 24 named cuts, no overlapping tweens);
  - determinism (play ≡ seek; scene jump ≡ seek);
  - cues once and in order, and cue suppression on seek;
  - slow motion;
  - choreography, framing and contact contracts;
  - reduced motion (no shake, impact frames or speed lines; < 10 u/s);
  - portrait;
  - IK plant and hand shapes;
  - batch draw budgets.
- Live inspection is done with Playwright against the deployed site: desktop 1280×720, phone 390×844, and `?fx=off`.

## Known Visual Weaknesses

- The figures are procedural low-poly lofts: readable as two people with faces and costumes, but not yet at hand-sculpted quality. Facial planes are small at wide-shot distance.
- Cloth is a light Verlet ribbon system: there is no self-collision, and the cloak can clip on extreme poses.
- The teleport reconstruction and impact light are short. On a slow software renderer, single frames can look harsher than at 60 fps.
- Hands at wide-shot distance read mainly by silhouette.
- Audio is procedural placeholder.
- Real-GPU performance has not been measured.

## Repository / Commit State

- Repository: `abudoxali/VoidShift`. Work branch: `claude/confident-curie-sydv8b`. Draft PR #1.
- Pages is deployed from the work branch by the `pages-preview.yml` workflow (`workflow_dispatch`, base `/VoidShift/`).
- The default branch is still `claude/confident-curie-sydv8b`. A repository admin can change it under Settings → General → Default branch.
