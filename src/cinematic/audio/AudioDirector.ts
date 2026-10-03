import type { CinematicEngine } from '../engine/CinematicEngine'
import type { CueEvent } from '../engine/CinematicTimeline'
import { CUES } from '../engine/cues'

/**
 * Cue-driven procedural audio foundation (Web Audio, no assets). Sound is OFF by default and
 * the AudioContext is only created from a user gesture (autoplay policy). Final sound design
 * is a later milestone; this establishes the bus, the cue routing and the VOID drone.
 */
export class AudioDirector {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private droneGain: GainNode | null = null
  private droneLevel = 0
  private noise: AudioBuffer | null = null
  private enabled = false

  async enable(): Promise<void> {
    if (!this.ctx) this.build()
    const ctx = this.ctx!
    await ctx.resume()
    this.enabled = true
    this.master!.gain.setTargetAtTime(0.7, ctx.currentTime, 0.15)
  }

  disable(): void {
    if (!this.ctx || !this.master) return
    this.enabled = false
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08)
  }

  /** Called every frame — only touches audio params when the drone level actually changes. */
  sync(engine: CinematicEngine): void {
    if (!this.enabled || !this.ctx || !this.droneGain) return
    const target = engine.state.void.mass * 0.16
    if (Math.abs(target - this.droneLevel) > 0.004) {
      this.droneLevel = target
      this.droneGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12)
    }
  }

  handleCue(cue: CueEvent): void {
    if (!this.enabled || !this.ctx) return
    switch (cue.name) {
      case CUES.BOOT_PULSE:
        this.blip(1320, 0.06, 0.18)
        break
      case CUES.VELOCITY_TARGET:
        this.blip(1760, 0.04, 0.1)
        this.blip(2350, 0.04, 0.08, 0.07)
        break
      case CUES.VELOCITY_DASH:
        this.sweep(5200, 500, 0.28, 0.35)
        break
      case CUES.VELOCITY_ARRIVE:
        this.thump(90, 38, 0.35, 0.5)
        break
      case CUES.VOID_OPEN:
        this.thump(55, 22, 1.4, 0.9)
        this.sweep(300, 60, 0.9, 0.3)
        break
      case CUES.VELOCITY_LOCK:
        this.blip(880, 0.05, 0.12)
        this.blip(1320, 0.05, 0.12, 0.08)
        this.blip(1760, 0.08, 0.1, 0.16)
        break
      case CUES.VELOCITY_LAUNCH:
        this.sweep(400, 6500, 0.16, 0.4)
        this.thump(140, 60, 0.18, 0.35)
        break
      case CUES.VOID_PHASE:
        // Not an impact: a hollow downward glide where the hit should have been.
        this.glide(520, 70, 0.75, 0.22)
        this.sweep(2400, 180, 0.6, 0.12)
        break
      case CUES.VELOCITY_PASSTHROUGH:
        this.sweep(7000, 500, 0.32, 0.3)
        break
      case CUES.VELOCITY_RECOVER:
        this.blip(660, 0.06, 0.1)
        this.blip(440, 0.1, 0.1, 0.09)
        break
      case CUES.VOID_SPLIT:
        this.sweep(120, 1100, 0.22, 0.25)
        break
    }
  }

  dispose(): void {
    void this.ctx?.close()
    this.ctx = null
  }

  private build(): void {
    const ctx = new AudioContext()
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
    const t = ctx.currentTime + delay
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
    const t = ctx.currentTime
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
    const t = ctx.currentTime
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
    const t = ctx.currentTime
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
