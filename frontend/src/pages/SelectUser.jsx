import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, childrenApi, clearSession, getSession, setSelectedChild } from '../services/api'
import '../styles/Auth.css'

export default function SelectUser() {
  const navigate = useNavigate()
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    // Giả sử có màn hình tạo hồ sơ bé tại /parent/settings hoặc một route tương tự
    // Ở đây tôi điều hướng đến settings của phụ huynh nơi thường có chức năng quản lý trẻ
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
      {/* Top Bar */}
      <div className="top-bar">
        <button className="back-to-login-btn" onClick={handleBackToLogin}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Quay lại đăng nhập</span>
        </button>
      </div>

      <h1 className="select-user-title">Ai đang ở đây vậy?</h1>

      <div className="profiles-row">
        {/* Parent Card */}
        <div className="profile-card parent-card" onClick={handleSelectParent}>
          <div className="parent-icon-circle">
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4C10.34 4 9 5.34 9 7C9 8.66 10.34 10 12 10C13.66 10 15 8.66 15 7C15 5.34 13.66 4 12 4ZM12 12C9.33 12 4 13.34 4 16V18H20V16C20 13.34 14.67 12 12 12Z" />
              <path d="M17 10C17.55 10 18 9.55 18 9C18 8.45 17.55 8 17 8C16.45 8 16 8.45 16 9C16 9.55 16.45 10 17 10ZM17 11C15.67 11 13 11.67 13 13V15H21V13C21 11.67 18.33 11 17 11Z" />
            </svg>
          </div>
          <h3 className="card-title">Khu vực của Bố/Mẹ</h3>
          <p className="card-subtitle">Quản lý và theo dõi</p>
        </div>

        {/* Child Cards / Add Card */}
        {children.length > 0 ? (
          children.map((child) => (
            <div key={child.id} className="profile-card child-card-active" onClick={() => handleSelectChild(child)}>
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
            <p className="card-subtitle">Bắt đầu hành trình học tập</p>
          </div>
        )}
      </div>

      {loading && <p style={{ marginTop: '20px', color: '#718096' }}>Đang tải danh sách...</p>}
      {error && <p className="error-message" style={{ marginTop: '20px' }}>{error}</p>}
    </div>
  )
}
