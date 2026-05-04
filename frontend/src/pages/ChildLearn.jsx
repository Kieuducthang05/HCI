import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CorrectAnswer, IncorrectAnswer } from '../components/ResultScreen'
import '../styles/Child.css'
import '../styles/ChildLearn.css'
import '../styles/ResultScreen.css'

export default function ChildLearn() {
  const navigate = useNavigate()
  const [currentLesson, setCurrentLesson] = useState('emotions')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showResult, setShowResult] = useState(null) // null, 'correct', 'incorrect'
  const [score, setScore] = useState(0)

  const emotionRecognition = [
    {
      id: 1,
      emotion: 'Vui vẻ',
      emoji: '😊',
      description: 'Khi bé cảm thấy hạnh phúc',
      color: '#ffd700',
      examples: ['Chơi với bạn', 'Ăn kem', 'Được kỉ niệm'],
      question: 'Mặt nào dưới đây thể hiện cảm xúc VUI VẺ?',
      options: ['😊 (Vui vẻ)', '😢 (Buồn)', '😡 (Tức giận)'],
      correctAnswer: 0,
      explanation: 'Cảm xúc vui vẻ thường được thể hiện bằng nụ cười rực rỡ và đôi mắt sáng lên. Biểu tượng 😊 là cảm xúc vui vẻ.'
    },
    {
      id: 2,
      emotion: 'Buồn',
      emoji: '😢',
      description: 'Khi bé cảm thấy tâm trạng không tốt',
      color: '#87ceeb',
      examples: ['Mất một đồ chơi yêu thích', 'Bị bạn làm tổn thương', 'Cô đơn'],
      question: 'Mặt nào thể hiện cảm xúc BUỒN?',
      options: ['😊 (Vui vẻ)', '😢 (Buồn)', '😡 (Tức giận)'],
      correctAnswer: 1,
      explanation: 'Cảm xúc buồn được thể hiện bằng nước mắt, miệng cau có. Biểu tượng 😢 là cảm xúc buồn bã.'
    },
    {
      id: 3,
      emotion: 'Tức giận',
      emoji: '😡',
      description: 'Khi bé cảm thấy bực bội',
      color: '#ff6b6b',
      examples: ['Không được điều mong muốn', 'Ai đó đánh phá đồ chơi', 'Cảm thấy không công bằng'],
      question: 'Mặt nào thể hiện cảm xúc TỨC GIẬN?',
      options: ['😊 (Vui vẻ)', '😡 (Tức giận)', '😌 (Bình tĩnh)'],
      correctAnswer: 1,
      explanation: 'Cảm xúc tức giận được thể hiện bằng mặt nhăn nhó, mắt nhìn thẳng. Biểu tượng 😡 là cảm xúc tức giận.'
    },
    {
      id: 4,
      emotion: 'Sợ',
      emoji: '😨',
      description: 'Khi bé cảm thấy lo sợ',
      color: '#a67bb8',
      examples: ['Khi tối tăm', 'Gặp điều mới lạ', 'Nghe âm thanh lạ'],
      question: 'Mặt nào thể hiện cảm xúc SỢ?',
      options: ['😨 (Sợ)', '😊 (Vui vẻ)', '😌 (Bình tĩnh)'],
      correctAnswer: 0,
      explanation: 'Cảm xúc sợ hãi được thể hiện bằng mắt mở to, mồm há. Biểu tượng 😨 là cảm xúc sợ hãi.'
    },
    {
      id: 5,
      emotion: 'Bình tĩnh',
      emoji: '😌',
      description: 'Khi bé cảm thấy yên bình',
      color: '#90ee90',
      examples: ['Ngồi bên mẹ', 'Nghe nhạc soothing', 'Làm việc yêu thích'],
      question: 'Mặt nào thể hiện cảm xúc BÌNH TĨNH?',
      options: ['😌 (Bình tĩnh)', '😢 (Buồn)', '😡 (Tức giận)'],
      correctAnswer: 0,
      explanation: 'Cảm xúc bình tĩnh được thể hiện bằng gương mặt thoải mái, mắt nhắm có yên. Biểu tượng 😌 là cảm xúc bình tĩnh.'
    }
  ]

  const emotionalExpression = [
    {
      id: 1,
      title: 'Cách nói',
      emoji: '💬',
      description: 'Nói ra cảm xúc của mình',
      tip: 'Ví dụ: "Em cảm thấy buồn" thay vì im lặng'
    },
    {
      id: 2,
      title: 'Cách vẽ',
      emoji: '🎨',
      description: 'Vẽ để thể hiện cảm xúc',
      tip: 'Màu sắc và nét vẽ phản ánh cảm xúc'
    },
    {
      id: 3,
      title: 'Cách khiêu vũ',
      emoji: '💃',
      description: 'Nhảy theo cảm xúc',
      tip: 'Khi vui vẻ là những bước nhảy nhẹ nhàng'
    },
    {
      id: 4,
      title: 'Cách viết',
      emoji: '✍️',
      description: 'Viết nhật kỳ cảm xúc',
      tip: 'Ghi lại cảm xúc mỗi ngày'
    }
  ]

  const lessons = {
    emotions: emotionRecognition,
    expression: emotionalExpression
  }

  const current = lessons[currentLesson][currentIndex]

  const handleNext = () => {
    if (currentIndex < lessons[currentLesson].length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleAnswer = (selectedIndex) => {
    const correct = selectedIndex === current.correctAnswer
    if (correct) {
      setShowResult('correct')
      setScore(score + 1)
    } else {
      setShowResult('incorrect')
    }
  }

  const handleContinueResult = () => {
    setShowResult(null)
    if (currentIndex < lessons[currentLesson].length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Quiz kết thúc
      setCurrentIndex(0)
    }
  }

  return (
    <div className="child-lesson">
      {/* Show Result Screens */}
      {showResult === 'correct' && (
        <CorrectAnswer 
          emotion={current.emotion}
          score={score}
          onContinue={handleContinueResult}
        />
      )}
      
      {showResult === 'incorrect' && (
        <IncorrectAnswer 
          emotion={current.emotion}
          onContinue={handleContinueResult}
          explanation={current.explanation}
        />
      )}

      {/* Lesson Tabs */}
      <div className="lesson-tabs">
        <button
          className={`tab ${currentLesson === 'emotions' ? 'active' : ''}`}
          onClick={() => {
            setCurrentLesson('emotions')
            setCurrentIndex(0)
            setShowResult(null)
          }}
        >
          😊 Nhận diện cảm xúc
        </button>
        <button
          className={`tab ${currentLesson === 'expression' ? 'active' : ''}`}
          onClick={() => {
            setCurrentLesson('expression')
            setCurrentIndex(0)
            setShowResult(null)
          }}
        >
          😌 Biểu đạt cảm xúc
        </button>
      </div>

      {/* Lesson Card */}
      <div className="lesson-card">
        {currentLesson === 'emotions' ? (
          <>
            <div className="emotion-card">
              <div className="emotion-circle" style={{ backgroundColor: current.color }}>
                <span className="big-emoji">{current.emoji}</span>
              </div>
              <h2 className="emotion-title">{current.emotion}</h2>
              <p className="emotion-description">{current.description}</p>
              
              <div className="examples-section">
                <h4>Ví dụ:</h4>
                <ul className="examples-list">
                  {current.examples.map((example, idx) => (
                    <li key={idx}>🔹 {example}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Quiz Section */}
            <div className="quiz-section">
              <h3 className="quiz-question">{current.question}</h3>
              <div className="quiz-options">
                {current.options.map((option, idx) => (
                  <button
                    key={idx}
                    className="quiz-option-btn"
                    onClick={() => handleAnswer(idx)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="expression-card">
            <div className="expression-icon">{current.emoji}</div>
            <h2 className="expression-title">{current.title}</h2>
            <p className="expression-description">{current.description}</p>
            
            <div className="tip-section">
              <p className="tip-label">💡 Mẹo:</p>
              <p className="tip-text">{current.tip}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        {currentLesson === 'expression' && (
          <div className="lesson-navigation">
            <button
              className="nav-btn"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              ← Trước
            </button>
            
            <div className="progress">
              <span className="progress-text">
                {currentIndex + 1} / {lessons[currentLesson].length}
              </span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${((currentIndex + 1) / lessons[currentLesson].length) * 100}%`
                  }}
                ></div>
              </div>
            </div>

            <button
              className="nav-btn"
              onClick={handleNext}
              disabled={currentIndex === lessons[currentLesson].length - 1}
            >
              Tiếp →
            </button>
          </div>
        )}
      </div>

      {/* Back Button */}
      <button className="back-to-home" onClick={() => navigate('/child/home')}>
        ← Quay lại
      </button>
    </div>
  )
}
