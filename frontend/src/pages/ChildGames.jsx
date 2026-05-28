import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { CorrectAnswer, IncorrectAnswer } from '../components/ResultScreen'
import { contentApi, getSelectedChild, setSelectedChild } from '../services/api'
import '../styles/Child.css'

const gameContentKeys = {
  chooseEmotion: ['choose-emotion-happy', 'choose-emotion-sad', 'choose-emotion-calm'],
  chooseReaction: ['choose-reaction-help', 'choose-reaction-thanks', 'choose-reaction-support'],
  matchEmotion: ['match-emotion-play', 'match-emotion-lost-toy', 'match-emotion-boundary'],
}

const gameContentFallback = {
  chooseEmotion: 'JOY',
  chooseReaction: 'CALM',
  matchEmotion: 'CALM',
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function findGameContent(contents, gameId, index) {
  const key = gameContentKeys[gameId]?.[index]
  const byKey = contents.find((content) => normalize(content.title).includes(key))
  if (byKey) return byKey

  const target = gameContentFallback[gameId]
  return contents.find((content) => normalize(content.game?.target_emotion).includes(normalize(target)))
    || contents[index % Math.max(contents.length, 1)]
    || null
}

function nowMs() {
  return Date.now()
}

function makeSessionKey(gameId, questionIndex) {
  if (window.crypto?.randomUUID) {
    return `${gameId}-${questionIndex}-${window.crypto.randomUUID()}`
  }

  return `${gameId}-${questionIndex}-${nowMs()}`
}

const chooseEmotionGames = [
  {
    emotion: 'VUI',
    question: 'Ai đang {emotion} vậy con?',
    description: 'Hãy chạm vào biểu cảm đúng.',
    images: [
      { src: '😊', label: 'Vui', emotion: 'JOY', color: '#FFD700' },
      { src: '😢', label: 'Buồn', emotion: 'SAD', color: '#87CEEB' },
      { src: '😡', label: 'Tức giận', emotion: 'ANGRY', color: '#FF6347' },
      { src: '😨', label: 'Ngạc nhiên', emotion: 'SURPRISED', color: '#DDA0DD' },
    ],
    correctAnswer: 0,
    explanation: '😊 đó là cảm xúc vui vẻ.',
  },
  {
    emotion: 'BUỒN',
    question: 'Ai đang {emotion} vậy con?',
    description: 'Hãy chạm vào biểu cảm đúng.',
    images: [
      { src: '😊', label: 'Vui', emotion: 'JOY', color: '#FFD700' },
      { src: '😢', label: 'Buồn', emotion: 'SAD', color: '#87CEEB' },
      { src: '😡', label: 'Tức giận', emotion: 'ANGRY', color: '#FF6347' },
      { src: '😨', label: 'Ngạc nhiên', emotion: 'SURPRISED', color: '#DDA0DD' },
    ],
    correctAnswer: 1,
    explanation: '😢 đó là cảm xúc buồn.',
  },
  {
    emotion: 'BÌNH TĨNH',
    question: 'Ai đang {emotion} vậy con?',
    description: 'Hãy chạm vào biểu cảm đúng.',
    images: [
      { src: '😡', label: 'Tức giận', emotion: 'ANGRY', color: '#FF6347' },
      { src: '😨', label: 'Ngạc nhiên', emotion: 'SURPRISED', color: '#DDA0DD' },
      { src: '😌', label: 'Bình tĩnh', emotion: 'CALM', color: '#90EE90' },
      { src: '😢', label: 'Buồn', emotion: 'SAD', color: '#87CEEB' },
    ],
    correctAnswer: 2,
    explanation: '😌 đó là cảm xúc bình tĩnh.',
  },
]

const chooseReactionGames = [
  {
    scenario: '👦 Bạn bị ngã xuống đất',
    reactions: ['Bỏ đi', 'Cười', 'An ủi', 'Gọi bố mẹ'],
    correctAnswers: [2, 3],
    explanation: 'Con nên an ủi hoặc gọi bố mẹ để giúp bạn.',
  },
  {
    scenario: '🎂 Mẹ vừa mua bánh sinh nhật cho bé',
    reactions: ['Chạy đi', 'Vui lên', 'Ôm mẹ', 'Nằm yên'],
    correctAnswers: [1, 2],
    explanation: 'Con có thể vui lên và ôm mẹ để cảm ơn.',
  },
  {
    scenario: '😢 Bạn bị ai đó làm tổn thương',
    reactions: ['Đánh lại', 'Nói chuyện với người lớn', 'Khóc', 'Bất chấp'],
    correctAnswers: [1, 2],
    explanation: 'Con nên nói chuyện với người lớn để được giúp đỡ.',
  },
]

const matchEmotionGames = [
  {
    description: 'Khi bé chơi với bạn',
    emotion: 'JOY',
    label: 'Vui vẻ',
    correctEmoji: '😊',
    options: ['😊', '😢', '😡', '😨'],
    explanation: 'Khi chơi với bạn, bé thường cảm thấy vui vẻ.',
  },
  {
    description: 'Khi bé mất đồ chơi yêu thích',
    emotion: 'SAD',
    label: 'Buồn',
    correctEmoji: '😢',
    options: ['😊', '😢', '😌', '😡'],
    explanation: 'Khi mất món đồ mình thích, bé có thể thấy buồn.',
  },
  {
    description: 'Khi bé không được làm điều mình muốn',
    emotion: 'ANGRY',
    label: 'Tức giận',
    correctEmoji: '😡',
    options: ['😊', '😡', '😨', '😌'],
    explanation: 'Khi không được điều mình muốn, bé có thể tức giận.',
  },
]

const games = {
  chooseEmotion: chooseEmotionGames,
  chooseReaction: chooseReactionGames,
  matchEmotion: matchEmotionGames,
}

const gameOptions = [
  {
    id: 'chooseEmotion',
    title: '🎯 Chọn cảm xúc đúng',
    description: 'Xem câu hỏi và chọn biểu cảm đúng',
    icon: '😊',
  },
  {
    id: 'chooseReaction',
    title: '⚡ Chọn cách phản ứng',
    description: 'Xử lý tình huống đúng cách',
    icon: '⚡',
  },
  {
    id: 'matchEmotion',
    title: '🎭 Ghép cảm xúc',
    description: 'Khớp cảm xúc với tình huống',
    icon: '🎭',
  },
]

export default function ChildGames() {
  const navigate = useNavigate()
  const { setUserStars } = useOutletContext()
  const selectedChild = getSelectedChild()
  const [currentGame, setCurrentGame] = useState(null)
  const [score, setScore] = useState(0)
  const [gameIndex, setGameIndex] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [gameContents, setGameContents] = useState([])
  const [contentError, setContentError] = useState('')
  const [sessionStartTime, setSessionStartTime] = useState(null)

  useEffect(() => {
    if (!selectedChild?.id) {
      return
    }

    contentApi.list(selectedChild.id, { type: 'GAME', include_locked: true })
      .then((result) => {
        const contents = result.contents || []
        setGameContents(contents)
        setContentError(contents.length ? '' : 'Backend chưa có nội dung GAME để cộng sao.')
      })
      .catch((error) => {
        setContentError(error.message || 'Không tải được nội dung game từ backend.')
      })
  }, [selectedChild?.id])

  const selectedContent = useMemo(
    () => (currentGame ? findGameContent(gameContents, currentGame, gameIndex) : null),
    [currentGame, gameContents, gameIndex],
  )

  const startGame = (gameId) => {
    setCurrentGame(gameId)
    setGameIndex(0)
    setScore(0)
    setFeedback(null)
    setSessionStartTime(nowMs())
  }

  const backToMenu = () => {
    setCurrentGame(null)
    setGameIndex(0)
    setScore(0)
    setFeedback(null)
    setSessionStartTime(null)
  }

  const getFeedbackInfo = () => {
    const currentGameData = games[currentGame][gameIndex]

    if (currentGame === 'chooseEmotion') {
      return {
        emotion: currentGameData.emotion,
        explanation: currentGameData.explanation,
      }
    }

    if (currentGame === 'chooseReaction') {
      return {
        emotion: 'Phản ứng phù hợp',
        explanation: currentGameData.explanation,
      }
    }

    return {
      emotion: currentGameData.label,
      explanation: currentGameData.explanation,
    }
  }

  const updateSelectedChildStars = (totalStars) => {
    if (typeof totalStars !== 'number') return
    setUserStars(totalStars)
    setSelectedChild({ ...selectedChild, total_stars: totalStars })
  }

  const ensureContentUnlocked = async (content) => {
    if (!selectedChild?.id || !content) return false
    if (content.is_unlocked || content.isUnlocked || content.unlock) return true

    try {
      const result = await contentApi.unlock(selectedChild.id, content.id)
      setGameContents((prev) => prev.map((item) => (
        item.id === content.id
          ? { ...item, is_unlocked: true, isUnlocked: true, unlock: result.unlock }
          : item
      )))
      updateSelectedChildStars(result.child_total_stars)
      return true
    } catch (error) {
      if (error.type === 'CONTENT_ALREADY_UNLOCKED') return true
      setContentError(error.message || 'Không thể mở khóa nội dung game.')
      return false
    }
  }

  const recordGameSession = async ({ content, selectedEmotion }) => {
    if (!selectedChild?.id || !content) return { starsEarned: 0 }

    const unlocked = await ensureContentUnlocked(content)
    if (!unlocked) return { starsEarned: 0 }

    const startedAt = sessionStartTime ? new Date(sessionStartTime).toISOString() : new Date().toISOString()
    const completedAt = new Date().toISOString()
    const finishedAt = nowMs()
    const durationSeconds = Math.max(1, Math.round((finishedAt - (sessionStartTime || finishedAt)) / 1000))
    const targetEmotion = content.game?.target_emotion || content.game?.targetEmotion || selectedEmotion

    try {
      const result = await contentApi.recordSession(selectedChild.id, {
        content_id: content.id,
        idempotency_key: makeSessionKey(currentGame, gameIndex),
        duration_seconds: durationSeconds,
        status: 'COMPLETED',
        started_at: startedAt,
        completed_at: completedAt,
        is_correct: true,
        selected_emotion: selectedEmotion,
        ai_match_score: 1,
        ai_detected_emotion: targetEmotion,
        ai_confidence: 1,
        metadata: {
          local_game_id: currentGame,
          local_question_index: gameIndex,
        },
      })

      updateSelectedChildStars(result.child_total_stars)
      return { starsEarned: result.stars_earned || result.session?.stars_earned || 0 }
    } catch (error) {
      setContentError(error.message || 'Chưa lưu được điểm game vào backend.')
      return { starsEarned: 0 }
    }
  }

  const handleGameAnswer = async (isCorrect, selectedEmotion) => {
    if (feedback) return

    let starsEarned = 0
    if (isCorrect) {
      const result = await recordGameSession({
        content: selectedContent,
        selectedEmotion,
      })
      starsEarned = result.starsEarned
    }

    const scoreAfterAnswer = isCorrect ? score + starsEarned : score
    if (isCorrect) setScore(scoreAfterAnswer)

    setFeedback({
      isCorrect,
      scoreAfterAnswer,
      starsEarned,
      ...getFeedbackInfo(),
    })
  }

  const handleContinueFeedback = () => {
    const isLastQuestion = gameIndex >= games[currentGame].length - 1
    const scoreAfterAnswer = feedback?.scoreAfterAnswer ?? score

    setFeedback(null)

    if (isLastQuestion) {
      setScore(scoreAfterAnswer)
      setGameIndex(games[currentGame].length)
      return
    }

    setGameIndex((index) => index + 1)
    setSessionStartTime(nowMs())
  }

  if (!currentGame) {
    return (
      <div className="child-games-menu">
        <h2 className="games-title">🎮 Chọn trò chơi</h2>
        {(contentError || !selectedChild?.id) && (
          <p className="camera-error">
            {contentError || 'Chưa chọn tài khoản trẻ nên điểm sao sẽ chưa được lưu.'}
          </p>
        )}

        <div className="games-grid">
          {gameOptions.map((game) => (
            <div key={game.id} className="game-card" onClick={() => startGame(game.id)}>
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
        continueLabel={gameIndex < games[currentGame].length - 1 ? 'Tiếp tục →' : 'Xem kết quả →'}
        messages={[
          feedback.starsEarned > 0
            ? `Backend đã cộng ${feedback.starsEarned} sao cho bé.`
            : 'Bé đã chọn chính xác. Câu này không cộng thêm sao vì đã nhận thưởng trước đó hoặc chưa có content.',
          gameIndex < games[currentGame].length - 1
            ? 'Cùng sang lượt tiếp theo nhé!'
            : 'Cùng xem kết quả trò chơi nhé!',
        ]}
        onContinue={handleContinueFeedback}
      />
    ) : (
      <IncorrectAnswer
        emotion={feedback.emotion}
        title="Chưa đúng rồi!"
        continueLabel={gameIndex < games[currentGame].length - 1 ? 'Tiếp tục →' : 'Xem kết quả →'}
        explanation={feedback.explanation}
        encouragement="Không sao, bé đã học thêm được một điều mới!"
        onContinue={handleContinueFeedback}
      />
    )
  )

  if (isGameComplete) {
    return (
      <div className="game-complete">
        <div className="complete-content">
          <h2 className="complete-title">🎉 Hoàn thành!</h2>
          <p className="complete-text">Backend đã ghi nhận số sao thưởng</p>
          <div className="final-score">{score} ⭐</div>
          <p className="encourage-text">Tuyệt vời lắm! Hãy tiếp tục học hỏi!</p>

          <div className="complete-buttons">
            <button className="play-again-btn" onClick={() => startGame(currentGame)}>Chơi lại</button>
            <button className="go-menu-btn" onClick={backToMenu}>Quay lại menu</button>
          </div>
        </div>
      </div>
    )
  }

  if (currentGame === 'chooseEmotion') {
    const parts = currentGameData.question.split('{emotion}')

    return (
      <div className="choose-emotion-game">
        {feedbackOverlay}
        <div className="game-header-new">
          <button className="game-back-btn" onClick={backToMenu}>
            <span>← Quay lại</span>
          </button>
          <div className="game-score-badge">
            <span style={{ fontSize: '12px' }}>Score</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{score}</span>
          </div>
        </div>

        <div className="choose-emotion-content">
          <h2 className="question-title">
            {parts[0]}
            <span style={{ color: '#305196', fontWeight: 'bold' }}>{currentGameData.emotion}</span>
            {parts[1]}
          </h2>

          <p className="question-description">{currentGameData.description}</p>

          <div className="emotion-grid">
            {currentGameData.images.map((imageData, idx) => (
              <button
                key={imageData.emotion}
                className="emotion-card"
                onClick={() => handleGameAnswer(
                  idx === currentGameData.correctAnswer,
                  currentGameData.images[currentGameData.correctAnswer].emotion,
                )}
                style={{ borderColor: imageData.color, backgroundColor: `${imageData.color}15` }}
              >
                <div className="emotion-image" style={{ fontSize: '60px' }}>{imageData.src}</div>
              </button>
            ))}
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${((gameIndex + 1) / games[currentGame].length) * 100}%` }}></div>
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

        <div className="scenario">{currentGameData.scenario}</div>

        <div className="reactions-grid">
          {currentGameData.reactions.map((reaction, idx) => (
            <button
              key={reaction}
              className="reaction-btn"
              onClick={() => handleGameAnswer(
                currentGameData.correctAnswers.includes(idx),
                gameContentFallback.chooseReaction,
              )}
            >
              {reaction}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="game-container">
      {feedbackOverlay}
      <div className="game-header">
        <button className="game-back" onClick={backToMenu}>←</button>
        <div className="game-score">⭐ {score}</div>
      </div>

      <div className="match-description">{currentGameData.description}</div>

      <div className="match-options">
        {currentGameData.options.map((emoji) => (
          <button
            key={emoji}
            className="match-btn"
            onClick={() => handleGameAnswer(emoji === currentGameData.correctEmoji, currentGameData.emotion)}
          >
            <span className="match-emoji">{emoji}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
