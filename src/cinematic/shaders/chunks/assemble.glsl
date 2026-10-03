// ── Reconstruction ──────────────────────────────────────────────────────────
// Geometry assembles from scattered fragments. `order` (0..1) staggers fragments, `spread`
// sets how much of the progress range the stagger occupies. Reused for any "rebuild" beat.
float vsAssemble(float order, float progress, float spread) {
  float start = order * spread;
  return smoothstep(start, start + (1.0 - spread), progress);
}
