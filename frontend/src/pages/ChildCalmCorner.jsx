import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaCloudRain, FaHome, FaLeaf, FaMusic, FaVolumeUp } from 'react-icons/fa'
import { getSelectedChild, preferencesApi } from '../services/api'
import '../styles/ChildCalmCorner.css'

const defaultRegulationConfig = {
  method: 'breathing',
  contact: 'Mẹ',
  alertAfter: '60',
  quietMode: true,
}

const methodLabels = {
  breathing: 'Hít thở theo nhịp',
  quiet: 'Góc yên tĩnh',
  music: 'Âm thanh nhẹ',
  parent: 'Gọi người hỗ trợ',
}

const alertAfterLabels = {
  60: '1 phút',
  120: '2 phút',
}

const soundOptions = [
  {
    id: 'rain',
    label: 'Mưa nhẹ',
    helper: 'Tiếng mưa rơi êm',
    icon: FaCloudRain,
  },
  {
    id: 'nature',
    label: 'Thiên nhiên',
    helper: 'Âm thanh ngoài vườn',
    icon: FaLeaf,
  },
  {
    id: 'piano',
    label: 'Piano',
    helper: 'Nốt nhạc chậm',
    icon: FaMusic,
  },
]

function createAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  return AudioContext ? new AudioContext() : null
}

function playSoftTone(context, output, frequency, options = {}) {
  const now = options.startTime ?? context.currentTime
  const duration = options.duration ?? 0.8
  const peak = options.peak ?? 0.04
  const oscillator = context.createOscillator()
  const envelope = context.createGain()

  oscillator.type = options.type ?? 'sine'
  oscillator.frequency.setValueAtTime(frequency, now)
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, now + duration)
  }

  envelope.gain.setValueAtTime(0.0001, now)
  envelope.gain.linearRampToValueAtTime(peak, now + 0.12)
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  oscillator.connect(envelope)
  envelope.connect(output)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.04)
}

function createRainTrack(context) {
  const bufferSize = Math.floor(context.sampleRate * 2)
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate)
  const data = buffer.getChannelData(0)

  for (let index = 0; index < bufferSize; index += 1) {
    data[index] = (Math.random() * 2 - 1) * 0.35
  }

  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()

  source.buffer = buffer
  source.loop = true
  filter.type = 'lowpass'
  filter.frequency.value = 900
  gain.gain.value = 0.05

  source.connect(filter)
  filter.connect(gain)
  gain.connect(context.destination)
  source.start()

  return () => {
    try {
      source.stop()
    } catch {
      // Source may already be stopped by the browser.
    }
    source.disconnect()
    filter.disconnect()
    gain.disconnect()
  }
}

function createNatureTrack(context) {
  const gain = context.createGain()
  gain.gain.value = 0.18
  gain.connect(context.destination)

  const playNatureCue = () => {
    const now = context.currentTime
    playSoftTone(context, gain, 880, {
      startTime: now,
      duration: 0.55,
      peak: 0.035,
      endFrequency: 1120,
    })
    playSoftTone(context, gain, 1180, {
      startTime: now + 0.22,
      duration: 0.5,
      peak: 0.03,
      endFrequency: 980,
    })
  }

  playNatureCue()
  const intervalId = window.setInterval(playNatureCue, 5200)

  return () => {
    window.clearInterval(intervalId)
    gain.disconnect()
  }
}

function createPianoTrack(context) {
  const gain = context.createGain()
  const notes = [261.63, 329.63, 392.0, 329.63]
  let noteIndex = 0

  gain.gain.value = 0.16
  gain.connect(context.destination)

  const playPianoCue = () => {
    const now = context.currentTime
    const root = notes[noteIndex % notes.length]
    playSoftTone(context, gain, root, {
      startTime: now,
      duration: 1.8,
      peak: 0.035,
      type: 'triangle',
    })
    playSoftTone(context, gain, root * 1.5, {
      startTime: now + 0.18,
      duration: 1.6,
      peak: 0.022,
      type: 'triangle',
    })
    noteIndex += 1
  }

  playPianoCue()
  const intervalId = window.setInterval(playPianoCue, 3600)

  return () => {
    window.clearInterval(intervalId)
    gain.disconnect()
  }
}

