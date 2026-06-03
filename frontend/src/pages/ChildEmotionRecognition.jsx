import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiCamera } from 'react-icons/fi'
import { getSelectedChild, trackingApi, visionApi } from '../services/api'
import { captureDetectedFace } from '../utils/faceCapture'
import '../styles/Child.css'

export default function ChildEmotionRecognition() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const selectedChild = getSelectedChild()

  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [prediction, setPrediction] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      setIsCameraOn(true)
      
      // Wait for next tick to ensure video element is rendered and ref is attached
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      }, 100)
    } catch (err) {
      setError('Không thể mở camera. Hãy kiểm tra quyền truy cập.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraOn(false)
  }

  const handleStartRecognition = async () => {
    if (!isCameraOn) {
      await startCamera()
      return
    }

    if (isScanning) return

    setIsScanning(true)
    setError('')
    setPrediction(null)

    try {
      if (!videoRef.current) throw new Error('Camera chưa sẵn sàng.')

      // Capture face from video
      const captured = await captureDetectedFace(videoRef.current, {
        filenamePrefix: 'emotion-recognition'
      })

      if (!captured.ok) {
        throw new Error(captured.message)
      }

      // Call Vision API /predict
      const result = await visionApi.predict(captured.file)
      const modelPrediction = result.prediction || result
      setPrediction(modelPrediction)

      // Call Backend API to record emotion log
      if (selectedChild?.id) {
        await trackingApi.recordEmotionLog(selectedChild.id, {
          trigger_source: 'WEBCAM',
          ai_result: {
            emotion: modelPrediction.emotion,
            confidence: modelPrediction.confidence,
            all_scores: modelPrediction.all_scores || {}
          },
          metadata: {
            source: 'emotion-recognition-game'
          }
        })
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi nhận diện cảm xúc.')
    } finally {
      setIsScanning(false)
    }
  }

  const getEmotionLabel = (emotion) => {
    const labels = {
      happy: 'Vui vẻ 😊',
      sad: 'Buồn bã 😢',
      angry: 'Tức giận 😠',
      fear: 'Lo sợ 😟',
      neutral: 'Bình thường 😌',
      surprise: 'Ngạc nhiên 😲'
    }
    return labels[emotion.toLowerCase()] || emotion
  }

  return (
    <div className="child-emotion-recognition-page" style={{ 
      width: '100%', 
      display: 'flex', 
      justifyContent: 'center', 
      paddingTop: '40px' 
    }}>
      <div style={{ 
        backgroundColor: '#FDFDFD', 
        width: '66vw',
        height: '75vh',
        borderRadius: '32px', 
        padding: '24px 32px 48px 32px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative'
      }}>
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            left: '32px',
            top: '24px',
            border: 'none',
            background: '#F1F5F9',
            padding: '10px',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#64748B',
            fontWeight: '600'
          }}
        >
          <FiArrowLeft /> Quay lại
        </button>

        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A', marginBottom: '24px' }}>
          Nhận diện cảm xúc của bé
        </h1>

        {/* Camera Box */}
        <div style={{
          width: '80%',
          flex: 1,
          backgroundColor: '#000',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
        }}>
          {isCameraOn ? (
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted 
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
          ) : (
            <div style={{ color: '#64748B', textAlign: 'center' }}>
              <FiCamera size={64} style={{ marginBottom: '16px' }} />
              <p>Camera đang tắt</p>
            </div>
          )}

          {/* Recognition Guide Overlay */}
          {isCameraOn && (
            <div style={{
              position: 'absolute',
              height: '80%',
              aspectRatio: '1 / 1',
              border: '3px dashed rgba(255,255,255,0.6)',
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: 2
            }} />
          )}

          {/* Prediction Result Overlay */}
          {prediction && (
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: '12px 24px',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>Bé đang cảm thấy:</p>
              <h2 style={{ margin: '4px 0 0 0', color: '#305196', fontSize: '24px' }}>
                {getEmotionLabel(prediction.emotion)}
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94A3B8' }}>
                Độ tin cậy: {Math.round(prediction.confidence * 100)}%
              </p>
            </div>
          )}
        </div>

        {error && (
          <p style={{ color: '#EF4444', marginTop: '16px', fontSize: '14px' }}>{error}</p>
        )}

        {/* Start Button */}
        <button 
          onClick={handleStartRecognition}
          disabled={isScanning}
          style={{
            marginTop: '32px',
            width: '60%',
            padding: '16px',
            borderRadius: '16px',
            border: 'none',
            background: isScanning ? '#94A3B8' : 'linear-gradient(135deg, #305196 0%, #4C77C6 100%)',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: isScanning ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(48, 81, 150, 0.3)',
            transition: 'transform 0.1s'
          }}
          onMouseDown={(e) => !isScanning && (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={(e) => !isScanning && (e.currentTarget.style.transform = 'scale(1)')}
        >
          {isScanning ? 'Đang nhận diện...' : (isCameraOn ? 'Bắt đầu ghi nhận' : 'Bật camera và bắt đầu')}
        </button>

      </div>
    </div>
  )
}
