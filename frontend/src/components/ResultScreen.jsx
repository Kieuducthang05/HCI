import '../styles/ResultScreen.css'

// Correct Answer Result Screen
export function CorrectAnswer({ emotion, score, onContinue }) {
  return (
    <div className="result-overlay">
      <div className="result-card correct-result">
        <div className="achievement-badge">
          <span className="medal-icon">🏅</span>
        </div>
        
        <h2 className="result-title correct-title">Hoàn thành xuất sắc!</h2>
        <p className="emotion-name">Cảm xúc: {emotion}</p>
        
        {score !== undefined && (
          <p className="score-display">Điểm: {score}</p>
        )}
        
        <div className="achievement-message">
          <p>⭐ Bé trả lời rất chính xác!</p>
          <p>🎉 Hãy tiếp tục nỗ lực nhé!</p>
        </div>
        
        <button className="continue-btn success-btn" onClick={onContinue}>
          Tiếp tục →
        </button>
      </div>
    </div>
  )
}

// Incorrect Answer Result Screen
export function IncorrectAnswer({ emotion, onContinue, explanation }) {
  return (
    <div className="result-overlay">
      <div className="result-card incorrect-result">
        <div className="sad-badge">
          <span className="sad-icon">😢</span>
        </div>
        
        <h2 className="result-title incorrect-title">Hãy thử lại!</h2>
        <p className="emotion-name">Cảm xúc: {emotion}</p>
        
        <div className="explanation-box">
          <p className="explanation-label">💡 Gợi ý:</p>
          <p className="explanation-text">{explanation}</p>
        </div>
        
        <div className="encouragement">
          <p>✨ Lần tiếp theo bé sẽ làm tốt hơn!</p>
        </div>
        
        <button className="continue-btn retry-btn" onClick={onContinue}>
          Thử lại →
        </button>
      </div>
    </div>
  )
}
