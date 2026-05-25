import { useEffect, useState } from 'react'
import ToastNotification from '../components/ToastNotification'
import '../styles/ParentSettings.css'

export default function ParentSettings() {
  const [parentInfo, setParentInfo] = useState({
    name: 'Nguyễn Anh Duy',
    email: 'nguyenanhduy@gmail.com',
    dateOfBirth: '06/07/1967'
  })

  const [editingInfo, setEditingInfo] = useState(false)
  const [formData, setFormData] = useState(parentInfo)
  const [toast, setToast] = useState(null)

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [children, setChildren] = useState([
    { id: 1, name: 'Bé Bin', avatar: '👦', usageHours: 67, starCount: 1250, emotion: 'Vui vẻ' },
    { id: 2, name: 'Bé An', avatar: '👧', usageHours: 3, starCount: 240, emotion: 'Bình tĩnh' },
    { id: 3, name: 'Bé Bông', avatar: '👦', usageHours: 12, starCount: 320, emotion: 'Buồn' }
  ])
  const [newChildName, setNewChildName] = useState('')

  const [regulationConfig, setRegulationConfig] = useState({
    method: 'breathing',
    contact: 'Mẹ',
    alertAfter: '60',
    quietMode: true
  })

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
    if (!passwordData.oldPassword || !passwordData.newPassword) {
      setToast({
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập đủ mật khẩu cũ và mật khẩu mới.'
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setToast({
        type: 'error',
        title: 'Không thể cập nhật',
        message: 'Mật khẩu mới và phần nhập lại chưa trùng khớp.'
      })
      return
    }

    setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' })
    setToast({
      type: 'success',
      title: 'Cập nhật thành công',
      message: 'Mật khẩu mới đã được lưu.'
    })
  }

  const handleRegulationChange = (e) => {
    const { name, value, type, checked } = e.target
    setRegulationConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSaveRegulation = () => {
    setToast({
      type: 'success',
      title: 'Đã lưu thiết lập',
      message: 'Cấu hình điều hoà cảm xúc của trẻ đã được cập nhật.'
    })
  }

  const handleAddChild = () => {
    const trimmedName = newChildName.trim()
    if (!trimmedName) {
      setToast({
        type: 'error',
        title: 'Thiếu tên của bé',
        message: 'Vui lòng nhập tên trước khi tạo tài khoản trẻ.'
      })
      return
    }

    const nextId = Math.max(...children.map(child => child.id), 0) + 1
    setChildren(prev => [
      ...prev,
      {
        id: nextId,
        name: trimmedName,
        avatar: nextId % 2 === 0 ? '👧' : '👦',
        usageHours: 0,
        starCount: 0,
        emotion: 'Chưa có dữ liệu'
      }
    ])
    setNewChildName('')
    setToast({
      type: 'success',
      title: 'Đã tạo tài khoản',
      message: `${trimmedName} đã được thêm vào danh sách theo dõi.`
    })
  }

  const handleDeleteChild = (childId) => {
    setChildren(prev => prev.filter(child => child.id !== childId))
    setToast({
      type: 'success',
      title: 'Đã xoá tài khoản',
      message: 'Tài khoản trẻ đã được xoá khỏi danh sách.'
    })
  }

  return (
    <div className="settings-container">
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

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
                <button className="btn btn-secondary" onClick={() => setEditingInfo(false)}>Hủy</button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => setEditingInfo(true)}>Cập nhật</button>
            )}
          </div>
        </div>
      </section>

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
            <button className="btn btn-primary" onClick={handleUpdatePassword}>Cập nhật</button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="section-header">
          <h2 className="section-title">Thiết lập điều hoà cảm xúc</h2>
        </div>

        <div className="regulation-settings-grid">
          <div className="info-field">
            <label>Phương thức mặc định</label>
            <select
              name="method"
              value={regulationConfig.method}
              onChange={handleRegulationChange}
              className="text-input"
            >
              <option value="breathing">Hít thở theo nhịp</option>
              <option value="quiet">Góc yên tĩnh</option>
              <option value="music">Âm thanh nhẹ</option>
              <option value="parent">Gọi phụ huynh</option>
            </select>
          </div>

          <div className="info-field">
            <label>Người hỗ trợ</label>
            <input
              type="text"
              name="contact"
              value={regulationConfig.contact}
              onChange={handleRegulationChange}
              className="text-input"
            />
          </div>

          <div className="info-field">
            <label>Cảnh báo sau</label>
            <select
              name="alertAfter"
              value={regulationConfig.alertAfter}
              onChange={handleRegulationChange}
              className="text-input"
            >
              <option value="30">30 giây tiêu cực kéo dài</option>
              <option value="60">1 phút tiêu cực kéo dài</option>
              <option value="120">2 phút tiêu cực kéo dài</option>
            </select>
          </div>

          <label className="quiet-mode-toggle">
            <input
              type="checkbox"
              name="quietMode"
              checked={regulationConfig.quietMode}
              onChange={handleRegulationChange}
            />
            <span>Ưu tiên giao diện yên tĩnh khi trẻ mất bình tĩnh</span>
          </label>
        </div>

        <div className="action-button settings-action-row">
          <button className="btn btn-primary" onClick={handleSaveRegulation}>✓ Lưu thiết lập</button>
        </div>
      </section>

      <section className="settings-section">
        <div className="section-header">
          <h2 className="section-title">Tài khoản của các bé</h2>
          <div className="new-child-form">
            <input
              type="text"
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              placeholder="Tên của bé"
              className="text-input"
            />
            <button className="btn btn-primary" onClick={handleAddChild}>👶 Tạo mới</button>
          </div>
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

              <button
                className="delete-child-btn"
                onClick={() => handleDeleteChild(child.id)}
                aria-label={`Xoá ${child.name}`}
              >
                Xoá
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
