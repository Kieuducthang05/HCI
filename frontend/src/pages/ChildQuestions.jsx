import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CorrectAnswer, IncorrectAnswer } from '../components/ResultScreen'
import { contentApi, getSelectedChild, setSelectedChild } from '../services/api'
import '../styles/Child.css'
import '../styles/ChildLearn.css'
import '../styles/ResultScreen.css'

const emotionLabels = {
  JOY: { label: 'Vui vẻ', emoji: '😊' },
  HAPPY: { label: 'Vui vẻ', emoji: '😊' },
  SAD: { label: 'Buồn', emoji: '😢' },
  ANGRY: { label: 'Tức giận', emoji: '😡' },
  CALM: { label: 'Bình tĩnh', emoji: '😌' },
  NEUTRAL: { label: 'Bình tĩnh', emoji: '😌' },
  SCARED: { label: 'Sợ', emoji: '😨' },
  FEAR: { label: 'Sợ', emoji: '😨' },
  SURPRISED: { label: 'Ngạc nhiên', emoji: '😮' },
}

function normalizeEmotion(value) {
  return String(value || '').trim().toUpperCase()
}

function emotionInfo(value) {
  return emotionLabels[normalizeEmotion(value)] || {
    label: value || 'Cảm xúc',
    emoji: '🙂',
  }
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
  if (window.crypto?.randomUUID) return `question-${contentId}-${window.crypto.randomUUID()}`
  return `question-${contentId}-${Date.now()}`
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
    <div className="lesson-media-frame">
      <img
        className="lesson-media-image"
        src={source}
        alt={`Minh họa ${title}`}
        onError={() => setShowEmbed(true)}
      />
    </div>
  )
}

