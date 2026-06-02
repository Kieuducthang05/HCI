import { useEffect, useState } from 'react'
import ToastNotification from '../components/ToastNotification'
import {
  authApi,
  childrenApi,
  preferencesApi,
  getSelectedChild,
  getSession,
  setSession,
  setSelectedChild,
} from '../services/api'
import '../styles/ParentSettings.css'

const defaultParentInfo = {
  name: '',
  email: '',
  phone: '',
}

function formatChild(child) {
  return {
    ...child,
    name: child.nickname || 'Bé',
    avatar: child.avatar_url || '🧒',
    usageHours: 0,
    starCount: child.total_stars || 0,
    emotion: 'Theo dõi từ nhật ký',
  }
}

export default function ParentSettings() {
  const [parentInfo, setParentInfo] = useState(defaultParentInfo)
  const [editingInfo, setEditingInfo] = useState(false)
  const [formData, setFormData] = useState(defaultParentInfo)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [children, setChildren] = useState([])
  const [newChildName, setNewChildName] = useState('')
  const [newChildBirthYear, setNewChildBirthYear] = useState(new Date().getFullYear() - 7)
  const [newChildAvatar, setNewChildAvatar] = useState(null)
  const [newChildAvatarPreview, setNewChildAvatarPreview] = useState('')
  const [avatarUploadingId, setAvatarUploadingId] = useState('')

  const [regulationConfig, setRegulationConfig] = useState({
    method: 'breathing',
    contact: 'Mẹ',
    alertAfter: '60',
    quietMode: true,
  })

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!newChildAvatarPreview) return undefined
    return () => URL.revokeObjectURL(newChildAvatarPreview)
  }, [newChildAvatarPreview])

  useEffect(() => {
    let mounted = true

    Promise.all([authApi.getMe(), childrenApi.list()])
      .then(([me, childResult]) => {
        if (!mounted) return

        const info = {
          name: me.user?.full_name || '',
          email: me.user?.email || '',
          phone: me.user?.phone_number || '',
        }
        const childList = (childResult.children || []).map(formatChild)

        setParentInfo(info)
        setFormData(info)
        setChildren(childList)
        setSelectedChild(childList[0] || null)

        const preferences = childList[0]?.preferences?.preferences
        if (preferences?.regulation) {
          setRegulationConfig((prev) => ({ ...prev, ...preferences.regulation }))
        }
      })
      .catch((err) => {
        if (mounted) {
          setToast({
            type: 'error',
            title: 'Không tải được dữ liệu',
            message: err.message || 'Vui lòng kiểm tra backend và đăng nhập lại.',
          })
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  const handleSaveInfo = async () => {
    try {
      setLoading(true)
      const result = await authApi.updateMe({
        full_name: formData.name,
        email: formData.email,
        phone_number: formData.phone || null,
      })
      const nextInfo = {
        name: result.user?.full_name || '',
        email: result.user?.email || '',
        phone: result.user?.phone_number || '',
      }

      setParentInfo(nextInfo)
      setFormData(nextInfo)
      setSession({ ...(getSession() || {}), user: result.user })
      setEditingInfo(false)
      setToast({
        type: 'success',
        title: 'Cập nhật thành công',
        message: 'Thông tin cá nhân đã được lưu.',
      })
    } catch (err) {
      setToast({
        type: 'error',
        title: 'Không thể cập nhật',
        message: err.message || 'Vui lòng thử lại.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({ ...prev, [name]: value }))
  }

  const handleUpdatePassword = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword) {
      setToast({
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập đủ mật khẩu cũ và mật khẩu mới.',
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setToast({
        type: 'error',
        title: 'Không thể cập nhật',
        message: 'Mật khẩu mới và phần nhập lại chưa trùng khớp.',
      })
      return
    }

    try {
      await authApi.changePassword({
        current_password: passwordData.oldPassword,
        new_password: passwordData.newPassword,
      })
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' })
      setToast({
        type: 'success',
        title: 'Cập nhật thành công',
        message: 'Mật khẩu mới đã được lưu.',
      })
    } catch (err) {
      setToast({
        type: 'error',
        title: 'Không thể cập nhật',
        message: err.message || 'Vui lòng kiểm tra lại mật khẩu.',
      })
    }
  }

  const handleRegulationChange = (e) => {
    const { name, value, type, checked } = e.target
    setRegulationConfig((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSaveRegulation = async () => {
    const child = children[0]
    if (!child?.id) {
      setToast({
        type: 'error',
        title: 'Chưa có tài khoản trẻ',
        message: 'Hãy tạo tài khoản trẻ trước khi lưu thiết lập.',
      })
      return
    }

    try {
      await preferencesApi.update(child.id, {
        is_high_contrast: false,
        preferences: {
          regulation: regulationConfig,
        },
      })
      setToast({
        type: 'success',
        title: 'Đã lưu thiết lập',
        message: 'Cấu hình điều hoà cảm xúc của trẻ đã được cập nhật.',
      })
    } catch (err) {
      setToast({
        type: 'error',
        title: 'Không thể lưu',
        message: err.message || 'Vui lòng thử lại.',
      })
    }
  }

  const validateAvatarFile = (file) => {
    if (!file) return false

    if (!file.type.startsWith('image/')) {
      setToast({
        type: 'error',
        title: 'Ảnh đại diện chưa hợp lệ',
        message: 'Vui lòng chọn file ảnh cho avatar của bé.',
      })
      return false
    }

    if (file.size > 5 * 1024 * 1024) {
      setToast({
        type: 'error',
        title: 'Ảnh quá lớn',
        message: 'Avatar cần nhỏ hơn hoặc bằng 5MB.',
      })
      return false
    }

    return true
  }

  const handleNewChildAvatarChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!validateAvatarFile(file)) {
      event.target.value = ''
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setNewChildAvatar(file)
    setNewChildAvatarPreview(previewUrl)
  }

  const clearNewChildAvatar = () => {
    setNewChildAvatar(null)
    setNewChildAvatarPreview('')
  }

  const handleUpdateChildAvatar = async (child, event) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return

    if (!validateAvatarFile(file)) {
      input.value = ''
      return
    }

    try {
      setAvatarUploadingId(child.id)
      const result = await childrenApi.update(child.id, { avatar: file })
      const updatedChild = formatChild(result.child)
      setChildren((prev) => prev.map((item) => (item.id === child.id ? updatedChild : item)))

      const selectedChild = getSelectedChild()
      if (selectedChild?.id === child.id) {
        setSelectedChild(updatedChild)
      }

      setToast({
        type: 'success',
        title: 'Đã cập nhật avatar',
        message: `Ảnh đại diện của ${child.name} đã được lưu.`,
      })
    } catch (err) {
      setToast({
        type: 'error',
        title: 'Không thể cập nhật avatar',
        message: err.message || 'Vui lòng thử lại.',
      })
    } finally {
      setAvatarUploadingId('')
      input.value = ''
    }
  }

  const handleAddChild = async () => {
    const trimmedName = newChildName.trim()
    const birthYear = Number(newChildBirthYear)

    if (!trimmedName) {
      setToast({
        type: 'error',
        title: 'Thiếu tên của bé',
        message: 'Vui lòng nhập tên trước khi tạo tài khoản trẻ.',
      })
      return
    }

    if (!birthYear || birthYear < 2000 || birthYear > new Date().getFullYear()) {
      setToast({
        type: 'error',
        title: 'Năm sinh chưa hợp lệ',
        message: 'Vui lòng nhập năm sinh hợp lệ cho bé.',
      })
      return
    }

    try {
      const result = await childrenApi.create({
        nickname: trimmedName,
        birthYear,
        avatar: newChildAvatar || undefined,
        webcamConsent: true,
      })
      const child = formatChild(result.child)
      setChildren((prev) => [...prev, child])
      setSelectedChild(child)
      setNewChildName('')
      clearNewChildAvatar()
      setToast({
        type: 'success',
        title: 'Đã tạo tài khoản',
        message: `${trimmedName} đã được thêm vào danh sách theo dõi.`,
      })
    } catch (err) {
      setToast({
        type: 'error',
        title: 'Không thể tạo tài khoản',
        message: err.message || 'Vui lòng thử lại.',
      })
    }
  }

  const handleDeleteChild = async (childId) => {
    try {
      await childrenApi.remove(childId)
      setChildren((prev) => {
        const nextChildren = prev.filter((child) => child.id !== childId)
        setSelectedChild(nextChildren[0] || null)
        return nextChildren
      })
      setToast({
        type: 'success',
        title: 'Đã xoá tài khoản',
        message: 'Tài khoản trẻ đã được xoá khỏi danh sách.',
      })
    } catch (err) {
      setToast({
        type: 'error',
        title: 'Không thể xoá',
        message: err.message || 'Vui lòng thử lại.',
      })
    }
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
              <label>Số điện thoại</label>
              <input
                type="tel"
                name="phone"
                value={editingInfo ? formData.phone : parentInfo.phone}
                onChange={handleInputChange}
                disabled={!editingInfo}
                className="text-input"
              />
            </div>
          </div>

          <div className="action-button">
            {editingInfo ? (
              <>
                <button className="btn btn-primary" onClick={handleSaveInfo} disabled={loading}>✓ Lưu</button>
                <button className="btn btn-secondary" onClick={() => setEditingInfo(false)} disabled={loading}>Hủy</button>
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
              <input type="password" name="oldPassword" value={passwordData.oldPassword} onChange={handlePasswordChange} className="text-input" />
            </div>
            <div className="info-field">
              <label>Mật khẩu mới</label>
              <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} className="text-input" />
            </div>
            <div className="info-field">
              <label>Nhập lại mật khẩu mới</label>
              <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} className="text-input" />
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
            <select name="method" value={regulationConfig.method} onChange={handleRegulationChange} className="text-input">
              <option value="breathing">Hít thở theo nhịp</option>
              <option value="quiet">Góc yên tĩnh</option>
              <option value="music">Âm thanh nhẹ</option>
              <option value="parent">Gọi phụ huynh</option>
            </select>
          </div>

          <div className="info-field">
            <label>Người hỗ trợ</label>
            <input type="text" name="contact" value={regulationConfig.contact} onChange={handleRegulationChange} className="text-input" />
          </div>

          <div className="info-field">
            <label>Cảnh báo sau</label>
            <select name="alertAfter" value={regulationConfig.alertAfter} onChange={handleRegulationChange} className="text-input">
              <option value="60">1 phút tiêu cực kéo dài</option>
              <option value="120">2 phút tiêu cực kéo dài</option>
            </select>
          </div>

          <label className="quiet-mode-toggle">
            <input type="checkbox" name="quietMode" checked={regulationConfig.quietMode} onChange={handleRegulationChange} />
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
            <label className="child-avatar-picker" aria-label="Chọn ảnh đại diện cho bé">
              {newChildAvatarPreview ? (
                <img src={newChildAvatarPreview} alt="Ảnh đại diện mới" />
              ) : (
                <span>🧒</span>
              )}
              <input type="file" accept="image/*" onChange={handleNewChildAvatarChange} />
            </label>
            <input
              type="text"
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              placeholder="Tên của bé"
              className="text-input"
            />
            <input
              type="number"
              value={newChildBirthYear}
              onChange={(e) => setNewChildBirthYear(e.target.value)}
              placeholder="Năm sinh"
              className="text-input"
              min="2000"
              max={new Date().getFullYear()}
            />
            <button className="btn btn-primary" onClick={handleAddChild}>👶 Tạo mới</button>
            {newChildAvatar && (
              <button type="button" className="btn btn-secondary" onClick={clearNewChildAvatar}>
                Bỏ ảnh
              </button>
            )}
          </div>
        </div>

        <div className="children-accounts-list">
          {children.map((child) => (
            <div key={child.id} className="child-account-item">
              <div className="child-avatar-area">
                {child.avatar_url ? (
                  <img className="child-avatar child-avatar-image" src={child.avatar_url} alt={child.name} />
                ) : (
                  <div className="child-avatar">{child.avatar}</div>
                )}
                <div className="child-identity">
                  <span className="child-name">{child.name}</span>
                  <label className={`child-avatar-upload ${avatarUploadingId === child.id ? 'disabled' : ''}`}>
                    {avatarUploadingId === child.id ? 'Đang tải...' : 'Đổi ảnh'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={avatarUploadingId === child.id}
                      onChange={(event) => handleUpdateChildAvatar(child, event)}
                    />
                  </label>
                </div>
              </div>

              <div className="child-stats">
                <div className="stat-item">
                  <span className="stat-label">Năm sinh</span>
                  <span className="stat-value">{child.birth_year}</span>
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

              <button className="delete-child-btn" onClick={() => handleDeleteChild(child.id)} aria-label={`Xoá ${child.name}`}>
                Xoá
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
