/** Pick the closest Jarvis-like system voice (British / deep male when available). */
function pickJarvisVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices?.() || []
  if (!voices.length) return null

  const scored = voices.map((voice) => {
    const name = `${voice.name} ${voice.lang}`.toLowerCase()
    let score = 0
    if (voice.lang.toLowerCase().startsWith('en-gb')) score += 8
    else if (voice.lang.toLowerCase().startsWith('en')) score += 3
    if (/daniel|arthur|thomas|george|rishi|male|uk|british|en-gb/.test(name)) score += 6
    if (/female|zira|samantha|karen|moira|fiona|veena|google uk english female/.test(name)) score -= 10
    return { voice, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.score > 0 ? scored[0].voice : voices.find((v) => v.lang.startsWith('en')) || voices[0]
}

function speakAccessGranted() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

  const utter = new SpeechSynthesisUtterance('Access granted.')
  utter.rate = 0.88
  utter.pitch = 0.72
  utter.volume = 1

  const voice = pickJarvisVoice()
  if (voice) utter.voice = voice

  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utter)
}

/** Jarvis-style “Access granted” on successful login. */
export function playLoginSuccessSound() {
  try {
    if (!('speechSynthesis' in window)) return

    // Voices often load async on first use
    const voices = window.speechSynthesis.getVoices()
    if (!voices.length) {
      window.speechSynthesis.addEventListener(
        'voiceschanged',
        () => {
          speakAccessGranted()
        },
        { once: true },
      )
      // Fallback if voiceschanged never fires
      window.setTimeout(() => speakAccessGranted(), 120)
      return
    }

    speakAccessGranted()
  } catch {
    /* unsupported / blocked — ignore */
  }
}
