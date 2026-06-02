import { useEffect, useMemo, useState } from 'react'
import { getSelectedChild, petsApi } from '../services/api'
import '../styles/Child.css'

function activePetStorageKey(childId) {
  return `hci.activePet.${childId}`
}

function normalizeChildPet(childPet) {
  const pet = childPet.pet || {}
  return {
    id: childPet.id,
    petId: childPet.pet_id,
    name: childPet.custom_name || pet.name || 'Vật phẩm',
    originalName: pet.name || 'Vật phẩm',
    description: pet.description || 'Vật phẩm bé đã đổi bằng sao.',
    imageUrl: pet.image_url,
    animationUrl: pet.animation_url,
    unlockedAt: childPet.unlocked_at,
    cost: pet.unlock_star_cost || 0,
  }
}

export default function ChildInventory() {
  const selectedChild = getSelectedChild()
  const [childPets, setChildPets] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [activePetId, setActivePetId] = useState(() => (
    selectedChild?.id ? localStorage.getItem(activePetStorageKey(selectedChild.id)) || '' : ''
  ))
  const [loading, setLoading] = useState(Boolean(selectedChild?.id))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedChild?.id) {
      return
    }

    let mounted = true
    petsApi.listChildPets(selectedChild.id)
      .then((result) => {
        if (!mounted) return
        setChildPets(result.child_pets || [])
        setError('')
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Không tải được kho vật phẩm.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [selectedChild?.id])

  const inventory = useMemo(() => childPets.map(normalizeChildPet), [childPets])

  const filtered = selectedCategory === 'all'
    ? inventory
    : inventory.filter((item) => selectedCategory === 'active' ? item.id === activePetId : true)

  const categories = [
    { id: 'all', label: 'Tất cả', emoji: '🎒' },
    { id: 'active', label: 'Đang dùng', emoji: '✓' },
  ]

  const handleUsePet = (item) => {
    if (!selectedChild?.id) return
    localStorage.setItem(activePetStorageKey(selectedChild.id), item.id)
    setActivePetId(item.id)
  }

  return (
    <div className="child-inventory">
      <div className="inventory-header">
        <div>
          <h2>🎒 Kho vật phẩm</h2>
          <p>Những pet và vật phẩm ba mẹ đã đổi sao cho bé.</p>
        </div>
      </div>

      <div className="inventory-stats">
        <div className="stat-box">
          <span className="stat-label">Vật phẩm đã có</span>
          <span className="stat-value">{inventory.length}</span>
        </div>
      </div>

      <div className="category-filters">
        {categories.map((cat) => (
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

      {error && <p className="inventory-error">{error}</p>}

      <div className="inventory-grid">
        {loading && (
          <div className="empty-state">
            <p>Đang tải kho vật phẩm...</p>
          </div>
        )}

        {!loading && filtered.length > 0 && filtered.map((item) => {
          const isActive = item.id === activePetId
          return (
            <div key={item.id} className={`inventory-item ${isActive ? 'active' : ''}`}>
              <div className="item-display">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} />
                ) : (
                  <span>🐾</span>
                )}
              </div>
              <h4 className="item-name">{item.name}</h4>
              <p className="item-count">{item.description}</p>
              <button className="use-item-btn" onClick={() => handleUsePet(item)} disabled={isActive}>
                {isActive ? 'Đang dùng' : 'Dùng'}
              </button>
            </div>
          )
        })}

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <p>{selectedCategory === 'active' ? 'Bé chưa chọn vật phẩm đang dùng.' : 'Bé chưa có vật phẩm nào.'}</p>
            <p className="empty-text">Ba mẹ có thể vào Cửa hàng sao để đổi pet cho bé.</p>
          </div>
        )}
      </div>
    </div>
  )
}
