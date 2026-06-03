import React from 'react'
import { FiAlertTriangle, FiX } from 'react-icons/fi'
import '../styles/Admin.css'

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Xác nhận xóa', 
  message = 'Bạn có chắc chắn muốn xóa mục này? Hành động này không thể hoàn tác.',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy'
}) {
  if (!isOpen) return null

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
        <div className="admin-form-heading" style={{ marginBottom: '20px', textAlign: 'center', display: 'block' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '50%', 
            background: '#fee2e2', 
            color: '#dc2626', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <FiAlertTriangle size={24} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>{title}</h2>
          <p style={{ color: '#64748b' }}>{message}</p>
        </div>

        <div className="admin-form-actions" style={{ justifyContent: 'center', gap: '16px', marginTop: '32px', display: 'flex' }}>
          <button 
            type="button" 
            onClick={onClose}
            style={{ 
              background: '#ffffff', 
              color: '#475467', 
              border: '1px solid #d0d5dd',
              borderRadius: '10px',
              flex: '1',
              minHeight: '48px',
              fontSize: '15px',
              fontWeight: '700',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.target.style.background = '#f9fafb'; e.target.style.borderColor = '#d0d5dd'; }}
            onMouseOut={(e) => { e.target.style.background = '#ffffff'; e.target.style.borderColor = '#d0d5dd'; }}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            onClick={() => {
              onConfirm()
              onClose()
            }}
            style={{ 
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              flex: '1',
              minHeight: '48px',
              fontSize: '15px',
              fontWeight: '700',
              boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.target.style.background = '#b91c1c'; }}
            onMouseOut={(e) => { e.target.style.background = '#dc2626'; }}
          >
            {confirmText}
          </button>
        </div>
        
        <button className="admin-modal-close" onClick={onClose} aria-label="Đóng">
          <FiX />
        </button>
      </div>
    </div>
  )
}
