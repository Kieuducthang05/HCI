import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { FiCheckCircle, FiArrowLeft, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
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

function makeSessionKey(contentId) {
  if (window.crypto?.randomUUID) return `question-${contentId}-${window.crypto.randomUUID()}`
  return `question-${contentId}-${Date.now()}`
}

function isQuizRewarded(content) {
  return Number(content?.progress?.stars_earned || 0) > 0
}

function getPlayableQuizzes(contents) {
  return contents.filter((content) => !isQuizRewarded(content))
}

function QuizImage({ media, title }) {
  const source = String(media || '').trim()
  if (getMediaKind(source) !== 'image') return null

  return (
    <div className="question-image-frame">
      <img className="question-image" src={source} alt={`Minh họa ${title}`} />
    </div>
  )
}

function QuizContent({ content, onAnswer, answerDisabled }) {
  const quiz = content.quiz || {}
  const answers = quiz.answer_emotions || []
  const question = quiz.description || content.title
  const hasImage = getMediaKind(quiz.media_url) === 'image'
  const isCompleted = isQuizRewarded(content)

  return (
    <div className={`question-quiz-content ${hasImage ? 'has-image' : 'text-only'}`}>
      {hasImage && <QuizImage media={quiz.media_url} title={content.title} />}
      <div className="quiz-section">
        <p className="quiz-question">{question}</p>
        {isCompleted && (
          <p style={{ color: '#2b8a3e', fontWeight: 800, textAlign: 'center', marginBottom: '12px', fontSize: '15px' }}>
            🎉 Con đã hoàn thành câu hỏi này!
          </p>
        )}
        <div className="quiz-options">
          {answers.map((answer) => {
            const info = emotionInfo(answer)
            const isCorrect = normalizeEmotion(answer) === normalizeEmotion(quiz.correct_emotion)
            return (
              <button
                key={answer}
                className={`quiz-option-btn ${isCompleted && isCorrect ? 'correct-completed' : ''}`}
                onClick={() => onAnswer(answer)}
                disabled={answerDisabled || isCompleted}
                aria-label={info.label}
                title={info.label}
                style={isCompleted && isCorrect ? { border: '3px solid #2b8a3e', background: '#ebfbee' } : {}}
              >
                <span className="quiz-option-emoji">{info.emoji}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function QuestionExhaustedDialog({ onClose }) {
  return (
    <div className="question-empty-overlay" role="dialog" aria-modal="true" aria-labelledby="question-empty-title">
      <div className="question-empty-dialog">
        <div className="question-empty-icon" aria-hidden="true">
          <FiCheckCircle />
        </div>
        <h2 id="question-empty-title">Đã hết câu hỏi cho bé chơi rồi</h2>
        <button type="button" onClick={onClose}>Về trang chủ</button>
      </div>
    </div>
  )
}

export default function ChildQuestions() {
  const navigate = useNavigate()
  const { setUserStars } = useOutletContext()
  const selectedChild = getSelectedChild()
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showResult, setShowResult] = useState(null)
  const [lastOutcome, setLastOutcome] = useState(null)
  const [showNoQuestionsDialog, setShowNoQuestionsDialog] = useState(false)
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const current = questions[currentIndex]
  useEffect(() => {
    if (!selectedChild?.id) return

    let mounted = true
    contentApi.list(selectedChild.id, { type: 'QUIZ', include_locked: true })
      .then((result) => {
        if (!mounted) return
        const quizzes = result.contents || []
        setQuestions(quizzes)
        
        // Find index of first uncompleted question
        const firstUncompleted = quizzes.findIndex((q) => !isQuizRewarded(q))
        setCurrentIndex(firstUncompleted !== -1 ? firstUncompleted : 0)
        
        setShowNoQuestionsDialog(quizzes.length === 0)
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

  const updateStars = (totalStars) => {
    if (typeof totalStars !== 'number') return
    setUserStars(totalStars)
    setSelectedChild({ ...selectedChild, total_stars: totalStars })
  }

  const leaveQuestionScreen = () => {
    navigate('/child/home', { replace: true })
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
      if (err.type === 'CONTENT_ALREADY_REWARDED') {
        return { starsEarned: 0, alreadyCompleted: true }
      }

      setError(err.message || 'Chưa lưu được kết quả câu hỏi.')
      return { starsEarned: 0 }
    }
  }

  const handleAnswer = async (selectedEmotion) => {
    if (!current || showResult || submittingAnswer) return
    if (isQuizRewarded(current)) {
      handleNext()
      return
    }

    try {
      setSubmittingAnswer(true)
      const correctEmotion = normalizeEmotion(current.quiz?.correct_emotion)
      const selected = normalizeEmotion(selectedEmotion)
      const isCorrect = selected === correctEmotion
      const result = await recordQuestionSession({
        content: current,
        isCorrect,
        selectedEmotion: selected,
      })

      if (result.alreadyCompleted) {
        handleNext()
        return
      }

      const correctInfo = emotionInfo(correctEmotion)
      setLastOutcome({
        completedContentId: current.id,
        starsEarned: result.starsEarned,
        explanation: isCorrect
          ? `Backend đã cộng ${result.starsEarned} sao cho câu trả lời đúng.`
          : `Đáp án đúng là ${correctInfo.emoji} ${correctInfo.label}.`,
      })
      setShowResult(isCorrect ? 'correct' : 'incorrect')
    } finally {
      setSubmittingAnswer(false)
    }
  }

  const handleContinueResult = () => {
    setShowResult(null)
    setLastOutcome(null)

    // Find the next uncompleted question starting from currentIndex + 1
    const nextUncompletedIndex = questions.findIndex(
      (quiz, idx) => idx > currentIndex && !isQuizRewarded(quiz)
    )

    if (nextUncompletedIndex !== -1) {
      setCurrentIndex(nextUncompletedIndex)
    } else {
      // Check if there are any uncompleted questions anywhere in the list
      const anyUncompletedIndex = questions.findIndex((quiz) => !isQuizRewarded(quiz))
      if (anyUncompletedIndex !== -1) {
        setCurrentIndex(anyUncompletedIndex)
      } else {
        // All questions completed!
        setShowNoQuestionsDialog(true)
      }
    }
  }

  const handleNext = () => {
    setCurrentIndex((index) => Math.min(index + 1, questions.length - 1))
  }

  const handlePrev = () => {
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
      {showNoQuestionsDialog && <QuestionExhaustedDialog onClose={leaveQuestionScreen} />}

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
        <button 
          onClick={leaveQuestionScreen}
          className="lesson-back-btn"
          aria-label="Quay lại"
        >
          <FiArrowLeft size={18} />
          <span>Quay lại</span>
        </button>

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
              answerDisabled={submittingAnswer}
            />

            <div className="lesson-navigation">
              <button 
                className="nav-btn" 
                onClick={handlePrev} 
                disabled={currentIndex === 0 || submittingAnswer}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FiChevronLeft size={18} />
                Trước
              </button>

              <div className="game-step-progress" aria-label={`Question ${currentIndex + 1}/${questions.length}`}>
                <div className="game-step-dashes">
                  {Array.from({ length: questions.length }).map((_, index) => (
                    <span key={index} className={index <= currentIndex ? 'active' : ''}></span>
                  ))}
                </div>
                <span>CÂU HỎI {currentIndex + 1}/{questions.length}</span>
              </div>

              <button 
                className="nav-btn" 
                onClick={handleNext} 
                disabled={currentIndex === questions.length - 1 || submittingAnswer}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                Tiếp
                <FiChevronRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
