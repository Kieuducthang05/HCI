import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSelectedChild, trackingApi } from '../services/api'
import '../styles/Child.css'

const emotions = [
  {
    id: 'happy',
    label: 'Vui',
    icon: '😊',
    color: '#f6c453',
    phrase: 'Con đang cảm thấy vui.',
    suggestion: 'Con có thể chia sẻ niềm vui này với bố mẹ hoặc bạn bè.'
  },
  {
    id: 'sad',
    label: 'Buồn',
    icon: '😢',
    color: '#6aa6d9',
    phrase: 'Con đang cảm thấy buồn.',
    suggestion: 'Con có thể ngồi nghỉ một chút và nói với người lớn điều làm con buồn.'
  },
  {
    id: 'angry',
    label: 'Tức giận',
    icon: '😠',
    color: '#e87461',
    phrase: 'Con đang cảm thấy tức giận.',
    suggestion: 'Con hãy thử hít vào chậm, thở ra chậm rồi nói điều con cần.'
  },
  {
    id: 'scared',
    label: 'Sợ',
    icon: '😟',
    color: '#9b8ac6',
    phrase: 'Con đang cảm thấy sợ.',
    suggestion: 'Con có thể tìm nơi yên tĩnh và gọi bố mẹ hoặc cô giáo giúp con.'
  },
  {
    id: 'calm',
    label: 'Bình tĩnh',
    icon: '😌',
    color: '#77bfa3',
    phrase: 'Con đang cảm thấy bình tĩnh.',
    suggestion: 'Con đang làm rất tốt. Hãy tiếp tục giữ nhịp thở nhẹ nhàng.'
  }
]

const regulationSteps = [
  'Đặt hai tay lên bụng.',
  'Hít vào trong 4 nhịp.',
  'Giữ yên trong 2 nhịp.',
  'Thở ra thật chậm trong 6 nhịp.'
]

export default function ChildEmotion() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [selectedEmotion, setSelectedEmotion] = useState(emotions[0])
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [saveMessage, setSaveMessage] = useState('')

  const oppositeHint = useMemo(() => {
    if (selectedEmotion.id === 'happy' || selectedEmotion.id === 'calm') {
      return 'Người đối diện có thể thấy con đang thoải mái. Con có thể mỉm cười và nói lời cảm ơn.'
    }

    return 'Người đối diện có thể chưa hiểu con cần gì. Con hãy chọn câu nói ngắn và nhờ người lớn giúp.'
  }, [selectedEmotion])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const speak = (text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'vi-VN'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }

  const startCamera = async () => {
    setCameraError('')
    setScanResult(null)
    setSaveMessage('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsCameraOn(true)
    } catch {
      setCameraError('Không mở được camera. Hãy kiểm tra quyền truy cập camera của trình duyệt.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraOn(false)
  }

  const scanExpression = () => {
    if (!isCameraOn) {
      setCameraError('Bật camera trước khi kiểm tra biểu cảm.')
      return
    }

    const confidence = 82 + Math.floor(Math.random() * 14)
    const result = {
      icon: selectedEmotion.icon,
      confidence,
      message: `Biểu cảm của con đang gần với cảm xúc "${selectedEmotion.label}".`
    }
    setScanResult(result)

    const child = getSelectedChild()
    if (!child?.id) {
      setSaveMessage('Chưa chọn tài khoản trẻ nên chưa lưu nhật ký.')
      return
    }

    trackingApi.recordEmotionLog(child.id, {
      emotion_value: selectedEmotion.id,
      trigger_source: 'WEBCAM',
      ai_emotion_label: selectedEmotion.id,
      ai_confidence: confidence / 100,
      confidence_score: confidence / 100,
      metadata: {
        source: 'child-emotion-page',
        simulated: true,
      },
    })
      .then(() => setSaveMessage('Đã lưu cảm xúc vào nhật ký.'))
      .catch(() => setSaveMessage('Chưa lưu được nhật ký. Hãy kiểm tra kết nối backend.'))
  }

  return (
    <div className="child-emotion-page">
      <div className="emotion-tool-header">
        <div>
          <h2>Cảm xúc của con</h2>
          <p>Chọn cảm xúc, nghe câu nói mẫu và kiểm tra biểu cảm bằng camera.</p>
        </div>
        <button className="close-btn" onClick={() => navigate('/child/home')}>×</button>
      </div>

      <section className="emotion-picker-panel">
        <h3>Con đang cảm thấy thế nào?</h3>
        <div className="emotion-choice-grid">
          {emotions.map((emotion) => (
            <button
              key={emotion.id}
              className={`emotion-choice ${selectedEmotion.id === emotion.id ? 'selected' : ''}`}
              style={{ borderColor: emotion.color }}
              onClick={() => {
                setSelectedEmotion(emotion)
                setScanResult(null)
                setSaveMessage('')
              }}
            >
              <span className="emotion-choice-icon">{emotion.icon}</span>
              <span>{emotion.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="expression-panel">
        <div className="expression-card-main" style={{ borderColor: selectedEmotion.color }}>
          <div className="selected-emotion-icon">{selectedEmotion.icon}</div>
          <div>
            <h3>{selectedEmotion.phrase}</h3>
            <p>{selectedEmotion.suggestion}</p>
          </div>
          <button className="speak-btn" onClick={() => speak(selectedEmotion.phrase)}>
            🔊 Đọc câu này
          </button>
        </div>

        <div className="camera-panel">
          <div className="camera-preview">
            {isCameraOn ? (
              <video ref={videoRef} autoPlay playsInline muted />
            ) : (
              <div className="camera-placeholder">
                <span>📷</span>
                <p>Camera đang tắt</p>
              </div>
            )}
          </div>

          <div className="camera-actions">
            <button className="tool-btn primary" onClick={isCameraOn ? stopCamera : startCamera}>
              {isCameraOn ? 'Tắt camera' : 'Bật camera'}
            </button>
            <button className="tool-btn" onClick={scanExpression}>
              Kiểm tra biểu cảm
            </button>
          </div>

          {cameraError && <p className="camera-error">{cameraError}</p>}
          {scanResult && (
            <div className="scan-result">
              <span>{scanResult.icon}</span>
              <div>
                <strong>{scanResult.message}</strong>
                <p>Độ tin cậy mô phỏng: {scanResult.confidence}%</p>
                {saveMessage && <p>{saveMessage}</p>}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="regulation-panel">
        <div>
          <h3>Góc bình tĩnh</h3>
          <p>{regulationSteps[currentStep]}</p>
        </div>
        <button
          className="tool-btn primary"
          onClick={() => setCurrentStep((step) => (step + 1) % regulationSteps.length)}
        >
          Bước tiếp theo
        </button>
      </section>

      <section className="social-hint-panel">
        <h3>Gợi ý khi nói chuyện</h3>
        <p>{oppositeHint}</p>
      </section>
    </div>
  )
}
