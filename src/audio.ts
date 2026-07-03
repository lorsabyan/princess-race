// All sound is synthesized with the Web Audio API — no audio files needed.

const NOTE = {
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
  C6: 1046.5, E6: 1318.5,
}

const MELODY: number[] = [
  NOTE.C5, NOTE.E5, NOTE.G5, NOTE.E5, NOTE.A5, NOTE.G5, NOTE.E5, NOTE.D5,
  NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.A5, NOTE.G5, NOTE.D5, NOTE.E5,
]

export class AudioKit {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private musicTimer: number | null = null
  private melodyStep = 0
  muted = false

  /** Must be called from a user gesture (browser autoplay policy). */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    this.ctx = new AudioContext()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 1
    this.master.connect(this.ctx.destination)
    this.musicGain = this.ctx.createGain()
    this.musicGain.gain.value = 0.055
    this.musicGain.connect(this.master)
  }

  private tone(
    freq: number, duration: number, type: OscillatorType, volume: number,
    destination?: AudioNode, slideTo?: number,
  ) {
    if (!this.ctx || !this.master) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration)
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
    osc.connect(gain)
    gain.connect(destination ?? this.master)
    osc.start(t)
    osc.stop(t + duration + 0.05)
  }

  coin() {
    this.tone(NOTE.A5, 0.09, 'sine', 0.25)
    setTimeout(() => this.tone(NOTE.E6, 0.22, 'sine', 0.25), 70)
  }

  hit() {
    this.tone(180, 0.3, 'triangle', 0.4, undefined, 70)
    this.tone(120, 0.35, 'square', 0.12, undefined, 55)
  }

  gameOver() {
    const notes = [NOTE.G5, NOTE.E5, NOTE.C5]
    notes.forEach((n, i) => setTimeout(() => this.tone(n, 0.4, 'sine', 0.25), i * 220))
  }

  startMusic() {
    this.stopMusic()
    if (!this.ctx || !this.musicGain) return
    this.melodyStep = 0
    const stepMs = 270
    this.musicTimer = window.setInterval(() => {
      const note = MELODY[this.melodyStep % MELODY.length]
      this.tone(note, 0.24, 'triangle', 1, this.musicGain!)
      // Soft bass every other beat
      if (this.melodyStep % 2 === 0) this.tone(note / 2, 0.3, 'sine', 0.6, this.musicGain!)
      this.melodyStep++
    }, stepMs)
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer)
      this.musicTimer = null
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.02)
    }
    return this.muted
  }
}
