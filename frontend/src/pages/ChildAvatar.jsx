import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Child.css'

export default function ChildAvatar() {
  const navigate = useNavigate()
  const [selectedAvatar, setSelectedAvatar] = useState('avatar-1')
  const [avatarItems, setAvatarItems] = useState([
    { id: 'head-1', category: 'head', name: 'Mũ hồng', emoji: '🎀', owned: true },
    { id: 'head-2', category: 'head', name: 'Kính mặt trời', emoji: '😎', owned: false },
    { id: 'body-1', category: 'body', name: 'Áo xanh', emoji: '👕', owned: true },
    { id: 'body-2', category: 'body', name: 'Áo hồng', emoji: '👗', owned: false },
    { id: 'pet-1', category: 'pet', name: 'Chim cảnh', emoji: '🐦', owned: true },
    { id: 'pet-2', category: 'pet', name: 'Thỏ', emoji: '🐰', owned: false },
  ])

  const [displayedItems, setDisplayedItems] = useState({
    head: '🎀',
    body: '👕',
    pet: '🐦'
  })

  const categories = [
    { id: 'head', label: 'Mũ / Phụ kiện' },
    { id: 'body', label: 'Quần áo' },
    { id: 'pet', label: 'Thú cưng' }
  ]

  const equip = (category, emoji) => {
    setDisplayedItems({ ...displayedItems, [category]: emoji })
  }

  return (
    <div className="child-avatar-page">
      <div className="avatar-header">
        <h2>👤 Avatar của bé</h2>
        <button className="close-btn" onClick={() => navigate('/child/home')}>✕</button>
      </div>

      <div className="avatar-display">
        <div className="avatar-circle">
          <span className="avatar-part head">{displayedItems.head}</span>
          <span className="avatar-part body">{displayedItems.body}</span>
          <span className="avatar-part pet">{displayedItems.pet}</span>
        </div>
      </div>

      <div className="item-categories">
        {categories.map(category => (
          <div key={category.id} className="category-section">
            <h3 className="category-title">{category.label}</h3>
            <div className="items-row">
              {avatarItems
                .filter(item => item.category === category.id)
                .map(item => (
                  <div
                    key={item.id}
                    className={`item-card ${item.owned ? 'owned' : 'locked'}`}
                    onClick={() => {
                      if (item.owned) {
                        equip(category.id, item.emoji)
                      }
                    }}
                  >
                    <div className="item-emoji">{item.emoji}</div>
                    <p className="item-name">{item.name}</p>
                    {!item.owned && <div className="lock-badge">🔒</div>}
                    {item.owned && <button className="use-btn">Dùng</button>}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <button className="save-avatar-btn" onClick={() => navigate('/child/home')}>
        ✓ Lưu
      </button>
    </div>
  )
}
