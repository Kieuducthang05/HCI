import '../styles/ResultScreen.css'

const resultCopy = {
  question: {
    success: 'Hoan hô! Chúc mừng bé đã hoàn thành câu hỏi',
    incorrect: 'Cố lên! Bé đã học thêm từ câu hỏi này',
  },
  lesson: {
    success: 'Hoan hô! Chúc mừng bé đã hoàn thành bài học',
    incorrect: 'Cố lên! Bé đã học thêm từ bài học này',
  },
  game: {
    success: 'Hoan hô! Chúc mừng bé đã hoàn thành trò chơi',
    incorrect: 'Cố lên! Bé đã học thêm từ trò chơi này',
  },
}

function formatReward(reward, fallback) {
  if (fallback) return fallback
  if (typeof reward === 'number') return reward > 0 ? `+${reward} Sao` : 'Đã hoàn thành'
  if (typeof reward === 'string' && reward.trim()) return reward
  return null
}

function cleanContinueLabel(label) {
  return String(label || 'Tiếp tục').replace(/\s*→\s*$/, '')
}

function ResultDialog({
  variant,
  resultType = 'question',
  title,
  bannerText,
  reward,
  rewardLabel,
  messages = [],
  explanation,
  encouragement,
  onContinue,
  onDismiss,
  continueLabel = 'Tiếp tục →',
}) {
  const isIncorrect = variant === 'incorrect'
  const copy = resultCopy[resultType] || resultCopy.question
  const displayBanner = bannerText || copy[variant]
  const displayReward = formatReward(reward, rewardLabel) || (isIncorrect ? 'Chưa nhận sao' : 'Đã hoàn thành')
  const messageLines = Array.isArray(messages) ? messages : [messages]
  const detailLines = [
    explanation,
    encouragement,
    ...messageLines,
  ].filter(Boolean)

  return (
    <div
      className={`result-overlay result-overlay-${variant}`}
      role="dialog"
      aria-modal="true"
      onClick={onDismiss || onContinue}
    >
      <div className="result-rocket" aria-hidden="true">🚀</div>
      <div className="result-sparkles" aria-hidden="true">
        <span>✦</span>
        <span>✦</span>
        <span>✦</span>
      </div>

      <div className={`result-banner result-banner-${variant}`}>
        <span className="result-banner-icon" aria-hidden="true">{isIncorrect ? '!' : '✦'}</span>
        <span>{displayBanner}</span>
      </div>

      <div
        className={`result-card ${isIncorrect ? 'incorrect-result' : 'correct-result'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`result-medallion result-medallion-${variant}`} aria-hidden="true">
          {isIncorrect ? '!' : '★'}
        </div>

        <h2 className="result-title">{title}</h2>

        <div className={`result-reward result-reward-${variant}`}>
          <span className="result-reward-icon" aria-hidden="true">★</span>
          <span>{displayReward}</span>
        </div>

        {detailLines.length > 0 && (
          <div className="result-details">
            {detailLines.map((line, index) => (
              <p key={`${index}-${line}`}>{line}</p>
            ))}
          </div>
        )}

        <button className="result-continue-btn" onClick={onContinue}>
          <span>{cleanContinueLabel(continueLabel)}</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  )
}

export function CorrectAnswer({
  resultType = 'question',
  reward,
  rewardLabel,
  score,
  onContinue,
  onDismiss,
  title = 'Hoàn thành xuất sắc!',
  bannerText,
  continueLabel = 'Tiếp tục →',
  messages,
}) {
  return (
    <ResultDialog
      variant="success"
      resultType={resultType}
      reward={reward}
      rewardLabel={rewardLabel || score}
      title={title}
      bannerText={bannerText}
      continueLabel={continueLabel}
      messages={messages}
      onContinue={onContinue}
      onDismiss={onDismiss}
    />
  )
}

export function IncorrectAnswer({
  resultType = 'question',
  reward,
  rewardLabel,
  onContinue,
  onDismiss,
  explanation,
  title = 'Chưa đúng rồi!',
  bannerText,
  continueLabel = 'Tiếp tục →',
  encouragement = 'Không sao, con đã học thêm được một điều mới.',
}) {
  return (
    <ResultDialog
      variant="incorrect"
      resultType={resultType}
      reward={reward}
      rewardLabel={rewardLabel}
      title={title}
      bannerText={bannerText}
      continueLabel={continueLabel}
      explanation={explanation}
      encouragement={encouragement}
      onContinue={onContinue}
      onDismiss={onDismiss}
    />
  )
}
