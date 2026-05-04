import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Child.css'

export default function ChildInventory() {
  const navigate = useNavigate()
  const [inventory] = useState([
    { id: 1, name: 'Mũ hồng', emoji: '🎀', category: 'accessory', count: 1 },
    { id: 2, name: 'Bóp hình mèo', emoji: '🎁', category: 'gift', count: 2 },
    { id: 3, name: 'Tranh vẽ', emoji: '🎨', category: 'art', count: 3 },
    { id: 4, name: 'Sách truyện tranh', emoji: '📚', category: 'book', count: 1 },
    { id: 5, name: 'Thẻ cao su', emoji: '🎮', category: 'collectible', count: 5 },
  ])

  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = [
    { id: 'all', label: 'Tất cả', emoji: '📦' },
    { id: 'accessory', label: 'Phụ kiện', emoji: '🎀' },
    { id: 'gift', label: 'Quà tặng', emoji: '🎁' },
    { id: 'art', label: 'Nghệ thuật', emoji: '🎨' },
    { id: 'book', label: 'Sách', emoji: '📚' },
    { id: 'collectible', label: 'Sưu tập', emoji: '🎮' },
  ]

  const filtered = selectedCategory === 'all'
    ? inventory
    : inventory.filter(item => item.category === selectedCategory)

  return (
    <div className="child-inventory">
      <div className="inventory-header">
        <h2>🎒 Kho của bé</h2>
        <button className="close-btn" onClick={() => navigate('/child/home')}>✕</button>
      </div>

      <div className="inventory-stats">
        <div className="stat-box">
          <span className="stat-label">Tổng vật phẩm</span>
          <span className="stat-value">{inventory.reduce((sum, item) => sum + item.count, 0)}</span>
        </div>
      </div>

      <div className="category-filters">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span className="emoji">{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="inventory-grid">
        {filtered.length > 0 ? (
          filtered.map(item => (
            <div key={item.id} className="inventory-item">
              <div className="item-display">{item.emoji}</div>
              <h4 className="item-name">{item.name}</h4>
              <p className="item-count">x{item.count}</p>
              <button className="use-item-btn">Dùng</button>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>Chưa có vật phẩm trong danh mục này</p>
              <p className="empty-text">Hãy hoàn thành những trò chơi để nhận vật phẩm!</p>
          </div>
        )}
      </div>
    </div>
  )
}
