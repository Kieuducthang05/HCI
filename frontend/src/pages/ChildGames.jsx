import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { CorrectAnswer, IncorrectAnswer } from '../components/ResultScreen'
import '../styles/Child.css'

const POINTS_PER_CORRECT_ANSWER = 10

export default function ChildGames() {
  const navigate = useNavigate()
  const { setUserStars } = useOutletContext()
  const [currentGame, setCurrentGame] = useState(null)
  const [score, setScore] = useState(0)
  const [gameIndex, setGameIndex] = useState(0)
  const [feedback, setFeedback] = useState(null)

  // Game 1: Choose Emotion
  const chooseEmotionGames = [
    {
      id: 1,
      emotion: 'VUI',
      question: 'Ai đang {emotion} vậy con?',
      description: 'Hãy chạm vào bức ảnh của bạn để đoán cảm thái thỏ nha!',
      images: [
        { src: '😊', label: 'Vui', emotion: 'JOY', color: '#FFD700' },
        { src: '😢', label: 'Buồn', emotion: 'SAD', color: '#87CEEB' },
        { src: '😡', label: 'Tức giận', emotion: 'ANGRY', color: '#FF6347' },
        { src: '😨', label: 'Ngạc nhiên', emotion: 'SURPRISED', color: '#DDA0DD' }
      ],
      correctAnswer: 0,
      explanation: '😊 đó là cảm xúc VUI vẻ!'
    },
    {
      id: 2,
      emotion: 'BUỒN',
      question: 'Ai đang {emotion} vậy con?',
      description: 'Hãy chạm vào bức ảnh của bạn để đoán cảm thái thỏ nha!',
      images: [
        { src: '😊', label: 'Vui', emotion: 'JOY', color: '#FFD700' },
        { src: '😢', label: 'Buồn', emotion: 'SAD', color: '#87CEEB' },
        { src: '😡', label: 'Tức giận', emotion: 'ANGRY', color: '#FF6347' },
        { src: '😨', label: 'Ngạc nhiên', emotion: 'SURPRISED', color: '#DDA0DD' }
      ],
      correctAnswer: 1,
      explanation: '😢 đó là cảm xúc BUỒN bã!'
    },
    {
      id: 3,
      emotion: 'BÌNH TĨNH',
      question: 'Ai đang {emotion} vậy con?',
      description: 'Hãy chạm vào bức ảnh của bạn để đoán cảm thái thỏ nha!',
      images: [
        { src: '😡', label: 'Tức giận', emotion: 'ANGRY', color: '#FF6347' },
        { src: '😨', label: 'Ngạc nhiên', emotion: 'SURPRISED', color: '#DDA0DD' },
        { src: '😌', label: 'Bình tĩnh', emotion: 'CALM', color: '#90EE90' },
        { src: '😢', label: 'Buồn', emotion: 'SAD', color: '#87CEEB' }
      ],
      correctAnswer: 2,
      explanation: '😌 đó là cảm xúc BÌNH TĨNH!'
    }
  ]

  // Game 2: Choose Reaction
  const chooseReactionGames = [
    {
      id: 1,
      scenario: '👦 Bạn bị ngã xuống đất',
      reactions: ['Bỏ đi', 'Cười', 'An ủi', 'Gọi bố mẹ'],
      correctAnswers: [2, 3],
      explanation: 'Bạn nên an ủi hoặc gọi bố mẹ để giúp đỡ!'
    },
    {
      id: 2,
      scenario: '🎂 Mẹ vừa mua bánh sinh nhật cho bé',
      reactions: ['Chạy đi', 'Vui lên', 'Ôm mẹ', 'Nằm yên'],
      correctAnswers: [1, 2],
      explanation: 'Bạn nên vui lên và ôm mẹ để cảm ơn!'
    },
    {
      id: 3,
      scenario: '😢 Bạn bị ai đó làm tổn thương',
      reactions: ['Đánh lại', 'Nói chuyện với người lớn', 'Khóc', 'Bất chấp'],
      correctAnswers: [1, 2],
      explanation: 'Bạn nên nói chuyện với người lớn để được giúp đỡ!'
    }
  ]

  // Game 3: Match Emotion
  const matchEmotionGames = [
    {
      id: 1,
      description: 'Khi bé chơi với bạn',
      emotion: 'Vui vẻ',
      correctEmoji: '😊',
      options: ['😊', '😢', '😡', '😨'],
      explanation: 'Khi chơi với bạn, bé thường cảm thấy vui vẻ nên 😊 là phù hợp.'
    },
    {
      id: 2,
      description: 'Khi bé mất đồ chơi yêu thích',
      emotion: 'Buồn',
      correctEmoji: '😢',
      options: ['😊', '😢', '😌', '😡'],
      explanation: 'Khi mất món đồ mình thích, bé có thể thấy buồn. Biểu cảm 😢 là phù hợp.'
    },
    {
      id: 3,
      description: 'Khi bé không được làm những gì muốn',
      emotion: 'Tức giận',
      correctEmoji: '😡',
      options: ['😊', '😡', '😨', '😌'],
      explanation: 'Khi không được điều mình muốn, bé có thể tức giận. Biểu cảm 😡 là phù hợp.'
    }
  ]

  const games = {
    chooseEmotion: chooseEmotionGames,
    chooseReaction: chooseReactionGames,
    matchEmotion: matchEmotionGames
  }

  const gameOptions = [
    {
      id: 'chooseEmotion',
      title: '🎯 Chọn cảm xúc đúng',
      description: 'Xem câu hỏi và chọn biểu cảm đúng',
      icon: '😊'
    },
    {
      id: 'chooseReaction',
      title: '⚡ Chọn cách phản ứng',
      description: 'Xử lý tình huống đúng cách',
      icon: '⚡'
    },
    {
      id: 'matchEmotion',
      title: '😊 Chọn biểu cảm đúng',
      description: 'Khớp cảm xúc với tình huống',
      icon: '🎭'
    }
  ]

  const startGame = (gameId) => {
    setCurrentGame(gameId)
    setGameIndex(0)
    setScore(0)
    setFeedback(null)
  }

  const backToMenu = () => {
    setCurrentGame(null)
    setGameIndex(0)
    setScore(0)
    setFeedback(null)
  }

  const getFeedbackInfo = () => {
    const currentGameData = games[currentGame][gameIndex]

    if (currentGame === 'chooseEmotion') {
      return {
        emotion: currentGameData.emotion,
        explanation: currentGameData.explanation
      }
    }

    if (currentGame === 'chooseReaction') {
      return {
        emotion: 'Phản ứng phù hợp',
        explanation: currentGameData.explanation
      }
    }

    return {
      emotion: currentGameData.emotion,
      explanation: currentGameData.explanation
    }
  }

  const handleGameAnswer = (isCorrect) => {
    if (feedback) return

    const scoreAfterAnswer = isCorrect ? score + POINTS_PER_CORRECT_ANSWER : score
    if (isCorrect) {
      setScore(scoreAfterAnswer)
    }

    setFeedback({
      isCorrect,
      scoreAfterAnswer,
      ...getFeedbackInfo()
    })
  }

  const handleContinueFeedback = () => {
    const isLastQuestion = gameIndex >= games[currentGame].length - 1
    const scoreAfterAnswer = feedback?.scoreAfterAnswer ?? score

    setFeedback(null)

    if (isLastQuestion) {
      setScore(scoreAfterAnswer)
      setUserStars((stars) => stars + scoreAfterAnswer)
      setGameIndex(games[currentGame].length)
      return
    }

    setGameIndex((index) => index + 1)
  }

  if (!currentGame) {
    return (
      <div className="child-games-menu">
        <h2 className="games-title">🎮 Chọn trò chơi</h2>
        
        <div className="games-grid">
          {gameOptions.map(game => (
            <div
              key={game.id}
              className="game-card"
              onClick={() => startGame(game.id)}
            >
              <div className="game-icon">{game.icon}</div>
              <h3 className="game-title">{game.title}</h3>
              <p className="game-description">{game.description}</p>
              <button className="play-btn">Chơi →</button>
            </div>
          ))}
        </div>

        <button className="back-to-home" onClick={() => navigate('/child/home')}>
          ← Quay lại
        </button>
      </div>
    )
  }

  const currentGameData = games[currentGame][gameIndex]
  const isGameComplete = gameIndex >= games[currentGame].length
  const feedbackOverlay = feedback && (
    feedback.isCorrect ? (
      <CorrectAnswer
        emotion={feedback.emotion}
        score={`${feedback.scoreAfterAnswer} ⭐`}
        title="Đúng rồi!"
        continueLabel={
          gameIndex < games[currentGame].length - 1
            ? 'Tiếp tục →'
            : 'Xem kết quả →'
        }
        messages={[
          '⭐ Bé đã chọn rất chính xác!',
          gameIndex < games[currentGame].length - 1
            ? '🎉 Cùng sang lượt tiếp theo nhé!'
            : '🎉 Cùng xem kết quả trò chơi nhé!'
        ]}
        onContinue={handleContinueFeedback}
      />
    ) : (
      <IncorrectAnswer
        emotion={feedback.emotion}
        title="Chưa đúng rồi!"
        continueLabel={
          gameIndex < games[currentGame].length - 1
            ? 'Tiếp tục →'
            : 'Xem kết quả →'
        }
        explanation={feedback.explanation}
        encouragement="✨ Không sao, bé đã học thêm được một điều mới!"
        onContinue={handleContinueFeedback}
      />
    )
  )

  if (isGameComplete) {
    return (
      <div className="game-complete">
        <div className="complete-content">
          <h2 className="complete-title">🎉 Hoàn thành!</h2>
          <p className="complete-text">Bạn đã đạt được</p>
          <div className="final-score">{score} ⭐</div>
          <p className="encourage-text">Tuyệt vời lắm! Hãy tiếp tục học hỏi!</p>
          
          <div className="complete-buttons">
            <button className="play-again-btn" onClick={() => startGame(currentGame)}>
              Chơi lại
            </button>
            <button className="go-menu-btn" onClick={backToMenu}>
              Quay lại menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (currentGame === 'chooseEmotion') {
    const emotionColor = {
      'VUI': '#305196',
      'BUỒN': '#305196',
      'BÌNH TĨNH': '#305196',
      'TỨC GIẬN': '#305196'
    }

    const renderQuestion = () => {
      const parts = currentGameData.question.split('{emotion}')
      return (
        <>
          {parts[0]}
          <span style={{ color: emotionColor[currentGameData.emotion], fontWeight: 'bold' }}>
            {currentGameData.emotion}
          </span>
          {parts[1]}
        </>
      )
    }

    return (
      <div className="choose-emotion-game">
        {feedbackOverlay}
        <div className="game-header-new">
          <button className="game-back-btn" onClick={backToMenu}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Quay lại</span>
          </button>
          <div className="game-score-badge">
            <span style={{ fontSize: '12px' }}>Score</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{score}</span>
          </div>
        </div>

        <div className="choose-emotion-content">
          <h2 className="question-title">{renderQuestion()}</h2>
          
          <p className="question-description">{currentGameData.description}</p>

          <div className="emotion-grid">
            {currentGameData.images.map((imageData, idx) => (
              <button
                key={idx}
                className="emotion-card"
                onClick={() => handleGameAnswer(idx === currentGameData.correctAnswer)}
                style={{ borderColor: imageData.color, backgroundColor: `${imageData.color}15` }}
              >
                <div className="emotion-image" style={{ fontSize: '60px' }}>
                  {imageData.src}
                </div>
              </button>
            ))}
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((gameIndex + 1) / games[currentGame].length) * 100}%` }}
              ></div>
            </div>
            <span className="progress-text">QUESTION {gameIndex + 1}/{games[currentGame].length}</span>
          </div>
        </div>
      </div>
    )
  }

  if (currentGame === 'chooseReaction') {
    return (
      <div className="game-container">
        {feedbackOverlay}
        <div className="game-header">
          <button className="game-back" onClick={backToMenu}>←</button>
          <div className="game-score">⭐ {score}</div>
        </div>

        <div className="scenario">
          {currentGameData.scenario}
        </div>

        <div className="reactions-grid">
          {currentGameData.reactions.map((reaction, idx) => (
            <button
              key={idx}
              className="reaction-btn"
              onClick={() => handleGameAnswer(currentGameData.correctAnswers.includes(idx))}
            >
              {reaction}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (currentGame === 'matchEmotion') {
    return (
      <div className="game-container">
        {feedbackOverlay}
        <div className="game-header">
          <button className="game-back" onClick={backToMenu}>←</button>
          <div className="game-score">⭐ {score}</div>
        </div>

        <div className="match-description">
          {currentGameData.description}
        </div>

        <div className="match-options">
          {currentGameData.options.map((emoji, idx) => (
            <button
              key={idx}
              className="match-btn"
              onClick={() => handleGameAnswer(emoji === currentGameData.correctEmoji)}
            >
              <span className="match-emoji">{emoji}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }
}
