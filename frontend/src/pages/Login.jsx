import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Auth.css'

export default function Login() {
  const navigate = useNavigate()
  const [inputType, setInputType] = useState('email') // 'email' hoặc 'phone'
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: ''
  })
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.emailOrPhone) {
      newErrors.emailOrPhone = inputType === 'email' 
        ? 'Vui lòng nhập email' 
        : 'Vui lòng nhập số điện thoại'
    } else if (inputType === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailOrPhone)) {
        newErrors.emailOrPhone = 'Email không hợp lệ'
      }
    } else {
      if (!/^[0-9]{10}$/.test(formData.emailOrPhone.replace(/\D/g, ''))) {
        newErrors.emailOrPhone = 'Số điện thoại không hợp lệ (10 số)'
      }
    }
    
    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự'
    }
    
    return newErrors
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = validateForm()
    
    if (Object.keys(newErrors).length === 0) {
      // Đăng nhập thành công
      console.log('Đăng nhập:', formData, 'Loại:', inputType)
      // TODO: Gọi API đăng nhập
      navigate('/select-user')
    } else {
      setErrors(newErrors)
    }
  }

  const handleGoogleLogin = () => {
    // TODO: Xử lý đăng nhập Google
    console.log('Đăng nhập Google')
  }

  return (
    <div className="auth-container">
      <div className="auth-form-wrapper">
        <div className="auth-form">
          <div className="auth-header">
            <h1>Chào mừng bố mẹ</h1>
            <p>Chào mừng bạn tới nơi để bạn không phải lo lắng</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Toggle Email/Phone */}
            <div className="input-type-toggle">
              <button
                type="button"
                className={`toggle-btn ${inputType === 'email' ? 'active' : ''}`}
                onClick={() => {
                  setInputType('email')
                  setFormData(prev => ({ ...prev, emailOrPhone: '' }))
                  setErrors({})
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Email
              </button>
              <button
                type="button"
                className={`toggle-btn ${inputType === 'phone' ? 'active' : ''}`}
                onClick={() => {
                  setInputType('phone')
                  setFormData(prev => ({ ...prev, emailOrPhone: '' }))
                  setErrors({})
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Số điện thoại
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="emailOrPhone">
                {inputType === 'email' ? 'Email' : 'Số điện thoại'}
              </label>
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
              <div className="password-input-wrapper">
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Nhập mật khẩu"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? 'input-error' : ''}
                />
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
              <a href="/forgot-password" className="forgot-password">
                Quên mật khẩu?
              </a>
            </div>

            <button type="submit" className="btn-primary">
              Đăng nhập
            </button>
          </form>

          <div className="divider">
            <span>Hoặc</span>
          </div>

          <button 
            type="button" 
            className="btn-google"
            onClick={handleGoogleLogin}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Đăng nhập với Google
          </button>

          <p className="auth-footer">
            Chưa có tài khoản? <a href="/register" className="link-register">Đăng kí ngay</a>
          </p>
        </div>
      </div>
    </div>
  )
}
