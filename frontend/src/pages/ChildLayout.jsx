import { useEffect, useState } from 'react'
import { useNavigate, Outlet, useLocation } from 'react-router-dom'
import { childrenApi, getSelectedChild, setSelectedChild } from '../services/api'
import '../styles/Child.css'

export default function ChildLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const selectedChild = getSelectedChild()
  const [userStars, setUserStars] = useState(selectedChild?.total_stars || 0)
  const activeMenu = location.pathname.split('/')[2] || 'home'
  const isPlainChildPage = ['questions', 'games'].includes(activeMenu)

  useEffect(() => {
    const child = getSelectedChild()
    if (!child?.id) return

    childrenApi.detail(child.id)
      .then((result) => {
        if (!result.child) return
        setSelectedChild(result.child)
        setUserStars(result.child.total_stars || 0)
      })
      .catch(() => {
        setUserStars(child.total_stars || 0)
      })
  }, [])

  const menuItems = [
    { id: 'home', label: 'Trang chủ', icon: '🏠' },
    { id: 'inventory', label: 'Vật phẩm', icon: '💎' }
  ]

  const handleMenuClick = (menuId) => {
    // Sửa ở đây: Đã thêm lệnh navigate tự động theo ID của mọi nút
    navigate(`/child/${menuId}`)
  }

  const handleLogout = () => {
    navigate('/select-user')
  }

  return (
    <div className={`child-container${isPlainChildPage ? ' child-container-plain' : ''}`}>
      {/* Top Bar with Stars */}
      <div className="child-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Quay lại</span>
          </button>
        </div>
        <nav className="child-top-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => handleMenuClick(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          <div className="star-display">
            <span className="star-icon">⭐</span>
            <span className="star-count">{userStars}</span>
          </div>
          <button className="logout-btn-child" onClick={handleLogout}>🚪</button>
        </div>
      </div>

      {/* Main Content */}
      <main className="child-main-content">
        {/* Truyền điểm số xuống cho các trang con sử dụng */}
        <Outlet context={{ userStars, setUserStars }} />
      </main>

    </div>
  )
}
