import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdSupervisorAccount } from 'react-icons/md'
import { authApi, childrenApi, clearSession, getSession, setSelectedChild } from '../services/api'
import '../styles/Auth.css'

const childPastelColors = [
  { background: '#dff5e6', border: '#a9dec0', accent: '#5fae7a', text: '#2f7650' },
  { background: '#dff2ff', border: '#a9d7f2', accent: '#4f9fca', text: '#236c93' },
  { background: '#dbeeff', border: '#9fc9ef', accent: '#3d82c4', text: '#1f5f99' },
  { background: '#fff2c7', border: '#efd889', accent: '#c49b28', text: '#7b6416' },
  { background: '#f9dbe4', border: '#ebaebe', accent: '#c9617e', text: '#934457' },
]

function getStableColorIndex(value) {
  const source = String(value || '')
  let hash = 0

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) % childPastelColors.length
  }

  return hash
}

function getChildCards(children) {
  const usedColorIndexes = new Set()

  return children.map((child, index) => {
    const baseColorIndex = getStableColorIndex(child.id || child.nickname || child.name || index)
    let colorIndex = baseColorIndex

    if (children.length <= childPastelColors.length) {
      while (usedColorIndexes.has(colorIndex)) {
        colorIndex = (colorIndex + 1) % childPastelColors.length
      }
    } else {
      colorIndex = (baseColorIndex + index) % childPastelColors.length
    }

    usedColorIndexes.add(colorIndex)

    return {
      child,
      color: childPastelColors[colorIndex],
    }
  })
}

export default function SelectUser() {
  const navigate = useNavigate()
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const childCards = useMemo(() => getChildCards(children), [children])

  useEffect(() => {
    const session = getSession()
    if (!session?.session?.session_token) {
      navigate('/login', { replace: true })
      return
    }

    if (session.user?.role === 'ADMIN') {
      navigate('/admin', { replace: true })
      return
    }

    let mounted = true
    childrenApi.list()
      .then((result) => {
        if (!mounted) return
        setChildren(result.children || [])
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.message || 'Không tải được danh sách trẻ.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [navigate])

  const handleSelectParent = () => {
    setSelectedChild(children[0] || null)
    navigate('/parent/home')
  }

  const handleSelectChild = (child) => {
    setSelectedChild(child)
    navigate('/child/home')
  }

  const handleAddChild = () => {
    navigate('/parent/settings')
  }

  const handleBackToLogin = async () => {
    try {
      await authApi.signOut()
    } catch {
      // Local logout is still valid
    } finally {
      clearSession()
      navigate('/login')
    }
  }

  return (
    <div className="select-user-container">
      <div className="select-user-modal-box">
        {/* Top Bar inside the box */}
        <div className="top-bar">
          <button className="back-to-login-btn" onClick={handleBackToLogin}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Quay lại đăng nhập</span>
          </button>
        </div>

        <h1 className="select-user-title">Ai đang ở đây vậy?</h1>

        <div className={`profiles-row ${children.length >= 4 ? 'profiles-row-compact' : ''} ${children.length >= 4 ? 'profiles-row-scroll' : ''}`}>
          {/* Parent Card with MdSupervisorAccount Icon */}
          <div className="profile-card parent-card" onClick={handleSelectParent}>
            <div className="parent-icon-circle">
              <MdSupervisorAccount size={48} />
            </div>
            <h3 className="card-title">Khu vực của Bố/Mẹ</h3>
            <p className="card-subtitle">Quản lý và theo dõi tiến trình</p>
          </div>

          {/* Child Cards / Add Card */}
          {children.length > 0 ? (
            childCards.map(({ child, color }) => (
              <div
                key={child.id}
                className="profile-card child-card-active"
                style={{
                  '--profile-bg': color.background,
                  '--profile-border': color.border,
                  '--profile-accent': color.accent,
                  '--profile-text': color.text,
                }}
                onClick={() => handleSelectChild(child)}
              >
                <div className="child-avatar-wrapper">
                  {child.avatar_url ? (
                    <img src={child.avatar_url} alt={child.nickname} className="child-avatar-img" />
                  ) : (
                    <span className="child-avatar-placeholder">🧒</span>
                  )}
                </div>
                <h3 className="card-title">{child.nickname || 'Bé'}</h3>
                <p className="card-subtitle">Chào mừng con quay lại!</p>
              </div>
            ))
          ) : (
            <div className="profile-card add-child-card" onClick={handleAddChild}>
              <div className="add-icon-circle">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="card-title">Thêm hồ sơ bé</h3>
              <p className="card-subtitle">Bắt đầu hành trình cùng con</p>
            </div>
          )}
        </div>

        {loading && <p style={{ textAlign: 'center', marginTop: '20px', color: '#94A3B8', fontSize: '14px' }}>Đang tải danh sách...</p>}
        {error && <p className="error-message" style={{ textAlign: 'center', marginTop: '20px' }}>{error}</p>}
      </div>
    </div>
  )
}
