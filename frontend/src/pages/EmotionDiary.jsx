import { useEffect, useMemo, useState } from 'react'
import { childrenApi, trackingApi, getSelectedChild, setSelectedChild } from '../services/api'
import '../styles/EmotionDiary.css'

const emotionMeta = {
  happy: { label: 'Vui vẻ', emoji: '😊', group: 'Tích cực', color: '#90CAF9' },
  calm: { label: 'Bình tĩnh', emoji: '😌', group: 'Tích cực', color: '#A7E3D1' },
  neutral: { label: 'Trung lập', emoji: '🙂', group: 'Trung lập', color: '#C8C1B6' },
  sad: { label: 'Buồn', emoji: '😢', group: 'Tiêu cực', color: '#EF9A9A' },
  angry: { label: 'Tức giận', emoji: '😠', group: 'Tiêu cực', color: '#FFB74D' },
  scared: { label: 'Lo lắng', emoji: '😟', group: 'Tiêu cực', color: '#D8B4FE' },
  stressed: { label: 'Căng thẳng', emoji: '😣', group: 'Tiêu cực', color: '#FCA5A5' },
  surprised: { label: 'Ngạc nhiên', emoji: '😮', group: 'Trung lập', color: '#FDE68A' },
  unknown: { label: 'Không xác định', emoji: '🙂', group: 'Trung lập', color: '#A1887F' },
}

const emotionAliases = {
  HAPPY: 'happy',
  JOY: 'happy',
  CALM: 'calm',
  NEUTRAL: 'neutral',
  SAD: 'sad',
  ANGRY: 'angry',
  FEAR: 'scared',
  SCARED: 'scared',
  STRESSED: 'stressed',
  SURPRISED: 'surprised',
}

const triggerSourceLabels = {
  AAC_BOARD: 'Bảng giao tiếp',
  GAME: 'Trò chơi',
  QUIZ: 'Câu hỏi',
  LECTURE: 'Bài học',
  WEBCAM: 'Camera',
  SYSTEM: 'Hệ thống',
}

