import { useEffect, useMemo, useState } from 'react'
import { childrenApi, trackingApi } from '../services/api'
import '../styles/EmotionDiary.css'

const emotionMeta = {
  happy: { label: 'Hạnh phúc', emoji: '😊', group: 'Tích cực', color: '#90CAF9' },
  calm: { label: 'Bình tĩnh', emoji: '😌', group: 'Tích cực', color: '#90CAF9' },
  sad: { label: 'Buồn', emoji: '😢', group: 'Tiêu cực', color: '#EF9A9A' },
  angry: { label: 'Tức giận', emoji: '😠', group: 'Tiêu cực', color: '#FFB74D' },
  scared: { label: 'Lo lắng', emoji: '😟', group: 'Tiêu cực', color: '#EF9A9A' },
}

function formatTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export default function EmotionDiary() {
  const [children, setChildren] = useState([])
  const [childId, setChildId] = useState('')
  const [emotionLogs, setEmotionLogs] = useState([])
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let mounted = true
    childrenApi.list()
      .then((result) => {
        if (!mounted) return
        const childList = result.children || []
        setChildren(childList)
        setChildId(childList[0]?.id || '')
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Không tải được danh sách trẻ.')
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!childId) return

    let mounted = true
    trackingApi.listEmotionLogs(childId, { limit: 50 })
      .then((result) => {
        if (mounted) setEmotionLogs(result.logs || [])
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Không tải được nhật ký cảm xúc.')
      })

    return () => {
      mounted = false
    }
  }, [childId])

  const emotionStats = useMemo(() => {
    const counts = emotionLogs.reduce((acc, log) => {
      const key = log.emotion_value || log.ai_emotion_label || 'unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    return Object.entries(counts).map(([key, value], index) => ({
      id: key,
      label: emotionMeta[key]?.label || key,
      value,
      change: index === 0 ? 'Nhiều nhất gần đây' : 'Đã ghi nhận',
      color: emotionMeta[key]?.color || '#A1887F',
    }))
  }, [emotionLogs])

  const emotionBreakdown = useMemo(() => {
    const groups = emotionLogs.reduce((acc, log) => {
      const key = log.emotion_value || log.ai_emotion_label || 'unknown'
      const group = emotionMeta[key]?.group || 'Trung lập'
      acc[group] = (acc[group] || 0) + 1
      return acc
    }, {})

    return [
      { type: 'Tích cực', count: groups['Tích cực'] || 0, color: '#90CAF9' },
      { type: 'Tiêu cực', count: groups['Tiêu cực'] || 0, color: '#EF9A9A' },
      { type: 'Trung lập', count: groups['Trung lập'] || 0, color: '#A1887F' },
    ]
  }, [emotionLogs])

  const handleExportPdf = async () => {
    if (!childId) return

    try {
      setExporting(true)
      const blob = await trackingApi.downloadSummaryPdf(childId, { days: 7 })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'nhat-ky-cam-xuc.pdf'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Không xuất được PDF.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="emotion-diary-container">
      <div className="emotion-header">
        <div className="emotion-title-section">
          <h1 className="emotion-title">Nhật ký cảm xúc của con</h1>
          <p className="emotion-subtitle">Xem lại toàn bộ nhật ký cảm xúc đã được ghi nhận.</p>
          {error && <span className="error-message">{error}</span>}
        </div>
        <div className="emotion-header-actions">
          <select className="text-input" value={childId} onChange={(e) => setChildId(e.target.value)}>
            {children.map((child) => (
              <option key={child.id} value={child.id}>Bé {child.nickname}</option>
            ))}
          </select>
          <button className="emotion-export-btn" onClick={handleExportPdf} disabled={exporting}>
            📊 {exporting ? 'Đang xuất...' : 'Xuất PDF'}
          </button>
        </div>
      </div>

      <div className="emotion-stats-grid">
        {(emotionStats.length ? emotionStats : [
          { id: 'empty', label: 'Chưa có dữ liệu', value: 0, change: 'Hãy để bé ghi nhận cảm xúc', color: '#A1887F' },
        ]).map((stat) => (
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

      <div className="emotion-charts-row">
        <div className="emotion-chart-box">
          <h3 className="chart-box-title">Xu hướng cảm xúc theo tuần</h3>
          <div className="line-chart-container">
            <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" className="line-chart-svg">
              <line x1="0" y1="40" x2="400" y2="40" stroke="#e0e0e0" strokeWidth="1" />
              <line x1="0" y1="80" x2="400" y2="80" stroke="#e0e0e0" strokeWidth="1" />
              <line x1="0" y1="120" x2="400" y2="120" stroke="#e0e0e0" strokeWidth="1" />
              <line x1="0" y1="160" x2="400" y2="160" stroke="#e0e0e0" strokeWidth="1" />
              <polyline
                fill="none"
                stroke="#64B5F6"
                strokeWidth="3"
                points={emotionLogs.slice(0, 7).map((_, index) => `${20 + index * 50},${150 - Math.min(100, (index + 1) * 12)}`).join(' ') || '20,150 70,150'}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, index) => (
                <text key={day} x={20 + index * 50} y="195" fontSize="12" textAnchor="middle" fill="#999">{day}</text>
              ))}
            </svg>
          </div>
        </div>

        <div className="emotion-chart-box">
          <h3 className="chart-box-title">Tổng quan cảm xúc</h3>
          <div className="bar-chart-container">
            <div className="bars-grid">
              {emotionBreakdown.map((item) => (
                <div key={item.type} className="bar-column">
                  <div className="bar" style={{ height: `${Math.max(8, item.count * 12)}px`, backgroundColor: item.color }}></div>
                  <div className="bar-count">{item.count}</div>
                </div>
              ))}
            </div>
            <div className="bar-labels">
              {emotionBreakdown.map((item) => (
                <div key={item.type} className="bar-label-text">{item.type}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="emotion-logs-section">
        <h3 className="logs-title">Nhật ký gần đây</h3>
        <div className="emotion-logs-list">
          {emotionLogs.length === 0 && (
            <div className="emotion-log-item">
              <div className="log-emoji">📝</div>
              <div className="log-details">
                <div className="log-emotion-name">Chưa có dữ liệu</div>
                <div className="log-description">Khi bé chọn hoặc kiểm tra cảm xúc, dữ liệu sẽ xuất hiện ở đây.</div>
              </div>
            </div>
          )}
          {emotionLogs.map((log) => {
            const key = log.emotion_value || log.ai_emotion_label || 'unknown'
            const meta = emotionMeta[key] || { label: key, emoji: '🙂' }
            return (
              <div key={log.id} className="emotion-log-item">
                <div className="log-emoji">{meta.emoji}</div>
                <div className="log-details">
                  <div className="log-emotion-name">{meta.label}</div>
                  <div className="log-description">{log.trigger_source || 'Ghi nhận cảm xúc'}</div>
                </div>
                <div className="log-time">{formatTime(log.created_at)}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
