import { useEffect, useMemo, useState } from 'react'
import ToastNotification from '../components/ToastNotification'
import { childrenApi, getSelectedChild, petsApi, setSelectedChild } from '../services/api'
import '../styles/ParentShop.css'

const fallbackItems = [
  {
    id: 'fallback-1',
    name: 'Thỏ bình tĩnh',
    description: 'Một người bạn nhỏ để bé đồng hành trong góc bình tĩnh.',
    category: 'pet-item',
    price: 300,
    image: '🐰',
    bgColor: '#ffe5ef',
  },
]

export default function ParentShop() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [children, setChildren] = useState([])
  const [childId, setChildId] = useState(getSelectedChild()?.id || '')
  const [userStars, setUserStars] = useState(getSelectedChild()?.total_stars || 0)
  const [shopItems, setShopItems] = useState([])
  const [ownedPetIds, setOwnedPetIds] = useState(new Set())
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    let mounted = true

    Promise.all([childrenApi.list(), petsApi.list({ limit: 50 })])
      .then(([childResult, petResult]) => {
        if (!mounted) return
        const childList = childResult.children || []
        const selected = getSelectedChild()
        const firstChild = childList.find((child) => child.id === selected?.id) || childList[0]
        const items = (petResult.pets || []).map((pet) => ({
          id: pet.id,
          name: pet.name,
          description: pet.description || 'Vật phẩm có thể đổi bằng sao của bé.',
          category: 'pet-item',
          price: pet.unlock_star_cost || 0,
          image: pet.image_url || '🐾',
          imageUrl: pet.image_url,
          bgColor: '#eef7ff',
        }))

        setChildren(childList)
        setChildId(firstChild?.id || '')
        setUserStars(firstChild?.total_stars || 0)
        setSelectedChild(firstChild || null)
        setShopItems(items.length ? items : fallbackItems)
      })
      .catch((err) => {
        if (!mounted) return
        setShopItems(fallbackItems)
        setToast({
          type: 'error',
          title: 'Không tải được cửa hàng',
          message: err.message || 'Đang hiển thị dữ liệu mẫu.',
        })
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!childId) return

    petsApi.listChildPets(childId)
      .then((result) => {
        setOwnedPetIds(new Set((result.child_pets || []).map((item) => item.pet_id)))
      })
      .catch(() => {
        setOwnedPetIds(new Set())
      })
  }, [childId])

  const categories = [
    { id: 'all', label: 'Tất cả' },
    { id: 'pet-item', label: 'Thú cưng' },
    { id: 'others', label: 'Đã đổi' },
  ]

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return shopItems
    if (selectedCategory === 'others') return shopItems.filter((item) => ownedPetIds.has(item.id))
    return shopItems.filter((item) => item.category === selectedCategory && !ownedPetIds.has(item.id))
  }, [ownedPetIds, selectedCategory, shopItems])

  const handleSelectChild = (e) => {
    const nextChild = children.find((item) => item.id === e.target.value)
    setChildId(e.target.value)
    setUserStars(nextChild?.total_stars || 0)
    setSelectedChild(nextChild || null)
  }

  const handleBuyItem = async (item) => {
    if (!childId) {
      setToast({
        type: 'error',
        title: 'Chưa chọn trẻ',
        message: 'Hãy tạo hoặc chọn tài khoản trẻ trước khi đổi sao.',
      })
      return
    }

    if (ownedPetIds.has(item.id)) {
      setToast({
        type: 'success',
        title: 'Đã sở hữu',
        message: `${item.name} đã có trong kho của bé.`,
      })
      return
    }

    if (userStars < item.price) {
      setToast({
        type: 'error',
        title: 'Chưa đủ sao',
        message: `Bạn cần thêm ${(item.price - userStars).toLocaleString()} sao để mua ${item.name}.`,
      })
      return
    }

    try {
      const result = await petsApi.buy(childId, item.id)
      setUserStars(result.child_total_stars ?? (userStars - item.price))
      setOwnedPetIds((prev) => new Set([...prev, item.id]))
      setToast({
        type: 'success',
        title: 'Mua thành công',
        message: `${item.name} đã được thêm vào kho của bé.`,
      })
    } catch (err) {
      setToast({
        type: 'error',
        title: 'Không thể mua',
        message: err.message || 'Vui lòng thử lại.',
      })
    }
  }

  return (
    <div className="shop-container">
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      <div className="shop-header">
        <div className="shop-title-section">
          <h1 className="shop-title">Cửa hàng đổi sao</h1>
          <p className="shop-description">Sử dụng sao của bé để mở khóa thú cưng đồng hành</p>
        </div>

        <div className="shop-stars-display">
          <span className="stars-label">Hiện có:</span>
          <span className="stars-amount">
            <span className="stars-icon" aria-hidden="true">★</span>
            <span>{userStars.toLocaleString()}</span>
          </span>
          <select className="text-input" value={childId} onChange={handleSelectChild}>
            {children.map((child) => (
              <option key={child.id} value={child.id}>Bé {child.nickname}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="shop-filters">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`filter-tab ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="shop-items-grid">
        {loading && <p>Đang tải cửa hàng...</p>}
        {!loading && filteredItems.map((item) => {
          const owned = ownedPetIds.has(item.id)
          return (
            <div key={item.id} className="shop-product-card" style={{ backgroundColor: item.bgColor }}>
              <div className="product-category-tag">{owned ? 'Đã đổi' : 'Thú cưng'}</div>
              <div className="product-image-area">
                {item.imageUrl ? (
                  <img className="product-image" src={item.imageUrl} alt={item.name} />
                ) : (
                  <div className="product-image">{item.image}</div>
                )}
              </div>
              <div className="product-info">
                <h3 className="product-name">{item.name}</h3>
                <p className="product-description">{item.description}</p>
              </div>
              <div className="product-footer">
                <div className="product-price">
                  <span className="price-star" aria-hidden="true">★</span>
                  <span>{item.price}</span>
                </div>
                <button className="buy-product-btn" onClick={() => handleBuyItem(item)} disabled={owned || userStars < item.price}>
                  {owned ? 'Đã có' : 'Mua'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
