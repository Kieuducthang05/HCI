import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getSelectedChild } from '../services/api';

// --- CÁC ICON SVG ---
const CoinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" fill="#FCE596" />
    <path d="M12 5L14 10L19 10L15 13L16.5 18L12 15L7.5 18L9 13L5 10L10 10L12 5Z" fill="#DCA846" />
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8B2BD" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const BookIcon = () => (
  <svg width="45" height="45" viewBox="0 0 24 24" fill="#305196" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 6.25C21 5.48 20.25 4.93 19.53 5.12C17.51 5.64 14.86 6.32 12 8C9.14 6.32 6.49 5.64 4.47 5.12C3.75 4.93 3 5.48 3 6.25V18.25C3 19.03 3.78 19.57 4.54 19.38C6.63 18.86 9.42 18.27 12 20C14.58 18.27 17.37 18.86 19.46 19.38C20.22 19.57 21 19.03 21 18.25V6.25Z" />
    <path d="M12 8V20" stroke="#EEF5FF" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M16.5 6.5V17.5" stroke="#EEF5FF" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const GamepadIcon = () => (
  <svg width="45" height="45" viewBox="0 0 24 24" fill="#E8BE56" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="7" width="22" height="12" rx="3.5" fill="#E8BE56" />
    <path d="M5 13H9M7 11V15" stroke="#FFFFA" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="16" cy="13.5" r="1.5" fill="#FFFFFF" />
    <circle cx="18.5" cy="11" r="1.5" fill="#FFFFFF" />
  </svg>
);

const QuestionIcon = () => (
  <svg width="45" height="45" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="36" fill="#B7EAD9" />
    <path
      d="M39 39C40.8 30.5 48.1 26 56.2 28.3C63.1 30.3 67.1 36.3 65.6 43.1C64.6 47.7 61.5 50.7 57.5 53.2C53.7 55.6 52.5 57.8 52.5 62.5"
      fill="none"
      stroke="#477064"
      strokeLinecap="round"
      strokeWidth="8"
    />
    <circle cx="52.5" cy="73" r="5" fill="#477064" />
  </svg>
);

const BunnyIcon = () => (
  <svg width="50" height="50" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M 40 55 C 32 15 45 15 48 35" fill="#FCA5B5" />
    <path d="M 60 55 C 68 15 55 15 52 35" fill="#FCA5B5" />
    <path d="M 42 50 C 37 25 43 23 46 35" fill="#FFFFFF" />
    <path d="M 58 50 C 63 25 57 23 54 35" fill="#FFFFFF" />
    <circle cx="50" cy="65" r="26" fill="#FCA5B5" />
    <path d="M 39 61 Q 43 56 46 61" fill="none" stroke="#5A4A4C" strokeWidth="3" strokeLinecap="round" />
    <path d="M 54 61 Q 58 56 61 61" fill="none" stroke="#5A4A4C" strokeWidth="3" strokeLinecap="round" />
    <circle cx="50" cy="67" r="2.5" fill="#FFFFFF" />
    <path d="M 46 72 Q 50 76 54 72" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    <ellipse cx="36" cy="68" rx="4" ry="2.5" fill="#FFCADA" />
    <ellipse cx="64" cy="68" rx="4" ry="2.5" fill="#FFCADA" />
  </svg>
);

// --- COMPONENT THẺ NÚT CHÍNH (Đã thêm thuộc tính onClick) ---
const ActionCard = ({ title, borderColor, bgColor, textColor, icon, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 10px',
        borderRadius: '24px',
        border: `3px solid ${borderColor}`,
        backgroundColor: '#FFFFFF',
        cursor: 'pointer',
        boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
        width: '100%',
        boxSizing: 'border-box',
        transition: 'transform 0.1s ease-in-out',
      }}
      // Thêm hiệu ứng nhún nhẹ khi click bằng event listener nội tuyến
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div
        style={{
          width: '85px',
          height: '85px',
          borderRadius: '50%',
          backgroundColor: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: '20px', fontWeight: 'bold', color: textColor }}>
        {title}
      </span>
    </button>
  );
};

// --- COMPONENT CHÍNH ---
export default function ChildHome() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const selectedChild = getSelectedChild();
  const starCount = Number(outletContext?.userStars ?? selectedChild?.total_stars ?? 0);
  // Giữ lại state nếu sau này bạn muốn thay đổi câu chào linh hoạt
  const [greeting] = useState('Hôm nay con muốn làm gì?');

  // Hàm xử lý chuyển trang giống code cũ của bạn
  const handleActivityClick = (activityId) => {
    navigate(`/child/${activityId}`);
  };

  return (
    <div 
      style={{ 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        paddingTop: '40px',
        fontFamily: 'sans-serif'
      }}
    >
      <div 
        style={{ 
          backgroundColor: '#FDFDFD', 
          width: '100%', 
          maxWidth: '550px', 
          borderRadius: '32px', 
          padding: '24px 32px 48px 32px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
          boxSizing: 'border-box'
        }}
      >
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FCEDC9', padding: '6px 16px', borderRadius: '20px' }}>
            <CoinIcon />
            <span style={{ color: '#DCA846', fontWeight: 'bold', fontSize: '16px' }}>{starCount}</span>
          </div>
          {/* Nút X: Tôi set cho nó chức năng quay lại trang trước (Go back) */}
          <button 
            onClick={() => navigate(-1)}
            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #F0F2F5', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Tiêu đề */}
        <h1 style={{ textAlign: 'center', fontSize: '26px', fontWeight: '800', color: '#0F172A', marginBottom: '32px', marginTop: '0' }}>
          {greeting}
        </h1>

        {/* Lưới 4 nút được map thẳng sự kiện chuyển hướng */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '20px',
            width: '100%'
          }}
        >
          <ActionCard 
            title="Học" 
            borderColor="#305196" 
            bgColor="#EEF5FF" 
            textColor="#305196" 
            icon={<BookIcon />} 
            onClick={() => handleActivityClick('learn')} 
          />
          <ActionCard 
            title="Chơi" 
            borderColor="#E8BE56" 
            bgColor="#FFFAEA" 
            textColor="#C79A1F" 
            icon={<GamepadIcon />} 
            onClick={() => handleActivityClick('games')} 
          />
          <ActionCard
            title="Câu hỏi"
            borderColor="#77BFA3"
            bgColor="#EAF7F0"
            textColor="#34765F"
            icon={<QuestionIcon />}
            onClick={() => handleActivityClick('questions')}
          />
          <ActionCard 
            title="Bạn Thỏ" 
            borderColor="#D1969D" 
            bgColor="#FCEEF0" 
            textColor="#D1969D" 
            icon={<BunnyIcon />} 
            onClick={() => handleActivityClick('chat')} 
          />
        </div>

      </div>
    </div>
  );
}