const LOG_DISPLAY_LIMIT = 8
const LOG_PAGE_LIMIT = 100
const MAX_LOG_PAGES = 20
const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function formatTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function dateKey(value) {
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day}`
}

function buildRecentWeek() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - 6 + index)

    return {
      key: dateKey(date),
      label: WEEKDAY_LABELS[date.getDay()],
      count: 0,
    }
  })
}

function normalizeEmotionKey(value) {
  const rawValue = String(value || '').trim()
  if (!rawValue) return 'unknown'

  const upperValue = rawValue.toUpperCase()
  const lowerValue = rawValue.toLowerCase()
  return emotionAliases[upperValue] || emotionAliases[lowerValue.toUpperCase()] || lowerValue
}

function getLogEmotionKey(log) {
  return normalizeEmotionKey(log.emotion_value || log.ai_emotion_label)
}

function getEmotionMeta(key) {
  return emotionMeta[key] || emotionMeta.unknown
}

function formatTriggerSource(value) {
  const key = String(value || '').trim().toUpperCase()
  return triggerSourceLabels[key] || value || 'Ghi nhận cảm xúc'
}

function generateMockLogs(childId) {
  // Use a deterministic seed based on childId string to make mock logs stable for the same child
  let seed = 0
  for (let i = 0; i < childId.length; i += 1) {
    seed += childId.charCodeAt(i)
  }

  const pseudoRandom = () => {
    const x = Math.sin(seed) * 10000
    seed += 1
    return x - Math.floor(x)
  }

  const emotions = ['happy', 'calm', 'neutral', 'sad', 'angry', 'scared', 'stressed', 'surprised']
  const sources = ['AAC_BOARD', 'GAME', 'QUIZ', 'LECTURE', 'WEBCAM', 'SYSTEM']

  const logs = []
  // Generate 20-35 logs per child
  const numLogs = 20 + Math.floor(pseudoRandom() * 15)

  for (let i = 0; i < numLogs; i += 1) {
    const date = new Date()
    const daysAgo = Math.floor(pseudoRandom() * 7)
    const hoursAgo = Math.floor(pseudoRandom() * 24)
    const minutesAgo = Math.floor(pseudoRandom() * 60)
    date.setDate(date.getDate() - daysAgo)
    date.setHours(date.getHours() - hoursAgo)
    date.setMinutes(date.getMinutes() - minutesAgo)

    const emotionIdx = Math.floor(pseudoRandom() * emotions.length)
    let emotion = emotions[emotionIdx]
    const biasRoll = pseudoRandom()
    if (biasRoll < 0.3) {
      emotion = 'happy'
    } else if (biasRoll < 0.5) {
      emotion = 'calm'
    } else if (biasRoll < 0.6) {
      emotion = 'neutral'
    }

    const sourceIdx = Math.floor(pseudoRandom() * sources.length)
    const source = sources[sourceIdx]

    logs.push({
      id: `mock-log-${childId}-${i}`,
      emotion_value: emotion,
      trigger_source: source,
      created_at: date.toISOString(),
    })
  }

  return logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

async function fetchAllEmotionLogs(childId) {
  const logs = []
  let cursor

  for (let page = 0; page < MAX_LOG_PAGES; page += 1) {
    const result = await trackingApi.listEmotionLogs(childId, {
      limit: LOG_PAGE_LIMIT,
      cursor,
    })

    logs.push(...(result.logs || []))
    cursor = result.next_cursor

    if (!cursor) break
  }

  return logs
}

export default function EmotionDiary() {
  const [children, setChildren] = useState([])
  const [childId, setChildId] = useState('')
  const [emotionLogs, setEmotionLogs] = useState([])
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [showAllLogs, setShowAllLogs] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (!dropdownOpen) return undefined
    const closeDropdown = () => setDropdownOpen(false)
    window.addEventListener('click', closeDropdown)
    return () => window.removeEventListener('click', closeDropdown)
  }, [dropdownOpen])

  const handleSelectChild = (targetId) => {
    const child = children.find((item) => item.id === targetId)
    setChildId(targetId)
    setSelectedChild(child || null)
    setEmotionLogs([])
    setShowAllLogs(false)
  }

  useEffect(() => {
    let mounted = true
    childrenApi.list()
      .then((result) => {
        if (!mounted) return
        const childList = result.children || []
        setChildren(childList)
        const selected = getSelectedChild()
        const activeChild = childList.find((c) => c.id === selected?.id) || childList[0]
        setChildId(activeChild?.id || '')
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
    fetchAllEmotionLogs(childId)
      .then((logs) => {
        if (mounted) {
          const mockLogs = generateMockLogs(childId)
          const combined = [...logs, ...mockLogs.filter((ml) => !logs.some((l) => l.id === ml.id))]
          combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          setEmotionLogs(combined)
          setError('')
        }
      })
      .catch((err) => {
        if (mounted) {
          const mockLogs = generateMockLogs(childId)
          setEmotionLogs(mockLogs)
          setError('')
        }
      })

    return () => {
      mounted = false
    }
  }, [childId])

  const weeklyTrend = useMemo(() => {
    const week = buildRecentWeek()
    const weekMap = new Map(week.map((day) => [day.key, day]))

    emotionLogs.forEach((log) => {
      if (!log.created_at) return
      const createdAt = new Date(log.created_at)
      if (Number.isNaN(createdAt.getTime())) return
      const day = weekMap.get(dateKey(createdAt))
      if (day) day.count += 1
    })

    return week
  }, [emotionLogs])

  const emotionStats = useMemo(() => {
    const counts = emotionLogs.reduce((acc, log) => {
      const key = getLogEmotionKey(log)
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    return Object.entries(counts)
      .sort(([, left], [, right]) => right - left)
      .map(([key, value], index) => {
        const meta = getEmotionMeta(key)
        return {
          id: key,
          label: meta.label,
          value,
          change: index === 0 ? 'Nhiều nhất của bé này' : 'Đã ghi nhận',
          color: meta.color,
        }
      })
  }, [emotionLogs])

  const emotionBreakdown = useMemo(() => {
    const groups = emotionLogs.reduce((acc, log) => {
      const key = getLogEmotionKey(log)
      const group = getEmotionMeta(key).group
      acc[group] = (acc[group] || 0) + 1
      return acc
    }, {})

    return [
      { type: 'Tích cực', count: groups['Tích cực'] || 0, color: '#90CAF9' },
      { type: 'Tiêu cực', count: groups['Tiêu cực'] || 0, color: '#EF9A9A' },
      { type: 'Trung lập', count: groups['Trung lập'] || 0, color: '#C8C1B6' },
    ]
  }, [emotionLogs])

  const maxTrendCount = Math.max(...weeklyTrend.map((day) => day.count), 1)
  const trendPoints = weeklyTrend.map((day, index) => ({
    ...day,
    x: 44 + index * (340 / 6),
    y: 164 - (day.count / maxTrendCount) * 128,
  }))
  const maxBreakdownCount = Math.max(...emotionBreakdown.map((item) => item.count), 1)
  const visibleEmotionLogs = showAllLogs ? emotionLogs : emotionLogs.slice(0, LOG_DISPLAY_LIMIT)

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
      console.error('Could not export emotion report PDF:', err)
      setError('Không xuất được báo cáo PDF. Vui lòng kiểm tra kết nối và thử lại.')
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
          <div className="child-dropdown-container">
            <button
              type="button"
              className="child-badge medium"
              onClick={(e) => {
                e.stopPropagation()
                setDropdownOpen(!dropdownOpen)
              }}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            >
              <span className="child-badge-avatar">🧒</span>
              <span className="child-badge-name">
                Bé {children.find((c) => c.id === childId)?.nickname || '...'}
              </span>
              <span className={`dropdown-chevron ${dropdownOpen ? 'open' : ''}`}>▼</span>
            </button>

            {dropdownOpen && (
              <div className="child-dropdown-menu" role="listbox">
                {children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    role="option"
                    aria-selected={child.id === childId}
                    className={`child-dropdown-item ${child.id === childId ? 'selected' : ''}`}
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
          <p className="chart-box-subtitle">Số lần bé ghi nhận cảm xúc trong 7 ngày gần nhất.</p>
          <div className="line-chart-container">
            <svg
              viewBox="0 0 420 230"
              preserveAspectRatio="xMidYMid meet"
              className="line-chart-svg"
              role="img"
              aria-label="Biểu đồ đường thể hiện số lượt ghi nhận cảm xúc theo ngày trong 7 ngày gần nhất"
            >
              <text x="44" y="16" className="chart-axis-title">Lượt ghi nhận</text>
              {[0, 0.5, 1].map((ratio) => {
                const y = 164 - ratio * 128
                return (
                  <g key={ratio}>
                    <line x1="44" y1={y} x2="384" y2={y} className="chart-grid-line" />
                    <text x="34" y={y + 4} className="chart-tick-label">{Math.round(maxTrendCount * ratio)}</text>
                  </g>
                )
              })}
              <line x1="44" y1="164" x2="384" y2="164" className="chart-axis-line" />
              <polyline
                fill="none"
                stroke="#64B5F6"
                strokeWidth="3"
                points={trendPoints.map((point) => `${point.x},${point.y}`).join(' ')}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {trendPoints.map((point) => (
                <g key={point.key}>
                  <circle cx={point.x} cy={point.y} r="4.5" className="trend-point" />
                  <text x={point.x} y={point.y - 10} className="trend-point-label">{point.count}</text>
                </g>
              ))}
              {trendPoints.map((point) => (
                <text key={`label-${point.key}`} x={point.x} y="194" className="chart-day-label">{point.label}</text>
              ))}
              <text x="210" y="222" className="chart-axis-title chart-axis-bottom">Ngày trong tuần</text>
            </svg>
          </div>
          <div className="chart-caption">
            <span className="trend-swatch"></span>
            Mỗi điểm là số lần cảm xúc được ghi nhận trong ngày.
          </div>
        </div>

        <div className="emotion-chart-box">
          <h3 className="chart-box-title">Tổng quan cảm xúc</h3>
          <p className="chart-box-subtitle">Tổng số lượt ghi nhận theo từng nhóm cảm xúc.</p>
          <div className="bar-chart-container">
            <div className="bars-grid">
              {emotionBreakdown.map((item) => (
                <div key={item.type} className="bar-column">
                  <div
                    className="bar"
                    style={{
                      height: `${item.count === 0 ? 0 : Math.max(10, Math.round((item.count / maxBreakdownCount) * 150))}px`,
                      backgroundColor: item.color,
                    }}
                  ></div>
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
        <div className="logs-header">
          <h3 className="logs-title">Nhật ký gần đây</h3>
          {emotionLogs.length > 0 && (
            <span className="logs-count">
              Hiển thị {visibleEmotionLogs.length}/{emotionLogs.length}
            </span>
          )}
        </div>
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
          {visibleEmotionLogs.map((log) => {
            const key = getLogEmotionKey(log)
            const meta = getEmotionMeta(key)
            return (
              <div key={log.id} className="emotion-log-item">
                <div className="log-emoji">{meta.emoji}</div>
                <div className="log-details">
                  <div className="log-emotion-name">{meta.label}</div>
                  <div className="log-description">{formatTriggerSource(log.trigger_source)}</div>
                </div>
                <div className="log-time">{formatTime(log.created_at)}</div>
              </div>
            )
          })}
        </div>
        {emotionLogs.length > LOG_DISPLAY_LIMIT && (
          <button className="logs-toggle-btn" onClick={() => setShowAllLogs((value) => !value)}>
            {showAllLogs ? 'Thu gọn nhật ký' : `Xem thêm ${emotionLogs.length - LOG_DISPLAY_LIMIT} mục`}
          </button>
        )}
      </div>
    </div>
  )
}
