import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { CorrectAnswer, IncorrectAnswer } from '../components/ResultScreen'
import { contentApi, getSelectedChild, setSelectedChild } from '../services/api'
import '../styles/Child.css'
import '../styles/ChildLearn.css'
import '../styles/ResultScreen.css'

const emotionLabels = {
  JOY: { label: 'Vui vẻ', emoji: '😊', color: '#ffd700' },
  HAPPY: { label: 'Vui vẻ', emoji: '😊', color: '#ffd700' },
  SAD: { label: 'Buồn', emoji: '😢', color: '#87ceeb' },
  ANGRY: { label: 'Tức giận', emoji: '😡', color: '#ff6b6b' },
  CALM: { label: 'Bình tĩnh', emoji: '😌', color: '#90ee90' },
  SCARED: { label: 'Sợ', emoji: '😨', color: '#a67bb8' },
  SURPRISED: { label: 'Ngạc nhiên', emoji: '😮', color: '#dda0dd' },
}

function normalizeEmotion(value) {
  return String(value || '').trim().toUpperCase()
}

function emotionInfo(value) {
  return emotionLabels[normalizeEmotion(value)] || {
    label: value || 'Cảm xúc',
    emoji: '🙂',
    color: '#b8d8f2',
  }
}

function getContentDescription(content) {
  return content.lecture?.description || content.quiz?.description || 'Bài học cảm xúc'
}

