import { useState } from 'react'
import '../styles/EmotionDiary.css'

export default function EmotionDiary() {
  const [emotionStats] = useState([
    { id: 1, label: 'Cảm xúc tích cực', value: 36, change: '+12% tuần này', color: '#90CAF9' },
    { id: 2, label: 'Cảm xúc buồn bã', value: 9, change: '-5% tuần này', color: '#64B5F6' },
    { id: 3, label: 'Cảm xúc lo lắng', value: 12, change: '+12% tuần này', color: '#42A5F5' },
    { id: 4, label: 'Cảm xúc tức giận', value: 247, change: '+24 tuần này', color: '#FFB74D' }
  ])

  const [emotionBreakdown] = useState([
    { type: 'Tích cực', count: 45, color: '#90CAF9' },
    { type: 'Tiêu cực', count: 30, color: '#EF9A9A' },
    { type: 'Trung lập', count: 25, color: '#A1887F' }
  ])

  const [emotionLogs] = useState([
    { id: 1, emoji: '😊', emotion: 'Hạnh phúc', description: 'Chơi nhạc ngày 1/24', time: '11:05 PM' },
    { id: 2, emoji: '😄', emotion: 'Vui vẻ', description: 'Chơi nhạc ngày 1/24', time: '11:05 PM' },
    { id: 3, emoji: '😠', emotion: 'Tức giận', description: 'Chơi nhạc ngày 1/24', time: '11:05 PM' },
    { id: 4, emoji: '😄', emotion: 'Vui vẻ', description: 'Chơi nhạc ngày 1/24', time: '11:05 PM' },
    { id: 5, emoji: '😄', emotion: 'Vui vẻ', description: 'Chơi nhạc ngày 1/24', time: '11:05 PM' },
    { id: 6, emoji: '😮', emotion: 'Ngạc nhiên', description: 'Chơi nhạc ngày 1/24', time: '11:05 PM' },
    { id: 7, emoji: '😊', emotion: 'Hạnh phúc', description: 'Chơi nhạc ngày 1/24', time: '11:05 PM' },
    { id: 8, emoji: '😄', emotion: 'Vui vẻ', description: 'Chơi nhạc ngày 1/24', time: '11:05 PM' }
  ])

  return (
    <div className="emotion-diary-container">
      {/* Header Section */}
      <div className="emotion-header">
        <div className="emotion-title-section">
          <h1 className="emotion-title">Nhật ký cảm xúc của con</h1>
          <p className="emotion-subtitle">Xem lại toàn bộ nhật ký cảm xúc của bé hôm nay</p>
        </div>
        <button className="emotion-export-btn">📊 Xuất PDF</button>
      </div>

      {/* Stats Cards - 4 columns */}
      <div className="emotion-stats-grid">
        {emotionStats.map(stat => (
          <div key={stat.id} className="emotion-stat-card">
            <div className="stat-icon" style={{ backgroundColor: stat.color, opacity: 0.2 }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: stat.color, borderRadius: '2px' }}></div>
            </div>
            <div className="stat-info">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-change">{stat.change}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts - 2 columns */}
      <div className="emotion-charts-row">
        {/* Line Chart */}
        <div className="emotion-chart-box">
          <h3 className="chart-box-title">Xu hướng cảm xúc theo tuần</h3>
          <div className="line-chart-container">
            <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" className="line-chart-svg">
              {/* Grid lines */}
              <line x1="0" y1="40" x2="400" y2="40" stroke="#e0e0e0" strokeWidth="1" />
              <line x1="0" y1="80" x2="400" y2="80" stroke="#e0e0e0" strokeWidth="1" />
              <line x1="0" y1="120" x2="400" y2="120" stroke="#e0e0e0" strokeWidth="1" />
              <line x1="0" y1="160" x2="400" y2="160" stroke="#e0e0e0" strokeWidth="1" />
              
              {/* Line */}
              <polyline
                fill="none"
                stroke="#64B5F6"
                strokeWidth="3"
                points="20,100 50,80 80,95 110,70 140,50 170,65 200,55"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* X-axis labels */}
              <text x="20" y="195" fontSize="12" textAnchor="middle" fill="#999">T3</text>
              <text x="50" y="195" fontSize="12" textAnchor="middle" fill="#999">T4</text>
              <text x="80" y="195" fontSize="12" textAnchor="middle" fill="#999">T5</text>
              <text x="110" y="195" fontSize="12" textAnchor="middle" fill="#999">T6</text>
              <text x="140" y="195" fontSize="12" textAnchor="middle" fill="#999">T7</text>
              <text x="170" y="195" fontSize="12" textAnchor="middle" fill="#999">CN</text>
            </svg>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="emotion-chart-box">
          <h3 className="chart-box-title">Tổng quan cảm xúc</h3>
          <div className="bar-chart-container">
            <div className="bars-grid">
              {emotionBreakdown.map((item, idx) => (
                <div key={idx} className="bar-column">
                  <div className="bar" style={{ height: `${item.count}px`, backgroundColor: item.color }}></div>
                  <div className="bar-count">{item.count}</div>
                </div>
              ))}
            </div>
            <div className="bar-labels">
              {emotionBreakdown.map((item, idx) => (
                <div key={idx} className="bar-label-text">{item.type}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Emotion Logs */}
      <div className="emotion-logs-section">
        <h3 className="logs-title">Tuần 1 - Tháng 4/2026</h3>
        <div className="emotion-logs-list">
          {emotionLogs.map(log => (
            <div key={log.id} className="emotion-log-item">
              <div className="log-emoji">{log.emoji}</div>
              <div className="log-details">
                <div className="log-emotion-name">{log.emotion}</div>
                <div className="log-description">{log.description}</div>
              </div>
              <div className="log-time">{log.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
