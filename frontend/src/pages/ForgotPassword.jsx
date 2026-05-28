import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import '../styles/Auth.css'

function normalizeIdentifier(value, type) {
  if (type === 'email') return value.trim().toLowerCase()
  return value.replace(/\D/g, '')
}

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [contactType, setContactType] = useState(null)
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [otpData, setOtpData] = useState({ otp: '', timer: 0 })
  const [resetToken, setResetToken] = useState('')
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const identifier = normalizeIdentifier(emailOrPhone, contactType)

  useEffect(() => {
    if (step !== 3 || otpData.timer <= 0) return undefined

    const timerId = setTimeout(() => {
      setOtpData((prev) => ({ ...prev, timer: Math.max(prev.timer - 1, 0) }))
    }, 1000)

    return () => clearTimeout(timerId)
  }, [otpData.timer, step])

  const handleContactTypeSelect = (type) => {
    setContactType(type)
    setStep(2)
    setErrors({})
  }

  const handleEmailOrPhoneChange = (e) => {
    setEmailOrPhone(e.target.value)
    if (errors.emailOrPhone || errors.submit) {
      setErrors((prev) => ({ ...prev, emailOrPhone: '', submit: '' }))
    }
  }

  const validateContactInfo = () => {
    const newErrors = {}

    if (!emailOrPhone) {
      newErrors.emailOrPhone = contactType === 'email'
        ? 'Vui lòng nhập email'
        : 'Vui lòng nhập số điện thoại'
    } else if (contactType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone)) {
      newErrors.emailOrPhone = 'Email không hợp lệ'
    } else if (contactType === 'phone' && !/^[0-9]{10}$/.test(emailOrPhone.replace(/\D/g, ''))) {
      newErrors.emailOrPhone = 'Số điện thoại không hợp lệ (10 số)'
    }

    return newErrors
  }

  const handleSendOtp = async (e) => {
    e.preventDefault()
    const newErrors = validateContactInfo()

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      setLoading(true)
      await authApi.requestPasswordReset(identifier)
      setStep(3)
      setErrors({})
      setOtpData({ otp: '', timer: 60 })
    } catch (error) {
      setErrors({ submit: error.message || 'Không gửi được mã xác thực.' })
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtpData((prev) => ({ ...prev, otp: value }))
    if (errors.otp || errors.submit) {
      setErrors((prev) => ({ ...prev, otp: '', submit: '' }))
    }
  }

  const validateOtp = () => {
    const newErrors = {}

    if (!otpData.otp) {
      newErrors.otp = 'Vui lòng nhập OTP'
    } else if (otpData.otp.length !== 6) {
      newErrors.otp = 'OTP phải có 6 số'
    }

    return newErrors
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const newErrors = validateOtp()

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      setLoading(true)
      const result = await authApi.verifyPasswordReset(identifier, otpData.otp)
      setResetToken(result.reset_token)
      setStep(4)
      setErrors({})
    } catch (error) {
      setErrors({ otp: error.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.' })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name] || errors.submit) {
      setErrors((prev) => ({ ...prev, [name]: '', submit: '' }))
    }
  }

  const validatePassword = () => {
    const newErrors = {}

    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu mới'
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

  const handleResetPassword = async (e) => {
    e.preventDefault()
    const newErrors = validatePassword()

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      setLoading(true)
      await authApi.confirmPasswordReset(identifier, resetToken, formData.password)
      navigate('/login')
    } catch (error) {
      setErrors({ submit: error.message || 'Không đặt lại được mật khẩu.' })
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    try {
      setLoading(true)
      await authApi.requestPasswordReset(identifier)
      setOtpData({ otp: '', timer: 60 })
      setErrors({})
    } catch (error) {
      setErrors({ submit: error.message || 'Không gửi lại được OTP.' })
    } finally {
      setLoading(false)
    }
  }

  if (step === 1 || !contactType) {
    return (
      <div className="auth-container">
        <div className="auth-form-wrapper">
          <div className="auth-form">
            <div className="auth-header">
              <h1>Quên mật khẩu?</h1>
              <p>Chọn cách để xác thực tài khoản của bạn.</p>
            </div>

            <div className="forgot-password-options">
              <button type="button" className="forgot-option-card email" onClick={() => handleContactTypeSelect('email')}>
                <div className="option-icon">✉</div>
                <h3>Qua Email</h3>
                <p>Nhận mã xác thực qua email</p>
              </button>

              <button type="button" className="forgot-option-card phone" onClick={() => handleContactTypeSelect('phone')}>
                <div className="option-icon">☎</div>
                <h3>Qua SMS</h3>
                <p>Nhận mã xác thực qua SMS</p>
              </button>
            </div>

            <p className="auth-footer">
              Nhớ mật khẩu rồi? <Link to="/login" className="link-register">Đăng nhập ngay</Link>
            </p>
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
              <h1>Nhập {contactType === 'email' ? 'Email' : 'Số điện thoại'}</h1>
              <p>Chúng tôi sẽ gửi mã xác thực cho bạn.</p>
            </div>

            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label htmlFor="emailOrPhone">{contactType === 'email' ? 'Email' : 'Số điện thoại'}</label>
                <input
                  type={contactType === 'email' ? 'email' : 'tel'}
                  id="emailOrPhone"
                  placeholder={contactType === 'email' ? 'Nhập email của bạn' : 'Nhập số điện thoại'}
                  value={emailOrPhone}
                  onChange={handleEmailOrPhoneChange}
                  className={errors.emailOrPhone ? 'input-error' : ''}
                />
                {errors.emailOrPhone && <span className="error-message">{errors.emailOrPhone}</span>}
                {errors.submit && <span className="error-message">{errors.submit}</span>}
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => {
                  setStep(1)
                  setContactType(null)
                  setEmailOrPhone('')
                }}>
                  Quay lại
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Đang gửi...' : 'Gửi OTP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className="auth-container">
        <div className="auth-form-wrapper">
          <div className="auth-form">
            <div className="auth-header">
              <h1>Nhập mã OTP</h1>
              <p>Chúng tôi đã gửi mã 6 số đến {contactType === 'email' ? 'email' : 'SĐT'} của bạn.</p>
            </div>

            <form onSubmit={handleVerifyOtp}>
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
              </div>

              <div className="otp-timer">
                {otpData.timer > 0 ? (
                  <p>Gửi lại mã trong <span className="timer">{otpData.timer}s</span></p>
                ) : (
                  <button type="button" className="resend-otp" onClick={handleResendOtp} disabled={loading}>
                    Gửi lại mã OTP
                  </button>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => {
                  setStep(2)
                  setOtpData({ otp: '', timer: 0 })
                }}>
                  Quay lại
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Đang xác thực...' : 'Xác thực'}
                </button>
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
            <h1>Đặt lại mật khẩu</h1>
            <p>Nhập mật khẩu mới cho tài khoản của bạn.</p>
          </div>

          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label htmlFor="password">Mật khẩu mới</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Nhập mật khẩu mới tối thiểu 8 ký tự"
                value={formData.password}
                onChange={handlePasswordChange}
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
                placeholder="Xác nhận mật khẩu mới"
                value={formData.confirmPassword}
                onChange={handlePasswordChange}
                className={errors.confirmPassword ? 'input-error' : ''}
              />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              {errors.submit && <span className="error-message">{errors.submit}</span>}
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
            </button>
          </form>

          <p className="auth-footer">
            Quay về <Link to="/login" className="link-register">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