function getContentMedia(content) {
  return content.lecture?.media_url || content.quiz?.media_url || '🙂'
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

function makeSessionKey(contentId) {
  if (window.crypto?.randomUUID) return `learn-${contentId}-${window.crypto.randomUUID()}`
  return `learn-${contentId}-${Date.now()}`
}

export default function ChildLearn() {
  const navigate = useNavigate()
  const { setUserStars } = useOutletContext()
  const selectedChild = getSelectedChild()
  const [currentTab, setCurrentTab] = useState('LECTURE')
  const [contents, setContents] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showResult, setShowResult] = useState(null)
  const [lastOutcome, setLastOutcome] = useState(null)
  const [earnedStars, setEarnedStars] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedChild?.id) {
      return
    }

    let mounted = true
    Promise.all([
      contentApi.list(selectedChild.id, { type: 'LECTURE', include_locked: true }),
      contentApi.list(selectedChild.id, { type: 'QUIZ', include_locked: true }),
    ])
      .then(([lectureResult, quizResult]) => {
        if (!mounted) return
        setContents([...(lectureResult.contents || []), ...(quizResult.contents || [])])
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
    () => contents.filter((content) => content.type === currentTab),
    [contents, currentTab],
  )
  const current = tabContents[currentIndex]

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
          source: 'child-learn-page',
          tab: currentTab,
        },
      })

      updateStars(result.child_total_stars)
      const stars = result.stars_earned || result.session?.stars_earned || 0
      setEarnedStars((value) => value + stars)
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

  const switchTab = (tab) => {
    setCurrentTab(tab)
    setCurrentIndex(0)
    setShowResult(null)
    setLastOutcome(null)
    setError('')
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
      selectedEmotion: null,
    })
    setLastOutcome({
      emotion: current.title,
      explanation: result.starsEarned > 0
        ? `Backend đã cộng ${result.starsEarned} sao khi hoàn thành bài học.`
        : 'Bài học đã được ghi nhận. Nội dung này có thể đã nhận thưởng trước đó.',
    })
    setShowResult('correct')
  }

  const handleAnswer = async (selectedEmotion) => {
    if (!current) return
    const correctEmotion = normalizeEmotion(current.quiz?.correct_emotion)
    const selected = normalizeEmotion(selectedEmotion)
    const isCorrect = selected === correctEmotion
    const result = await recordSession({
      content: current,
      isCorrect,
      selectedEmotion: selected,
    })
    const correctInfo = emotionInfo(correctEmotion)
    setLastOutcome({
      emotion: correctInfo.label,
      explanation: isCorrect
        ? `Backend đã cộng ${result.starsEarned} sao cho câu trả lời đúng.`
        : `Đáp án đúng là ${correctInfo.label}.`,
    })
    setShowResult(isCorrect ? 'correct' : 'incorrect')
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
          emotion={lastOutcome?.emotion}
          score={`${earnedStars} ⭐`}
          title={currentTab === 'LECTURE' ? 'Hoàn thành bài học!' : 'Đúng rồi!'}
          messages={[
            lastOutcome?.explanation || 'Tiến độ đã được lưu vào backend.',
            'Con tiếp tục học bài tiếp theo nhé!',
          ]}
          onContinue={handleContinueResult}
        />
      )}

      {showResult === 'incorrect' && (
        <IncorrectAnswer
          emotion={lastOutcome?.emotion}
          explanation={lastOutcome?.explanation}
          title="Chưa đúng rồi!"
          continueLabel="Tiếp tục →"
          encouragement="Không sao, con đã học thêm được một điều mới."
          onContinue={handleContinueResult}
        />
      )}

      <div className="lesson-tabs">
        <button className={`tab ${currentTab === 'LECTURE' ? 'active' : ''}`} onClick={() => switchTab('LECTURE')}>
          📘 Bài học
        </button>
        <button className={`tab ${currentTab === 'QUIZ' ? 'active' : ''}`} onClick={() => switchTab('QUIZ')}>
          ✅ Câu hỏi
        </button>
      </div>

      {error && <p className="camera-error">{error}</p>}

      {!current ? (
        <div className="lesson-card">
          <h2>Chưa có nội dung {currentTab === 'LECTURE' ? 'bài học' : 'câu hỏi'} từ backend</h2>
          <p>Hãy tạo nội dung trong trang Admin hoặc chạy lại seed database.</p>
        </div>
      ) : (
        <div className="lesson-card">
          {currentTab === 'LECTURE' ? (
            <LectureContent content={current} onComplete={handleCompleteLecture} />
          ) : (
            <QuizContent content={current} onAnswer={handleAnswer} />
          )}

          <div className="lesson-navigation">
            <button className="nav-btn" onClick={handlePrev} disabled={currentIndex === 0}>← Trước</button>

            <div className="progress">
              <span className="progress-text">{currentIndex + 1} / {tabContents.length}</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${((currentIndex + 1) / tabContents.length) * 100}%` }}></div>
              </div>
            </div>

            <button className="nav-btn" onClick={handleNext} disabled={currentIndex === tabContents.length - 1}>Tiếp →</button>
          </div>
        </div>
      )}

      <button className="back-to-home" onClick={() => navigate('/child/home')}>
        ← Quay lại
      </button>
    </div>
  )
}

function ContentMedia({ media, fallback = '🙂', title = 'media bài học' }) {
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
    return (
      <a className="lesson-media-link" href={source} target="_blank" rel="noreferrer">
        Mở media
      </a>
    )
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
  const progress = content.progress

  return (
    <div className="emotion-card">
      <ContentMedia media={media} title={content.title} />
      <h2 className="emotion-title">{content.title}</h2>
      <p className="emotion-description">{description}</p>

      <div className="examples-section">
        <h4>Tiến độ backend:</h4>
        <ul className="examples-list">
          <li>⭐ Sao đã nhận: {progress?.stars_earned || 0}</li>
          <li>✅ Số lần hoàn thành: {progress?.completed_sessions || 0}</li>
        </ul>
      </div>

      <button className="learn-complete-btn" onClick={onComplete}>
        Hoàn thành bài học
      </button>
    </div>
  )
}

function QuizContent({ content, onAnswer }) {
  const quiz = content.quiz || {}
  const answers = quiz.answer_emotions || []
  const question = quiz.description || content.title

  return (
    <>
      <div className="emotion-card">
        <ContentMedia media={quiz.media_url} fallback="❓" title={content.title} />
        <h2 className="emotion-title">{content.title}</h2>
        <p className="emotion-description">Chọn câu trả lời đúng để backend ghi nhận điểm sao.</p>
      </div>

      <div className="quiz-section">
        <h3 className="quiz-question">{question}</h3>
        <div className="quiz-options">
          {answers.map((answer) => {
            const info = emotionInfo(answer)
            return (
              <button key={answer} className="quiz-option-btn" onClick={() => onAnswer(answer)}>
                {info.emoji} {info.label}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
