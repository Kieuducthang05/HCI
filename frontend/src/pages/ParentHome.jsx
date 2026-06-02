import { useEffect, useMemo, useState } from 'react'
import { childrenApi, setSelectedChild, trackingApi, getSelectedChild } from '../services/api'
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

function formatAlertTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function parseChatbotAlertReason(value) {
  const raw = String(value || '').trim()
  const severity = raw.match(/Mức độ:\s*([^|]+)/i)?.[1]?.trim().toLowerCase() || ''
  const reason = raw.match(/Lý do:\s*([^|]+)/i)?.[1]?.trim()
  const childMessage = raw.match(/Tin nhắn của trẻ:\s*(.+)$/i)?.[1]?.trim()

  return {
    severity,
    reason: reason || raw || 'Chatbot ghi nhận nội dung cần phụ huynh chú ý.',
    childMessage,
  }
}

function alertSeverityLabel(value) {
  const labels = {
    low: 'Nhẹ',
    medium: 'Cần chú ý',
    high: 'Khẩn cấp',
  }

  return labels[value] || 'Cần chú ý'
}

function notificationStatusLabel(value) {
  const labels = {
    SENT: 'Đã gửi',
    PENDING: 'Đang gửi',
    FAILED: 'Gửi lỗi',
    NO_DEVICES: 'Chưa có thiết bị nhận',
  }

  return labels[String(value || '').toUpperCase()] || 'Đã ghi nhận'
}

export default function ParentHome() {
  const [children, setChildren] = useState([])
  const [currentChildId, setCurrentChildId] = useState('')
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (!dropdownOpen) return undefined
    const closeDropdown = () => setDropdownOpen(false)
    window.addEventListener('click', closeDropdown)
    return () => window.removeEventListener('click', closeDropdown)
  }, [dropdownOpen])

  useEffect(() => {
    let mounted = true
    childrenApi.list()
      .then((result) => {
        if (!mounted) return
        const childList = result.children || []
        setChildren(childList)
        const selected = getSelectedChild()
        const activeChild = childList.find((c) => c.id === selected?.id) || childList[0]
        if (activeChild) {
          setCurrentChildId(activeChild.id)
          setSelectedChild(activeChild)
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
  const chatbotAlerts = dashboard?.chatbot_alerts?.recent || []
  const chatbotAlertTotal = dashboard?.chatbot_alerts?.total || 0

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

  const handleSelectChild = (value) => {
    const targetId = typeof value === 'string' ? value : value.target.value
    const child = children.find((item) => item.id === targetId)
    setCurrentChildId(targetId)
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
      console.error('Could not export parent summary PDF:', err)
      setError('Không xuất được báo cáo PDF. Vui lòng kiểm tra kết nối và thử lại.')
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
      <div className="notification-banner milestone-banner">
        <span>★</span>
        <span>Bé {currentChild.nickname} đang có {(dashboard?.child?.total_stars ?? currentChild.total_stars ?? 0).toLocaleString()} sao. Hãy vào cửa hàng để đổi vật phẩm mới thưởng cho bé!</span>
      </div>

      {error && (
        <div className="notification-banner">
          <span>!</span>
          <span>{error}</span>
        </div>
      )}

      <div className="greeting-container">
        <div className="greeting-left">
          <h1 className="greeting-title">{getGreeting()}</h1>
          <p className="greeting-subtitle">Theo dõi hoạt động, điểm sao và cảm xúc của bé trong tuần này.</p>
        </div>
        <div className="child-dropdown-container">
          <button 
            type="button" 
            className="child-badge" 
            onClick={(e) => {
              e.stopPropagation()
              setDropdownOpen(!dropdownOpen)
            }}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
          >
            <span className="child-badge-avatar">🧒</span>
            <span className="child-badge-name">Bé {currentChild?.nickname || '...'}</span>
            <span className={`dropdown-chevron ${dropdownOpen ? 'open' : ''}`}>▼</span>
          </button>
          
          {dropdownOpen && (
            <div className="child-dropdown-menu" role="listbox">
              {children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  role="option"
                  aria-selected={child.id === currentChildId}
                  className={`child-dropdown-item ${child.id === currentChildId ? 'selected' : ''}`}
                  onClick={() => {
                    handleSelectChild(child.id)
                    setDropdownOpen(false)
                  }}
                >
                  <span className="item-avatar">🧒</span>
                  <span className="item-name">Bé {child.nickname}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className={`chatbot-alert-panel ${chatbotAlertTotal > 0 ? 'has-alerts' : ''}`}>
        <div className="chatbot-alert-header">
          <div>
            <h2>Cảnh báo từ chatbot</h2>
            <p>Khi bé nói nội dung tiêu cực hoặc có rủi ro, cảnh báo sẽ xuất hiện ở đây.</p>
          </div>
          <span className="chatbot-alert-count">{chatbotAlertTotal}</span>
        </div>

        <div className="chatbot-alert-list">
          {chatbotAlerts.length === 0 && (
            <div className="chatbot-alert-empty">
              Chưa có cảnh báo nào trong 7 ngày gần đây.
            </div>
          )}

          {chatbotAlerts.map((alert) => {
            const parsed = parseChatbotAlertReason(alert.reason)
            const severity = ['low', 'medium', 'high'].includes(parsed.severity) ? parsed.severity : 'medium'

            return (
              <article key={alert.id} className={`chatbot-alert-item severity-${severity}`}>
                <div className="chatbot-alert-icon">!</div>
                <div className="chatbot-alert-body">
                  <div className="chatbot-alert-row">
                    <strong>{alertSeverityLabel(severity)}</strong>
                    <span>{formatAlertTime(alert.created_at)}</span>
                  </div>
                  <p>{parsed.reason}</p>
                  {parsed.childMessage && (
                    <blockquote>“{parsed.childMessage}”</blockquote>
                  )}
                  <span className="chatbot-alert-status">
                    {notificationStatusLabel(alert.notification_status)}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <div className="stats-cards-grid">
        <div className="stat-card stars-card">
          <div className="star-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-kicker">Tháng này</div>
            <div className="stat-label">Tổng số sao</div>
            <div className="stat-value">
              {(dashboard?.child?.total_stars ?? currentChild.total_stars ?? 0).toLocaleString()}
              <span className="stat-percentage">+12%</span>
            </div>
            <div className="stat-bar">
              <div className="bar-fill" style={{ width: `${Math.min((dashboard?.child?.total_stars || 0) / 10, 100)}%` }}></div>
            </div>
          </div>
        </div>

        <div className="stat-card zone-card">
          <div className="zone-content">
            <div className="stat-label">Thời gian trong Zone</div>
            <div className="stat-value">{dashboard?.learning?.completed_sessions || 0}<span className="stat-unit">giờ</span></div>
            <div className="zone-progress">
              <span></span>
              <span></span>
              <span></span>
              <strong>+3</strong>
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
                <div className={`weekly-bar ${data.day === 'T4' ? 'active' : ''}`} style={{ height: `${Math.max(72, data.calm + data.happy / 2)}px` }}></div>
                <div className="bar-label">{data.day}</div>
              </div>
            ))}
          </div>

          <div className="chart-legend">
            <div className="legend-item"><span className="legend-dot calm"></span><span>Học tập</span></div>
            <div className="legend-item"><span className="legend-dot happy"></span><span>Nghỉ ngơi</span></div>
            <div className="legend-item"><span className="legend-dot sad"></span><span>Sáng tạo</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
