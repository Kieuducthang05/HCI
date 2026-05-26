import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, setSession } from '../services/api'
import '../styles/Auth.css'

export default function Login() {
  const navigate = useNavigate()
  const [inputType, setInputType] = useState('email')
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name] || errors.submit) {
      setErrors((prev) => ({ ...prev, [name]: '', submit: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.emailOrPhone) {
      newErrors.emailOrPhone = inputType === 'email'
        ? 'Vui lòng nhập email'
        : 'Vui lòng nhập số điện thoại'
    } else if (inputType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailOrPhone)) {
      newErrors.emailOrPhone = 'Email không hợp lệ'
    } else if (inputType === 'phone' && !/^[0-9]{10}$/.test(formData.emailOrPhone.replace(/\D/g, ''))) {
      newErrors.emailOrPhone = 'Số điện thoại không hợp lệ (10 số)'
    }

    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự'
    }

    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validateForm()

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      setLoading(true)
      const result = await authApi.signIn({
        identifier: formData.emailOrPhone.trim(),
        password: formData.password,
      })
      setSession(result)
      navigate('/select-user')
    } catch (error) {
      setErrors({ submit: error.message || 'Đăng nhập thất bại. Vui lòng thử lại.' })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    setErrors({ submit: 'Đăng nhập Google cần tích hợp Google Sign-In SDK để lấy id_token thật.' })
  }

  return (
    <div className="auth-container">
      <div className="auth-form-wrapper">
        <div className="auth-form">
          <div className="auth-header">
            <h1>Chào mừng bố mẹ</h1>
            <p>Đăng nhập để quản lý và đồng hành cùng con.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-type-toggle">
              <button
                type="button"
                className={`toggle-btn ${inputType === 'email' ? 'active' : ''}`}
                onClick={() => {
                  setInputType('email')
                  setFormData((prev) => ({ ...prev, emailOrPhone: '' }))
                  setErrors({})
                }}
              >
                Email
              </button>
              <button
                type="button"
                className={`toggle-btn ${inputType === 'phone' ? 'active' : ''}`}
                onClick={() => {
                  setInputType('phone')
                  setFormData((prev) => ({ ...prev, emailOrPhone: '' }))
                  setErrors({})
                }}
              >
                Số điện thoại
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="emailOrPhone">{inputType === 'email' ? 'Email' : 'Số điện thoại'}</label>
              <input
                type={inputType === 'email' ? 'email' : 'tel'}
                id="emailOrPhone"
                name="emailOrPhone"
                placeholder={inputType === 'email' ? 'Nhập email của bạn' : 'Nhập số điện thoại'}
                value={formData.emailOrPhone}
                onChange={handleChange}
                className={errors.emailOrPhone ? 'input-error' : ''}
              />
              {errors.emailOrPhone && <span className="error-message">{errors.emailOrPhone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Mật khẩu</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Nhập mật khẩu"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'input-error' : ''}
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
              <Link to="/forgot-password" className="forgot-password">Quên mật khẩu?</Link>
            </div>

            {errors.submit && <span className="error-message">{errors.submit}</span>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="divider">
            <span>Hoặc</span>
          </div>

          <button type="button" className="btn-google" onClick={handleGoogleLogin} disabled={loading}>
            Đăng nhập với Google
          </button>

          <p className="auth-footer">
            Chưa có tài khoản? <Link to="/register" className="link-register">Đăng kí ngay</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
