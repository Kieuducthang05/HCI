import '../styles/ToastNotification.css'

const toastIcons = {
  success: '✓',
  error: '!'
}

export default function ToastNotification({ toast, onClose }) {
  if (!toast) return null

  const type = toast.type || 'success'

  return (
    <div className={`toast-notification toast-${type}`} role="status" aria-live="polite">
      <div className="toast-icon">{toastIcons[type] || toastIcons.success}</div>
      <div className="toast-content">
        <p className="toast-title">{toast.title}</p>
        {toast.message && <p className="toast-message">{toast.message}</p>}
      </div>
      <button className="toast-close" onClick={onClose} aria-label="Đóng thông báo">
        ×
      </button>
    </div>
  )
}