function createSoundTrack(context, soundId) {
  if (soundId === 'rain') return createRainTrack(context)
  if (soundId === 'nature') return createNatureTrack(context)
  return createPianoTrack(context)
}

function normalizeRegulationConfig(value) {
  if (!value || typeof value !== 'object') return defaultRegulationConfig

  return {
    method: ['breathing', 'quiet', 'music', 'parent'].includes(value.method)
      ? value.method
      : defaultRegulationConfig.method,
    contact: typeof value.contact === 'string' && value.contact.trim()
      ? value.contact.trim()
      : defaultRegulationConfig.contact,
    alertAfter: ['60', '120'].includes(String(value.alertAfter))
      ? String(value.alertAfter)
      : defaultRegulationConfig.alertAfter,
    quietMode: typeof value.quietMode === 'boolean' ? value.quietMode : defaultRegulationConfig.quietMode,
  }
}

function getGuidanceText(config) {
  if (config.method === 'quiet') {
    return 'Con hãy ngồi ở nơi yên tĩnh. Đặt hai tay lên bụng. Hít vào chậm. Thở ra chậm.'
  }

  if (config.method === 'music') {
    return 'Con có thể chọn âm thanh nhẹ. Sau đó hít vào chậm và thở ra thật nhẹ nhàng.'
  }

  if (config.method === 'parent') {
    return `Nếu con cần giúp đỡ, con có thể gọi ${config.contact}. Bây giờ mình cùng hít vào và thở ra chậm.`
  }

  return 'Con hãy đặt hai tay lên bụng. Hít vào thật chậm. Thở ra nhẹ nhàng. Con đang an toàn.'
}

