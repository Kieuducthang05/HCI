import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { FiArrowLeft, FiArrowRight, FiCheckCircle, FiPause, FiPlay } from 'react-icons/fi'
import { CorrectAnswer, IncorrectAnswer } from '../components/ResultScreen'
import { contentApi, getSelectedChild, setSelectedChild, trackingApi } from '../services/api'
import { captureDetectedFace } from '../utils/faceCapture'
import '../styles/Child.css'
import '../styles/ChildLearn.css'
import '../styles/ResultScreen.css'

const expressionEmotions = [
  {
    id: 'happy',
    modelEmotion: 'happy',
    label: 'Vui',
    icon: '😊',
    color: '#f6b814',
    prompt: 'Cười tươi',
  },
  {
    id: 'sad',
    modelEmotion: 'sad',
    label: 'Buồn',
    icon: '😢',
    color: '#6aa6d9',
    prompt: 'Mặt buồn',
  },
  {
    id: 'angry',
    modelEmotion: 'angry',
    label: 'Tức giận',
    icon: '😠',
    color: '#e87461',
    prompt: 'Mặt giận',
  },
  {
    id: 'scared',
    modelEmotion: 'fear',
    label: 'Sợ',
    icon: '😟',
    color: '#9b8ac6',
    prompt: 'Mặt sợ',
  },
  {
    id: 'calm',
    modelEmotion: 'neutral',
    label: 'Bình tĩnh',
    icon: '😌',
    color: '#77bfa3',
    prompt: 'Mặt bình tĩnh',
  },
]

const modelEmotionMap = {
  happy: { uiId: 'happy', label: 'Vui', icon: '😊' },
  sad: { uiId: 'sad', label: 'Buồn', icon: '😢' },
  angry: { uiId: 'angry', label: 'Tức giận', icon: '😠' },
  fear: { uiId: 'scared', label: 'Sợ', icon: '😟' },
  neutral: { uiId: 'calm', label: 'Bình tĩnh', icon: '😌' },
}

function getModelEmotionInfo(value) {
  const key = String(value || '').trim().toLowerCase()
  return modelEmotionMap[key] || {
    uiId: 'calm',
    label: value || 'Không xác định',
    icon: '🙂',
  }
}

async function captureVideoFrame(video) {
  const captured = await captureDetectedFace(video, { filenamePrefix: 'lesson-expression-face' })

  if (!captured.ok) {
    throw new Error(captured.message)
  }

  return captured.file
}

function getContentDescription(content) {
  return content.lecture?.description || 'Bài học cảm xúc'
}

function getContentMedia(content) {
  return content.lecture?.media_url || '🙂'
}

