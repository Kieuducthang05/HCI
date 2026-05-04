import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Auth.css'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: Chọn phương thức, 2: Nhập OTP, 3: Đặt lại mật khẩu
  const [contactType, setContactType] = useState(null) // 'email' hoặc 'phone'
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [otpData, setOtpData] = useState({
    otp: '',
    timer: 0
  })
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})

  const handleContactTypeSelect = (type) => {
    setContactType(type)
    setStep(2)
    setErrors({})
  }

  const handleEmailOrPhoneChange = (e) => {
    setEmailOrPhone(e.target.value)
    if (errors.emailOrPhone) {
      setErrors(prev => ({
        ...prev,
        emailOrPhone: ''
      }))
    }
  }

  const validateContactInfo = () => {
    const newErrors = {}
    
    if (!emailOrPhone) {
      newErrors.emailOrPhone = contactType === 'email'
        ? 'Vui lòng nhập email'
        : 'Vui lòng nhập số điện thoại'
    } else if (contactType === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone)) {
        newErrors.emailOrPhone = 'Email không hợp lệ'
      }
    } else {
      if (!/^[0-9]{10}$/.test(emailOrPhone.replace(/\D/g, ''))) {
        newErrors.emailOrPhone = 'Số điện thoại không hợp lệ (10 số)'
      }
    }
    
    return newErrors
  }

  const handleSendOtp = (e) => {
    e.preventDefault()
    const newErrors = validateContactInfo()
    
    if (Object.keys(newErrors).length === 0) {
      setStep(3)
      setErrors({})
      setOtpData(prev => ({ ...prev, timer: 60 }))
      // TODO: Gửi OTP đến email/phone
      console.log('Gửi OTP đến:', emailOrPhone, 'Loại:', contactType)
    } else {
      setErrors(newErrors)
    }
  }

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtpData(prev => ({
      ...prev,
      otp: value
    }))
    if (errors.otp) {
      setErrors(prev => ({
        ...prev,
        otp: ''
      }))
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

  const handleVerifyOtp = (e) => {
    e.preventDefault()
    const newErrors = validateOtp()
    
    if (Object.keys(newErrors).length === 0) {
      setStep(4)
      setErrors({})
      // TODO: Xác thực OTP với backend
      console.log('Xác thực OTP:', otpData.otp)
    } else {
      setErrors(newErrors)
    }
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
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

  const handleResetPassword = (e) => {
    e.preventDefault()
    const newErrors = validatePassword()
    
    if (Object.keys(newErrors).length === 0) {
      // Đặt lại mật khẩu thành công
      console.log('Đặt lại mật khẩu thành công')
      // TODO: Gọi API đặt lại mật khẩu
      navigate('/login')
    } else {
      setErrors(newErrors)
    }
  }

  const handleResendOtp = () => {
    setOtpData(prev => ({ ...prev, timer: 60 }))
    // TODO: Gửi lại OTP
    console.log('Gửi lại OTP')
  }

  // Step 1: Chọn phương thức
  if (step === 1 || !contactType) {
    return (
      <div className="auth-container">
        <div className="auth-form-wrapper">
          <div className="auth-form">
            <div className="auth-header">
              <h1>Quên mật khẩu?</h1>
              <p>Chọn cách để xác thực tài khoản của bạn</p>
            </div>

            <div className="forgot-password-options">
              <button
                type="button"
                className="forgot-option-card email"
                onClick={() => handleContactTypeSelect('email')}
              >
                <div className="option-icon">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>Qua Email</h3>
                <p>Nhận mã xác thực qua email</p>
              </button>

              <button
                type="button"
                className="forgot-option-card phone"
                onClick={() => handleContactTypeSelect('phone')}
              >
                <div className="option-icon">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>Qua SMS</h3>
                <p>Nhận mã xác thực qua SMS</p>
              </button>
            </div>

            <p className="auth-footer">
              Nhớ mật khẩu rồi? <a href="/login" className="link-register">Đăng nhập ngay</a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Nhập email/phone
  if (step === 2) {
    return (
      <div className="auth-container">
        <div className="auth-form-wrapper">
          <div className="auth-form">
            <div className="auth-header">
              <h1>Nhập {contactType === 'email' ? 'Email' : 'Số điện thoại'}</h1>
              <p>Chúng tôi sẽ gửi mã xác thực cho bạn</p>
            </div>

            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label htmlFor="emailOrPhone">
                  {contactType === 'email' ? 'Email' : 'Số điện thoại'}
                </label>
                <input
                  type={contactType === 'email' ? 'email' : 'tel'}
                  id="emailOrPhone"
                  placeholder={contactType === 'email' ? 'Nhập email của bạn' : 'Nhập số điện thoại'}
                  value={emailOrPhone}
                  onChange={handleEmailOrPhoneChange}
                  className={errors.emailOrPhone ? 'input-error' : ''}
                />
                {errors.emailOrPhone && <span className="error-message">{errors.emailOrPhone}</span>}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setStep(1)
                    setContactType(null)
                    setEmailOrPhone('')
                  }}
                >
                  Quay lại
                </button>
                <button type="submit" className="btn-primary">
                  Tiếp theo
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Nhập OTP
  if (step === 3) {
    return (
      <div className="auth-container">
        <div className="auth-form-wrapper">
          <div className="auth-form">
            <div className="auth-header">
              <h1>Nhập mã OTP</h1>
              <p>
                Chúng tôi đã gửi mã 6 số đến {contactType === 'email' ? 'email' : 'SĐT'} của bạn
              </p>
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
                <p className="otp-hint">
                  Nhập 6 số mã OTP được gửi đến {contactType === 'email' ? 'email' : 'SĐT'} của bạn
                </p>
              </div>

              <div className="otp-timer">
                {otpData.timer > 0 ? (
                  <p>Gửi lại mã trong <span className="timer">{otpData.timer}s</span></p>
                ) : (
                  <button
                    type="button"
                    className="resend-otp"
                    onClick={handleResendOtp}
                  >
                    Gửi lại mã OTP
                  </button>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setStep(2)
                    setOtpData({ otp: '', timer: 0 })
                  }}
                >
                  Quay lại
                </button>
                <button type="submit" className="btn-primary">
                  Xác thực
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Step 4: Đặt lại mật khẩu
  if (step === 4) {
    return (
      <div className="auth-container">
        <div className="auth-form-wrapper">
          <div className="auth-form">
            <div className="auth-header">
              <h1>Đặt lại mật khẩu</h1>
              <p>Nhập mật khẩu mới cho tài khoản của bạn</p>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label htmlFor="password">Mật khẩu mới</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Nhập mật khẩu mới (Tối thiểu 8 ký tự)"
                  value={formData.password}
                  onChange={handlePasswordChange}
                  className={errors.password ? 'input-error' : ''}
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
                <div className="password-requirements">
                  <p>Mật khẩu phải chứa:</p>
                  <ul>
                    <li className={formData.password.length >= 8 ? 'valid' : ''}>
                      ✓ Ít nhất 8 ký tự
                    </li>
                    <li className={/[A-Z]/.test(formData.password) ? 'valid' : ''}>
                      ✓ Chữ hoa (A-Z)
                    </li>
                    <li className={/[a-z]/.test(formData.password) ? 'valid' : ''}>
                      ✓ Chữ thường (a-z)
                    </li>
                    <li className={/\d/.test(formData.password) ? 'valid' : ''}>
                      ✓ Số (0-9)
                    </li>
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
              </div>

              <button type="submit" className="btn-primary">
                Đặt lại mật khẩu
              </button>
            </form>

            <p className="auth-footer">
              Quay về <a href="/login" className="link-register">Đăng nhập</a>
            </p>
          </div>
        </div>
      </div>
    )
  }
}