export default function ChildCalmCorner() {
  const navigate = useNavigate()
  const audioRef = useRef({ context: null, tracks: {} })
  const [regulationConfig, setRegulationConfig] = useState(() => {
    const child = getSelectedChild()
    return normalizeRegulationConfig(child?.preferences?.preferences?.regulation)
  })
  const [breathPhase, setBreathPhase] = useState('inhale')
  const [activeSounds, setActiveSounds] = useState([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showExitChoice, setShowExitChoice] = useState(false)
  const [audioMessage, setAudioMessage] = useState('')

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setBreathPhase((phase) => (phase === 'inhale' ? 'exhale' : 'inhale'))
    }, 4000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const child = getSelectedChild()
    if (!child?.id) return

    let mounted = true
    preferencesApi.get(child.id)
      .then((result) => {
        if (!mounted) return
        const regulation = result.preferences?.preferences?.regulation
        if (regulation) setRegulationConfig(normalizeRegulationConfig(regulation))
      })
      .catch(() => {
        // The calm corner still works with the default HCI-safe settings.
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const audioState = audioRef.current

    return () => {
      Object.values(audioState.tracks).forEach((stopTrack) => stopTrack())
      audioState.tracks = {}
      if (audioState.context) {
        audioState.context.close()
      }
      window.speechSynthesis?.cancel()
    }
  }, [])

  const ensureAudioContext = async () => {
    if (!audioRef.current.context) {
      audioRef.current.context = createAudioContext()
    }

    const context = audioRef.current.context
    if (!context) {
      setAudioMessage('Trình duyệt chưa hỗ trợ âm thanh thư giãn.')
      return null
    }

    if (context.state === 'suspended') {
      await context.resume()
    }

    setAudioMessage('')
    return context
  }

  const toggleSound = async (soundId) => {
    const existingTrack = audioRef.current.tracks[soundId]

    if (existingTrack) {
      existingTrack()
      delete audioRef.current.tracks[soundId]
      setActiveSounds((sounds) => sounds.filter((id) => id !== soundId))
      return
    }

    const context = await ensureAudioContext()
    if (!context) return

    audioRef.current.tracks[soundId] = createSoundTrack(context, soundId)
    setActiveSounds((sounds) => [...sounds, soundId])
  }

  const playVoiceCue = () => {
    if (!window.speechSynthesis) {
      setIsSpeaking(true)
      window.setTimeout(() => setIsSpeaking(false), 3800)
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(getGuidanceText(regulationConfig))
    utterance.lang = 'vi-VN'
    utterance.rate = 0.78
    utterance.pitch = 1
    utterance.volume = 0.9
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  const goHome = () => {
    setShowExitChoice(false)
    navigate('/child/home')
  }

  const phaseLabel = breathPhase === 'inhale' ? 'Hít vào...' : 'Thở ra...'
  const phaseCount = breathPhase === 'inhale' ? '4 nhịp' : '4 nhịp'
  const methodLabel = methodLabels[regulationConfig.method] || methodLabels.breathing
  const alertAfterLabel = alertAfterLabels[regulationConfig.alertAfter] || alertAfterLabels[60]

  return (
    <div className={`calm-corner-page ${regulationConfig.quietMode ? 'quiet-mode' : ''}`}>
      <button className="calm-safe-exit" onClick={() => setShowExitChoice(true)}>
        <FaHome aria-hidden="true" />
        <span>Trang chủ</span>
      </button>

      <main className="calm-shell">
        <header className="calm-header">
          <p>Góc bình tĩnh</p>
          <h1>Con hãy thở chậm cùng bong bóng</h1>
        </header>

        <section className="calm-preference-note" aria-label="Thiết lập điều hòa của phụ huynh">
          <span>Gợi ý của ba mẹ</span>
          <strong>{methodLabel}</strong>
          <p>Người hỗ trợ: {regulationConfig.contact} · Cảnh báo sau: {alertAfterLabel}</p>
        </section>

        <section className="breathing-guide" aria-label="Hướng dẫn nhịp thở">
          <div className={`breath-bubble breath-${breathPhase}`} aria-live="polite">
            <span className="breath-label">{phaseLabel}</span>
            <span className="breath-count">{phaseCount}</span>
          </div>
        </section>

        <section className="soundscape-section" aria-label="Âm thanh thư giãn">
          <div className="calm-section-heading">
            <h2>Âm thanh nhẹ</h2>
            <p>Chọn âm thanh giúp con thấy dễ chịu.</p>
          </div>

          <div className="soundscape-grid">
            {soundOptions.map((option) => {
              const Icon = option.icon
              const isActive = activeSounds.includes(option.id)

              return (
                <button
                  key={option.id}
                  className={`soundscape-button ${isActive ? 'active' : ''}`}
                  onClick={() => toggleSound(option.id)}
                  aria-pressed={isActive}
                >
                  <Icon className="soundscape-icon" aria-hidden="true" />
                  <strong>{option.label}</strong>
                  <span>
                    {isActive
                      ? 'Đang bật'
                      : regulationConfig.method === 'music' && option.id === 'piano'
                        ? 'Gợi ý của ba mẹ'
                        : option.helper}
                  </span>
                </button>
              )
            })}
          </div>
          {audioMessage && <p className="calm-audio-message">{audioMessage}</p>}
        </section>

        <section className="voice-cue-section" aria-label="Trợ lý giọng nói">
          <button className={`voice-cue-button ${isSpeaking ? 'active' : ''}`} onClick={playVoiceCue}>
            <FaVolumeUp className="voice-cue-icon" aria-hidden="true" />
            <span>Nghe hướng dẫn</span>
            <span className="voice-wave" aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
            </span>
          </button>
        </section>
      </main>

      {showExitChoice && (
        <div className="calm-exit-layer" role="dialog" aria-modal="true">
          <div className="calm-exit-dialog">
            <h2>Bé đã thấy thoải mái hơn chưa?</h2>
            <p>Chúng mình cùng quay lại bài học nhé!</p>
            <div className="calm-exit-actions">
              <button className="calm-exit-stay" onClick={() => setShowExitChoice(false)}>
                Ở lại thêm
              </button>
              <button className="calm-exit-go" onClick={goHome}>
                Quay lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
