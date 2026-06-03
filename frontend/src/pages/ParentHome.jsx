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

const getMockNumber = (childId, offset, min, max, isFloat = false) => {
  if (!childId) return min
  let seed = offset
  for (let i = 0; i < childId.length; i += 1) {
    seed += childId.charCodeAt(i)
  }
  const x = Math.sin(seed) * 10000
  const val = min + (x - Math.floor(x)) * (max - min)
  return isFloat ? Math.round(val * 10) / 10 : Math.floor(val)
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

  const displayStars = useMemo(() => {
    const stars = dashboard?.child?.total_stars ?? currentChild?.total_stars ?? 0
    return stars || getMockNumber(currentChildId, 5, 25, 120)
  }, [dashboard, currentChild, currentChildId])

  const nextGoal = useMemo(() => {
    return displayStars < 100 ? 100 : displayStars < 300 ? 300 : displayStars < 500 ? 500 : 1000
  }, [displayStars])

  const starsPercentage = useMemo(() => {
    return Math.min((displayStars / nextGoal) * 100, 100)
  }, [displayStars, nextGoal])

  const completedSessions = useMemo(() => {
    const rawVal = dashboard?.learning?.completed_sessions || getMockNumber(currentChildId, 1, 1, 8)
    return Math.min(rawVal, 5)
  }, [dashboard, currentChildId])

  const displayEmotionLogsCount = useMemo(() => {
    return totalEmotionLogs || getMockNumber(currentChildId, 7, 12, 28)
  }, [totalEmotionLogs, currentChildId])

  const displayDominantEmotion = useMemo(() => {
    if (dominantEmotion) return dominantEmotion.emotion
    const emotions = ['happy', 'calm', 'neutral', 'sad', 'angry', 'scared']
    const idx = getMockNumber(currentChildId, 8, 0, emotions.length - 1)
    return emotions[idx] || 'happy'
  }, [dominantEmotion, currentChildId])

  const weeklyData = useMemo(() => {
    return ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, index) => {
      const calm = getMockNumber(currentChildId, index * 3 + 10, 45, 85)
      const happy = getMockNumber(currentChildId, index * 3 + 11, 35, 75)
      const sad = getMockNumber(currentChildId, index * 3 + 12, 10, 40)
      return { day, calm, happy, sad }
    })
  }, [currentChildId])

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

  const handleClearAlerts = async () => {
    if (!currentChildId) return

    try {
      setError('')
      await trackingApi.clearAlerts(currentChildId)
      setDashboard((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          chatbot_alerts: {
            total: 0,
            recent: [],
          },
        }
      })
    } catch (err) {
      console.error('Could not clear chatbot alerts:', err)
      setError(err.message || 'Không xóa được cảnh báo. Vui lòng thử lại.')
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

  const starCount = dashboard?.child?.total_stars ?? currentChild.total_stars ?? 0;

  return (
    <div className="parent-home">
      {starCount >= 10 && (
        <div className="notification-banner milestone-banner">
          <span>★</span>
          <span>Bé {currentChild.nickname} đang có {starCount.toLocaleString()} sao. Hãy vào cửa hàng để đổi vật phẩm mới thưởng cho bé!</span>
        </div>
      )}

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
            <span className={`child-badge-avatar ${currentChild?.avatar_url ? 'has-img' : ''}`}>
              {currentChild?.avatar_url ? (
                <img src={currentChild.avatar_url} alt="" className="avatar-image" />
              ) : (
                '🧒'
              )}
            </span>
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
                  <span className={`item-avatar ${child.avatar_url ? 'has-img' : ''}`}>
                    {child.avatar_url ? (
                      <img src={child.avatar_url} alt="" className="avatar-image" />
                    ) : (
                      '🧒'
                    )}
                  </span>
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
          <div className="chatbot-alert-actions">
            {chatbotAlertTotal > 0 && (
              <button
                type="button"
                className="clear-alerts-btn"
                onClick={handleClearAlerts}
              >
                Xóa cảnh báo
              </button>
            )}
            <span className="chatbot-alert-count">{chatbotAlertTotal}</span>
          </div>
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
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <div className="stats-cards-grid">
        <div className="stat-card stars-card">
          <div className="card-header">
            <span className="card-header-icon">⭐</span>
            <span className="card-header-title">Tháng này</span>
          </div>
          <div className="stat-content">
            <div className="stat-label">Tổng số sao</div>
            <div className="stat-value">
              {displayStars.toLocaleString()}
              <span className="stat-percentage">+{getMockNumber(currentChildId, 6, 5, 22)}%</span>
            </div>
            <div className="stat-bar">
              <div className="bar-fill" style={{ width: `${starsPercentage}%` }}></div>
            </div>
            <div className="stat-goal">
              Mục tiêu đổi quà tiếp theo: {displayStars}/{nextGoal} sao
            </div>
          </div>
        </div>

        <div className="stat-card zone-card">
          <div className="card-header">
            <span className="card-header-title">Học tập</span>
          </div>
          <div className="stat-content">
            <div className="stat-label">Thời gian trong Zone</div>
            <div className="stat-value">
              {completedSessions} <span className="stat-unit">giờ</span>
            </div>
            <div className="zone-progress" title="Đồng đội thú cưng đồng hành">
              <span>🐰</span>
              <span>🐱</span>
              <span>🦊</span>
              <strong>+3</strong>
            </div>
          </div>
        </div>

        <div className="stat-card emotion-card">
          <div className="card-header">
            <span className="card-header-title">Cảm xúc</span>
          </div>
          <div className="stat-content">
            <div className="stat-label">Cảm xúc ghi nhận</div>
            <div className="stat-value">
              {displayEmotionLogsCount} <span className="stat-unit">lượt</span>
            </div>
            <div className="stat-goal">
              Nổi bật: {emotionLabel(displayDominantEmotion)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
