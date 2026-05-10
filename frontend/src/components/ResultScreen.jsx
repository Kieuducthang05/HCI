import '../styles/ResultScreen.css'

// Correct Answer Result Screen
export function CorrectAnswer({
  emotion,
  score,
  onContinue,
  title = 'Hoàn thành xuất sắc!',
  continueLabel = 'Tiếp tục →',
  messages = ['⭐ Bé trả lời rất chính xác!', '🎉 Hãy tiếp tục nỗ lực nhé!']
}) {
  return (
    <div className="result-overlay">
      <div className="result-card correct-result">
        <div className="achievement-badge">
          <span className="medal-icon">🏅</span>
        </div>
        
        <h2 className="result-title correct-title">{title}</h2>
        <p className="emotion-name">Cảm xúc: {emotion}</p>
        
        {score !== undefined && (
          <p className="score-display">Điểm: {score}</p>
        )}
        
        <div className="achievement-message">
          {messages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
        
        <button className="continue-btn success-btn" onClick={onContinue}>
          {continueLabel}
        </button>
      </div>
    </div>
  )
}

// Incorrect Answer Result Screen
export function IncorrectAnswer({
  emotion,
  onContinue,
  explanation,
  title = 'Hãy thử lại!',
  continueLabel = 'Thử lại →',
  encouragement = '✨ Lần tiếp theo bé sẽ làm tốt hơn!'
}) {
  return (
    <div className="result-overlay">
      <div className="result-card incorrect-result">
        <div className="sad-badge">
          <span className="sad-icon">😢</span>
        </div>
        
        <h2 className="result-title incorrect-title">{title}</h2>
        <p className="emotion-name">Cảm xúc: {emotion}</p>
        
        <div className="explanation-box">
          <p className="explanation-label">💡 Gợi ý:</p>
          <p className="explanation-text">{explanation}</p>
        </div>
        
        <div className="encouragement">
          <p>{encouragement}</p>
        </div>
        
        <button className="continue-btn retry-btn" onClick={onContinue}>
          {continueLabel}
        </button>
      </div>
    </div>
  )
}
