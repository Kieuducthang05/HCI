import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Auth.css'

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: Thông tin, 2: Mật khẩu, 3: OTP
  const [contactType, setContactType] = useState('email') // 'email' hoặc 'phone'
  const [formData, setFormData] = useState({
    fullName: '',
    emailOrPhone: '',
    password: '',
    confirmPassword: ''
  })
  const [otpData, setOtpData] = useState({
    otp: '',
    timer: 0,
    code: ''
  })
  const [errors, setErrors] = useState({})

  // LƯU Ý: Step 1 là nhập thông tin (không chọn loại), Step 2 là mật khẩu, Step 3 là OTP
  // Sau khi đăng nhập thành công, redirect đến /select-user để chọn loại người dùng


  const handleChange = (e) => {
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

  useEffect(() => {
    if (step !== 3 || otpData.timer <= 0) return undefined

    const timerId = setTimeout(() => {
      setOtpData(prev => ({ ...prev, timer: Math.max(prev.timer - 1, 0) }))
    }, 1000)

    return () => clearTimeout(timerId)
  }, [otpData.timer, step])

  const createMockOtp = () => String(Math.floor(100000 + Math.random() * 900000))

  const validateStep1 = () => {
    const newErrors = {}
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ tên'
    }
    
    if (!formData.emailOrPhone) {
      newErrors.emailOrPhone = contactType === 'email'
        ? 'Vui lòng nhập email'
        : 'Vui lòng nhập số điện thoại'
    } else if (contactType === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailOrPhone)) {
        newErrors.emailOrPhone = 'Email không hợp lệ'
      }
    } else {
      if (!/^[0-9]{10}$/.test(formData.emailOrPhone.replace(/\D/g, ''))) {
        newErrors.emailOrPhone = 'Số điện thoại không hợp lệ (10 số)'
      }
    }
    
    return newErrors
  }

  const validateStep3 = () => {
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
    }
    
    return newErrors
  }

  const handleNextStep = (e) => {
    e.preventDefault()
    const newErrors = validateStep1()
    
    if (Object.keys(newErrors).length === 0) {
      setStep(2)
      setErrors({})
    } else {
      setErrors(newErrors)
    }
  }

  const handleToStepOtp = (e) => {
    e.preventDefault()
    const newErrors = validateStep3()
    
    if (Object.keys(newErrors).length === 0) {
      setStep(3)
      setErrors({})
      setOtpData(prev => ({ ...prev, otp: '', timer: 60, code: createMockOtp() }))
      // TODO: Gửi OTP đến email/phone
    } else {
      setErrors(newErrors)
    }
  }

  const handleSubmitOtp = (e) => {
    e.preventDefault()
    const newErrors = validateOtp()
    
    if (Object.keys(newErrors).length === 0 && otpData.otp !== otpData.code) {
      setErrors({ otp: 'Mã OTP chưa đúng' })
      return
    }

    if (Object.keys(newErrors).length === 0) {
      // Xác thực OTP thành công
      console.log('Đăng kí:', {
        ...formData,
        contactType,
        otp: otpData.otp
      })
      // TODO: Gọi API xác thực OTP
      navigate('/login')
    } else {
      setErrors(newErrors)
    }
  }

  const handleResendOtp = () => {
    // TODO: Gửi lại OTP
    setOtpData(prev => ({ ...prev, otp: '', timer: 60, code: createMockOtp() }))
    setErrors(prev => ({ ...prev, otp: '' }))
  }

  // Step 1: Thông tin cơ bản
  if (step === 1) {
    return (
      <div className="auth-container">
        <div className="auth-form-wrapper">
          <div className="auth-form">
            <div className="auth-header">
              <h1>Tạo tài khoản</h1>
              <p>Nhập thông tin cơ bản của bạn</p>
            </div>

            <div className="progress-indicator">
              <div className="progress-step">
                <span className="progress-number active">1</span>
                <span>Thông tin</span>
              </div>
              <div className="progress-line"></div>
              <div className="progress-step">
                <span className="progress-number">2</span>
                <span>Mật khẩu</span>
              </div>
              <div className="progress-line"></div>
              <div className="progress-step">
                <span className="progress-number">3</span>
                <span>Xác thực</span>
              </div>
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
                <button
                  type="button"
                  className={`toggle-btn ${contactType === 'email' ? 'active' : ''}`}
                  onClick={() => {
                    setContactType('email')
                    setFormData(prev => ({ ...prev, emailOrPhone: '' }))
                    setErrors({})
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Email
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${contactType === 'phone' ? 'active' : ''}`}
                  onClick={() => {
                    setContactType('phone')
                    setFormData(prev => ({ ...prev, emailOrPhone: '' }))
                    setErrors({})
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                  Số điện thoại
                </button>
              </div>

              <div className="form-group">
                <label htmlFor="emailOrPhone">
                  {contactType === 'email' ? 'Email' : 'Số điện thoại'}
                </label>
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
                <button type="submit" className="btn-primary">
                  Tiếp theo
                </button>
              </div>
            </form>

            <div className="auth-footer">
              <p>Đã có tài khoản? <a href="/login">Đăng nhập</a></p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Mật khẩu
  if (step === 2) {
    return (
      <div className="auth-container">
        <div className="auth-form-wrapper">
          <div className="auth-form">
            <div className="auth-header">
              <h1>Đặt mật khẩu</h1>
              <p>Tạo mật khẩu bảo mật cho tài khoản</p>
            </div>

            <div className="progress-indicator">
              <div className="progress-step">
                <span className="progress-number">1</span>
                <span>Thông tin</span>
              </div>
              <div className="progress-line"></div>
              <div className="progress-step">
                <span className="progress-number active">2</span>
                <span>Mật khẩu</span>
              </div>
              <div className="progress-line"></div>
              <div className="progress-step">
                <span className="progress-number">3</span>
                <span>Xác thực</span>
              </div>
            </div>

            <form onSubmit={handleToStepOtp}>
              <div className="form-group">
                <label htmlFor="password">Mật khẩu</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Nhập mật khẩu (Tối thiểu 8 ký tự)"
                  value={formData.password}
                  onChange={handleChange}
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
                  placeholder="Xác nhận mật khẩu"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? 'input-error' : ''}
                />
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setStep(1)}
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

  // Step 3: Xác thực OTP
  if (step === 3) {
    return (
      <div className="auth-container">
        <div className="auth-form-wrapper">
          <div className="auth-form">
            <div className="auth-header">
              <h1>Xác thực tài khoản</h1>
              <p>Nhập mã OTP được gửi đến {contactType === 'email' ? 'email' : 'số điện thoại'} của bạn</p>
            </div>

            <div className="progress-indicator">
              <div className="progress-step">
                <span className="progress-number">1</span>
                <span>Thông tin</span>
              </div>
              <div className="progress-line"></div>
              <div className="progress-step">
                <span className="progress-number">2</span>
                <span>Mật khẩu</span>
              </div>
              <div className="progress-line"></div>
              <div className="progress-step">
                <span className="progress-number active">3</span>
                <span>Xác thực</span>
              </div>
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
                <p className="otp-hint">Mã OTP gồm 6 chữ số</p>
                <p className="otp-hint">Mã OTP demo: <strong>{otpData.code}</strong></p>
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
                  onClick={() => setStep(2)}
                >
                  Quay lại
                </button>
                <button type="submit" className="btn-primary">
                  Hoàn thành
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }
}
