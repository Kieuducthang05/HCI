import { useState } from 'react'
import '../styles/ParentShop.css'

export default function ParentShop() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [userStars, setUserStars] = useState(1250)

  const categories = [
    { id: 'all', label: 'Tất cả' },
    { id: 'pet', label: 'Chủ đề' },
    { id: 'pet-item', label: 'Thú cưng' },
    { id: 'others', label: 'Đã đổi' }
  ]

  const shopItems = [
    {
      id: 1,
      name: 'Đảo Dương Xanh',
      description: 'Một nơi tuyệt vời với bầu trời xanh lam, hải cảu yên bình và những điều tuyệt vời',
      category: 'pet',
      price: 300,
      icon: '🏝️',
      image: '🏝️',
      bgColor: '#cce5ff'
    },
    {
      id: 2,
      name: 'Khu rừng vui về',
      description: 'Một khu rừng rộng lớn nơi những con vật có thể chơi đùa và khám phá những điều thú vị',
      category: 'pet',
      price: 300,
      icon: '🌲',
      image: '🌳',
      bgColor: '#ccffed'
    },
    {
      id: 3,
      name: 'Đải Dương Xanh',
      description: 'Một nơi tuyệt vời với bầu trời xanh lam, hải cảu yên bình và những điều tuyệt vời',
      category: 'pet',
      price: 300,
      icon: '🏖️',
      image: '🏖️',
      bgColor: '#cce5ff'
    },
    {
      id: 4,
      name: 'Khu rừng vui về',
      description: 'Một khu rừng rộng lớn nơi những con vật có thể chơi đùa và khám phá những điều thú vị',
      category: 'pet-item',
      price: 300,
      icon: '🌿',
      image: '🌿',
      bgColor: '#ccffed'
    },
    {
      id: 5,
      name: 'Mèo Béo',
      description: 'Một chú mèo béo đáng yêu, rất thích ngủ và chơi với chủ nhân của nó',
      category: 'pet-item',
      price: 300,
      icon: '😺',
      image: '😺',
      bgColor: '#ffe5cc'
    },
    {
      id: 6,
      name: 'Mèo Béo',
      description: 'Một chú mèo béo đáng yêu, rất thích ngủ và chơi với chủ nhân của nó',
      category: 'others',
      price: 300,
      icon: '😸',
      image: '😸',
      bgColor: '#ffcccc'
    },
    {
      id: 7,
      name: 'Khu rừng vui về',
      description: 'Một khu rừng rộng lớn nơi những con vật có thể chơi đùa và khám phá những điều thú vị',
      category: 'pet',
      price: 300,
      icon: '🌴',
      image: '🌴',
      bgColor: '#ccffed'
    },
    {
      id: 8,
      name: 'Đảo Dương Xanh',
      description: 'Một nơi tuyệt vời với bầu trời xanh lam, hải cảu yên bình và những điều tuyệt vời',
      category: 'pet-item',
      price: 300,
      icon: '🏝️',
      image: '🏝️',
      bgColor: '#cce5ff'
    },
    {
      id: 9,
      name: 'Khu rừng vui về',
      description: 'Một khu rừng rộng lớn nơi những con vật có thể chơi đùa và khám phá những điều thú vị',
      category: 'others',
      price: 300,
      icon: '🌲',
      image: '🌲',
      bgColor: '#ccffed'
    }
  ]

  const filteredItems = selectedCategory === 'all'
    ? shopItems
    : shopItems.filter(item => item.category === selectedCategory)

  const handleBuyItem = (item) => {
    if (userStars >= item.price) {
      setUserStars(userStars - item.price)
      alert(`✓ Mua thành công: ${item.name}`)
    } else {
      alert(`✗ Sao không đủ. Bạn cần thêm ${item.price - userStars} sao`)
    }
  }

  return (
    <div className="shop-container">
      {/* Header Section */}
      <div className="shop-header">
        <div className="shop-title-section">
          <h1 className="shop-title">Cửa hàng đối sao</h1>
          <p className="shop-description">Sử dụng những sao được đạt được để mở khóa những trò chơi và hoạt động mới đầy thú vị!</p>
        </div>
        
        <div className="shop-stars-display">
          <span className="stars-label">Hiện có:</span>
          <span className="stars-amount">{userStars.toLocaleString()} <span className="stars-icon">⭐</span></span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="shop-filters">
        {categories.map(category => (
          <button
            key={category.id}
            className={`filter-tab ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="shop-items-grid">
        {filteredItems.map(item => (
          <div
            key={item.id}
            className="shop-product-card"
            style={{ backgroundColor: item.bgColor }}
          >
            {/* Category Label */}
            <div className="product-category-tag">
              {item.category === 'pet' && 'Chủ đề'}
              {item.category === 'pet-item' && 'Thú cưng'}
              {item.category === 'others' && 'Đã đổi'}
            </div>

            {/* Product Image */}
            <div className="product-image-area">
              <div className="product-image">{item.image}</div>
            </div>

            {/* Product Info */}
            <div className="product-info">
              <h3 className="product-name">{item.name}</h3>
              <p className="product-description">{item.description}</p>
            </div>

            {/* Product Footer */}
            <div className="product-footer">
              <div className="product-price">
                {item.price} <span className="price-star">⭐</span>
              </div>
              <button
                className="buy-product-btn"
                onClick={() => handleBuyItem(item)}
                disabled={userStars < item.price}
              >
                Mua
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
