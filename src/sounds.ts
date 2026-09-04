/** Short success chime for login (Web Audio — no asset file required). */
export function playLoginSuccessSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    const ctx = new AudioCtx()
    const now = ctx.currentTime
    // Soft major arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5]

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)

      const t0 = now + i * 0.07
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t0)
      osc.stop(t0 + 0.42)
    })

    window.setTimeout(() => {
      void ctx.close().catch(() => undefined)
    }, 900)
  } catch {
    /* autoplay / unsupported — ignore */
  }
}
