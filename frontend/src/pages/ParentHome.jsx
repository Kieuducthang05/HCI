import { useEffect, useMemo, useState } from 'react'
import { childrenApi, setSelectedChild, trackingApi } from '../services/api'
import '../styles/ParentDashboard.css'

const fallbackWeeklyData = [
  { day: 'T2', calm: 65, happy: 45, sad: 20 },
  { day: 'T3', calm: 55, happy: 35, sad: 30 },
  { day: 'T4', calm: 75, happy: 50, sad: 15 },
  { day: 'T5', calm: 60, happy: 40, sad: 25 },
  { day: 'T6', calm: 70, happy: 45, sad: 20 },
  { day: 'T7', calm: 80, happy: 60, sad: 10 },
  { day: 'CN', calm: 70, happy: 55, sad: 15 },
]

function emotionLabel(value) {
  const labels = {
    happy: 'Vui vẻ',
    sad: 'Buồn',
    angry: 'Tức giận',
    scared: 'Lo lắng',
    calm: 'Bình tĩnh',
  }
  return labels[value] || value || 'Chưa có dữ liệu'
}

export default function ParentHome() {
  const [children, setChildren] = useState([])
  const [currentChildId, setCurrentChildId] = useState('')
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let mounted = true
    childrenApi.list()
      .then((result) => {
        if (!mounted) return
        const childList = result.children || []
        setChildren(childList)
        if (childList[0]) {
          setCurrentChildId(childList[0].id)
          setSelectedChild(childList[0])
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Không tải được danh sách trẻ.')
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!currentChildId) return

    let mounted = true
    trackingApi.dashboard(currentChildId, 7)
      .then((result) => {
        if (mounted) setDashboard(result)
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Không tải được dashboard.')
      })

    return () => {
      mounted = false
    }
  }, [currentChildId])

  const currentChild = useMemo(() => {
    return children.find((child) => child.id === currentChildId) || children[0] || dashboard?.child
  }, [children, currentChildId, dashboard])

  const emotionSummary = useMemo(() => dashboard?.emotions || [], [dashboard])
  const dominantEmotion = [...emotionSummary].sort((a, b) => b.count - a.count)[0]
  const totalEmotionLogs = emotionSummary.reduce((sum, item) => sum + item.count, 0)

  const weeklyData = useMemo(() => {
    if (!emotionSummary.length) return fallbackWeeklyData

    const positive = emotionSummary
      .filter((item) => ['happy', 'calm'].includes(item.emotion))
      .reduce((sum, item) => sum + item.count, 0)
    const negative = emotionSummary
      .filter((item) => ['sad', 'angry', 'scared'].includes(item.emotion))
      .reduce((sum, item) => sum + item.count, 0)

    return fallbackWeeklyData.map((item, index) => ({
      ...item,
      happy: Math.min(90, 25 + positive * 6 + index * 2),
      sad: Math.min(90, 15 + negative * 5),
      calm: Math.min(90, 35 + (dashboard.learning?.success_rate || 0) / 2),
    }))
  }, [dashboard, emotionSummary])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Chào buổi sáng'
    if (hour < 17) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  }

  const handleSelectChild = (e) => {
    const child = children.find((item) => item.id === e.target.value)
    setCurrentChildId(e.target.value)
    setSelectedChild(child || null)
  }

  const handleExportPdf = async () => {
    if (!currentChildId) return

    try {
      setExporting(true)
      const blob = await trackingApi.downloadSummaryPdf(currentChildId, { days: 7 })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `bao-cao-${currentChild?.nickname || 'tre'}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Không xuất được PDF.')
    } finally {
      setExporting(false)
    }
  }

  if (!currentChild) {
    return (
      <div className="parent-home">
        <div className="notification-banner">
          <span>⭐</span>
          <span>{error || 'Chưa có tài khoản trẻ. Hãy tạo tài khoản cho bé trong phần cài đặt.'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="parent-home">
      {error && (
        <div className="notification-banner">
          <span>!</span>
          <span>{error}</span>
        </div>
      )}

      <div className="greeting-container">
        <div className="greeting-left">
          <h1 className="greeting-title">{getGreeting()}, {currentChild.nickname}</h1>
          <p className="greeting-subtitle">Theo dõi hoạt động, điểm sao và cảm xúc của bé trong tuần này.</p>
        </div>
        <div className="child-badge">
          <span className="child-badge-avatar">🧒</span>
          <select value={currentChildId} onChange={handleSelectChild} className="child-badge-name">
            {children.map((child) => (
              <option key={child.id} value={child.id}>Bé {child.nickname}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="stats-cards-grid">
        <div className="stat-card stars-card">
          <div className="star-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-label">Tổng số sao</div>
            <div className="stat-value">{(dashboard?.child?.total_stars ?? currentChild.total_stars ?? 0).toLocaleString()}</div>
            <div className="stat-bar">
              <div className="bar-fill" style={{ width: `${Math.min((dashboard?.child?.total_stars || 0) / 10, 100)}%` }}></div>
            </div>
          </div>
        </div>

        <div className="stat-card zone-card">
          <div className="zone-content">
            <div className="stat-label">Phiên học hoàn thành</div>
            <div className="stat-value">{dashboard?.learning?.completed_sessions || 0}</div>
            <div className="zone-progress">
              <div className="progress-circle" style={{ width: '40px', height: '40px' }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="2" />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#93c5fd"
                    strokeWidth="2"
                    strokeDasharray={`${dashboard?.learning?.success_rate || 0} 100`}
                    transform="rotate(-90 18 18)"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card emotion-card">
          <div className="emotion-icon">😊</div>
          <div className="stat-content">
            <div className="stat-label">Cảm xúc ghi nhận</div>
            <p className="emotion-text">
              {totalEmotionLogs > 0
                ? `${totalEmotionLogs} lượt, nổi bật: ${emotionLabel(dominantEmotion?.emotion)}`
                : 'Chưa có dữ liệu cảm xúc trong tuần này'}
            </p>
          </div>
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-header">
          <h2 className="chart-title">Nhật ký tuần</h2>
          <button className="export-btn" onClick={handleExportPdf} disabled={exporting}>
            📊 {exporting ? 'Đang xuất...' : 'Xuất PDF'}
          </button>
        </div>

        <div className="chart-container">
          <div className="bars-container">
            {weeklyData.map((data) => (
              <div key={data.day} className="bar-group">
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
            <div className="legend-item"><span className="legend-dot calm"></span><span>Bình tĩnh</span></div>
            <div className="legend-item"><span className="legend-dot happy"></span><span>Vui vẻ</span></div>
            <div className="legend-item"><span className="legend-dot sad"></span><span>Tiêu cực</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
