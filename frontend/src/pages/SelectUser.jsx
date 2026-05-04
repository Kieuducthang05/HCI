import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Auth.css'

export default function SelectUser() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  // Mock data - sau này sẽ lấy từ API
  const users = [
    {
      id: 'parent-1',
      type: 'parent',
      name: 'Khu vực của Bố/Mẹ',
      description: 'Quản lý và theo dõi',
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="7" r="2" fill="currentColor"/>
          <path d="M7 9h4a1 1 0 0 1 1 1v3H6v-3a1 1 0 0 1 1-1z" fill="currentColor"/>
          <circle cx="17" cy="7" r="2" fill="currentColor"/>
          <path d="M15 9h4a1 1 0 0 1 1 1v3h-5v-3a1 1 0 0 1 1-1z" fill="currentColor"/>
          <path d="M4 19c0-1.5 1.5-3 3-3h1.5c.276 0 .5.224.5.5v3.5H4z" fill="currentColor"/>
          <path d="M16 19c0-1.5 1.5-3 3-3h1.5c.276 0 .5.224.5.5v3.5H16z" fill="currentColor"/>
          <path d="M8 13h8v2H8z" fill="currentColor"/>
        </svg>
      )
    },
    {
      id: 'child-1',
      type: 'child',
      name: 'Bin',
      description: 'Chào mừng con quay lại!',
      avatar: '👦',
      bgColor: '#d4d4d4' // màu nền xám của card trẻ em
    }
  ]

  const handleSelectUser = (userId, userType) => {
    setLoading(true)
    // TODO: Lưu user selection vào context/localStorage
    console.log(`Đã chọn: ${userId} (${userType})`)
    
    // Simulate API call
    setTimeout(() => {
      // Navigate to home page or dashboard based on user type
      if (userType === 'parent') {
        navigate('/parent/home')
      } else {
        navigate('/child/home')
      }
      setLoading(false)
    }, 500)
  }

  return (
    <div className="auth-container">
      <div className="auth-form-wrapper">
        <div className="auth-form select-user-form">
          <div className="auth-header">
            <h1>Ai đang ở đây vậy?</h1>
          </div>

          <div className="select-user-grid">
            {users.map(user => (
              <button
                key={user.id}
                type="button"
                className={`user-card ${user.type === 'parent' ? 'parent-card' : 'child-card'}`}
                style={user.bgColor ? { backgroundColor: user.bgColor } : {}}
                onClick={() => handleSelectUser(user.id, user.type)}
                disabled={loading}
              >
                <div className="user-icon">
                  {user.type === 'parent' ? (
                    <div className="icon-circle">
                      {user.icon}
                    </div>
                  ) : (
                    <div className="avatar-circle">
                      {user.avatar}
                    </div>
                  )}
                </div>
                <h3>{user.name}</h3>
                <p>{user.description}</p>
              </button>
            ))}
          </div>

          <div className="auth-footer">
            <button 
              type="button"
              className="logout-btn"
              onClick={() => navigate('/login')}
            >
              Đăng nhập tài khoản khác
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
