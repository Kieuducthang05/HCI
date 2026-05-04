import { useState } from 'react'
import '../styles/ParentDashboard.css'

export default function ParentHome() {
  const [children, setChildren] = useState([
    { id: 1, name: 'Bìn', avatar: '👦', emotion: 'Bình thường' }
  ])
  const [currentChild, setCurrentChild] = useState(children[0])

  // Mock data - thay bằng API sau
  const weeklyData = [
    { day: 'T2', calm: 65, happy: 45, sad: 20 },
    { day: 'T3', calm: 55, happy: 35, sad: 30 },
    { day: 'T4', calm: 75, happy: 50, sad: 15 },
    { day: 'T5', calm: 60, happy: 40, sad: 25 },
    { day: 'T6', calm: 70, happy: 45, sad: 20 },
    { day: 'T7', calm: 80, happy: 60, sad: 10 },
    { day: 'CN', calm: 70, happy: 55, sad: 15 }
  ]

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Chào buổi sáng'
    if (hour < 17) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  }

  return (
    <div className="parent-home">
      {/* Notification Banner */}
      <div className="notification-banner">
        <span>⭐</span>
        <span>Bé Bìn vừa đạt có 1000 sao, hãy vào cửa hàng để mua vật phẩm mới thương cho bé!</span>
      </div>

      {/* Greeting Section with Child Badge */}
      <div className="greeting-container">
        <div className="greeting-left">
          <h1 className="greeting-title">{getGreeting()}, {currentChild.name}</h1>
          <p className="greeting-subtitle">Dự dự lần tìm tất hoạt động của bé hôm nay.</p>
        </div>
        <div className="child-badge">
          <span className="child-badge-avatar">{currentChild.avatar}</span>
          <span className="child-badge-name">Bé {currentChild.name}</span>
        </div>
      </div>

      {/* Top Stats Cards - 3 columns */}
      <div className="stats-cards-grid">
        {/* Stars Card */}
        <div className="stat-card stars-card">
          <div className="star-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-label">Tổng số sao</div>
            <div className="stat-value">1,250 <span className="stat-percentage">+12%</span></div>
            <div className="stat-bar">
              <div className="bar-fill" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>

        {/* Time in Zone Card */}
        <div className="stat-card zone-card">
          <div className="zone-content">
            <div className="stat-label">Thời gian trong Zone</div>
            <div className="stat-value">42 <span className="stat-unit">phút</span></div>
            <div className="zone-progress">
              <div className="progress-circle" style={{ width: '40px', height: '40px' }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="2"/>
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#93c5fd" strokeWidth="2" 
                    strokeDasharray={`${(42/60)*100.5} 100.5`} strokeDashoffset="0" 
                    transform="rotate(-90 18 18)" style={{ transition: 'stroke-dasharray 0.3s' }}/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Stable Emotions Card */}
        <div className="stat-card emotion-card">
          <div className="emotion-icon">😊</div>
          <div className="stat-content">
            <div className="stat-label">Cảm xúc ổn định</div>
            <p className="emotion-text">Duy vừa có cảm xúc tích cực hôm nay</p>
          </div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="chart-section">
        <div className="chart-header">
          <h2 className="chart-title">Nhật ký tuần</h2>
          <button className="export-btn">📊 Xuất PDF</button>
        </div>

        <div className="chart-container">
          <div className="bars-container">
            {weeklyData.map((data, idx) => (
              <div key={idx} className="bar-group">
                <div className="bars-set">
                  <div className="bar calm" style={{ height: `${data.calm}px` }}></div>
                  <div className="bar happy" style={{ height: `${data.happy}px` }}></div>
                  <div className="bar sad" style={{ height: `${data.sad}px` }}></div>
                </div>
                <div className="bar-label">{data.day}</div>
              </div>
            ))}
          </div>
          
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-dot calm"></span>
              <span>Hạn chế</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot happy"></span>
              <span>Hạnh phúc</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot sad"></span>
              <span>Buồn bã</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
