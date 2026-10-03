import { CinematicEngine } from '../engine/CinematicEngine'
import type { SequenceDefinition } from '../engine/CinematicTimeline'
import type { MotionProfile } from '../types'
import type { CueEvent } from '../engine/CinematicTimeline'
import { CUES } from '../engine/cues'

/**
 * Cue-driven procedural audio (Web Audio, no assets). Sound is OFF by default and the
 * AudioContext is only created from a user gesture (autoplay policy). Every sound is
 * synthesised from oscillators and seeded noise, scheduled on an explicit clock so the same
 * score can also be rendered offline (`renderOffline`) for previews.
 */
export class AudioDirector {
  private ctx: BaseAudioContext | null = null
  /** Explicit schedule time (offline rendering); null = the context's live clock. */
  private clock: number | null = null
  private master: GainNode | null = null
  private droneGain: GainNode | null = null
  private droneLevel = 0
  private coreGain: GainNode | null = null
  private coreOsc: OscillatorNode | null = null
  private coreLevel = 0
  private noise: AudioBuffer | null = null
  private enabled = false

  async enable(): Promise<void> {
    if (!this.ctx) this.build()
    const ctx = this.ctx!
    if (ctx instanceof AudioContext) await ctx.resume()
    this.enabled = true
    this.master!.gain.setTargetAtTime(0.7, this.now(), 0.15)
  }

  disable(): void {
    if (!this.ctx || !this.master) return
    this.enabled = false
    this.master.gain.setTargetAtTime(0, this.now(), 0.08)
  }

  /** Called every frame — only touches audio params when levels actually change. */
  sync(engine: CinematicEngine): void {
    if (!this.enabled || !this.ctx || !this.droneGain || !this.coreGain || !this.coreOsc) return
    const s = engine.state
    const t = this.now()
    const drone = s.world.voidField * s.fighters.void.reveal * 0.12
    if (Math.abs(drone - this.droneLevel) > 0.004) {
      this.droneLevel = drone
      this.droneGain.gain.setTargetAtTime(drone, t, 0.12)
    }
    const core = s.core.charge * 0.22 + s.core.overload * 0.1
    if (Math.abs(core - this.coreLevel) > 0.004) {
      this.coreLevel = core
      this.coreGain.gain.setTargetAtTime(core, t, 0.05)
      this.coreOsc.frequency.setTargetAtTime(90 + s.core.charge * 380 + s.core.overload * 520, t, 0.08)
    }
  }

  private now(): number {
    return this.clock ?? this.ctx!.currentTime
  }

  /**
   * Renders the full score of a sequence offline: cues at their timeline times, drone and core
   * levels sampled at 60 Hz from a private engine. Deterministic; used for preview exports.
   */
  static async renderOffline(sequence: SequenceDefinition, motion?: MotionProfile, sampleRate = 48000): Promise<AudioBuffer> {
    const engine = new CinematicEngine({ sequence, motion, autoplay: false })
    const ctx = new OfflineAudioContext(2, Math.ceil((engine.duration + 2) * sampleRate), sampleRate)
    const director = new AudioDirector()
    director.build(ctx)
    director.enabled = true
    director.master!.gain.value = 0.7
    let next = 0
    const cues = engine.cues
    for (let frame = 0; ; frame++) {
      const t = Math.min(frame / 60, engine.duration)
      engine.seek(t)
      director.clock = t
      director.sync(engine)
      while (next < cues.length && cues[next].time <= t) director.handleCue(cues[next++])
      if (t >= engine.duration) break
    }
    engine.dispose()
    return ctx.startRendering()
  }