function ContentMedia({ media, fallback = '❓', title = 'media câu hỏi' }) {
  const source = String(media || '').trim()
  const mediaKind = getMediaKind(source)

  if (source && mediaKind === 'video') {
    return (
      <div className="lesson-media-frame">
        <video
          className="lesson-media-video"
          src={source}
          controls
          preload="metadata"
          playsInline
          aria-label={`Video ${title}`}
        />
      </div>
    )
  }

  if (source && mediaKind === 'image') {
    return (
      <div className="lesson-media-frame">
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

function QuizContent({ content, onAnswer, onSpeakQuestion, isSpeaking }) {
  const quiz = content.quiz || {}
  const answers = quiz.answer_emotions || []
  const question = quiz.description || content.title

  return (
    <>
      <div className="quiz-media-card">
        <ContentMedia media={quiz.media_url} title={content.title} />
        <h2 className="emotion-title">{content.title}</h2>
        <p className="emotion-description">Chọn câu trả lời đúng để backend ghi nhận điểm sao.</p>
      </div>

      <div className="quiz-section">
        <h3 className="quiz-question">{question}</h3>
        <button
          className={`question-speak-btn ${isSpeaking ? 'active' : ''}`}
          onClick={() => onSpeakQuestion(question)}
          type="button"
          aria-pressed={isSpeaking}
        >
          <span aria-hidden="true">{isSpeaking ? '■' : '🔊'}</span>
          {isSpeaking ? 'Dừng đọc' : 'Nghe câu hỏi'}
        </button>
        <div className="quiz-options">
          {answers.map((answer) => {
            const info = emotionInfo(answer)
            return (
              <button
                key={answer}
                className="quiz-option-btn"
                onClick={() => onAnswer(answer)}
                aria-label={info.label}
                title={info.label}
              >
                <span className="quiz-option-emoji">{info.emoji}</span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default function ChildQuestions() {
  const { setUserStars } = useOutletContext()
  const selectedChild = getSelectedChild()
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showResult, setShowResult] = useState(null)
  const [lastOutcome, setLastOutcome] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [speakingQuestionId, setSpeakingQuestionId] = useState(null)

  const current = questions[currentIndex]
  useEffect(() => {
    if (!selectedChild?.id) return

    let mounted = true
    contentApi.list(selectedChild.id, { type: 'QUIZ', include_locked: true })
      .then((result) => {
        if (!mounted) return
        setQuestions(result.contents || [])
        setError('')
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Không tải được câu hỏi từ backend.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [selectedChild?.id])

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])

  useEffect(() => {
    window.speechSynthesis?.cancel()
  }, [currentIndex])

  const stopQuestionSpeech = () => {
    window.speechSynthesis?.cancel()
    setSpeakingQuestionId(null)
  }

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
      setQuestions((prev) => prev.map((item) => (
        item.id === content.id
          ? { ...item, is_unlocked: true, isUnlocked: true, unlock: result.unlock }
          : item
      )))
      updateStars(result.child_total_stars)
      return true
    } catch (err) {
      if (err.type === 'CONTENT_ALREADY_UNLOCKED') return true
      setError(err.message || 'Không mở khóa được câu hỏi.')
      return false
    }
  }

  const recordQuestionSession = async ({ content, isCorrect, selectedEmotion }) => {
    const unlocked = await ensureUnlocked(content)
    if (!unlocked) return { starsEarned: 0 }

    try {
      const now = new Date().toISOString()
      const result = await contentApi.recordSession(selectedChild.id, {
        content_id: content.id,
        idempotency_key: makeSessionKey(content.id),
        duration_seconds: 30,
        status: 'COMPLETED',
        started_at: now,
        completed_at: now,
        is_correct: isCorrect,
        selected_emotion: selectedEmotion,
        metadata: {
          source: 'child-questions-page',
          tab: 'QUIZ',
        },
      })

      updateStars(result.child_total_stars)
      const stars = result.stars_earned || result.session?.stars_earned || 0
      setQuestions((prev) => prev.map((item) => (
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
      setError(err.message || 'Chưa lưu được kết quả câu hỏi.')
      return { starsEarned: 0 }
    }
  }

  const handleAnswer = async (selectedEmotion) => {
    if (!current || showResult) return
    stopQuestionSpeech()

    const correctEmotion = normalizeEmotion(current.quiz?.correct_emotion)
    const selected = normalizeEmotion(selectedEmotion)
    const isCorrect = selected === correctEmotion
    const result = await recordQuestionSession({
      content: current,
      isCorrect,
      selectedEmotion: selected,
    })
    const correctInfo = emotionInfo(correctEmotion)

    setLastOutcome({
      starsEarned: result.starsEarned,
      explanation: isCorrect
        ? `Backend đã cộng ${result.starsEarned} sao cho câu trả lời đúng.`
        : `Đáp án đúng là ${correctInfo.emoji} ${correctInfo.label}.`,
    })
    setShowResult(isCorrect ? 'correct' : 'incorrect')
  }

  const handleSpeakQuestion = (questionText) => {
    if (!window.speechSynthesis) {
      setError('Trình duyệt hiện tại chưa hỗ trợ đọc câu hỏi.')
      return
    }

    const speechId = current?.id ?? currentIndex

    if (speakingQuestionId === speechId) {
      window.speechSynthesis.cancel()
      setSpeakingQuestionId(null)
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(`Câu hỏi. ${questionText}. Con hãy chọn đáp án đúng nhé.`)
    utterance.lang = 'vi-VN'
    utterance.rate = 0.82
    utterance.pitch = 1
    utterance.volume = 0.9
    utterance.onend = () => setSpeakingQuestionId(null)
    utterance.onerror = () => setSpeakingQuestionId(null)
    setSpeakingQuestionId(speechId)
    window.speechSynthesis.speak(utterance)
  }

  const handleContinueResult = () => {
    stopQuestionSpeech()
    setShowResult(null)
    setLastOutcome(null)

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((index) => index + 1)
    } else {
      setCurrentIndex(0)
    }
  }

  const handleNext = () => {
    stopQuestionSpeech()
    setCurrentIndex((index) => Math.min(index + 1, questions.length - 1))
  }

  const handlePrev = () => {
    stopQuestionSpeech()
    setCurrentIndex((index) => Math.max(index - 1, 0))
  }

  if (!selectedChild?.id) {
    return (
      <div className="question-page">
        <div className="lesson-card">
          <h2>Chưa chọn tài khoản trẻ</h2>
          <p>Hãy quay lại màn chọn người dùng và chọn tài khoản của bé.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="question-page">
        <div className="lesson-card">
          <p>Đang tải câu hỏi từ backend...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="question-page">
      {showResult === 'correct' && (
        <CorrectAnswer
          resultType="question"
          reward={lastOutcome?.starsEarned}
          title="Hoàn thành xuất sắc!"
          onContinue={handleContinueResult}
        />
      )}

      {showResult === 'incorrect' && (
        <IncorrectAnswer
          resultType="question"
          explanation={lastOutcome?.explanation}
          title="Chưa đúng rồi!"
          continueLabel="Tiếp tục →"
          encouragement="Không sao, con đã học thêm được một điều mới."
          onContinue={handleContinueResult}
        />
      )}

      <div className="lesson-card">
        <div className="question-page-heading">
          <div>
            <h2>Câu hỏi</h2>
            <p>Chọn đáp án đúng cho từng câu hỏi cảm xúc.</p>
          </div>
        </div>

        {error && <p className="camera-error">{error}</p>}

        {!current ? (
          <div className="emotion-card">
            <h2 className="emotion-title">Chưa có câu hỏi từ backend</h2>
            <p className="emotion-description">Hãy tạo nội dung loại Câu hỏi trong trang Admin.</p>
          </div>
        ) : (
          <>
            <QuizContent
              content={current}
              onAnswer={handleAnswer}
              onSpeakQuestion={handleSpeakQuestion}
              isSpeaking={speakingQuestionId === (current?.id ?? currentIndex)}
            />

            <div className="lesson-navigation">
              <button className="nav-btn" onClick={handlePrev} disabled={currentIndex === 0}>← Trước</button>

              <div className="progress">
                <span className="progress-text">{currentIndex + 1} / {questions.length}</span>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
                </div>
              </div>

              <button className="nav-btn" onClick={handleNext} disabled={currentIndex === questions.length - 1}>Tiếp →</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
