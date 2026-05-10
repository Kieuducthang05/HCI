import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { CorrectAnswer, IncorrectAnswer } from '../components/ResultScreen'
import '../styles/Child.css'

const STARS_PER_CORRECT_ANSWER = 10

const todayQuestions = [
  {
    id: 1,
    emotion: 'Buồn',
    question: 'Khi bé cảm thấy buồn, bé nên làm gì?',
    options: [
      'Nghỉ ngơi một chút',
      'Nói chuyện với bố mẹ hoặc người lớn',
      'Chơi với bạn bè',
      'Tất cả những điều trên'
    ],
    correct: 3,
    emoji: '😢',
    explanation: 'Khi buồn, bé có thể nghỉ ngơi, chơi với bạn bè hoặc nói với người lớn để được lắng nghe và giúp đỡ.'
  },
  {
    id: 2,
    emotion: 'Tức giận',
    question: 'Khi bé tức giận, cách tốt nhất là:',
    options: [
      'Đánh vỡ đồ vật',
      'Hít thở sâu và bình tĩnh lại',
      'Chạy đi và trốn',
      'La hét thật to'
    ],
    correct: 1,
    emoji: '😡',
    explanation: 'Hít thở sâu giúp cơ thể bình tĩnh hơn. Sau đó bé có thể nói ra điều làm mình khó chịu.'
  },
  {
    id: 3,
    emotion: 'Vui vẻ',
    question: 'Cảm xúc vui vẻ thường xuất hiện khi:',
    options: [
      'Chơi với bạn bè',
      'Ăn những món mình thích',
      'Được khen ngợi',
      'Tất cả những điều trên'
    ],
    correct: 3,
    emoji: '😊',
    explanation: 'Niềm vui có thể đến từ nhiều việc tốt đẹp như chơi cùng bạn, ăn món yêu thích hoặc được mọi người động viên.'
  }
]

export default function ChildQuestions() {
  const navigate = useNavigate()
  const { setUserStars } = useOutletContext()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answered, setAnswered] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [isComplete, setIsComplete] = useState(false)

  const handleAnswer = (answer) => {
    if (feedback || isComplete) return

    const current = todayQuestions[currentQuestion]
    const isCorrect = answer === current.correct

    setAnswered((previousAnswers) => [
      ...previousAnswers,
      { questionId: current.id, answer, isCorrect }
    ])
    setFeedback({ isCorrect, question: current })
  }

  const handleContinueFeedback = () => {
    setFeedback(null)
    if (currentQuestion < todayQuestions.length - 1) {
      setCurrentQuestion((questionIndex) => questionIndex + 1)
      return
    }

    setUserStars((stars) => stars + correctAnswers * STARS_PER_CORRECT_ANSWER)
    setIsComplete(true)
  }

  const handleRestart = () => {
    setCurrentQuestion(0)
    setAnswered([])
    setFeedback(null)
    setIsComplete(false)
  }

  const current = todayQuestions[currentQuestion]
  const correctAnswers = answered.filter((answer) => answer.isCorrect).length
  const earnedStars = correctAnswers * STARS_PER_CORRECT_ANSWER

  if (isComplete) {
    return (
      <div className="child-questions">
        <div className="quiz-complete-card">
          <div className="quiz-complete-emoji">🎉</div>
          <h2 className="quiz-complete-title">Hoàn thành câu hỏi hôm nay!</h2>
          <p className="quiz-complete-text">
            Bé trả lời đúng {correctAnswers}/{todayQuestions.length} câu.
          </p>

          <div className="quiz-summary">
            <div className="quiz-summary-item">
              <span>Điểm</span>
              <strong>{correctAnswers}/{todayQuestions.length}</strong>
            </div>
            <div className="quiz-summary-item">
              <span>Thưởng</span>
              <strong>+{earnedStars} ⭐</strong>
            </div>
          </div>

          <div className="complete-buttons">
            <button className="play-again-btn" onClick={handleRestart}>
              Làm lại
            </button>
            <button className="go-menu-btn" onClick={() => navigate('/child/home')}>
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="child-questions">
      {feedback?.isCorrect && (
        <CorrectAnswer
          emotion={feedback.question.emotion}
          score={`${correctAnswers}/${todayQuestions.length}`}
          title="Chính xác!"
          continueLabel={
            currentQuestion < todayQuestions.length - 1
              ? 'Câu tiếp theo →'
              : 'Xem kết quả →'
          }
          messages={[
            '⭐ Bé đã chọn đúng đáp án!',
            currentQuestion < todayQuestions.length - 1
              ? '🎉 Cùng sang câu tiếp theo nhé!'
              : '🎉 Cùng xem kết quả hôm nay nhé!'
          ]}
          onContinue={handleContinueFeedback}
        />
      )}

      {feedback && !feedback.isCorrect && (
        <IncorrectAnswer
          emotion={feedback.question.emotion}
          title="Chưa đúng rồi!"
          continueLabel={
            currentQuestion < todayQuestions.length - 1
              ? 'Câu tiếp theo →'
              : 'Xem kết quả →'
          }
          explanation={feedback.question.explanation}
          encouragement="✨ Không sao, bé đã học thêm được một điều mới!"
          onContinue={handleContinueFeedback}
        />
      )}

      <div className="questions-header">
        <h2>❓ Câu hỏi hôm nay</h2>
        <button className="close-btn" onClick={() => navigate('/child/home')}>✕</button>
      </div>

      <div className="question-card">
        <div className="emoji-display">{current.emoji}</div>
        
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((currentQuestion + 1) / todayQuestions.length) * 100}%` }}
          ></div>
        </div>
        <p className="progress-text">{currentQuestion + 1}/{todayQuestions.length}</p>

        <h3 className="question-text">{current.question}</h3>

        <div className="options-list">
          {current.options.map((option, idx) => (
            <button
              key={idx}
              className="option-btn"
              onClick={() => handleAnswer(idx)}
            >
              {String.fromCharCode(65 + idx)}. {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
