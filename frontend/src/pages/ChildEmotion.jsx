import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSelectedChild, trackingApi, visionApi } from '../services/api'
import { captureDetectedFace } from '../utils/faceCapture'
import '../styles/Child.css'

const emotions = [
  {
    id: 'happy',
    modelEmotion: 'happy',
    label: 'Vui',
    icon: '😊',
    color: '#f6c453',
    phrase: 'Con đang cảm thấy vui.',
    suggestion: 'Con có thể chia sẻ niềm vui này với bố mẹ hoặc bạn bè.'
  },
  {
    id: 'sad',
    modelEmotion: 'sad',
    label: 'Buồn',
    icon: '😢',
    color: '#6aa6d9',
    phrase: 'Con đang cảm thấy buồn.',
    suggestion: 'Con có thể ngồi nghỉ một chút và nói với người lớn điều làm con buồn.'
  },
  {
    id: 'angry',
    modelEmotion: 'angry',
    label: 'Tức giận',
    icon: '😠',
    color: '#e87461',
    phrase: 'Con đang cảm thấy tức giận.',
    suggestion: 'Con hãy thử hít vào chậm, thở ra chậm rồi nói điều con cần.'
  },
  {
    id: 'scared',
    modelEmotion: 'fear',
    label: 'Sợ',
    icon: '😟',
    color: '#9b8ac6',
    phrase: 'Con đang cảm thấy sợ.',
    suggestion: 'Con có thể tìm nơi yên tĩnh và gọi bố mẹ hoặc cô giáo giúp con.'
  },
  {
    id: 'calm',
    modelEmotion: 'neutral',
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

const modelEmotionMap = {
  happy: {
    uiId: 'happy',
    backendValue: 'happy',
    label: 'Vui',
    icon: '😊',
  },
  sad: {
    uiId: 'sad',
    backendValue: 'sad',
    label: 'Buồn',
    icon: '😢',
  },
  angry: {
    uiId: 'angry',
    backendValue: 'angry',
    label: 'Tức giận',
    icon: '😠',
  },
  fear: {
    uiId: 'scared',
    backendValue: 'fear',
    label: 'Sợ',
    icon: '😟',
  },
  neutral: {
    uiId: 'calm',
    backendValue: 'neutral',
    label: 'Bình tĩnh',
    icon: '😌',
  },
}

function getModelEmotionInfo(value) {
  const key = String(value || '').trim().toLowerCase()
  return modelEmotionMap[key] || {
    uiId: 'calm',
    backendValue: key || 'neutral',
    label: value || 'Không xác định',
    icon: '🙂',
  }
}

async function captureVideoFrame(video) {
  const captured = await captureDetectedFace(video, { filenamePrefix: 'emotion-tool-face' })

  if (!captured.ok) {
    throw new Error(captured.message)
  }

  return captured.file
}

export default function ChildEmotion() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [selectedEmotion, setSelectedEmotion] = useState(emotions[0])
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
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

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Trình duyệt hiện tại không hỗ trợ mở camera.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsCameraOn(true)
    } catch (error) {
      let message = 'Không mở được camera. Hãy kiểm tra quyền truy cập camera của trình duyệt.'

      if (error?.name === 'NotAllowedError') {
        message = 'Trình duyệt đang chặn quyền camera. Hãy cho phép quyền camera cho localhost rồi thử lại.'
      } else if (error?.name === 'NotFoundError') {
        message = 'Không tìm thấy webcam trên thiết bị.'
      } else if (error?.name === 'NotReadableError') {
        message = 'Webcam đang được ứng dụng khác sử dụng. Hãy tắt ứng dụng đó rồi thử lại.'
      }

      setCameraError(message)
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

  const scanExpression = async () => {
    if (!isCameraOn) {
      setCameraError('Bật camera trước khi kiểm tra biểu cảm.')
      return
    }

    setCameraError('')
    setSaveMessage('')
    setIsScanning(true)

    try {
      const child = getSelectedChild()
      if (!child?.id) {
        setSaveMessage('Chưa chọn tài khoản trẻ nên chưa thể dự đoán cảm xúc.')
        return
      }

      const targetEmotion = selectedEmotion
      const frame = await captureVideoFrame(videoRef.current)

      // 1. Gọi trực tiếp Computer Vision Service (Port 9000)
      const visionResult = await visionApi.predict(frame)
      const prediction = visionResult.prediction || visionResult
      
      const detectedEmotion = getModelEmotionInfo(prediction.emotion)
      const confidence = Number(prediction.confidence || 0)
      const expressionCheck = prediction.expression_check
      
      const isCorrect = typeof expressionCheck?.is_correct === 'boolean'
        ? expressionCheck.is_correct
        : detectedEmotion.uiId === targetEmotion.id

      setScanResult({
        status: isCorrect ? 'correct' : 'incorrect',
        icon: isCorrect ? '✅' : '🔁',
        targetIcon: targetEmotion.icon,
        targetLabel: targetEmotion.label,
        detectedIcon: detectedEmotion.icon,
        detectedLabel: detectedEmotion.label,
        confidence,
        scores: prediction.all_scores || {},
        message: isCorrect
          ? `Đúng rồi, con đã thể hiện cảm xúc "${targetEmotion.label}".`
          : `Chưa đúng. Mục tiêu là "${targetEmotion.label}", model đang thấy gần với "${detectedEmotion.label}".`
      })

      // 2. Gửi kết quả đã nhận diện về Backend (Port 5050) để lưu log
      const logResult = await trackingApi.recordEmotionLog(child.id, {
        trigger_source: 'WEBCAM',
        ai_result: {
          emotion: prediction.emotion,
          confidence: confidence,
          all_scores: prediction.all_scores || {}
        },
        metadata: {
          source: 'child-emotion-page',
          ui_label: detectedEmotion.label,
          target_emotion: targetEmotion.id,
          is_correct: isCorrect
        }
      })

      setSaveMessage(logResult.log ? 'Đã kiểm tra biểu cảm và lưu kết quả vào nhật ký.' : '')
    } catch (error) {
      setCameraError(error.message || 'Không gửi được ảnh đến mô hình cảm xúc.')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="child-emotion-page">
      <div className="emotion-tool-header">
        <div>
          <h2>Luyện biểu cảm</h2>
          <p>Chọn cảm xúc mục tiêu, thể hiện trước camera và để hệ thống kiểm tra đúng hay chưa.</p>
        </div>
        <button className="close-btn" onClick={() => navigate('/child/home')}>×</button>
      </div>

      <section className="emotion-picker-panel">
        <h3>Con hãy chọn cảm xúc muốn luyện</h3>
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
            <video
              ref={videoRef}
              className={isCameraOn ? '' : 'camera-video-hidden'}
              autoPlay
              playsInline
              muted
            />
            {isCameraOn && <div className="camera-face-guide" aria-hidden="true"></div>}
            {!isCameraOn && (
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
            <button className="tool-btn" onClick={scanExpression} disabled={!isCameraOn || isScanning}>
              {isScanning ? 'Đang kiểm tra...' : 'Kiểm tra đúng/sai'}
            </button>
          </div>

          {cameraError && <p className="camera-error">{cameraError}</p>}
          {scanResult && (
            <div className={`scan-result ${scanResult.status}`}>
              <span>{scanResult.icon}</span>
              <div>
                <strong>{scanResult.message}</strong>
                <p>
                  Mục tiêu: {scanResult.targetIcon} {scanResult.targetLabel} · Model thấy: {scanResult.detectedIcon} {scanResult.detectedLabel}
                </p>
                <p>Độ tin cậy: {Math.round(scanResult.confidence * 100)}%</p>
                {Object.keys(scanResult.scores || {}).length > 0 && (
                  <p>
                    Điểm mô hình: {Object.entries(scanResult.scores)
                      .map(([emotion, score]) => `${getModelEmotionInfo(emotion).label} ${Math.round(Number(score) * 100)}%`)
                      .join(' · ')}
                  </p>
                )}
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
