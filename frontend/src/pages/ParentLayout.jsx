import { useMemo } from 'react'
import { useNavigate, Outlet, useLocation } from 'react-router-dom'
import '../styles/ParentDashboard.css'

export default function ParentLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeMenu = useMemo(() => {
    const path = location.pathname.replace('/parent/', '')
    return path === '' || path === '/' ? 'home' : path
  }, [location.pathname])

  const menuItems = [
    { id: 'home', label: 'Trang chủ', icon: '🏠' },
    { id: 'emotion-diary', label: 'Nhật kỳ cảm xúc', icon: '📔' },
    { id: 'settings', label: 'Cài đặt', icon: '⚙️' },
    { id: 'shop', label: 'Cửa hàng sao', icon: '🛍️' }
  ]

  const handleMenuClick = (menuId) => {
    navigate(`/parent/${menuId}`)
  }

  const handleLogout = () => {
    // TODO: Xoá session
    navigate('/select-user')
  }

  return (
    <div className="parent-dashboard-container">
      {/* Sidebar */}
      <aside className="parent-sidebar">
        <div className="sidebar-header">
          <h2>Trang quản lý các bé</h2>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`menu-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => handleMenuClick(item.id)}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span>🚪</span> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="parent-main-content">
        <Outlet />
      </main>
    </div>
  )
}
