import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, setSession } from '../services/api'
import '../styles/Auth.css'

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [contactType, setContactType] = useState('email')
  const [formData, setFormData] = useState({
    fullName: '',
    emailOrPhone: '',
    password: '',
    confirmPassword: '',
  })
  const [otpData, setOtpData] = useState({
    otp: '',
    timer: 0,
    code: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (step !== 3 || otpData.timer <= 0) return undefined

    const timerId = setTimeout(() => {
      setOtpData((prev) => ({ ...prev, timer: Math.max(prev.timer - 1, 0) }))
    }, 1000)

    return () => clearTimeout(timerId)
  }, [otpData.timer, step])

  const createMockOtp = () => String(Math.floor(100000 + Math.random() * 900000))

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name] || errors.submit) {
      setErrors((prev) => ({ ...prev, [name]: '', submit: '' }))
    }
  }

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtpData((prev) => ({ ...prev, otp: value }))
    if (errors.otp || errors.submit) {
      setErrors((prev) => ({ ...prev, otp: '', submit: '' }))
    }
  }

  const validateStep1 = () => {
    const newErrors = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ tên'
    }

    if (!formData.emailOrPhone) {
      newErrors.emailOrPhone = contactType === 'email'
        ? 'Vui lòng nhập email'
        : 'Vui lòng nhập số điện thoại'
    } else if (contactType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailOrPhone)) {
      newErrors.emailOrPhone = 'Email không hợp lệ'
    } else if (contactType === 'phone' && !/^[0-9]{10}$/.test(formData.emailOrPhone.replace(/\D/g, ''))) {
      newErrors.emailOrPhone = 'Số điện thoại không hợp lệ (10 số)'
    }

    return newErrors
  }

  const validatePassword = () => {
    const newErrors = {}

    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Mật khẩu phải chứa chữ hoa, chữ thường và số'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu'
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Mật khẩu không khớp'
    }

    return newErrors
  }

  const validateOtp = () => {
    const newErrors = {}
    if (!otpData.otp) {
      newErrors.otp = 'Vui lòng nhập OTP'
    } else if (otpData.otp.length !== 6) {
      newErrors.otp = 'OTP phải có 6 số'
    } else if (otpData.otp !== otpData.code) {
      newErrors.otp = 'Mã OTP chưa đúng'
    }

    return newErrors
  }

  const handleNextStep = (e) => {
    e.preventDefault()
    const newErrors = validateStep1()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setStep(2)
    setErrors({})
  }

  const handleToStepOtp = (e) => {
    e.preventDefault()
    const newErrors = validatePassword()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setStep(3)
    setErrors({})
    setOtpData({ otp: '', timer: 60, code: createMockOtp() })
  }

  const handleSubmitOtp = async (e) => {
    e.preventDefault()
    const newErrors = validateOtp()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      setLoading(true)
      const phone = contactType === 'phone' ? formData.emailOrPhone.replace(/\D/g, '') : undefined
      const email = contactType === 'email'
        ? formData.emailOrPhone.trim()
        : `${phone}@phone.local`

      const result = await authApi.signUp({
        email,
        password: formData.password,
        phone_number: phone,
        full_name: formData.fullName.trim(),
      })
      setSession(result)
      navigate('/select-user')
    } catch (error) {
      setErrors({ submit: error.message || 'Đăng ký thất bại. Vui lòng thử lại.' })
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = () => {
    setOtpData({ otp: '', timer: 60, code: createMockOtp() })
    setErrors((prev) => ({ ...prev, otp: '' }))
  }

  const selectContactType = (type) => {
    setContactType(type)
    setFormData((prev) => ({ ...prev, emailOrPhone: '' }))
    setErrors({})
  }

  if (step === 1) {
    return (
      <div className="auth-container">
        <div className="auth-form-wrapper">
          <div className="auth-form">
            <div className="auth-header">
              <h1>Tạo tài khoản</h1>
              <p>Nhập thông tin cơ bản của phụ huynh.</p>
            </div>

            <div className="progress-indicator">
              <div className="progress-step"><span className="progress-number active">1</span><span>Thông tin</span></div>
              <div className="progress-line"></div>
              <div className="progress-step"><span className="progress-number">2</span><span>Mật khẩu</span></div>
              <div className="progress-line"></div>
              <div className="progress-step"><span className="progress-number">3</span><span>Xác thực</span></div>
            </div>

            <form onSubmit={handleNextStep}>
              <div className="form-group">
                <label htmlFor="fullName">Họ và tên</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  placeholder="Nhập họ và tên của bạn"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={errors.fullName ? 'input-error' : ''}
                />
                {errors.fullName && <span className="error-message">{errors.fullName}</span>}
              </div>

              <div className="contact-type-toggle">
                <button type="button" className={`toggle-btn ${contactType === 'email' ? 'active' : ''}`} onClick={() => selectContactType('email')}>
                  Email
                </button>
                <button type="button" className={`toggle-btn ${contactType === 'phone' ? 'active' : ''}`} onClick={() => selectContactType('phone')}>
                  Số điện thoại
                </button>
              </div>

              <div className="form-group">
                <label htmlFor="emailOrPhone">{contactType === 'email' ? 'Email' : 'Số điện thoại'}</label>
                <input
                  type={contactType === 'email' ? 'email' : 'tel'}
                  id="emailOrPhone"
                  name="emailOrPhone"
                  placeholder={contactType === 'email' ? 'Nhập email' : 'Nhập số điện thoại'}
                  value={formData.emailOrPhone}
                  onChange={handleChange}
                  className={errors.emailOrPhone ? 'input-error' : ''}
                />
                {errors.emailOrPhone && <span className="error-message">{errors.emailOrPhone}</span>}
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">Tiếp theo</button>
              </div>
            </form>

            <div className="auth-footer">
              Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="auth-container">
        <div className="auth-form-wrapper">
          <div className="auth-form">
            <div className="auth-header">
              <h1>Đặt mật khẩu</h1>
              <p>Tạo mật khẩu bảo mật cho tài khoản.</p>
            </div>

            <div className="progress-indicator">
              <div className="progress-step"><span className="progress-number">1</span><span>Thông tin</span></div>
              <div className="progress-line"></div>
              <div className="progress-step"><span className="progress-number active">2</span><span>Mật khẩu</span></div>
              <div className="progress-line"></div>
              <div className="progress-step"><span className="progress-number">3</span><span>Xác thực</span></div>
            </div>

            <form onSubmit={handleToStepOtp}>
              <div className="form-group">
                <label htmlFor="password">Mật khẩu</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Nhập mật khẩu tối thiểu 8 ký tự"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? 'input-error' : ''}
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
                <div className="password-requirements">
                  <p>Mật khẩu phải chứa:</p>
                  <ul>
                    <li className={formData.password.length >= 8 ? 'valid' : ''}>✓ Ít nhất 8 ký tự</li>
                    <li className={/[A-Z]/.test(formData.password) ? 'valid' : ''}>✓ Chữ hoa (A-Z)</li>
                    <li className={/[a-z]/.test(formData.password) ? 'valid' : ''}>✓ Chữ thường (a-z)</li>
                    <li className={/\d/.test(formData.password) ? 'valid' : ''}>✓ Số (0-9)</li>
                  </ul>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Xác nhận mật khẩu"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? 'input-error' : ''}
                />
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setStep(1)}>Quay lại</button>
                <button type="submit" className="btn-primary">Tiếp theo</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-form-wrapper">
        <div className="auth-form">
          <div className="auth-header">
            <h1>Xác thực tài khoản</h1>
            <p>Nhập mã OTP được gửi đến {contactType === 'email' ? 'email' : 'số điện thoại'} của bạn.</p>
          </div>

          <div className="progress-indicator">
            <div className="progress-step"><span className="progress-number">1</span><span>Thông tin</span></div>
            <div className="progress-line"></div>
            <div className="progress-step"><span className="progress-number">2</span><span>Mật khẩu</span></div>
            <div className="progress-line"></div>
            <div className="progress-step"><span className="progress-number active">3</span><span>Xác thực</span></div>
          </div>

          <form onSubmit={handleSubmitOtp}>
            <div className="form-group">
              <label htmlFor="otp">Mã OTP</label>
              <input
                type="text"
                id="otp"
                maxLength="6"
                placeholder="000000"
                value={otpData.otp}
                onChange={handleOtpChange}
                className={`otp-input ${errors.otp ? 'input-error' : ''}`}
              />
              {errors.otp && <span className="error-message">{errors.otp}</span>}
              {errors.submit && <span className="error-message">{errors.submit}</span>}
              <p className="otp-hint">Mã OTP demo: <strong>{otpData.code}</strong></p>
            </div>

            <div className="otp-timer">
              {otpData.timer > 0 ? (
                <p>Gửi lại mã trong <span className="timer">{otpData.timer}s</span></p>
              ) : (
                <button type="button" className="resend-otp" onClick={handleResendOtp}>Gửi lại mã OTP</button>
              )}
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setStep(2)} disabled={loading}>Quay lại</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang tạo tài khoản...' : 'Hoàn thành'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
