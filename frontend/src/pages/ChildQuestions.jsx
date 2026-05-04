import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Child.css'

export default function ChildQuestions() {
  const navigate = useNavigate()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answered, setAnswered] = useState([])

  const todayQuestions = [
    {
      id: 1,
      question: 'Khi bế cảm thấy buồn, bế nên làm gì?',
      options: [
        'Nch im lặng một mình',
        'Nói chuyện với bố mẹ hoặc người lớn',
        'Chơi với bạn bè',
        'Tất cả những điều trên'
      ],
      correct: 3,
      emoji: '😢'
    },
    {
      id: 2,
      question: 'Khi bé tức giận, cách tốt nhất là:',
      options: [
        'Đánh vỡ đồ vật',
        'Hít thở sâu và yên tĩnh',
        'Chạy đi và trốn',
        'La hét to tiếng'
      ],
      correct: 1,
      emoji: '😡'
    },
    {
      id: 3,
      question: 'Cảm xúc vui vẻ thường xuất hiện khi:',
      options: [
        'Chơi với bạn bè',
        'Ăn những thứ ngon',
        'Được khen ngợi',
        'Tất cả những điều trên'
      ],
      correct: 3,
      emoji: '😊'
    }
  ]

  const handleAnswer = (answer) => {
    const isCorrect = answer === todayQuestions[currentQuestion].correct
    setAnswered([...answered, { questionId: currentQuestion, answer, isCorrect }])
    
    if (isCorrect) {
      alert('✅ Tuyệt vời!')
    } else {
      alert('❌ Sai rồi! Hãy thử lần sau.')
    }

    if (currentQuestion < todayQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      alert(`📊 Bạn trả lời đúng ${answered.filter(a => a.isCorrect).length + (isCorrect ? 1 : 0)}/${todayQuestions.length} câu!`)
      navigate('/child/home')
    }
  }

  const current = todayQuestions[currentQuestion]

  return (
    <div className="child-questions">
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
