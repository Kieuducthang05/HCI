import { useEffect, useMemo, useState } from 'react'
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

  const users = useMemo(() => [
    {
      id: 'parent',
      type: 'parent',
      name: 'Khu vực của Bố/Mẹ',
      description: 'Quản lý và theo dõi tiến trình của con',
      avatar: '👨‍👩‍👧',
    },
    ...children.map((child) => ({
      id: child.id,
      type: 'child',
      name: child.nickname || 'Bé',
      description: 'Chào mừng con quay lại!',
      avatar: child.avatar_url ? null : '🧒',
      avatarUrl: child.avatar_url,
      child,
    })),
  ], [children])

  const handleSelectUser = (user) => {
    if (user.type === 'parent') {
      setSelectedChild(children[0] || null)
      navigate('/parent/home')
      return
    }

    setSelectedChild(user.child)
    navigate('/child/home')
  }

  const handleLogout = async () => {
    try {
      await authApi.signOut()
    } catch {
      // Local logout is still valid if the server is already unavailable.
    } finally {
      clearSession()
      navigate('/login')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-form-wrapper">
        <div className="auth-form select-user-form">
          <div className="auth-header">
            <h1>Ai đang ở đây vậy?</h1>
            {loading && <p>Đang tải danh sách tài khoản...</p>}
            {error && <p className="error-message">{error}</p>}
            {!loading && !error && children.length === 0 && (
              <p>Chưa có tài khoản trẻ. Vào khu vực bố mẹ để tạo tài khoản cho bé.</p>
            )}
          </div>

          <div className="select-user-grid">
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                className={`user-card ${user.type === 'parent' ? 'parent-card' : 'child-card'}`}
                onClick={() => handleSelectUser(user)}
                disabled={loading}
              >
                <div className="user-icon">
                  {user.avatarUrl ? (
                    <img className="avatar-circle" src={user.avatarUrl} alt={user.name} />
                  ) : (
                    <div className="avatar-circle">{user.avatar}</div>
                  )}
                </div>
                <h3>{user.name}</h3>
                <p>{user.description}</p>
              </button>
            ))}
          </div>

          <div className="auth-footer">
            <button type="button" className="logout-btn" onClick={handleLogout}>
              Đăng nhập tài khoản khác
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
