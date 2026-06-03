import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Outlet, useLocation } from 'react-router-dom'
import { FiBookOpen, FiGrid, FiLogOut, FiSettings, FiShoppingBag } from 'react-icons/fi'
import { authApi, clearSession, devicesApi } from '../services/api'
import { requestNotificationPermissionAndGetToken, onForegroundMessage } from '../utils/firebase'
import ToastNotification from '../components/ToastNotification'
import '../styles/ParentDashboard.css'

export default function ParentLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let active = true

    const registerPush = async () => {
      if (localStorage.getItem('hci.deviceId')) return

      const token = await requestNotificationPermissionAndGetToken()
      if (!token || !active) return

      try {
        const response = await devicesApi.register({
          platform: 'WEB',
          push_token: token,
        })
        if (active && response?.id) {
          localStorage.setItem('hci.deviceId', response.id)
          console.log('Push device registered successfully with ID:', response.id)
        }
      } catch (error) {
        console.error('Failed to register device with backend:', error)
      }
    }

    registerPush()

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('Foreground push notification received:', payload)
      if (active) {
        const title = payload.notification?.title || 'Cảnh báo mới'
        const body = payload.notification?.body || 'Bé của bạn vừa kích hoạt một cảnh báo mới.'

        // Show in-app UI toast
        setToast({
          title,
          message: body,
          type: 'error',
        })

        // Trigger native system notification
        if (Notification.permission === 'granted') {
          try {
            new Notification(title, {
              body,
              icon: '/logo192.png',
            })
          } catch (err) {
            console.error('Failed to trigger native system notification in foreground:', err)
          }
        }
      }
    })

    return () => {
      active = false
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  const activeMenu = useMemo(() => {
    const path = location.pathname.replace('/parent/', '')
    return path === '' || path === '/' ? 'home' : path
  }, [location.pathname])

  const menuItems = [
    { id: 'home', label: 'Trang chủ', icon: <FiGrid aria-hidden="true" /> },
    { id: 'emotion-diary', label: 'Nhật ký cảm xúc', icon: <FiBookOpen aria-hidden="true" /> },
    { id: 'settings', label: 'Cài đặt', icon: <FiSettings aria-hidden="true" /> },
    { id: 'shop', label: 'Cửa hàng sao', icon: <FiShoppingBag aria-hidden="true" /> }
  ]

  const handleMenuClick = (menuId) => {
    navigate(`/parent/${menuId}`)
  }

  const handleLogout = async () => {
    const deviceId = localStorage.getItem('hci.deviceId')
    if (deviceId) {
      try {
        await devicesApi.deregister(deviceId)
      } catch (err) {
        console.error('Failed to deregister push device:', err)
      }
      localStorage.removeItem('hci.deviceId')
    }

    try {
      await authApi.signOut()
    } catch (err) {
      console.error('Failed to sign out:', err)
    } finally {
      clearSession()
      navigate('/select-user')
    }
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
            <FiLogOut aria-hidden="true" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="parent-main-content">
        <Outlet />
      </main>

      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
