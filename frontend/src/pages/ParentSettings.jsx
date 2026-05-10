import { useEffect, useState } from 'react'
import ToastNotification from '../components/ToastNotification'
import '../styles/ParentSettings.css'

export default function ParentSettings() {
  const [parentInfo, setParentInfo] = useState({
    name: 'Nguyễn Anh Duy',
    email: 'nguyenanhduy@gmail.com',
    dateOfBirth: '6/7/1967'
  })

  const [editingInfo, setEditingInfo] = useState(false)
  const [formData, setFormData] = useState(parentInfo)
  const [toast, setToast] = useState(null)

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [children] = useState([
    { id: 1, name: 'Bé Bìn', avatar: '👦', usageHours: 67, starCount: 1250, emotion: 'Vui vẻ' },
    { id: 2, name: 'Bé A', avatar: '👧', usageHours: 3, starCount: 9999999, emotion: 'Vui vẻ' },
    { id: 3, name: 'Bé B', avatar: '👦', usageHours: 1250, starCount: 3, emotion: 'Buồn' }
  ])

  useEffect(() => {
    if (!toast) return undefined

    const timer = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  const handleSaveInfo = () => {
    setParentInfo(formData)
    setEditingInfo(false)
    setToast({
      type: 'success',
      title: 'Cập nhật thành công',
      message: 'Thông tin cá nhân đã được lưu.'
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  const handleUpdatePassword = () => {
    if (passwordData.newPassword === passwordData.confirmPassword) {
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' })
      setToast({
        type: 'success',
        title: 'Cập nhật thành công',
        message: 'Mật khẩu mới đã được lưu.'
      })
    } else {
      setToast({
        type: 'error',
        title: 'Không thể cập nhật',
        message: 'Mật khẩu mới và phần nhập lại chưa trùng khớp.'
      })
    }
  }

  return (
    <div className="settings-container">
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      {/* Personal Info Section */}
      <section className="settings-section">
        <div className="section-header">
          <h2 className="section-title">Thông tin cá nhân</h2>
        </div>

        <div className="settings-content">
          <div className="info-fields">
            <div className="info-field">
              <label>Họ và tên</label>
              <input
                type="text"
                name="name"
                value={editingInfo ? formData.name : parentInfo.name}
                onChange={handleInputChange}
                disabled={!editingInfo}
                className="text-input"
              />
            </div>

            <div className="info-field">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={editingInfo ? formData.email : parentInfo.email}
                onChange={handleInputChange}
                disabled={!editingInfo}
                className="text-input"
              />
            </div>

            <div className="info-field">
              <label>Ngày sinh</label>
              <input
                type="text"
                name="dateOfBirth"
                value={editingInfo ? formData.dateOfBirth : parentInfo.dateOfBirth}
                onChange={handleInputChange}
                disabled={!editingInfo}
                className="text-input"
              />
            </div>
          </div>

          <div className="action-button">
            {editingInfo ? (
              <>
                <button className="btn btn-primary" onClick={handleSaveInfo}>✓ Lưu</button>
                <button className="btn btn-secondary" onClick={() => setEditingInfo(false)}>✕ Hủy</button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => setEditingInfo(true)}>🖊️ Cập nhật</button>
            )}
          </div>
        </div>
      </section>

      {/* Change Password Section */}
      <section className="settings-section">
        <div className="section-header">
          <h2 className="section-title">Đổi mật khẩu</h2>
        </div>

        <div className="settings-content">
          <div className="info-fields">
            <div className="info-field">
              <label>Mật khẩu cũ</label>
              <input
                type="password"
                name="oldPassword"
                value={passwordData.oldPassword}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                className="text-input"
              />
            </div>

            <div className="info-field">
              <label>Mật khẩu mới</label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                className="text-input"
              />
            </div>

            <div className="info-field">
              <label>Nhập lại mật khẩu mới</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                className="text-input"
              />
            </div>
          </div>

          <div className="action-button">
            <button className="btn btn-primary" onClick={handleUpdatePassword}>🖊️ Cập nhật</button>
          </div>
        </div>
      </section>

      {/* Children Accounts Section */}
      <section className="settings-section">
        <div className="section-header">
          <h2 className="section-title">Tài khoản của các bé</h2>
          <button className="btn btn-primary">👶 Tài khoản mới</button>
        </div>

        <div className="children-accounts-list">
          {children.map(child => (
            <div key={child.id} className="child-account-item">
              <div className="child-avatar-area">
                <div className="child-avatar">{child.avatar}</div>
                <span className="child-name">{child.name}</span>
              </div>

              <div className="child-stats">
                <div className="stat-item">
                  <span className="stat-label">Số giờ trong ứng dụng</span>
                  <span className="stat-value">{child.usageHours}</span>
                </div>

                <div className="stat-item">
                  <span className="stat-label">Tổng số sao</span>
                  <span className="stat-value">{child.starCount.toLocaleString()}</span>
                </div>

                <div className="stat-item">
                  <span className="stat-label">Cảm xúc</span>
                  <span className="stat-value">{child.emotion}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
