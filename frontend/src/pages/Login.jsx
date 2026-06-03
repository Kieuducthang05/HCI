import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, setSession } from '../services/api'
import '../styles/Auth.css'

export default function Login() {
  const navigate = useNavigate()
  const googleButtonRef = useRef(null)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const [inputType, setInputType] = useState('email')
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [googleRecreateKey, setGoogleRecreateKey] = useState(0)

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return undefined

    let cancelled = false

    const renderGoogleButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response?.credential) {
            setErrors({ submit: 'Không nhận được Google ID token.' })
            return
          }

          try {
            setLoading(true)
            const result = await authApi.googleSignIn(response.credential)
            setSession(result)
            navigate(result.user?.role === 'ADMIN' ? '/admin' : '/select-user')
          } catch (error) {
            setErrors({ submit: error.message || 'Đăng nhập Google thất bại.' })
          } finally {
            setLoading(false)
          }
        },
      })

      googleButtonRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: googleButtonRef.current.offsetWidth || 360,
        text: 'signin_with',
        locale: 'vi',
        shape: 'pill',
      })
    }

    if (window.google?.accounts?.id) {
      renderGoogleButton()
    } else {
      const existingScript = document.querySelector('script[src^="https://accounts.google.com/gsi/client"]')
      if (existingScript) {
        existingScript.addEventListener('load', renderGoogleButton, { once: true })
      } else {
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client?hl=vi'
        script.async = true
        script.defer = true
        script.onload = renderGoogleButton
        script.onerror = () => setErrors({ submit: 'Không tải được Google Sign-In SDK.' })
        document.head.appendChild(script)
      }
    }

    return () => {
      cancelled = true
    }
  }, [googleClientId, navigate, googleRecreateKey])

  useEffect(() => {
    const handleBlur = () => {
      if (document.activeElement && googleButtonRef.current?.contains(document.activeElement)) {
        setTimeout(() => {
          setGoogleRecreateKey((prev) => prev + 1)
        }, 150)
      }
    }

    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

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
      navigate(result.user?.role === 'ADMIN' ? '/admin' : '/select-user')
    } catch (error) {
      setErrors({ submit: error.message || 'Đăng nhập thất bại. Vui lòng thử lại.' })
    } finally {
      setLoading(false)
    }
  }

  const switchInputType = (type) => {
    setInputType(type)
    setFormData((prev) => ({ ...prev, emailOrPhone: '' }))
    setErrors({})
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
                onClick={() => switchInputType('email')}
              >
                Email
              </button>
              <button
                type="button"
                className={`toggle-btn ${inputType === 'phone' ? 'active' : ''}`}
                onClick={() => switchInputType('phone')}
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

          {googleClientId ? (
            <div ref={googleButtonRef} className="google-sdk-button" />
          ) : (
            <p className="error-message">Thiếu VITE_GOOGLE_CLIENT_ID trong frontend/.env để bật Google Login.</p>
          )}

          <p className="auth-footer">
            Chưa có tài khoản? <Link to="/register" className="link-register">Đăng kí ngay</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
