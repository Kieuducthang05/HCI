import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { FiArrowLeft, FiHeart, FiSmile, FiCamera } from 'react-icons/fi'
import { CorrectAnswer, IncorrectAnswer } from '../components/ResultScreen'
import { contentApi, getSelectedChild, setSelectedChild, trackingApi, visionApi } from '../services/api'
import { captureDetectedFace } from '../utils/faceCapture'
import '../styles/Child.css'

const backendGameKinds = {
  chooseEmotion: 'CHOOSE_EMOTION',
  chooseReaction: 'CHOOSE_REACTION',
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function getGameConfig(content) {
  return content?.game?.config && typeof content.game.config === 'object' ? content.game.config : {}
}

function isMediaSource(value) {
  return /^(https?:|blob:|data:|\/|media-assets\/)/i.test(String(value || '').trim())
}

function getConfiguredGameKind(content) {
  const config = getGameConfig(content)
  const kind = String(config.kind || config.gameKind || '').trim().toUpperCase()
  if (kind === 'CHOOSE_EMOTION' || kind === 'GAME_1' || kind === 'GAME1') return 'CHOOSE_EMOTION'
  if (kind === 'CHOOSE_REACTION' || kind === 'GAME_2' || kind === 'GAME2') return 'CHOOSE_REACTION'

  return ''
}

function toConfiguredChooseEmotionGame(content) {
  if (getConfiguredGameKind(content) !== 'CHOOSE_EMOTION') return null

  const config = getGameConfig(content)
  const options = Array.isArray(config.options) ? config.options : []
  if (!options.length) return null

  const requestedCorrectAnswer = Number.isInteger(config.correctIndex) ? config.correctIndex : 0
  const correctAnswer = Math.min(Math.max(requestedCorrectAnswer, 0), options.length - 1)
  const correctOption = options[correctAnswer] || options[0] || {}
  const targetEmotion = String(correctOption.emotion || content.game?.target_emotion || 'JOY').toUpperCase()
  const targetLabel = String(correctOption.label || targetEmotion)

  return {
    content,
    emotion: targetLabel.toUpperCase(),
    question: String(config.question || `Ai đang {emotion} vậy con?`),
    description: String(config.description || 'Hãy chạm vào bức ảnh đúng nhé!'),
    images: options.map((option, index) => ({
      src: option.imageUrl || option.src || '🙂',
      imageUrl: option.imageUrl || '',
      label: option.label || `Đáp án ${index + 1}`,
      emotion: String(option.emotion || option.value || '').toUpperCase(),
      color: '#f6c45f',
    })),
    correctAnswer,
    explanation: `${targetLabel} là đáp án đúng.`,
  }
}

function toConfiguredChooseReactionGame(content) {
  if (getConfiguredGameKind(content) !== 'CHOOSE_REACTION') return null

  const config = getGameConfig(content)
  const options = Array.isArray(config.options) ? config.options : []
  if (!options.length) return null

  const configuredCorrectAnswers = Array.isArray(config.correctIndexes) && config.correctIndexes.length
    ? config.correctIndexes.map((item) => Number(item)).filter((item) => Number.isInteger(item))
    : [0]
  const correctAnswers = configuredCorrectAnswers.filter((index) => index >= 0 && index < options.length)

  return {
    content,
    scenario: String(config.promptImageUrl || content.game?.prompt_asset_url || '🤝'),
    promptImageUrl: String(config.promptImageUrl || content.game?.prompt_asset_url || ''),
    prompt: String(config.question || content.title || 'Con sẽ làm gì?'),
    reactions: options.map((option, index) => option.label || `Đáp án ${index + 1}`),
    reactionOptions: options.map((option, index) => ({
      label: option.label || `Đáp án ${index + 1}`,
      value: option.value || option.emotion || `OPTION_${index + 1}`,
      emotion: String(option.emotion || content.game?.target_emotion || 'NEUTRAL').toUpperCase(),
      imageUrl: option.imageUrl || '',
      src: option.src || '🙂',
    })),
    reactionVisuals: options.map((option) => normalize(option.value || option.label || 'comfort')),
    correctAnswers: correctAnswers.length ? correctAnswers : [0],
    targetEmotion: String(content.game?.target_emotion || 'NEUTRAL').toUpperCase(),
    explanation: 'Con hãy chọn cách phản ứng phù hợp với tình huống.',
  }
}

function buildConfiguredGames(contents) {
  return contents.reduce((result, content) => {
    const emotionGame = toConfiguredChooseEmotionGame(content)
    if (emotionGame) result.chooseEmotion.push(emotionGame)

    const reactionGame = toConfiguredChooseReactionGame(content)
    if (reactionGame) result.chooseReaction.push(reactionGame)

    return result
  }, {
    chooseEmotion: [],
    chooseReaction: [],
  })
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

const modelEmotionMap = {
  happy: { uiId: 'JOY', label: 'Vui vẻ', icon: '😊' },
  sad: { uiId: 'SAD', label: 'Buồn', icon: '😢' },
  angry: { uiId: 'ANGRY', label: 'Tức giận', icon: '😠' },
  fear: { uiId: 'SCARED', label: 'Sợ', icon: '😟' },
  neutral: { uiId: 'CALM', label: 'Bình tĩnh', icon: '😌' },
}

function getModelEmotionInfo(value) {
  const key = String(value || '').trim().toLowerCase()
  return modelEmotionMap[key] || {
    uiId: 'CALM',
    label: value || 'Không xác định',
    icon: '🙂',
  }
}

async function captureVideoFrame(video) {
  const captured = await captureDetectedFace(video, { filenamePrefix: 'game-expression-face' })

  if (!captured.ok) {
    throw new Error(captured.message)
  }

  return captured.file
}

const matchEmotionGames = [
  {
    description: 'Làm nụ cười thật tươi để vượt qua thử thách này.',
    instruction: 'Mỉm cười giống biểu cảm này nhé!',
    emotion: 'JOY',
    label: 'Vui vẻ',
    emoji: '😊',
    modelEmotion: 'happy',
    explanation: 'Khi chơi với bạn, bé thường cảm thấy vui vẻ.',
  },
  {
    description: 'Thử làm khuôn mặt buồn như khi mất món đồ yêu thích.',
    instruction: 'Làm biểu cảm buồn giống mẫu nhé!',
    emotion: 'SAD',
    label: 'Buồn',
    emoji: '😢',
    modelEmotion: 'sad',
    explanation: 'Khi mất món đồ mình thích, bé có thể thấy buồn.',
  },
  {
    description: 'Mở mắt và miệng giống biểu cảm sợ/ngạc nhiên để model nhận diện.',
    instruction: 'Mở to mắt và miệng như bạn nhỏ trong hình để vượt qua thử thách này.',
    emotion: 'SCARED',
    label: 'Sợ',
    emoji: '😟',
    modelEmotion: 'fear',
    explanation: 'Model hiện hỗ trợ nhãn gần nhất là cảm xúc sợ.',
  },
]

const emotionImitationGames = [
  {
    targetEmotion: 'HAPPY',
    label: 'Vui vẻ',
    emoji: '😊',
    instruction: 'Con hãy cười thật tươi giống bạn nhỏ này nhé!',
    explanation: 'Con đã làm rất tốt! Nụ cười của con rất đẹp.',
  },
  {
    targetEmotion: 'SAD',
    label: 'Buồn',
    emoji: '😢',
    instruction: 'Con hãy thử làm khuôn mặt buồn một chút nhé.',
    explanation: 'Đúng rồi, đó là khuôn mặt khi chúng ta thấy buồn.',
  },
  {
    targetEmotion: 'ANGRY',
    label: 'Tức giận',
    emoji: '😡',
    instruction: 'Con hãy thử làm khuôn mặt tức giận xem nào!',
    explanation: 'Chính xác! Đó là biểu cảm khi chúng ta thấy giận dữ.',
  },
]

const localGameFallbacks = {
  matchEmotion: matchEmotionGames,
  emotionImitation: emotionImitationGames,
}

function getEmotionTone(emotion) {
  const key = normalize(emotion)
  return {
    joy: 'happy',
    happy: 'happy',
    sad: 'sad',
    angry: 'angry',
    calm: 'calm',
    neutral: 'calm',
    scared: 'surprised',
    fear: 'surprised',
    surprised: 'surprised',
  }[key] || 'happy'
}

function GameStepProgress({ currentIndex, total }) {
  return (
    <div className="game-step-progress" aria-label={`Question ${currentIndex + 1}/${total}`}>
      <div className="game-step-dashes">
        {Array.from({ length: total }).map((_, index) => (
          <span key={index} className={index <= currentIndex ? 'active' : ''}></span>
        ))}
      </div>
      <span>QUESTION {currentIndex + 1}/{total}</span>
    </div>
  )
}

function EmotionPortrait({ imageData }) {
  const tone = getEmotionTone(imageData.emotion)
  const imageSource = imageData.imageUrl || (isMediaSource(imageData.src) ? imageData.src : '')

  if (imageSource) {
    return (
      <div className={`game1-photo game1-photo-${tone} has-real-image`}>
        <img src={imageSource} alt={imageData.label} />
      </div>
    )
  }

  return (
    <div className={`game1-photo game1-photo-${tone}`} aria-hidden="true">
      <div className="game1-photo-light"></div>
      <div className="game1-person">
        <div className="game1-hair"></div>
        <div className="game1-head">
          <span>{imageData.src}</span>
        </div>
        <div className="game1-neck"></div>
        <div className="game1-shirt"></div>
      </div>
    </div>
  )
}

function ReactionScenarioArt({ data }) {
  const promptImage = data.promptImageUrl || (isMediaSource(data.scenario) ? data.scenario : '')

  return (
    <div className={`reaction-scene-card reaction-scene-${data.scene || 'fall'}${promptImage ? ' has-image' : ''}`}>
      {promptImage && (
        <div className="reaction-scene-image-wrap">
          <img src={promptImage} alt={data.prompt || data.scenario} />
        </div>
      )}
      <h2>{data.prompt || data.scenario}</h2>
    </div>
  )
}

function ReactionChoiceArt({ option = {}, variant = 'comfort' }) {
  const imageSource = option.imageUrl || (isMediaSource(option.src) ? option.src : '')

  if (imageSource) {
    return (
      <div className="reaction-choice-art has-real-image" aria-hidden="true">
        <img src={imageSource} alt="" />
      </div>
    )
  }

  if (option.src) {
    return (
      <div className="reaction-choice-art has-emoji" aria-hidden="true">
        <span>{option.src}</span>
      </div>
    )
  }

  return (
    <div className={`reaction-choice-art reaction-choice-${variant}`} aria-hidden="true">
      <span className="reaction-choice-figure"></span>
      <span className="reaction-choice-face"></span>
      <span className="reaction-choice-detail"></span>
    </div>
  )
}

const gameOptions = [
  {
    id: 'chooseEmotion',
    label: 'Game 1 - Chọn cảm xúc đúng',
    Icon: FiSmile,
  },
  {
    id: 'chooseReaction',
    label: 'Game 2 - Chọn cách phản ứng',
    Icon: FiHeart,
  },
  {
    id: 'emotion-recognition',
    label: 'Game 3 - Nhận diện cảm xúc',
    Icon: FiCamera,
  },
]

export default function ChildGames() {
  const { setUserStars } = useOutletContext()
  const navigate = useNavigate()
  const selectedChild = getSelectedChild()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [currentGame, setCurrentGame] = useState(null)
  const [score, setScore] = useState(0)
  const [gameIndex, setGameIndex] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [gameContents, setGameContents] = useState([])
  const [contentLoading, setContentLoading] = useState(Boolean(selectedChild?.id))
  const [contentError, setContentError] = useState('')
  const [sessionStartTime, setSessionStartTime] = useState(null)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsCameraOn(true)
    } catch {
      setCameraError('Không thể mở camera. Hãy kiểm tra quyền truy cập.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setIsCameraOn(false)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadGameContents = async () => {
      if (!selectedChild?.id) return

      try {
        setContentLoading(true)
        setContentError('')
        const result = await contentApi.list(selectedChild.id, { type: 'GAME', include_locked: true })
        if (cancelled) return
        const contents = result.contents || []
        setGameContents(contents)
        setContentError('')
      } catch (error) {
        if (cancelled) return
        setContentError(error.message || 'Không tải được nội dung game từ backend.')
      } finally {
        if (!cancelled) setContentLoading(false)
      }
    }

    loadGameContents()

    return () => {
      cancelled = true
    }
  }, [selectedChild?.id])

  const configuredGames = useMemo(() => buildConfiguredGames(gameContents), [gameContents])
  const activeGameList = useMemo(() => (
    currentGame
      ? (configuredGames[currentGame]?.length ? configuredGames[currentGame] : localGameFallbacks[currentGame] || [])
      : []
  ), [configuredGames, currentGame])
  const selectedContent = useMemo(
    () => {
      if (!currentGame) return null
      return activeGameList[gameIndex]?.content || null
    },
    [currentGame, activeGameList, gameIndex],
  )
  const startGame = (gameId) => {
    if (gameId === 'emotion-recognition') {
      navigate('/child/emotion-recognition')
      return
    }

    if (!selectedChild?.id) {
      setContentError('Chưa chọn tài khoản trẻ nên chưa thể tải nội dung game.')
      return
    }

    if (contentLoading) return

    if (backendGameKinds[gameId] && !configuredGames[gameId]?.length) {
      const gameLabel = gameOptions.find((game) => game.id === gameId)?.label || 'Game'
      setContentError(`${gameLabel} chưa có dữ liệu từ backend.`)
      return
    }

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

  const backToHome = () => {
    navigate('/child/home')
  }

  const missingBackendGameLabels = gameOptions
    .filter((game) => backendGameKinds[game.id] && !configuredGames[game.id]?.length)
    .map((game) => game.label)

  const gamesBackendStatus = contentError
    || (!selectedChild?.id ? 'Chưa chọn tài khoản trẻ nên chưa thể tải nội dung game.' : '')
    || (contentLoading ? 'Đang tải nội dung game từ backend...' : '')
    || (!contentLoading && missingBackendGameLabels.length
      ? `${missingBackendGameLabels.join(', ')} chưa có dữ liệu từ backend.`
      : '')

  const getFeedbackInfo = () => {
    const currentGameData = activeGameList[gameIndex]

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

  const recordGameSession = async ({
    content,
    selectedEmotion,
    aiDetectedEmotion,
    aiConfidence,
    aiMatchScore,
    isCorrect = true,
  }) => {
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
        is_correct: isCorrect,
        selected_emotion: selectedEmotion,
        ai_match_score: aiMatchScore ?? (isCorrect ? 1 : 0),
        ai_detected_emotion: aiDetectedEmotion || targetEmotion,
        ai_confidence: aiConfidence ?? (isCorrect ? 1 : 0),
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

  const handleGameAnswer = async (isCorrect, selectedEmotion, modelResult = {}) => {
    if (feedback) return

    let starsEarned = 0
    if (isCorrect) {
      const result = await recordGameSession({
        content: selectedContent,
        selectedEmotion,
        ...modelResult,
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
    const wasCorrect = feedback?.isCorrect
    const isLastQuestion = gameIndex >= activeGameList.length - 1
    const scoreAfterAnswer = feedback?.scoreAfterAnswer ?? score

    setFeedback(null)

    if (wasCorrect) {
      if (isLastQuestion) {
        setScore(scoreAfterAnswer)
        backToMenu()
        return
      }

      setGameIndex((index) => index + 1)
      setSessionStartTime(nowMs())
    }
    // If not correct, stays on same gameIndex so child can try again
  }

  const checkImitation = async () => {
    if (!isCameraOn || isScanning) return
    setIsScanning(true)
    setCameraError('')

    try {
      const frame = await captureVideoFrame(videoRef.current)
      const visionResult = await visionApi.predict(frame)
      const prediction = visionResult.prediction || visionResult
      
      const target = currentGameData.targetEmotion
      const detected = prediction.emotion?.toUpperCase()
      const isCorrect = detected === target.toUpperCase()

      await handleGameAnswer(isCorrect, detected)
    } catch (err) {
      setCameraError(err.message || 'Lỗi nhận diện cảm xúc.')
    } finally {
      setIsScanning(false)
    }
  }

  if (!currentGame) {
    return (
      <div className="child-games-menu">
        <div className="games-menu-header">
          <button type="button" className="games-back-btn" onClick={backToHome}>
            <FiArrowLeft className="games-back-icon" aria-hidden="true" />
            <span>Quay lại</span>
          </button>
          <span className="games-menu-header-spacer" aria-hidden="true"></span>
        </div>

        <h2 className="games-title">Chọn trò chơi</h2>
        {gamesBackendStatus && (
          <p className="camera-error">
            {gamesBackendStatus}
          </p>
        )}

        <div className="games-grid">
          {gameOptions.map((game) => {
            const isLocalGame = game.id === 'emotion-recognition'
            const unavailable = !selectedChild?.id || contentLoading || (!isLocalGame && !configuredGames[game.id]?.length)

            return (
              <button
                key={game.id}
                type="button"
                className={`game-card game-card-${game.id}`}
                onClick={() => startGame(game.id)}
                aria-label={game.label}
                title={game.label}
                disabled={unavailable}
              >
                <span className="game-icon" aria-hidden="true">
                  <game.Icon />
                </span>
                <span className="game-card-title">{game.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const currentGameData = activeGameList[gameIndex]
  const isGameComplete = gameIndex >= activeGameList.length

  if (!currentGameData || isGameComplete) {
    return (
      <div className="game-play-shell game-empty-shell">
        <div className="games-menu-header">
          <button type="button" className="games-back-btn" onClick={backToMenu}>
            <FiArrowLeft className="games-back-icon" aria-hidden="true" />
            <span>Quay lại</span>
          </button>
          <span className="games-menu-header-spacer" aria-hidden="true"></span>
        </div>
        <p className="camera-error">Chưa có dữ liệu game từ backend.</p>
      </div>
    )
  }

  const feedbackOverlay = feedback && (
    feedback.isCorrect ? (
      <CorrectAnswer
        resultType="question"
        reward={feedback.starsEarned}
        title="Hoàn thành xuất sắc!"
        continueLabel="Tiếp tục →"
        onContinue={handleContinueFeedback}
        buttonPosition="bottom-right"
      />
    ) : (
      <IncorrectAnswer
        resultType="question"
        title="Chưa đúng rồi!"
        continueLabel="Tiếp tục →"
        explanation={feedback.explanation}
        encouragement="Không sao, bé đã học thêm được một điều mới!"
        onContinue={handleContinueFeedback}
        buttonPosition="bottom-right"
      />
    )
  )

  if (isGameComplete) {
    return null // Redundant screen removed, handled in handleContinueFeedback
  }

  if (currentGame === 'emotionImitation') {
    return (
      <div className="imitation-game">
        {feedbackOverlay}

        <div className="imitation-content">
          <div className="target-card">
            <span className="target-emoji">{currentGameData.emoji}</span>
            <h3>{currentGameData.label}</h3>
            <p>{currentGameData.instruction}</p>
          </div>

          <div className="camera-view">
            <video ref={videoRef} autoPlay playsInline muted className={isCameraOn ? '' : 'hidden'} />
            {!isCameraOn && (
              <div className="camera-placeholder">
                <button className="start-cam-btn" onClick={startCamera}>Bật Camera</button>
              </div>
            )}
          </div>

          <div className="camera-controls">
            <button className="action-btn" onClick={checkImitation} disabled={!isCameraOn || isScanning}>
              {isScanning ? 'Đang kiểm tra...' : 'Kiểm tra biểu cảm'}
            </button>
            {cameraError && <p className="error-text">{cameraError}</p>}
          </div>
        </div>
      </div>
    )
  }

  if (currentGame === 'chooseEmotion') {
    const questionText = currentGameData.question || 'Ai đang {emotion} vậy con?'
    const hasEmotionSlot = questionText.includes('{emotion}')
    const parts = hasEmotionSlot ? questionText.split('{emotion}') : []

    return (
      <div className="choose-emotion-game game-play-shell game1-shell">
        {feedbackOverlay}

        <div className="games-menu-header">
          <button type="button" className="games-back-btn" onClick={backToMenu}>
            <FiArrowLeft className="games-back-icon" aria-hidden="true" />
            <span>Quay lại</span>
          </button>
          <span className="games-menu-header-spacer" aria-hidden="true"></span>
        </div>

        <div className="choose-emotion-content">
          <h2 className="game1-title">
            {hasEmotionSlot ? (
              <>
                {parts[0]}
                <span>{currentGameData.emotion}</span>
                {parts[1]}
              </>
            ) : questionText}
          </h2>

          <p className="game1-description">{currentGameData.description}</p>

          <div className="game1-options-grid">
            {currentGameData.images.map((imageData, idx) => (
              <button
                key={`${imageData.emotion}-${idx}`}
                className="game1-option-card"
                onClick={() => handleGameAnswer(
                  idx === currentGameData.correctAnswer,
                  imageData.emotion,
                )}
                aria-label={imageData.label}
              >
                <EmotionPortrait imageData={imageData} />
              </button>
            ))}
          </div>

          <GameStepProgress currentIndex={gameIndex} total={activeGameList.length} />
        </div>
      </div>
    )
  }

  if (currentGame === 'chooseReaction') {
    const reactionOptions = currentGameData.reactionOptions || currentGameData.reactions.map((reaction, index) => ({
      label: reaction,
      value: reaction,
      imageUrl: '',
      src: '',
      variant: currentGameData.reactionVisuals?.[index],
    }))

    return (
      <div className="game-play-shell game2-shell">
        {feedbackOverlay}

        <div className="games-menu-header">
          <button type="button" className="games-back-btn" onClick={backToMenu}>
            <FiArrowLeft className="games-back-icon" aria-hidden="true" />
            <span>Quay lại</span>
          </button>
          <span className="games-menu-header-spacer" aria-hidden="true"></span>
        </div>

        <ReactionScenarioArt data={currentGameData} />

        <div className="game2-reactions-grid">
          {reactionOptions.map((reaction, idx) => (
            <button
              key={`${reaction.value || reaction.label}-${idx}`}
              className="game2-reaction-card"
              onClick={() => handleGameAnswer(
                currentGameData.correctAnswers.includes(idx),
                reaction.emotion || reaction.value || currentGameData.targetEmotion,
              )}
            >
              <ReactionChoiceArt option={reaction} variant={reaction.variant || currentGameData.reactionVisuals?.[idx]} />
              <strong>{reaction.label}</strong>
            </button>
          ))}
        </div>

        <GameStepProgress currentIndex={gameIndex} total={activeGameList.length} />
      </div>
    )
  }

  return (
    <ExpressionGame
      data={currentGameData}
      currentIndex={gameIndex}
      total={activeGameList.length}
      selectedChild={selectedChild}
      feedbackOverlay={feedbackOverlay}
      onAnswer={handleGameAnswer}
      submittingAnswer={submittingAnswer}
      backToMenu={backToMenu}
    />
  )
}

function ExpressionGame({
  data,
  currentIndex,
  total,
  selectedChild,
  feedbackOverlay,
  onAnswer,
  submittingAnswer,
  backToMenu,
}) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [scanStatus, setScanStatus] = useState('Sẵn sàng nhận diện')

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const startCamera = async () => {
    setCameraError('')
    setScanStatus('Đang bật camera...')

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Trình duyệt hiện tại không hỗ trợ mở camera.')
      setScanStatus('Chưa có camera')
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
      setScanStatus('Camera đã bật')
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
      setScanStatus('Chưa nhận diện')
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
    setScanStatus('Đang nhận diện...')

    try {
      if (!selectedChild?.id) {
        setCameraError('Chưa chọn tài khoản trẻ nên chưa thể dự đoán cảm xúc.')
        setScanStatus('Chưa nhận diện')
        return
      }

      const frame = await captureVideoFrame(videoRef.current)
      const visionResult = await visionApi.predict(frame)
      const prediction = visionResult.prediction || visionResult
      
      const detectedEmotion = getModelEmotionInfo(prediction.emotion)
      const confidence = Number(prediction.confidence || 0)
      const expressionCheck = prediction.expression_check
      
      const targetMapInfo = getModelEmotionInfo(data.modelEmotion)
      const isCorrect = typeof expressionCheck?.is_correct === 'boolean'
        ? expressionCheck.is_correct
        : detectedEmotion.uiId === targetMapInfo.uiId

      // Gọi API ghi log cảm xúc của backend (port 5050)
      await trackingApi.recordEmotionLog(selectedChild.id, {
        trigger_source: 'WEBCAM',
        ai_result: {
          emotion: prediction.emotion,
          confidence: confidence,
          all_scores: prediction.all_scores || {}
        },
        metadata: {
          source: 'child-games-imitation',
          ui_label: detectedEmotion.label,
          target_emotion: data.modelEmotion,
          is_correct: isCorrect
        }
      })

      setScanStatus(isCorrect ? 'Nhận diện đúng!' : `Model thấy ${detectedEmotion.label}`)
      onAnswer(isCorrect, data.emotion, {
        aiDetectedEmotion: detectedEmotion.uiId,
        aiConfidence: confidence,
        aiMatchScore: isCorrect ? Math.max(confidence, 0.5) : confidence,
      })
    } catch (error) {
      setCameraError(error.message || 'Không gửi được ảnh đến mô hình cảm xúc.')
      setScanStatus('Chưa nhận diện')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="game-play-shell game1-shell">
      {feedbackOverlay}

      <div className="game-screen-topbar">
        <button type="button" className="game-screen-back" onClick={backToMenu}>
          <FiArrowLeft className="games-back-icon" aria-hidden="true" />
          <span>Quay lại</span>
        </button>
        <span className="games-menu-header-spacer" aria-hidden="true"></span>
      </div>

      <div className="choose-emotion-content flex-column-between" style={{ gap: '16px' }}>
        <div className="game1-header">
          <h1 className="game1-title">Hãy thể hiện cảm xúc: <span>{data.label}</span> {data.emoji}</h1>
          <p className="game1-description">{data.instruction || 'Con hãy thể hiện biểu cảm trước camera và nhấn nút kiểm tra nhé!'}</p>
        </div>

        <div className="expression-game-camera-container" style={{ display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center', flex: 1, width: '100%' }}>
          
          {/* Target Card */}
          <div className="expression-game-prompt-card" style={{ flex: 1, maxWidth: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', borderRadius: '24px', background: '#f8fafc', border: '2px dashed #cbd5e1' }}>
            <div className="expression-game-emoji" style={{ fontSize: '72px', marginBottom: '10px' }}>{data.emoji}</div>
            <strong style={{ fontSize: '20px', color: '#1e293b' }}>{data.label}</strong>
          </div>

          {/* Camera Frame */}
          <div className="expression-game-camera-wrap" style={{ flex: 1, maxWidth: '340px', position: 'relative', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div className="expression-game-status" style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', zIndex: 5 }}>
              {isScanning ? 'Đang nhận diện...' : scanStatus}
            </div>
            <div className="expression-game-camera" style={{ width: '100%', height: '240px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video
                ref={videoRef}
                className={isCameraOn ? 'expression-game-video' : 'expression-game-video hidden'}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {isCameraOn && <div className="expression-game-face-guide" aria-hidden="true" style={{ position: 'absolute', inset: '20px', border: '2px dashed rgba(255,255,255,0.5)', borderRadius: '50%' }}></div>}
              {!isCameraOn && (
                <div className="expression-game-avatar" aria-hidden="true" style={{ color: '#cbd5e1', textAlign: 'center' }}>
                  <FiCamera style={{ fontSize: '48px', marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>Camera đang tắt</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {cameraError && <p className="expression-game-error" style={{ color: '#ef4444', fontSize: '13px', margin: 0, textAlign: 'center' }}>{cameraError}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
          <button 
            className="expression-game-check" 
            onClick={scanExpression} 
            disabled={isScanning || submittingAnswer}
            style={{ 
              minWidth: '220px', 
              minHeight: '48px', 
              borderRadius: '24px', 
              border: 'none', 
              background: '#2f63b7', 
              color: 'white', 
              fontWeight: '900', 
              fontSize: '16px', 
              cursor: 'pointer',
              boxShadow: '0 8px 16px rgba(47, 99, 183, 0.2)'
            }}
          >
            {isScanning ? 'Đang kiểm tra...' : isCameraOn ? 'Kiểm tra biểu cảm' : 'Bật camera'}
          </button>

          <GameStepProgress currentIndex={gameIndex} total={total} />
        </div>
      </div>
    </div>
  )
}
