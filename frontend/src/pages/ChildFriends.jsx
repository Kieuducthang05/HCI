import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Child.css'

export default function ChildFriends() {
  const navigate = useNavigate()
  const [friends] = useState([
    {
      id: 1,
      name: 'Thỏ Trắng',
      avatar: '🐰',
      role: 'Bạn thân',
      level: 5,
      color: '#f06292',
      bio: 'Thỏ thích giúp bạn hiểu cảm xúc'
    },
    {
      id: 2,
      name: 'Gấu Nâu',
      avatar: '🐻',
      role: 'Cố vấn',
      level: 8,
      color: '#a1887f',
      bio: 'Gấu có kinh nghiệm và luôn sẵn sàng lắng nghe'
    },
    {
      id: 3,
      name: 'Mèo Cam',
      avatar: '🐱',
      role: 'Bạn cùng lớp',
      level: 3,
      color: '#ffb74d',
      bio: 'Mèo luôn vui vẻ và đầy năng lượng'
    },
    {
      id: 4,
      name: 'Chim Xanh',
      avatar: '🐦',
      role: 'Bạn mới',
      level: 1,
      color: '#64b5f6',
      bio: 'Chim vừa mới gia nhập nhóm'
    }
  ])

  const [selectedFriend, setSelectedFriend] = useState(null)

  return (
    <div className="child-friends">
      <div className="friends-header">
        <h2>🐰 Ban Thỏ</h2>
        <button className="close-btn" onClick={() => navigate('/child/home')}>✕</button>
      </div>

      <div className="friends-intro">
        <p>💬 Đây là những bạn của bé trong hành trình khám phá cảm xúc</p>
      </div>

      {!selectedFriend ? (
        <div className="friends-grid">
          {friends.map(friend => (
            <div
              key={friend.id}
              className="friend-card"
              style={{ borderColor: friend.color }}
              onClick={() => setSelectedFriend(friend)}
            >
              <div className="friend-avatar" style={{ backgroundColor: friend.color }}>
                {friend.avatar}
              </div>
              <h3 className="friend-name">{friend.name}</h3>
              <p className="friend-role">{friend.role}</p>
              <div className="friend-level">
                {'⭐'.repeat(Math.min(friend.level, 5))}
              </div>
              <button className="view-btn">Xem →</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="friend-detail">
          <button className="back-btn" onClick={() => setSelectedFriend(null)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Quay lại</span>
          </button>
          
          <div className="detail-card" style={{ borderColor: selectedFriend.color }}>
            <div className="detail-avatar" style={{ backgroundColor: selectedFriend.color }}>
              {selectedFriend.avatar}
            </div>
            
            <h2 className="detail-name">{selectedFriend.name}</h2>
            <p className="detail-role">{selectedFriend.role}</p>
            
            <div className="detail-bio">
              <p>{selectedFriend.bio}</p>
            </div>

            <div className="detail-level">
              <span>Cấp độ: </span>
              <span>{'⭐'.repeat(Math.min(selectedFriend.level, 5))}</span>
            </div>

            <div className="detail-actions">
              <button className="action-btn">💬 Nhắn tin</button>
              <button className="action-btn">🎁 Gửi quà</button>
              <button className="action-btn">👥 Thêm bạn</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