function getMediaKind(value) {
  const source = String(value || '').trim()
  if (!source) return null

  if (/^data:video\//i.test(source)) return 'video'
  if (/^data:image\//i.test(source)) return 'image'

  const path = source.split(/[?#]/)[0].toLowerCase()
  if (/\.(mp4|webm|ogg|mov|m4v)$/.test(path)) return 'video'
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(path)) return 'image'

  return null
}

function isLikelyMediaLink(value) {
  return /^(https?:|blob:|data:|\/)/i.test(String(value || '').trim())
}

function getEmbeddableMediaUrl(value) {
  const source = String(value || '').trim()
  if (!source) return ''

  try {
    const url = new URL(source, window.location.origin)
    const host = url.hostname.replace(/^www\./, '').toLowerCase()

    if (host === 'youtu.be') {
      const videoId = url.pathname.split('/').filter(Boolean)[0]
      if (videoId) return `https://www.youtube.com/embed/${videoId}`
    }

    if (host.endsWith('youtube.com')) {
      const videoId = url.searchParams.get('v')
      const shortsMatch = url.pathname.match(/^\/shorts\/([^/]+)/)
      const embedMatch = url.pathname.match(/^\/embed\/([^/]+)/)

      if (videoId) return `https://www.youtube.com/embed/${videoId}`
      if (shortsMatch?.[1]) return `https://www.youtube.com/embed/${shortsMatch[1]}`
      if (embedMatch?.[1]) return url.href
    }

    if (host === 'drive.google.com') {
      const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/)
      const fileId = fileMatch?.[1] || url.searchParams.get('id')
      if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`
    }
  } catch {
    return source
  }

  return source
}

function makeSessionKey(contentId) {
  if (window.crypto?.randomUUID) return `learn-${contentId}-${window.crypto.randomUUID()}`
  return `learn-${contentId}-${Date.now()}`
}

function hasVideoReachedCompletionPoint(video) {
  const duration = Number(video?.duration)
  const currentTime = Number(video?.currentTime)

  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(currentTime)) return false

  const completionPoint = Math.max(duration - 2, duration * 0.9)
  return currentTime >= completionPoint
}

export default function ChildLearn() {
  const { setUserStars } = useOutletContext()
  const selectedChild = getSelectedChild()
  const [contents, setContents] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showResult, setShowResult] = useState(null)
  const [lastOutcome, setLastOutcome] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedChild?.id) {
      return
    }

    let mounted = true
    contentApi.list(selectedChild.id, { type: 'LECTURE', include_locked: true })
      .then((lectureResult) => {
        if (!mounted) return
        setContents(lectureResult.contents || [])
        setError('')
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Không tải được nội dung học từ backend.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [selectedChild?.id])

  const tabContents = useMemo(
    () => contents.filter((content) => content.type === 'LECTURE'),
    [contents],
  )
  const current = tabContents[currentIndex]
  const hasMultipleLecturePages = tabContents.length > 1

  const updateStars = (totalStars) => {
    if (typeof totalStars !== 'number') return
    setUserStars(totalStars)
    setSelectedChild({ ...selectedChild, total_stars: totalStars })
  }

  const ensureUnlocked = async (content) => {
    if (!selectedChild?.id || !content) return false
    if (content.is_unlocked || content.isUnlocked || content.unlock) return true

    try {
      const result = await contentApi.unlock(selectedChild.id, content.id)
      setContents((prev) => prev.map((item) => (
        item.id === content.id
          ? { ...item, is_unlocked: true, isUnlocked: true, unlock: result.unlock }
          : item
      )))
      updateStars(result.child_total_stars)
      return true
    } catch (err) {
      if (err.type === 'CONTENT_ALREADY_UNLOCKED') return true
      setError(err.message || 'Không mở khóa được nội dung học.')
      return false
    }
  }

  const recordSession = async ({ content, isCorrect, selectedEmotion }) => {
    const unlocked = await ensureUnlocked(content)
    if (!unlocked) return { starsEarned: 0 }

    try {
      const now = new Date().toISOString()
      const payload = {
        content_id: content.id,
        idempotency_key: makeSessionKey(content.id),
        duration_seconds: 30,
        status: 'COMPLETED',
        started_at: now,
        completed_at: now,
        metadata: {
          source: 'child-learn-page',
          tab: 'LECTURE',
        },
      }

      if (typeof isCorrect === 'boolean') {
        payload.is_correct = isCorrect
      }

      if (typeof selectedEmotion === 'string' && selectedEmotion.trim()) {
        payload.selected_emotion = selectedEmotion
      }

      const result = await contentApi.recordSession(selectedChild.id, payload)

      updateStars(result.child_total_stars)
      const stars = result.stars_earned || result.session?.stars_earned || 0
      setContents((prev) => prev.map((item) => (
        item.id === content.id
          ? {
              ...item,
              progress: {
                ...(item.progress || {}),
                completed_sessions: (item.progress?.completed_sessions || 0) + 1,
                stars_earned: (item.progress?.stars_earned || 0) + stars,
              },
            }
          : item
      )))
      return { starsEarned: stars }
    } catch (err) {
      setError(err.message || 'Chưa lưu được tiến độ học.')
      return { starsEarned: 0 }
    }
  }

  const handleNext = () => {
    setCurrentIndex((index) => Math.min(index + 1, tabContents.length - 1))
  }

  const handlePrev = () => {
    setCurrentIndex((index) => Math.max(index - 1, 0))
  }

  const handleCompleteLecture = async () => {
    if (!current) return
    const result = await recordSession({
      content: current,
      isCorrect: true,
    })
    setLastOutcome({
      emotion: current.title,
      starsEarned: result.starsEarned,
      explanation: result.starsEarned > 0
        ? `Backend đã cộng ${result.starsEarned} sao khi hoàn thành bài học.`
        : 'Bài học đã được ghi nhận. Nội dung này có thể đã nhận thưởng trước đó.',
    })
    setShowResult('correct')
  }

  const handleContinueResult = () => {
    setShowResult(null)
    setLastOutcome(null)

    if (currentIndex < tabContents.length - 1) {
      setCurrentIndex((index) => index + 1)
    } else {
      setCurrentIndex(0)
    }
  }

  const handleDismissResult = () => {
    setShowResult(null)
    setLastOutcome(null)
  }

  if (!selectedChild?.id) {
    return (
      <div className="child-lesson">
        <div className="lesson-card">
          <h2>Chưa chọn tài khoản trẻ</h2>
          <p>Hãy quay lại màn chọn người dùng và chọn tài khoản của bé.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="child-lesson">
        <div className="lesson-card">
          <p>Đang tải bài học từ backend...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="child-lesson">
      {showResult === 'correct' && (
        <CorrectAnswer
          resultType="lesson"
          reward={lastOutcome?.starsEarned}
          rewardLabel={lastOutcome?.rewardLabel}
          title="Hoàn thành xuất sắc!"
          onContinue={handleContinueResult}
          onDismiss={handleDismissResult}
        />
      )}

      {showResult === 'incorrect' && (
        <IncorrectAnswer
          resultType="lesson"
          explanation={lastOutcome?.explanation}
          title="Chưa đúng rồi!"
          continueLabel="Tiếp tục →"
          encouragement="Không sao, con đã học thêm được một điều mới."
          onContinue={handleContinueResult}
          onDismiss={handleDismissResult}
        />
      )}

      {error && <p className="camera-error">{error}</p>}

      {!current ? (
        <div className="lesson-card">
          <h2>Chưa có nội dung bài học từ backend</h2>
          <p>Hãy tạo nội dung trong trang Admin hoặc chạy lại seed database.</p>
        </div>
      ) : (
        <div className="lesson-card lesson-lecture-card">
          <LectureContent key={current.id || currentIndex} content={current} onComplete={handleCompleteLecture} />

          <div className="lesson-navigation">
            {hasMultipleLecturePages && (
              <button className="nav-btn" onClick={handlePrev} disabled={currentIndex === 0}>
                <FiArrowLeft className="nav-btn-icon" aria-hidden="true" />
                <span>Trước</span>
              </button>
            )}

            <div className="progress">
              <span className="progress-text">{currentIndex + 1} / {tabContents.length}</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${((currentIndex + 1) / tabContents.length) * 100}%` }}></div>
              </div>
            </div>

            {hasMultipleLecturePages && (
              <button className="nav-btn" onClick={handleNext} disabled={currentIndex === tabContents.length - 1}>
                <span>Tiếp</span>
                <FiArrowRight className="nav-btn-icon" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function LinkedMedia({ source, title }) {
  const embedUrl = getEmbeddableMediaUrl(source)
  const [showEmbed, setShowEmbed] = useState(embedUrl !== source)

  if (showEmbed) {
    return (
      <div className="lesson-media-frame lesson-media-embed-frame">
        <iframe
          className="lesson-media-iframe"
          src={embedUrl}
          title={`Media ${title}`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <div className="lesson-media-frame lesson-media-image-frame">
      <img
        className="lesson-media-image"
        src={source}
        alt={`Minh họa ${title}`}
        onError={() => setShowEmbed(true)}
      />
    </div>
  )
}

function LessonVideoPlayer({ source, title, onVideoNearlyComplete }) {
  const videoRef = useRef(null)
  const hideControlsTimerRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isControlsVisible, setIsControlsVisible] = useState(true)

  useEffect(() => {
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current)
      }
    }
  }, [])

  const clearHideControlsTimer = () => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current)
      hideControlsTimerRef.current = null
    }
  }

  const scheduleControlsHide = () => {
    clearHideControlsTimer()
    hideControlsTimerRef.current = setTimeout(() => {
      setIsControlsVisible(false)
      hideControlsTimerRef.current = null
    }, 2500)
  }

  const showControlsTemporarily = () => {
    setIsControlsVisible(true)

    const video = videoRef.current
    if (video && !video.paused && !video.ended) {
      scheduleControlsHide()
    } else {
      clearHideControlsTimer()
    }
  }

  const handleVideoProgress = (event) => {
    if (hasVideoReachedCompletionPoint(event.currentTarget)) {
      onVideoNearlyComplete?.()
    }
  }

  const handleVideoPlay = () => {
    setIsPlaying(true)
    setIsControlsVisible(true)
    scheduleControlsHide()
  }

  const handleVideoPause = () => {
    setIsPlaying(false)
    setIsControlsVisible(true)
    clearHideControlsTimer()
  }

  const togglePlayback = async () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused || video.ended) {
      try {
        await video.play()
      } catch {
        handleVideoPause()
      }
      return
    }

    video.pause()
  }

  return (
    <div className="lesson-media-frame lesson-media-video-frame">
      <div
        className="lesson-video-player"
        onMouseMove={showControlsTemporarily}
        onTouchStart={showControlsTemporarily}
      >
        <video
          ref={videoRef}
          className="lesson-media-video"
          src={source}
          preload="metadata"
          playsInline
          onLoadedMetadata={handleVideoProgress}
          onTimeUpdate={handleVideoProgress}
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
          onEnded={(event) => {
            handleVideoPause()
            onVideoNearlyComplete?.()
            handleVideoProgress(event)
          }}
          aria-label={`Video ${title}`}
        />
        <div
          className={`lesson-video-overlay ${isPlaying && !isControlsVisible ? 'is-hidden' : ''}`}
          aria-hidden={isPlaying && !isControlsVisible}
        >
          <button
            type="button"
            className={`lesson-video-control ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlayback}
            aria-label={isPlaying ? 'Tạm dừng video' : 'Phát video'}
          >
            {isPlaying ? (
              <FiPause className="lesson-video-control-icon" aria-hidden="true" />
            ) : (
              <FiPlay className="lesson-video-control-icon play-icon" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function ContentMedia({ media, fallback = '🙂', title = 'media bài học', onVideoNearlyComplete }) {
  const source = String(media || '').trim()
  const mediaKind = getMediaKind(source)

  if (source && mediaKind === 'video') {
    return <LessonVideoPlayer source={source} title={title} onVideoNearlyComplete={onVideoNearlyComplete} />
  }

  if (source && mediaKind === 'image') {
    return (
      <div className="lesson-media-frame lesson-media-image-frame">
        <img className="lesson-media-image" src={source} alt={`Minh họa ${title}`} />
      </div>
    )
  }

  if (source && isLikelyMediaLink(source)) {
    return <LinkedMedia key={source} source={source} title={title} />
  }

  return (
    <div className="emotion-circle" style={{ backgroundColor: '#e3f2fd' }}>
      <span className="big-emoji">{source || fallback}</span>
    </div>
  )
}

function LectureContent({ content, onComplete }) {
  const media = getContentMedia(content)
  const description = getContentDescription(content)
  const requiresVideoWatch = getMediaKind(media) === 'video'
  const [hasWatchedVideoEnd, setHasWatchedVideoEnd] = useState(!requiresVideoWatch)
  const canComplete = !requiresVideoWatch || hasWatchedVideoEnd

  const handleCompleteClick = () => {
    if (!canComplete) return
    onComplete()
  }

  return (
    <div className="emotion-card">
      <ContentMedia
        media={media}
        title={content.title}
        onVideoNearlyComplete={() => setHasWatchedVideoEnd(true)}
      />
      <h2 className="emotion-title">{content.title}</h2>
      <p className="emotion-description">{description}</p>

      <button
        className="learn-complete-btn"
        onClick={handleCompleteClick}
        disabled={!canComplete}
        aria-label={canComplete ? 'Hoàn thành bài học' : 'Xem gần hết video để hoàn thành bài học'}
      >
        <FiCheckCircle className="learn-complete-icon" aria-hidden="true" />
        <span>Hoàn thành bài học</span>
      </button>
    </div>
  )
}

function ExpressionLesson({ selectedChild, onResult }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [emotionIndex, setEmotionIndex] = useState(0)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [isScanning, setIsScanning] = useState(false)

  const targetEmotion = expressionEmotions[emotionIndex]

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const startCamera = async () => {
    setCameraError('')
    setScanResult(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Trình duyệt hiện tại không hỗ trợ mở camera.')
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsCameraOn(true)
      return true
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
      return false
    }
  }

  const scanExpression = async () => {
    if (!isCameraOn) {
      await startCamera()
      return
    }

    setCameraError('')
    setIsScanning(true)

    try {
      if (!selectedChild?.id) {
        setCameraError('Chưa chọn tài khoản trẻ nên chưa thể dự đoán cảm xúc.')
        return
      }

      const frame = await captureVideoFrame(videoRef.current)
      const result = await trackingApi.predictEmotion(selectedChild.id, frame, {
        targetEmotion: targetEmotion.modelEmotion,
      })
      const prediction = result.prediction || {}
      const detectedEmotion = getModelEmotionInfo(prediction.emotion)
      const confidence = Number(prediction.confidence || 0)
      const expressionCheck = prediction.expression_check
      const isCorrect = typeof expressionCheck?.is_correct === 'boolean'
        ? expressionCheck.is_correct
        : detectedEmotion.uiId === targetEmotion.id

      const nextResult = {
        isCorrect,
        targetEmotion,
        detectedEmotion,
        confidence,
      }

      setScanResult(nextResult)
      onResult(nextResult)
    } catch (error) {
      setCameraError(error.message || 'Không gửi được ảnh đến mô hình cảm xúc.')
    } finally {
      setIsScanning(false)
    }
  }

  const switchTargetEmotion = () => {
    setEmotionIndex((index) => (index + 1) % expressionEmotions.length)
    setScanResult(null)
    setCameraError('')
  }

  return (
    <section className="express-lesson-shell">
      <div className="express-lesson-content">
        <h2>Con hãy làm biểu cảm giống bạn này nhé!</h2>
        <div className="express-title-mark" aria-hidden="true"></div>

        <div className="express-practice-area">
          <article className="express-target-card" style={{ '--express-color': targetEmotion.color }}>
            <span className="express-tip-dot" aria-hidden="true">●</span>
            <div className="express-target-emoji">{targetEmotion.icon}</div>
            <strong>{targetEmotion.prompt}</strong>
          </article>

          <button className="express-switch-btn" onClick={switchTargetEmotion} aria-label="Đổi cảm xúc mục tiêu">
            ⇄
          </button>

          <article className="express-camera-card">
            <div className="express-live-badge">
              <span aria-hidden="true"></span>
              LIVE
            </div>
            <video
              ref={videoRef}
              className={isCameraOn ? 'express-camera-video' : 'express-camera-video hidden'}
              autoPlay
              playsInline
              muted
            />
            {isCameraOn && <div className="express-face-guide" aria-hidden="true"></div>}
            {!isCameraOn && (
              <div className="express-camera-placeholder">
                <span>📷</span>
                <p>Camera đang tắt</p>
              </div>
            )}
            {scanResult && (
              <div className={`express-scan-bubble ${scanResult.isCorrect ? 'correct' : 'incorrect'}`}>
                <span>{scanResult.isCorrect ? '😊' : '🙂'}</span>
                <p>
                  {scanResult.isCorrect ? 'Đúng biểu cảm' : `Gần với ${scanResult.detectedEmotion.label}`}
                </p>
              </div>
            )}
          </article>
        </div>

        {cameraError && <p className="express-camera-error">{cameraError}</p>}

        <button className="express-check-btn" onClick={scanExpression} disabled={isScanning}>
          {isScanning ? 'Đang kiểm tra...' : isCameraOn ? 'Kiểm tra biểu cảm' : 'Bật camera'}
        </button>
      </div>
    </section>
  )
}