  handleCue(cue: CueEvent): void {
    if (!this.enabled || !this.ctx) return
    switch (cue.name) {
      case CUES.BOOT_PULSE:
        this.blip(880, 0.08, 0.14)
        break
      case CUES.VELOCITY_ASSEMBLE:
        this.sweep(700, 5200, 0.8, 0.22)
        this.blip(1760, 0.1, 0.08, 0.6)
        break
      case CUES.VOID_OPEN:
        this.thump(55, 22, 1.2, 0.8)
        this.glide(320, 60, 1.0, 0.2)
        break
      case CUES.VELOCITY_DASH:
        this.sweep(400, 6500, 0.16, 0.4)
        this.thump(140, 60, 0.15, 0.35)
        break
      case CUES.VOID_PHASE:
        this.glide(520, 70, 0.6, 0.22)
        this.sweep(2400, 180, 0.5, 0.12)
        break
      case CUES.VELOCITY_SKID:
        this.sweep(3200, 700, 0.32, 0.25)
        break
      case CUES.CLASH:
        this.blip(2400, 0.03, 0.18)
        this.sweep(6500, 1800, 0.09, 0.35)
        this.thump(220, 90, 0.12, 0.4)
        break
      case CUES.VOID_COUNTER:
        this.thump(70, 32, 0.5, 0.6)
        this.sweep(160, 60, 0.4, 0.2)
        break
      case CUES.LAND:
        this.thump(110, 45, 0.25, 0.45)
        break
      case CUES.VOID_GRAB:
        this.glide(300, 140, 0.3, 0.15)
        break
      case CUES.ANCHOR_THROW:
        this.sweep(1500, 7000, 0.2, 0.3)
        this.blip(1760, 0.05, 0.1)
        break
      case CUES.ANCHOR_PLANT:
        this.thump(180, 90, 0.2, 0.4)
        this.blip(990, 0.8, 0.12)
        this.blip(1485, 0.6, 0.06, 0.02)
        break
      case CUES.TELEPORT_OUT:
        this.sweep(6000, 260, 0.12, 0.4)
        this.blip(3200, 0.04, 0.12)
        break
      case CUES.TELEPORT_IN:
        this.sweep(260, 5200, 0.26, 0.32)
        this.blip(2200, 0.06, 0.1, 0.2)
        break
      case CUES.VOID_REALIZE:
        this.glide(200, 430, 0.35, 0.16)
        break
      case CUES.CORE_FORM:
        this.sweep(200, 2400, 1.6, 0.12)
        break
      case CUES.VOID_PHASE_FAIL:
        for (let i = 0; i < 5; i++) this.blip(300 + i * 230, 0.025, 0.08, i * 0.04)
        break
      case CUES.IMPACT:
        this.thump(62, 24, 1.8, 1.0)
        this.sweep(5500, 70, 1.9, 0.75)
        this.blip(4200, 0.05, 0.2)
        break
      case CUES.EXPLOSION:
        this.sweep(420, 38, 3.2, 0.55)
        this.thump(45, 20, 2.6, 0.6)
        break
      case CUES.AFTERMATH:
        // A high ring hanging in the air, and debris settling.
        this.blip(1760, 2.8, 0.05)
        this.blip(2637, 2.2, 0.025, 0.05)
        for (let i = 0; i < 7; i++) this.blip(2400 + ((i * 1373) % 2600), 0.03, 0.05, 0.25 + i * 0.21 + ((i * 37) % 11) * 0.02)
        break
    }
  }

  dispose(): void {
    if (this.ctx instanceof AudioContext) void this.ctx.close()
    this.ctx = null
  }

  private build(ctx: BaseAudioContext = new AudioContext()): void {
    const master = ctx.createGain()
    master.gain.value = 0
    const limiter = ctx.createDynamicsCompressor()
    master.connect(limiter).connect(ctx.destination)

    // VOID drone: two detuned saws, low-passed, level follows the void's mass.
    const droneGain = ctx.createGain()
    droneGain.gain.value = 0
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 150
    lp.connect(droneGain).connect(master)
    for (const f of [36.7, 37.15, 55.2]) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = f
      o.connect(lp)
      o.start()
    }

    // Code Core voice: a filtered saw whose pitch rises with the charge.
    const coreGain = ctx.createGain()
    coreGain.gain.value = 0
    const coreFilter = ctx.createBiquadFilter()
    coreFilter.type = 'bandpass'
    coreFilter.frequency.value = 900
    coreFilter.Q.value = 0.8
    const coreOsc = ctx.createOscillator()
    coreOsc.type = 'sawtooth'
    coreOsc.frequency.value = 90
    coreOsc.connect(coreFilter).connect(coreGain).connect(master)
    coreOsc.start()
    this.coreGain = coreGain
    this.coreOsc = coreOsc

    const len = ctx.sampleRate
    const noise = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = noise.getChannelData(0)
    let seed = 1
    for (let i = 0; i < len; i++) {
      seed = (seed * 16807) % 2147483647
      data[i] = (seed / 2147483647) * 2 - 1
    }

    this.ctx = ctx
    this.master = master
    this.droneGain = droneGain
    this.noise = noise
  }

  private env(gain: GainNode, peak: number, attack: number, decay: number, at: number): void {
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(peak, at + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  }

  private blip(freq: number, dur: number, level: number, delay = 0): void {
    const ctx = this.ctx!
    const t = this.now() + delay
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = freq
    o.connect(g).connect(this.master!)
    this.env(g, level, 0.003, dur, t)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  /** Detuned pair gliding in pitch — used for the phase event. */
  private glide(from: number, to: number, dur: number, level: number): void {
    const ctx = this.ctx!
    const t = this.now()
    const g = ctx.createGain()
    g.connect(this.master!)
    this.env(g, level, 0.02, dur, t)
    for (const detune of [-12, 9]) {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.detune.value = detune
      o.frequency.setValueAtTime(from, t)
      o.frequency.exponentialRampToValueAtTime(to, t + dur)
      o.connect(g)
      o.start(t)
      o.stop(t + dur + 0.1)
    }
  }

  private thump(from: number, to: number, dur: number, level: number): void {
    const ctx = this.ctx!
    const t = this.now()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(from, t)
    o.frequency.exponentialRampToValueAtTime(to, t + dur)
    o.connect(g).connect(this.master!)
    this.env(g, level, 0.005, dur, t)
    o.start(t)
    o.stop(t + dur + 0.1)
  }

  private sweep(from: number, to: number, dur: number, level: number): void {
    const ctx = this.ctx!
    const t = this.now()
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 2.5
    bp.frequency.setValueAtTime(from, t)
    bp.frequency.exponentialRampToValueAtTime(to, t + dur)
    const g = ctx.createGain()
    src.connect(bp).connect(g).connect(this.master!)
    this.env(g, level, 0.01, dur, t)
    src.start(t)
    src.stop(t + dur + 0.1)
  }
}
